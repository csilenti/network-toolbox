/**
 * IPv4 地址相关的纯函数工具集。
 *
 * 所有地址在内部统一以 32 位无符号整数表示（number，0 ~ 2^32 - 1）。
 * IPv4 最大值 4294967295 恰好落在 Number.MAX_SAFE_INTEGER 之内，
 * 全程使用 >>> / | / & 等无符号安全位运算，不依赖浮点边界。
 */

/** IP 解析失败的具体原因（discriminated union，供 UI 渲染教学化提示）。 */
export type IpParseError =
  | { kind: 'empty'; message: string }
  | { kind: 'not_ipv4'; message: string }
  | { kind: 'format'; message: string }
  | { kind: 'range'; message: string; segment: number };

export type IpParseResult =
  | { ok: true; value: number }
  | { ok: false; error: IpParseError };

/** 掩码解析失败的具体原因。 */
export type MaskParseError =
  | { kind: 'format'; message: string }
  | { kind: 'range'; message: string }
  | { kind: 'discontinuous'; message: string };

export type MaskParseResult =
  | { ok: true; value: number }
  | { ok: false; error: MaskParseError };

/** IPv6 形态特征：包含冒号。 */
const IPV6_HINT = /:/;

/**
 * 详细解析点分十进制 IPv4 地址。
 * 能识别 IPv6 格式并返回明确错误类型，供 UI 给出教学提示。
 */
export function parseIpDetailed(input: string): IpParseResult {
  const raw = input.trim();
  if (raw.length === 0) {
    return {
      ok: false,
      error: { kind: 'empty', message: '请输入 IP 地址，例如 192.168.1.0' },
    };
  }
  if (IPV6_HINT.test(raw)) {
    return {
      ok: false,
      error: {
        kind: 'not_ipv4',
        message: '检测到 IPv6 格式（地址中包含 “:”），本演示工具当前仅支持 IPv4 地址',
      },
    };
  }

  const parts = raw.split('.');
  if (parts.length !== 4) {
    return {
      ok: false,
      error: {
        kind: 'format',
        message: `IPv4 地址应由 4 段 0–255 的十进制数组成，当前解析到 ${parts.length} 段`,
      },
    };
  }

  let value = 0;
  for (let i = 0; i < 4; i++) {
    const seg = parts[i];
    if (!/^\d{1,3}$/.test(seg)) {
      return {
        ok: false,
        error: {
          kind: 'format',
          message: `第 ${i + 1} 段 “${seg}” 不是合法的十进制数字`,
        },
      };
    }
    const n = Number(seg);
    if (n > 255) {
      return {
        ok: false,
        error: {
          kind: 'range',
          segment: i + 1,
          message: `第 ${i + 1} 段的值 ${n} 超出了 0–255 的范围`,
        },
      };
    }
    value = ((value << 8) | n) >>> 0;
  }
  return { ok: true, value };
}

/** 简化接口：合法 IPv4 返回 32 位整数，否则返回 null。 */
export function parseIp(input: string): number | null {
  const result = parseIpDetailed(input);
  return result.ok ? result.value : null;
}

/** 单个 octet → 8 位二进制字符串（补零）。 */
export function octetToBinary(octet: number): string {
  return (octet & 0xff).toString(2).padStart(8, '0');
}

/** 32 位整数 → 32 位二进制字符串。 */
export function ipToBinary(ip: number): string {
  return ipToOctets(ip)
    .map(octetToBinary)
    .join('');
}

/** 32 位整数 → 4 个 octet 数组。 */
export function ipToOctets(ip: number): [number, number, number, number] {
  return [(ip >>> 24) & 0xff, (ip >>> 16) & 0xff, (ip >>> 8) & 0xff, ip & 0xff];
}

/** 32 位整数 → 点分十进制字符串。 */
export function ipToDotted(ip: number): string {
  return ipToOctets(ip).join('.');
}

/** 将前缀长度约束到 0–32 的安全整数。 */
function clampPrefix(prefix: number): number {
  if (!Number.isFinite(prefix)) return 0;
  return Math.min(32, Math.max(0, Math.trunc(prefix)));
}

