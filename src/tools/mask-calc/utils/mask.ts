/**
 * 子网掩码计算器 —— 核心计算层（纯函数，无任何 UI 依赖）。
 *
 * 地址与掩码在内部统一以 32 位无符号整数表示（number，0 ~ 2^32 − 1），
 * 全程使用 >>> / | / & 等无符号安全位运算，不依赖浮点边界；
 * 超出 32 位的总量（/0 的 2^32）恰在 Number.MAX_SAFE_INTEGER 之内。
 *
 * 尽量复用 ip-subnet 的纯函数（parseIpDetailed / prefixToMask / maskBits /
 * networkOf / broadcastOf 等），缺失的能力（掩码合法性校验出口、
 * 最近似掩码建议、/31 /32 /0 边界口径、地址类别与私有标记）在本目录实现。
 */
import {
  broadcastOf,
  ipToDotted,
  ipToOctets,
  maskBits,
  networkOf,
  octetToBinary,
  parseIpDetailed,
  parseMaskDetailed,
  prefixToMask,
} from '../../ip-subnet/utils/ip';
import type { CalcError, MaskError, MaskInfo, SubnetInfo, SubnetResult } from '../types';

/** 掩码合法性判断：合法掩码 = 四段 0~255 且二进制为连续 1 后跟连续 0。 */
export function isValidMask(mask: string): boolean {
  return parseMaskDetailed(mask).ok;
}

/**
 * 为「位不连续」等非法掩码给出最近似的合法掩码建议。
 * 策略：按合法段拼出 32 位整数，统计 1 的个数 k，返回第 k 位前缀对应的
 * 合法掩码（如 255.0.255.0 → 16 个 1 → 255.255.0.0）。
 * 若格式本身已无法解释（缺段 / 非数字 / 超 255），返回 null。
 */
export function suggestNearestMask(mask: string): string | null {
  const parts = mask.trim().split('.');
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = ((value << 8) | n) >>> 0;
  }

  // Brian Kernighan 逐个清除最低位的 1，循环次数即 1 的个数
  let ones = 0;
  let v = value;
  while (v !== 0) {
    v &= v - 1;
    ones++;
  }
  return prefixToMask(ones);
}

/**
 * 点分十进制掩码 → CIDR 前缀。
 * 成功返回 0~32 的前缀；失败返回结构化错误（含教学化中文提示，
 * 位不连续时附最近似合法掩码建议）。
 */
export function maskToPrefix(mask: string): number | { error: MaskError } {
  const result = parseMaskDetailed(mask);
  if (result.ok) return result.value;

  const err = result.error;
  if (err.kind === 'discontinuous') {
    const suggestion = suggestNearestMask(mask);
    return {
      error: {
        kind: 'discontinuous',
        message: '掩码必须是连续的 1 后跟连续的 0',
        suggestion: suggestion ?? '255.255.255.0',
      },
    };
  }
  if (err.kind === 'range') {
    return {
      error: {
        kind: 'range',
        message: '掩码每段的取值范围是 0~255，请检查超出范围的段',
      },
    };
  }
  return {
    error: {
      kind: 'format',
      message: '掩码格式不正确，应为 4 段 0~255 的十进制数，例如 255.255.255.0',
    },
  };
}

/** 前缀 → 掩码三要素（点分掩码 / 通配符 / 二进制）。prefix 由调用方保证在 0~32。 */
export function maskInfoOf(prefix: number): MaskInfo {
  const p = Math.min(32, Math.max(0, Math.trunc(prefix)));
  const maskInt = maskBits(p);
  const wildcardInt = (~maskInt) >>> 0;
  return {
    prefix: p,
    mask: prefixToMask(p),
    wildcard: ipToDotted(wildcardInt),
    binary: ipToOctets(maskInt)
      .map(octetToBinary)
      .join('.'),
  };
}

