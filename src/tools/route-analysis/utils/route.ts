/**
 * 路由表分析器 —— 核心计算层（纯函数，无任何 UI 依赖）。
 *
 * 匹配判定严格按任务要求第六节的三级规则实现：
 *  1. 匹配筛选：(目的IP AND 掩码) === 网络地址，使用无符号 32 位位运算；
 *  2. 最长前缀：候选集中前缀最大者胜出；
 *  3. metric 决胜：同前缀多条时 metric 最小者胜出，metric 相同取表中靠前者
 *     并标记「等价路由」；
 *  4. 无候选集：winner = null，报「目的网络不可达」并附默认路由教学提示。
 *
 * 复用 ip-subnet 的纯函数（parseIpDetailed / maskBits / prefixToMask /
 * networkOf / ipToDotted 等），只 import 不修改；本工具特有的
 * 路由条目解析（归一化）、metric 校验、三级判定与分步数据在本目录实现。
 */
import {
  ipToDotted,
  ipToOctets,
  maskBits,
  networkOf,
  octetToBinary,
  parseIpDetailed,
  parseMaskDetailed,
  prefixToMask,
} from '../../ip-subnet/utils/ip';
import type {
  MatchStep,
  MetricCheckResult,
  QueryResult,
  RouteEntry,
  RouteInputError,
  RouteInputResult,
  RouteStepData,
  RouteType,
} from '../types';

/** 预设教学路由表（任务要求第三节，id 1~6，页面加载即呈现，可恢复默认）。 */
export const DEFAULT_ROUTES: RouteEntry[] = [
  { id: 1, network: '0.0.0.0', prefix: 0, interfaceName: 'eth0', nextHop: '192.168.1.1', type: '静态', metric: 10 },
  { id: 2, network: '192.168.1.0', prefix: 24, interfaceName: 'eth0', nextHop: null, type: '直连', metric: 0 },
  { id: 3, network: '192.168.1.0', prefix: 25, interfaceName: 'eth1', nextHop: null, type: '直连', metric: 0 },
  { id: 4, network: '10.0.0.0', prefix: 8, interfaceName: 'eth2', nextHop: '10.0.0.1', type: '静态', metric: 10 },
  { id: 5, network: '172.16.5.0', prefix: 24, interfaceName: 'eth3', nextHop: '172.16.5.1', type: 'OSPF', metric: 110 },
  { id: 6, network: '192.168.1.128', prefix: 25, interfaceName: 'eth1', nextHop: null, type: '直连', metric: 0 },
];

/** 新增条目表单可选的路由类型。 */
export const ROUTE_TYPES: readonly RouteType[] = ['直连', '静态', 'OSPF', 'RIP', 'BGP'];

/**
 * 校验 metric 输入：必须为非负整数（0 表示最优）。
 * 严格十进制整数：拒绝 "-1"、"1.5"、全角数字与其它字符。
 */
export function validateMetric(raw: string): MetricCheckResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return { ok: false, message: 'metric 为空：请输入非负整数（0 表示最优）' };
  }
  if (!/^\d+$/.test(trimmed)) {
    return {
      ok: false,
      message: 'metric 应为非负整数，不接受负数、小数或其它字符（例如 0、10、110）',
    };
  }
  return { ok: true, metric: Number(trimmed) };
}

/** 归一化收尾：IP 合法 + 前缀合法 → 归一化网络地址与提示标记。 */
function finishRouteInput(ipPart: string, prefix: number): RouteInputResult {
  const ipResult = parseIpDetailed(ipPart);
  if (!ipResult.ok) {
    const error: RouteInputError = { kind: 'ip', message: ipResult.error.message };
    return { ok: false, error };
  }
  const networkInt = networkOf(ipResult.value, prefix);
  const normalized = networkInt !== ipResult.value;
  return {
    ok: true,
    network: ipToDotted(networkInt),
    prefix,
    normalized,
    normalizedFrom: normalized ? ipToDotted(ipResult.value) : '',
  };
}

/** 解析并校验前缀文本段（"24" 等），返回 0~32 的数字或错误。 */
function parsePrefixText(prefixPart: string): number | RouteInputError {
  if (!/^\d+$/.test(prefixPart)) {
    return { kind: 'prefix', message: '前缀范围 0~32，应为该区间内的整数' };
  }
  const n = Number(prefixPart);
  if (n > 32) {
    return { kind: 'prefix', message: `前缀 ${n} 超出范围：前缀范围 0~32` };
  }
  return n;
}

