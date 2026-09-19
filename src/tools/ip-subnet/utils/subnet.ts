/**
 * 子网划分核心算法（纯函数，无任何 UI 依赖）。
 *
 * 两种划分模式：
 *  - 'count'：需要 N 个子网 → 借位 n = ceil(log2(N))，新前缀 = prefix + n
 *  - 'hosts'：每子网需 H 台可用主机 → 主机位 h 取最小的满足 2^h − 2 ≥ H 的值，
 *             新前缀 = 32 − h（H ≤ 2 时 h = 2，教学口径统一按 2^h − 2 计算）
 *
 * 所有错误均为结构化的 discriminated union，UI 据此渲染教学化中文解释。
 */
import { broadcastOf, ipToBinary, networkOf } from './ip';

export type DivideMode = 'count' | 'hosts';

/** 教学演示上限：最多渲染 256 个子网（借位 ≤ 8 bit）。 */
export const MAX_TEACHING_SUBNETS = 256;

export interface SubnetEntry {
  /** 0 起始的子网序号（UI 层显示为 index + 1）。 */
  index: number;
  /** 子网网络地址（主机位全 0）。 */
  network: number;
  /** 第一个可用主机地址；无可用主机（/31、/32）时为 null。 */
  first: number | null;
  /** 最后一个可用主机地址；无可用主机时为 null。 */
  last: number | null;
  /** 广播地址（主机位全 1）。 */
  broadcast: number;
  /** 可用主机数（2^h − 2 口径，最小 0）。 */
  usableHosts: number;
  /** 该子网网络地址的 32 位二进制串，供详情面板做分段着色。 */
  binary: string;
}

export interface DivisionSuccess {
  mode: DivideMode;
  /** 用户输入的需求值（count: 子网数；hosts: 每子网主机数）。 */
  requestedValue: number;
  /** 用户原始输入的 IP（未归一化）。 */
  rawIp: number;
  /** 归一化后的基准网络地址（划分以此为基准）。 */
  baseNetwork: number;
  /** 原始 IP 是否包含非 0 主机位（即发生过归一化）。 */
  normalized: boolean;
  /** 原始前缀。 */
  basePrefix: number;
  /** 借位后的新前缀。 */
  newPrefix: number;
  /** 借用的 bit 数（newPrefix − basePrefix）。 */
  borrowedBits: number;
  /** 每个子网剩余的主机位数（32 − newPrefix）。 */
  hostBits: number;
  /** 需求口径下的子网数（count: 用户输入 N；hosts: 实际可划出数量）。 */
  requestedSubnets: number;
  /** 实际生成的子网数 = 2^borrowedBits（count 模式下可能大于 N，取 2 的幂）。 */
  actualSubnets: number;
  /** 每个子网的地址块大小 = 2^hostBits（含网络地址与广播地址）。 */
  blockSize: number;
  /** 每个子网的可用主机数。 */
  usableHosts: number;
  /** 特殊前缀（/31、/32）的教学说明，无则为 null。 */
  note: string | null;
  /** 子网明细列表。 */
  subnets: SubnetEntry[];
}

export type DivideError =
  | { kind: 'invalid_ip'; message: string }
  | { kind: 'invalid_prefix'; message: string }
  | { kind: 'invalid_value'; message: string }
  | {
      kind: 'not_enough_bits';
      /** 当前可借出的主机位数。 */
      availableBits: number;
      /** 完成划分需要借的位数。 */
      requestedBits: number;
      /** 用户请求的子网数。 */
      requestedSubnets: number;
      /** 当前网络最多能划出的子网数。 */
      maxSubnets: number;
      message: string;
    }
  | {
      kind: 'too_many_subnets';
      /** 按需求将产生的子网总数。 */
      requestedSubnets: number;
      /** 需要借的位数。 */
      borrowedBits: number;
      message: string;
    }
  | {
      kind: 'hosts_exceed_capacity';
      /** 用户请求的每子网主机数。 */
      requestedHosts: number;
      /** 当前网络最多能容纳的可用主机数。 */
      maxHosts: number;
      /** 当前网络的主机位数。 */
      availableHostBits: number;
      message: string;
    };

export type DivideResult =
  | { ok: true; result: DivisionSuccess }
  | { ok: false; error: DivideError };

export interface DivideInput {
  /** 已解析为 32 位整数的 IP 地址。 */
  ip: number;
  /** 前缀长度 0–32。 */
  prefix: number;
  mode: DivideMode;
  /** count 模式下为子网数量；hosts 模式下为每子网所需主机数。 */
  value: number;
}

const fail = (error: DivideError): DivideResult => ({ ok: false, error });

/**
 * 子网划分主入口。
 * 输入未做 UI 层的范围裁剪（如 256 上限），本函数自行校验并返回结构化错误，
 * 保证算法层在任何输入下都不抛异常。
 */