/** 前缀长度 → 32 位掩码整数（连续 1 后跟连续 0）。prefix 为 0 时掩码为 0。 */
export function maskBits(prefix: number): number {
  const p = clampPrefix(prefix);
  // 注意：JS 位运算位移量按 32 取模，prefix=0 时 32-0=32 会被取模为 0，
  // 因此必须特判，否则会错误地得到全 1 掩码。
  return p === 0 ? 0 : ((0xffffffff << (32 - p)) >>> 0);
}

/** 前缀长度 → 点分十进制掩码，如 24 → "255.255.255.0"。 */
export function prefixToMask(prefix: number): string {
  return ipToDotted(maskBits(prefix));
}

/**
 * 详细解析点分十进制子网掩码并校验合法性。
 * 合法掩码必须是连续的 1 后跟连续的 0（如 255.0.255.0 非法），
 * 返回值为其前缀长度。
 */
export function parseMaskDetailed(input: string): MaskParseResult {
  const raw = input.trim();
  if (raw.length === 0) {
    return {
      ok: false,
      error: { kind: 'format', message: '请输入子网掩码，例如 255.255.255.0' },
    };
  }
  if (IPV6_HINT.test(raw)) {
    return {
      ok: false,
      error: { kind: 'format', message: '子网掩码应为 IPv4 点分十进制格式' },
    };
  }

  const parts = raw.split('.');
  if (parts.length !== 4) {
    return {
      ok: false,
      error: {
        kind: 'format',
        message: '子网掩码应由 4 段 0–255 的十进制数组成，如 255.255.255.0',
      },
    };
  }

  let value = 0;
  for (let i = 0; i < 4; i++) {
    const seg = parts[i];
    if (!/^\d{1,3}$/.test(seg)) {
      return {
        ok: false,
        error: {
          kind: 'format',
          message: `掩码第 ${i + 1} 段 “${seg}” 不是合法的十进制数字`,
        },
      };
    }
    const n = Number(seg);
    if (n > 255) {
      return {
        ok: false,
        error: {
          kind: 'range',
          message: `掩码第 ${i + 1} 段的值 ${n} 超出了 0–255 的范围`,
        },
      };
    }
    value = ((value << 8) | n) >>> 0;
  }

  // 连续性校验：合法掩码取反后形如 0…011…1（低位连续 1），
  // 此时 (~v + 1) & ~v === 0；若不为 0 说明 1 不连续（如 255.0.255.0）。
  const inv = ~value >>> 0;
  if (inv !== 0 && (inv + 1) & inv) {
    return {
      ok: false,
      error: {
        kind: 'discontinuous',
        message: '子网掩码必须为连续的 1 后跟连续的 0（例如 255.0.255.0 是非法掩码）',
      },
    };
  }

  let prefix = 0;
  let v = value;
  while (v !== 0) {
    v = (v << 1) >>> 0;
    prefix++;
  }
  return { ok: true, value: prefix };
}

/** 掩码点分十进制 → 前缀长度；非法掩码返回 null。 */
export function maskToPrefix(mask: string): number | null {
  const result = parseMaskDetailed(mask);
  return result.ok ? result.value : null;
}

/** 计算 ip 所在前缀对应的网络地址（主机位清零）。 */
export function networkOf(ip: number, prefix: number): number {
  return (ip & maskBits(prefix)) >>> 0;
}

/** 计算 ip 所在前缀对应的广播地址（主机位全 1）。prefix=32 时即自身。 */
export function broadcastOf(ip: number, prefix: number): number {
  const net = networkOf(ip, prefix);
  const p = clampPrefix(prefix);
  // 同样需要特判：0xffffffff >>> 32 会因取模变成 >>> 0（不移动）。
  return p >= 32 ? net : (net | (0xffffffff >>> p)) >>> 0;
}

/** 前缀对应的主机位数。 */
export function hostBitsOf(prefix: number): number {
  return 32 - clampPrefix(prefix);
}

/** 前缀对应的地址块大小（该网段内总地址数，含网络地址与广播地址）。 */
export function blockSizeOf(prefix: number): number {
  return 2 ** hostBitsOf(prefix);
}

/** 前缀对应的可用主机数（统一口径 2^h − 2，最小为 0）。 */
export function usableHostsOf(prefix: number): number {
  return Math.max(0, blockSizeOf(prefix) - 2);
}
