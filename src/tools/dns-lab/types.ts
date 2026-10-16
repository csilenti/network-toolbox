/**
 * DNS 域名解析演示 —— 状态机类型定义（需求第二十八节）。
 *
 * 设计原则（需求第二十九节）：整个解析过程被抽象为结构化步骤数组 buildSteps()，
 * UI 完全由「当前步骤索引」驱动渲染，动画层只负责表现当前状态，
 * 业务逻辑中禁止出现 setTimeout 嵌套。
 */

/** DNS 记录类型（本工具演示范围）。 */
export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'NS';

/** 一条 DNS 资源记录。 */
export interface DnsRecord {
  /** 记录所有者名称（域名）。 */
  name: string;
  /** 记录类型。 */
  type: DnsRecordType;
  /** 记录值（IP / 目标域名 / 权威服务器名）。 */
  value: string;
  /** 生存时间（秒）；缺省按 3600 处理。 */
  ttl?: number;
}

/** 查询路径拓扑中的节点类型。 */
export type DnsServerType =
  | 'client'
  | 'browser_cache'
  | 'os_cache'
  | 'recursive'
  | 'root'
  | 'tld'
  | 'authoritative';

/** 查询路径上的一个节点（客户端 / 本地缓存 / DNS 服务器）。 */
export interface DnsServer {
  /** 节点唯一 id（与 type 一致，便于查找）。 */
  id: DnsServerType;
  /** 节点类型。 */
  type: DnsServerType;
  /** 展示名（中文）。 */
  name: string;
  /** 副标题（英文 / 说明）。 */
  subtitle: string;
  /** 图标 emoji。 */
  emoji: string;
}

/** DNS 报文（教学模拟：字段符合真实 DNS 协议概念，但不做真实编码）。 */
export interface DnsPacket {
  /** 事务 ID（16 进制展示），响应与对应查询相同。 */
  transactionId: string;
  /** Flags 字段（16 进制展示，如 0x0100 / 0x8180）。 */
  flags: string;
  /** 是否为响应报文。 */
  isResponse: boolean;
  /** Questions 计数。 */
  questions: number;
  /** 查询名 QNAME。 */
  qname: string;
  /** 查询类型 QTYPE。 */
  qtype: DnsRecordType;
  /** 查询类 QCLASS。 */
  qclass: 'IN';
  /** Answers 计数（响应报文）。 */
  answers?: number;
  /** 记录 TTL（响应报文）。 */
  ttl?: number;
  /** 记录数据（响应报文，如 IP 地址）。 */
  data?: string;
  /** Referral 语义：Authority 区指向的下一级服务器（Referral 响应）。 */
  authority?: string;
  /** Referral 语义：Additional 区附加信息说明（Referral 响应）。 */
  additional?: string;
}

/** 步骤交互类型：查询 / 响应 / 本地缓存检查 / 结果落定。 */
export type DnsStepType = 'query' | 'response' | 'cache' | 'result';

/** 步骤所属阶段（同时用于区分递归查询段与迭代查询段，需求第十五节）。 */
export type DnsPhase =
  | 'input'
  | 'cache-check'
  | 'recursive-query'
  | 'iterative-query'
  | 'return'
  | 'cache-result';

/** 趣味对话（仅帮助理解角色关系，并非真实 DNS 报文内容）。 */
export interface DnsDialogue {
  /** 说话者名称。 */
  speaker: string;
  /** 头像 emoji。 */
  emoji: string;
  /** 台词。 */
  text: string;
}

/** 状态机单步：DNS 解析过程的一个原子动作。 */
export interface DnsStep {
  /** 步骤唯一 id，同时作为 React key 与动画重放锚点。 */
  id: string;
  /** 步骤标题。 */
  title: string;
  /** 所属阶段。 */
  phase: DnsPhase;
  /** 发起方节点。 */
  source: DnsServerType;
  /** 接收方节点（source === target 表示无传输的纯状态步骤）。 */
  target: DnsServerType;
  /** 交互类型。 */
  type: DnsStepType;
  /** 本步报文；缓存检查 / 纯状态步骤为 null。 */
  packet: DnsPacket | null;
  /** 「当前发生了什么」教学解释。 */
  explanation: string;
  /** 趣味对话（一到两句，可为空）。 */
  dialogue: readonly DnsDialogue[];
  /** 可选 💡 教学提示。 */
  tip: string | null;
  /** 时间轴序号图标（①②…，对应需求第二十六节的八段式时间线）。 */
  timelineIcon: string;
  /** 时间轴名称。 */
  timelineLabel: string;
  /** 节点旁留痕用的短标签（如 Referral → .com）。 */
  shortTag: string;
  /** 是否为缓存命中相关步骤。 */
  cacheHit: boolean;
}

/** 视图模式：学习模式 / 协议模式（共用同一套状态机）。 */
export type ViewMode = 'learn' | 'protocol';

/** 播放速度倍率（需求第二十五节：0.5× ~ 4×）。 */
export type SpeedOption = 0.5 | 1 | 2 | 4;

/** 缓存 TTL 的模拟时间加速倍率（需求第二十节）。 */
export type TimeScaleOption = 1 | 10 | 100;

/** 客户端侧缓存中的一条记录（含 TTL 倒计时）。 */
export interface CacheEntry {
  /** 缓存的域名。 */
  domain: string;
  /** 缓存的资源记录。 */
  record: DnsRecord;
  /** 剩余 TTL（模拟秒，按时间加速倍率递减）。 */
  remaining: number;
  /** 写入时的总 TTL。 */
  total: number;
}

/** 阶段中文名（StepExplanation 顶部徽标）。 */
export const PHASE_LABELS: Record<DnsPhase, string> = {
  input: '输入域名',
  'cache-check': '本地缓存检查',
  'recursive-query': '递归查询 · 客户端 → 递归 DNS',
  'iterative-query': '迭代查询 · 递归 DNS → 各级服务器',
  return: '返回结果 · 递归 → 客户端',
  'cache-result': '解析完成',
};