export function divideSubnets(input: DivideInput): DivideResult {
  const { ip, mode } = input;
  const prefix = Math.trunc(input.prefix);
  const value = Math.trunc(input.value);

  // ---- 基础校验 ----
  if (!Number.isInteger(ip) || ip < 0 || ip > 0xffffffff) {
    return fail({
      kind: 'invalid_ip',
      message: 'IP 地址不是合法的 IPv4 数值，请检查输入',
    });
  }
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return fail({
      kind: 'invalid_prefix',
      message: `前缀长度必须在 0–32 之间，当前为 ${prefix}`,
    });
  }
  if (!Number.isInteger(value) || value < 1) {
    return fail({
      kind: 'invalid_value',
      message:
        mode === 'count'
          ? '子网数量必须为不小于 1 的整数'
          : '每子网所需主机数必须为不小于 1 的整数',
    });
  }

  let newPrefix: number;
  let borrowedBits: number;
  let requestedSubnets: number;
  let actualSubnets: number;

  if (mode === 'count') {
    // ---- 按子网数量划分 ----
    // ceil(log2(N))，并用整数比较兜底消除浮点误差（如 log2(8) = 2.999...）
    let bits = Math.ceil(Math.log2(value));
    while (2 ** bits < value) bits++;

    const availableBits = 32 - prefix;
    if (bits > availableBits) {
      const maxSubnets = 2 ** availableBits;
      return fail({
        kind: 'not_enough_bits',
        availableBits,
        requestedBits: bits,
        requestedSubnets: value,
        maxSubnets,
        message:
          `当前网络 /${prefix} 只剩 ${availableBits} 个主机位可以借出，` +
          `但你要求划分 ${value} 个子网，需要借用 ${bits} 个 bit，` +
          `而当前网络最多只能划出 ${maxSubnets} 个子网，因此无法完成划分。` +
          '可以尝试减少子网数量，或从前缀更短（更大）的网络开始划分。',
      });
    }
    if (2 ** bits > MAX_TEACHING_SUBNETS) {
      return fail({
        kind: 'too_many_subnets',
        requestedSubnets: 2 ** bits,
        borrowedBits: bits,
        message:
          `划分 ${value} 个子网需要借用 ${bits} 个 bit，将产生 ${2 ** bits} 个子网，` +
          `超出了本教学演示的上限（${MAX_TEACHING_SUBNETS} 个）。` +
          '教学场景下建议将子网数量控制在 256 以内（借位 ≤ 8 bit）。',
      });
    }
    newPrefix = prefix + bits;
    borrowedBits = bits;
    requestedSubnets = value;
    actualSubnets = 2 ** bits;
  } else {
    // ---- 按每子网所需主机数划分 ----
    // 找最小的 h 使 2^h − 2 ≥ value；value ≤ 2 时自然停在 h = 2
    //（2^1 − 2 = 0 不够任何需求，教学口径统一按 2^h − 2 计算）
    let h = 1;
    while (2 ** h - 2 < value) h++;

    const availableHostBits = 32 - prefix;
    if (h > availableHostBits) {
      const maxHosts = Math.max(0, 2 ** availableHostBits - 2);
      return fail({
        kind: 'hosts_exceed_capacity',
        requestedHosts: value,
        maxHosts,
        availableHostBits,
        message:
          `当前网络 /${prefix} 只有 ${availableHostBits} 个主机位，` +
          `最多容纳 ${maxHosts} 台可用主机，无法满足每子网 ${value} 台的需求。` +
          '若要容纳这么多主机，需要更大的地址块（超网，前缀短于 ' +
          `${prefix}）才能完成划分。`,
      });
    }

    newPrefix = 32 - h;
    borrowedBits = newPrefix - prefix;
    actualSubnets = 2 ** borrowedBits;
    if (actualSubnets > MAX_TEACHING_SUBNETS) {
      return fail({
        kind: 'too_many_subnets',
        requestedSubnets: actualSubnets,
        borrowedBits,
        message:
          `按每子网 ${value} 台主机划分，将在 /${prefix} 的基础上借用 ${borrowedBits} 个 bit，` +
          `产生 ${actualSubnets} 个子网，超出了教学演示的上限（${MAX_TEACHING_SUBNETS} 个）。` +
          '可以尝试增大每子网主机数，或选用前缀更长的网络。',
      });
    }
    requestedSubnets = actualSubnets;
  }

  // ---- 归一化：IP 若不是该前缀的网络地址（主机位非 0），以网络地址为基准 ----
  const baseNetwork = networkOf(ip, prefix);
  const normalized = baseNetwork !== ip;

  const hostBits = 32 - newPrefix;
  const blockSize = 2 ** hostBits;
  const usable = Math.max(0, blockSize - 2);
  const step = 2 ** (32 - newPrefix);

  // ---- 逐个子网生成明细：network = base + i × 2^(32 − newPrefix) ----
  const subnets: SubnetEntry[] = [];
  for (let i = 0; i < actualSubnets; i++) {
    const network = (baseNetwork + i * step) >>> 0;
    subnets.push({
      index: i,
      network,
      first: usable > 0 ? network + 1 : null,
      last: usable > 0 ? network + step - 2 : null,
      broadcast: network + step - 1,
      usableHosts: usable,
      binary: ipToBinary(network),
    });
  }

  let note: string | null = null;
  if (newPrefix === 31) {
    note =
      '新前缀为 /31：按 2^h − 2 口径计算可用主机数为 0（点对点链路的 /31 约定不在本演示范围内）。';
  } else if (newPrefix === 32) {
    note = '新前缀为 /32：主机位为 0 位，这是一个单主机地址，可用主机数为 0。';
  }

  return {
    ok: true,
    result: {
      mode,
      requestedValue: value,
      rawIp: ip,
      baseNetwork,
      normalized,
      basePrefix: prefix,
      newPrefix,
      borrowedBits,
      hostBits,
      requestedSubnets,
      actualSubnets,
      blockSize,
      usableHosts: usable,
      note,
      subnets,
    },
  };
}

/** 便捷导出：广播地址计算（供 UI 校验/演示复用）。 */
export { broadcastOf };