/** 按 IP 首八位判定地址类别（classful，仅作参考展示）。 */
function classifyIp(ip: number): { ipClass: SubnetInfo['ipClass']; classNote: string } {
  const first = (ip >>> 24) & 0xff;
  if (first <= 127) {
    return {
      ipClass: 'A',
      classNote: '首八位 0–127，历史上面向超大型网络（默认掩码 /8）',
    };
  }
  if (first <= 191) {
    return {
      ipClass: 'B',
      classNote: '首八位 128–191，历史上面向中型网络（默认掩码 /16）',
    };
  }
  if (first <= 223) {
    return {
      ipClass: 'C',
      classNote: '首八位 192–223，历史上面向小型网络（默认掩码 /24）',
    };
  }
  if (first <= 239) {
    return {
      ipClass: 'D',
      classNote: '首八位 224–239，为组播保留，不分配给主机',
    };
  }
  return {
    ipClass: 'E',
    classNote: '首八位 240–255，为实验用途保留',
  };
}

/** 判定 RFC 1918 私有地址与 127/8 回环地址，并给出中文说明。 */
function privateInfoOf(ip: number): { isPrivate: boolean; privateNote?: string } {
  const o = ipToOctets(ip);
  const [a, b] = o;
  if (a === 10) {
    return { isPrivate: true, privateNote: 'RFC 1918 私有地址（10.0.0.0/8），仅限内网使用，不会在公网路由' };
  }
  if (a === 172 && b >= 16 && b <= 31) {
    return { isPrivate: true, privateNote: 'RFC 1918 私有地址（172.16.0.0/12），仅限内网使用，不会在公网路由' };
  }
  if (a === 192 && b === 168) {
    return { isPrivate: true, privateNote: 'RFC 1918 私有地址（192.168.0.0/16），仅限内网使用，不会在公网路由' };
  }
  if (a === 127) {
    return { isPrivate: true, privateNote: '回环地址（127.0.0.0/8），指向本机自身，最常见的是 127.0.0.1' };
  }
  return { isPrivate: false };
}

/**
 * 由 32 位整数 IP 与前缀计算网段完整档案（严格按第六节边界规则）：
 *  - 普通前缀（/1~/30）：usable = 2^(32-prefix) − 2，范围 = 网络地址+1 ~ 广播地址−1
 *  - /31（RFC 3021）：usable = 2，范围 = 两个地址本身
 *  - /32（单主机路由）：usable = 1，范围 = 该地址本身，通配符 0.0.0.0
 *  - /0：mask 0.0.0.0，网络 0.0.0.0，广播 255.255.255.255，usable = 2^32 − 2
 */
export function calcSubnetFromInt(ip: number, prefix: number): { info: SubnetInfo; maskInfo: MaskInfo } {
  const p = Math.min(32, Math.max(0, Math.trunc(prefix)));
  const net = networkOf(ip, p);
  const bcast = broadcastOf(ip, p);
  const totalHosts = 2 ** (32 - p);

  let usableHosts: number;
  let firstInt: number;
  let lastInt: number;
  if (p === 31) {
    // RFC 3021 点对点链路：不扣除网络 / 广播，两个地址都可用
    usableHosts = 2;
    firstInt = net;
    lastInt = bcast;
  } else if (p === 32) {
    // 单主机路由：唯一的地址即主机自身
    usableHosts = 1;
    firstInt = ip;
    lastInt = ip;
  } else {
    usableHosts = totalHosts - 2;
    firstInt = net + 1;
    lastInt = bcast - 1;
  }

  const { ipClass, classNote } = classifyIp(ip);
  const { isPrivate, privateNote } = privateInfoOf(ip);

  const info: SubnetInfo = {
    network: ipToDotted(net),
    broadcast: ipToDotted(bcast),
    totalHosts,
    usableHosts,
    firstUsable: ipToDotted(firstInt),
    lastUsable: ipToDotted(lastInt),
    ipClass,
    classNote,
    isPrivate,
  };
  if (privateNote) info.privateNote = privateNote;

  return { info, maskInfo: maskInfoOf(p) };
}

/**
 * 由点分十进制 IP 文本与前缀计算网段完整档案。
 * IP 或前缀非法时返回结构化错误（教学化中文提示），绝不抛出异常。
 */
export function calcSubnet(ip: string, prefix: number): SubnetResult {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    const error: CalcError = {
      kind: 'invalid_prefix',
      message: '前缀范围 0~32，应为该区间内的整数',
    };
    return { ok: false, error };
  }

  const parsed = parseIpDetailed(ip);
  if (!parsed.ok) {
    const error: CalcError = parsed.error;
    return { ok: false, error };
  }

  const { info, maskInfo } = calcSubnetFromInt(parsed.value, prefix);
  return { ok: true, info, maskInfo };
}