/**
 * 解析路由条目的目的网络输入，支持两种形式：
 *  - CIDR：        "192.168.1.0/24"
 *  - 地址 + 掩码：  "192.168.1.0 255.255.255.0"
 *
 * 校验：四段 0~255、掩码位连续、前缀 0~32；
 * 网络地址自动归一化（192.168.1.123/24 → 192.168.1.0/24，附提示标记）。
 */
export function parseRouteInput(raw: string): RouteInputResult {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return {
      ok: false,
      error: {
        kind: 'format',
        message: '请输入目的网络，例如 192.168.1.0/24 或 192.168.1.0 255.255.255.0',
      },
    };
  }

  if (trimmed.includes('/')) {
    const slashIndex = trimmed.indexOf('/');
    const ipPart = trimmed.slice(0, slashIndex).trim();
    const prefixResult = parsePrefixText(trimmed.slice(slashIndex + 1).trim());
    if (typeof prefixResult === 'number') {
      return finishRouteInput(ipPart, prefixResult);
    }
    return { ok: false, error: prefixResult };
  }

  const parts = trimmed.split(/\s+/);
  if (parts.length === 2) {
    const maskResult = parseMaskDetailed(parts[1]);
    if (!maskResult.ok) {
      return {
        ok: false,
        error: { kind: 'mask', message: maskResult.error.message },
      };
    }
    return finishRouteInput(parts[0], maskResult.value);
  }

  return {
    ok: false,
    error: {
      kind: 'format',
      message: '路由条目应为「网络地址/前缀」或「网络地址 掩码」两种形式之一，例如 192.168.1.0/24',
    },
  };
}

/** 候选集的可读描述，如 "{#1: /0, #2: /24, #6: /25}"。 */
function describeCandidates(ids: number[], routes: RouteEntry[]): string {
  const byId = new Map(routes.map((r) => [r.id, r]));
  const items = ids.map((id) => {
    const route = byId.get(id);
    return `#${id}: /${route ? route.prefix : '?'}`;
  });
  return `{${items.join(', ')}}`;
}

/**
 * 路由匹配查询（任务要求第六节三级判定的唯一实现，组件内禁止硬编码）。
 * 恒不抛出异常：目的 IP 非法或路由表条目非法时返回 winner = null 与教学化原因。
 */
