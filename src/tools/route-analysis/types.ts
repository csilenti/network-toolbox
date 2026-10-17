/**
 * 路由表分析器 —— UI 共享类型与数据模型。
 *
 * 数据模型与任务要求第八节一一对应；错误均为结构化对象，
 * 供 UI 渲染教学化中文提示。
 */

/** 路由类型（任务要求第八节枚举）。 */
export type RouteType = '直连' | '静态' | 'OSPF' | 'RIP' | 'BGP';

/** 路由表条目。network 恒为归一化后的网络地址（点分十进制）。 */
export interface RouteEntry {
  /** 表内唯一 id，同时决定「同前缀同 metric 时取表中靠前」的顺序。 */
  id: number;
  /** 归一化后的网络地址（点分十进制），如 192.168.1.0。 */
  network: string;
  /** CIDR 前缀长度 0~32。 */
  prefix: number;
  /** 出接口名，如 eth0。 */
  interfaceName: string;
  /** 下一跳地址；直连为 null。 */
  nextHop: string | null;
  /** 路由类型。 */
  type: RouteType;
  /** metric（优先级），非负整数，越小越优。 */
  metric: number;
}

/** 单条路由的匹配判定结果（任务要求第八节 MatchStep）。 */
export interface MatchStep {
  /** 对应的路由条目 id。 */
  routeId: number;
  /** 是否匹配（目的 IP AND 掩码 === 网络地址）。 */
  matched: boolean;
  /** 目的 IP AND 掩码 的结果（点分十进制）。 */
  andResult: string;
  /** 一句话判定原因；不匹配时包含 AND 结果与网络地址两个值。 */
  reason: string;
}

/** 一次查询的完整结果（任务要求第八节 QueryResult）。winner 为 null 表示不可达。 */
export interface QueryResult {
  /** 全部条目逐条判定（与路由表同序）。 */
  steps: MatchStep[];
  /** 决赛圈 routeId（进入候选集的条目，按表中顺序）。 */
  finalists: number[];
  /** 胜出路由；null = 目的网络不可达。 */
  winner: RouteEntry | null;
  /** 胜出原因（最长前缀 / metric 最小 / 表中靠前 / 不可达原因）。 */
  winnerReason: string;
}

/** 路由条目网络输入的解析错误（discriminated union）。 */
export type RouteInputError =
  | { kind: 'format'; message: string }
  | { kind: 'ip'; message: string }
  | { kind: 'mask'; message: string }
  | { kind: 'prefix'; message: string };

/**
 * 路由条目网络输入的解析结果。
 * normalized 为 true 表示输入的主机位不为 0、已被归一化为网络地址
 * （教学提示，非错误）；normalizedFrom 记录归一化前的原始写法。
 */
export type RouteInputResult =
  | {
      ok: true;
      /** 归一化后的网络地址（点分十进制）。 */
      network: string;
      /** 前缀长度 0~32。 */
      prefix: number;
      /** 是否发生了归一化。 */
      normalized: boolean;
      /** 归一化前的原始地址写法；未归一化时为空字符串。 */
      normalizedFrom: string;
    }
  | { ok: false; error: RouteInputError };

/** metric 输入的校验结果。 */
export type MetricCheckResult =
  | { ok: true; metric: number }
  | { ok: false; message: string };

/** 匹配过程详解的单步数据（任务要求第七节）。 */
export interface RouteStepData {
  /** 步骤标题，如「掩码展开」。 */
  title: string;
  /** 步骤正文（中文说明，含关键数值）。 */
  detail: string;
  /** 可选的二进制串展示行。 */
  binary?: string;
}
