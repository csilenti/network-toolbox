/**
 * TCP 连接演示 —— 状态机类型定义。
 *
 * 设计原则（需求第二十五节）：整个 TCP 生命周期被抽象为结构化步骤数组，
 * UI 完全由「当前步骤索引」驱动渲染，动画只是渲染层的 CSS transition，
 * 业务逻辑中禁止出现 setTimeout 嵌套。
 */

/** TCP 端别角色：A = 客户端，B = 服务器。 */
export type TcpRole = 'A' | 'B';

/** TCP 连接生命周期阶段。 */
export type TcpPhase = 'handshake' | 'data' | 'teardown' | 'timewait';

/** 报文方向：A→B / B→A / 无报文（纯状态提示步骤）。 */
export type TcpDirection = 'a2b' | 'b2a' | 'none';

/** 视图模式：学习模式 / 协议模式（共用同一套状态机）。 */
export type ViewMode = 'learn' | 'protocol';

/** 播放速度倍率。 */
export type SpeedOption = 0.5 | 1 | 1.5 | 2;

/** TCP 首部标志位 + 数据标记。 */
export interface TcpFlags {
  /** 同步位：请求建立连接 / 同步初始序列号，消耗一个序列号。 */
  syn: boolean;
  /** 确认位：确认对端序列号，本身不消耗序列号。 */
  ack: boolean;
  /** 结束位：请求关闭发送方向，消耗一个序列号。 */
  fin: boolean;
  /** 是否携带应用数据（DATA），按字节数消耗序列号。 */
  data: boolean;
}

/** 单个步骤的报文信息（无报文步骤为 null）。 */
export interface TcpPacket {
  flags: TcpFlags;
  /** 序列号；纯状态提示步骤为 null。 */
  seq: number | null;
  /** 确认号；未确认任何序列号时为 null。 */
  ack: number | null;
  /** 载荷字节数。 */
  payloadLen: number;
}

/** 趣味对话（仅帮助理解，并非真实传输内容）。 */
export interface TcpDialogue {
  speaker: TcpRole;
  emoji: string;
  text: string;
}

/** 本演示涉及的 TCP 状态名。 */
export type TcpStateName =
  | 'CLOSED'
  | 'LISTEN'
  | 'SYN-SENT'
  | 'SYN-RECEIVED'
  | 'ESTABLISHED'
  | 'FIN-WAIT-1'
  | 'FIN-WAIT-2'
  | 'CLOSE-WAIT'
  | 'LAST-ACK'
  | 'TIME-WAIT';

/** 单个步骤中的状态迁移。 */
export interface TcpStateChange {
  role: TcpRole;
  from: TcpStateName;
  to: TcpStateName;
}

/** 教学提示（💡 只在关键知识点出现）。 */
export interface TcpTip {
  title: string;
  text: string;
}

/** 状态机单步：TCP 完整生命周期的一个原子动作。 */
export interface TcpStep {
  /** 步骤唯一 id，同时作为 React key 与动画重放的锚点。 */
  id: string;
  /** 所属阶段。 */
  phase: TcpPhase;
  /** 报文方向。 */
  direction: TcpDirection;
  /** 时间轴上的序号图标（①②…）。 */
  timelineIcon: string;
  /** 时间轴上的名称。 */
  timelineLabel: string;
  /** 本步报文；无报文步骤为 null。 */
  packet: TcpPacket | null;
  /** 本步触发的双方状态迁移。 */
  stateChanges: TcpStateChange[];
  /** 「当前发生了什么」解释文案。 */
  explanation: string;
  /** 趣味对话；无报文步骤可为 null。 */
  dialogue: TcpDialogue | null;
  /** 可选教学提示。 */
  tip: TcpTip | null;
  /** 无报文步骤的横幅文案（如 🔗 TCP 连接建立）。 */
  banner: string | null;
}

/** 双方初始状态：A 从 CLOSED 开始，B 从 LISTEN 开始。 */
export const INITIAL_STATES: Record<TcpRole, TcpStateName> = {
  A: 'CLOSED',
  B: 'LISTEN',
};

/** 双方完整状态链（StateTracker 渲染顺序，与需求第九节一致）。 */
export const STATE_CHAINS: Record<TcpRole, readonly TcpStateName[]> = {
  A: ['CLOSED', 'SYN-SENT', 'ESTABLISHED', 'FIN-WAIT-1', 'FIN-WAIT-2', 'TIME-WAIT', 'CLOSED'],
  B: ['LISTEN', 'SYN-RECEIVED', 'ESTABLISHED', 'CLOSE-WAIT', 'LAST-ACK', 'CLOSED'],
};

/** 阶段中文名。 */
export const PHASE_LABELS: Record<TcpPhase, string> = {
  handshake: '建立连接 · 三次握手',
  data: '数据传输',
  teardown: '断开连接 · 四次挥手',
  timewait: 'TIME_WAIT 等待',
};