export function queryRoute(ip: string, routes: RouteEntry[]): QueryResult {
  const ipResult = parseIpDetailed(ip);
  if (!ipResult.ok) {
    return {
      steps: [],
      finalists: [],
      winner: null,
      winnerReason: `目的 IP 非法：${ipResult.error.message}，无法进行路由匹配`,
    };
  }

  // ---- 第 1 级：匹配筛选（无符号 32 位位运算） ----
  const ipInt = ipResult.value;
  const steps: MatchStep[] = [];
  const candidates: RouteEntry[] = [];

  for (const entry of routes) {
    const netResult = parseIpDetailed(entry.network);
    if (!netResult.ok) {
      steps.push({
        routeId: entry.id,
        matched: false,
        andResult: '—',
        reason: `条目网络地址非法（${netResult.error.message}），该条目已跳过`,
      });
      continue;
    }
    const maskInt = maskBits(entry.prefix);
    const andInt = (ipInt & maskInt) >>> 0;
    const andDotted = ipToDotted(andInt);
    const maskDotted = prefixToMask(entry.prefix);
    const networkInt = netResult.value;

    if (andInt === networkInt) {
      steps.push({
        routeId: entry.id,
        matched: true,
        andResult: andDotted,
        reason: `${ip} AND ${maskDotted} = ${andDotted}，与网络地址 ${entry.network} 相等 → ✓ 匹配（前缀 ${entry.prefix}）`,
      });
      candidates.push(entry);
    } else {
      steps.push({
        routeId: entry.id,
        matched: false,
        andResult: andDotted,
        reason: `${ip} AND ${maskDotted} = ${andDotted}，与网络地址 ${entry.network} 不相等 → ✗ 不匹配（AND 结果 ${andDotted} ≠ 网络地址 ${entry.network}）`,
      });
    }
  }

  // ---- 无候选集：目的网络不可达 ----
  if (candidates.length === 0) {
    return {
      steps,
      finalists: [],
      winner: null,
      winnerReason:
        `路由表中没有任何条目匹配目的地址 ${ip} → 目的网络不可达。` +
        '0.0.0.0/0 默认路由可匹配任何目的地址，删除它之后就会出现这种不可达的情况，可点击「恢复默认」还原教学路由表。',
    };
  }

  const finalists = candidates.map((c) => c.id);
  const candidateDesc = describeCandidates(finalists, routes);

  // ---- 第 2 级：最长前缀 ----
  const maxPrefix = Math.max(...candidates.map((c) => c.prefix));
  const longest = candidates.filter((c) => c.prefix === maxPrefix);

  let winner: RouteEntry;
  let winnerReason: string;

  if (longest.length === 1) {
    winner = longest[0];
    winnerReason =
      `候选集 ${candidateDesc} 中前缀最长（/${maxPrefix}）且唯一 → 🏆 #${winner.id} 胜出（最长前缀匹配）`;
  } else {
    // ---- 第 3 级：metric 决胜 ----
    const minMetric = Math.min(...longest.map((c) => c.metric));
    const best = longest.filter((c) => c.metric === minMetric);
    if (best.length === 1) {
      winner = best[0];
      winnerReason =
        `候选集 ${candidateDesc} 中最长前缀 /${maxPrefix} 有 ${longest.length} 条，进入 metric 决胜：` +
        `metric 最小（${minMetric}）者胜出 → 🏆 #${winner.id} 胜出`;
    } else {
      // 同前缀同 metric：取表中靠前者（candidates 保持表序），标记等价路由
      winner = best[0];
      winnerReason =
        `候选集 ${candidateDesc} 中最长前缀 /${maxPrefix} 的多条条目 metric 相同（${minMetric}）→ 等价路由，` +
        `命中表中靠前的 🏆 #${winner.id}（真实路由器会在等价路由之间做负载均衡）`;
    }
  }

  return { steps, finalists, winner, winnerReason };
}

/**
 * 单条路由的 AND 比对分步数据（任务要求第七节第 1~3 步）。
 * IP 或条目网络非法时返回空数组（恒不抛出异常）。
 */
export function buildMatchSteps(ip: string, entry: RouteEntry): RouteStepData[] {
  const ipResult = parseIpDetailed(ip);
  const netResult = parseIpDetailed(entry.network);
  if (!ipResult.ok || !netResult.ok) return [];

  const maskDotted = prefixToMask(entry.prefix);
  const maskInt = maskBits(entry.prefix);
  const maskBinary = ipToOctets(maskInt)
    .map((octet) => octetToBinary(octet))
    .join('.');

  const andInt = (ipResult.value & maskInt) >>> 0;
  const andDotted = ipToDotted(andInt);
  const matched = andInt === netResult.value;

  return [
    {
      title: '掩码展开',
      detail: `条目 #${entry.id} ${entry.network}/${entry.prefix} 的掩码 /${entry.prefix} → ${maskDotted}`,
      binary: maskBinary,
    },
    {
      title: 'AND 运算',
      detail: `目的 IP ${ip} AND ${maskDotted} = ${andDotted}`,
    },
    {
      title: '比对网络地址',
      detail: matched
        ? `AND 结果 ${andDotted} 与条目网络地址 ${entry.network} 相等 → ✓ 匹配，前缀 ${entry.prefix}`
        : `AND 结果 ${andDotted} 与条目网络地址 ${entry.network} 不相等 → ✗ 不匹配`,
    },
  ];
}

/**
 * 胜出路由的完整分步数据（任务要求第七节第 1~4 步）：
 * 前三步为该条目的 AND 比对过程，第 4 步为决赛圈决胜说明。
 * 不可达（winner 为 null）时返回空数组。
 */
export function buildWinnerSteps(ip: string, result: QueryResult): RouteStepData[] {
  if (result.winner === null) return [];
  const base = buildMatchSteps(ip, result.winner);
  if (base.length === 0) return [];
  return [
    ...base,
    {
      title: '三级决胜',
      detail: `决赛圈 ${result.finalists.length} 条：${result.winnerReason}`,
    },
  ];
}
