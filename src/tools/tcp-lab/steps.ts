/**
 * TCP 连接演示 —— 核心状态机：结构化步骤数组。
 *
 * 完整流程（11 步）：
 *   三次握手（SYN / SYN+ACK / ACK）→ 连接建立
 *   → 数据传输（DATA / ACK）→ 四次挥手（FIN / ACK / FIN / ACK）
 *   → TIME_WAIT 等待 → CLOSED。
 *
 * Seq/Ack 逻辑（需求第二十六节）：
 *   - SYN 消耗一个序列号：A 的 SYN Seq=1000，B 回复 Ack=1001。
 *   - 纯 ACK 不消耗序列号：第三次握手 A 的 Seq 仍为 1001。
 *   - 数据按字节数消耗序列号：DATA Length=20 后 A 的下一序号 = 1001+20 = 1021。
 *   - FIN 消耗一个序列号：A 的 FIN Seq=1021，B 回复 Ack=1022。
 */
import { INITIAL_STATES } from './types';
import type { TcpPacket, TcpRole, TcpStateName, TcpStep } from './types';

/** 完整生命周期步骤数组（唯一数据源，UI 全部由此驱动）。 */
export const TCP_STEPS: readonly TcpStep[] = [
  {
    id: 'syn',
    phase: 'handshake',
    direction: 'a2b',
    timelineIcon: '①',
    timelineLabel: 'SYN',
    packet: { flags: { syn: true, ack: false, fin: false, data: false }, seq: 1000, ack: null, payloadLen: 0 },
    stateChanges: [{ role: 'A', from: 'CLOSED', to: 'SYN-SENT' }],
    explanation: 'A 主动请求建立连接：发送 SYN 报文，携带自己的初始序列号 Seq=1000，随后进入 SYN-SENT 状态。',
    dialogue: { speaker: 'A', emoji: '👋', text: '你好，我想和你建立 TCP 连接。' },
    tip: {
      title: '为什么？',
      text: 'SYN 用来同步双方的初始序列号。SYN 会消耗一个序列号，因此 B 回复时确认号 Ack=1000+1=1001。',
    },
    banner: null,
  },
  {
    id: 'syn-ack',
    phase: 'handshake',
    direction: 'b2a',
    timelineIcon: '②',
    timelineLabel: 'SYN+ACK',
    packet: { flags: { syn: true, ack: true, fin: false, data: false }, seq: 5000, ack: 1001, payloadLen: 0 },
    stateChanges: [{ role: 'B', from: 'LISTEN', to: 'SYN-RECEIVED' }],
    explanation: 'B 收到 SYN 后同意建立连接：回复 SYN+ACK，Ack=1001 确认 A 的序列号，同时带上自己的初始序列号 Seq=5000，进入 SYN-RECEIVED。',
    dialogue: { speaker: 'B', emoji: '🙂', text: '可以，我收到你的请求了，我也准备好了。' },
    tip: {
      title: '注意',
      text: 'B 把「确认」和「我也要同步」合并进同一个报文（SYN+ACK），这正是建立连接只需要三次交互的原因。',
    },
    banner: null,
  },
  {
    id: 'ack',
    phase: 'handshake',
    direction: 'a2b',
    timelineIcon: '③',
    timelineLabel: 'ACK',
    packet: { flags: { syn: false, ack: true, fin: false, data: false }, seq: 1001, ack: 5001, payloadLen: 0 },
    stateChanges: [
      { role: 'A', from: 'SYN-SENT', to: 'ESTABLISHED' },
      { role: 'B', from: 'SYN-RECEIVED', to: 'ESTABLISHED' },
    ],
    explanation: 'A 确认收到 B 的 SYN+ACK：发送 ACK，Ack=5001。A 随即进入 ESTABLISHED，B 收到后也进入 ESTABLISHED。',
    dialogue: { speaker: 'A', emoji: '👍', text: '好的，我也收到你的回复了，我们开始通信吧！' },
    tip: {
      title: '为什么？',
      text: '纯 ACK 本身不消耗序列号，所以 A 的 Seq 仍是 1001；Ack=5001 表示 B 的初始序列号 5000 已被确认。',
    },
    banner: null,
  },
  {
    id: 'established',
    phase: 'handshake',
    direction: 'none',
    timelineIcon: '🔗',
    timelineLabel: 'ESTABLISHED',
    packet: null,
    stateChanges: [],
    explanation: '三次握手完成，双方都处于 ESTABLISHED 状态：连接正式建立，可以开始传输数据了。',
    dialogue: null,
    tip: {
      title: '注意',
      text: '这里不是「发一次消息」就结束了 —— TCP 通过三次握手确认双方都具备发送和接收能力。',
    },
    banner: '🔗 TCP 连接建立',
  },
  {
    id: 'data',
    phase: 'data',
    direction: 'a2b',
    timelineIcon: '④',
    timelineLabel: 'DATA',
    packet: { flags: { syn: false, ack: false, fin: false, data: true }, seq: 1001, ack: null, payloadLen: 20 },
    stateChanges: [],
    explanation: '连接建立后 A 发送数据：DATA 报文 Seq=1001、Length=20，占用 20 个字节的序列号空间。',
    dialogue: { speaker: 'A', emoji: '📨', text: '那我给你发个消息。' },
    tip: {
      title: '注意',
      text: '数据按字节数消耗序列号：Length=20 使 A 的下一个序号变为 1001+20=1021。',
    },
    banner: null,
  },
  {
    id: 'data-ack',
    phase: 'data',
    direction: 'b2a',
    timelineIcon: '⑤',
    timelineLabel: 'ACK',
    packet: { flags: { syn: false, ack: true, fin: false, data: false }, seq: 5001, ack: 1021, payloadLen: 0 },
    stateChanges: [],
    explanation: 'B 确认收到数据：回复纯 ACK，Ack=1021（=1001+20）。纯 ACK 不消耗序列号，所以 B 的 Seq 仍是 5001。',
    dialogue: { speaker: 'B', emoji: '🙂', text: '收到。' },
    tip: null,
    banner: null,
  },
  {
    id: 'fin',
    phase: 'teardown',
    direction: 'a2b',
    timelineIcon: '⑥',
    timelineLabel: 'FIN',
    packet: { flags: { syn: false, ack: false, fin: true, data: false }, seq: 1021, ack: null, payloadLen: 0 },
    stateChanges: [{ role: 'A', from: 'ESTABLISHED', to: 'FIN-WAIT-1' }],
    explanation: 'A 数据发送完毕，主动请求断开：发送 FIN（Seq=1021），进入 FIN-WAIT-1。FIN 会消耗一个序列号。',
    dialogue: { speaker: 'A', emoji: '👋', text: '我这边没什么要发的了，我先下线啦。' },
    tip: null,
    banner: null,
  },
  {
    id: 'fin-ack',
    phase: 'teardown',
    direction: 'b2a',
    timelineIcon: '⑦',
    timelineLabel: 'ACK',
    packet: { flags: { syn: false, ack: true, fin: false, data: false }, seq: 5001, ack: 1022, payloadLen: 0 },
    stateChanges: [
      { role: 'B', from: 'ESTABLISHED', to: 'CLOSE-WAIT' },
      { role: 'A', from: 'FIN-WAIT-1', to: 'FIN-WAIT-2' },
    ],
    explanation: 'B 确认 A 的 FIN：回复 ACK，Ack=1022。B 进入 CLOSE-WAIT（可能还有数据要发），A 进入 FIN-WAIT-2 继续等待。',
    dialogue: { speaker: 'B', emoji: '🙂', text: '收到，你要下线的事情我知道了。' },
    tip: {
      title: '注意',
      text: 'B 进入 CLOSE-WAIT 后仍可能继续发送数据，因此 ACK 与 FIN 分开发送 —— 这就是挥手需要四次的原因。',
    },
    banner: null,
  },
  {
    id: 'fin-2',
    phase: 'teardown',
    direction: 'b2a',
    timelineIcon: '⑧',
    timelineLabel: 'FIN',
    packet: { flags: { syn: false, ack: false, fin: true, data: false }, seq: 5001, ack: null, payloadLen: 0 },
    stateChanges: [{ role: 'B', from: 'CLOSE-WAIT', to: 'LAST-ACK' }],
    explanation: 'B 的数据也发送完毕：发送自己的 FIN（Seq=5001），进入 LAST-ACK，等待 A 的最后确认。',
    dialogue: { speaker: 'B', emoji: '🙂', text: '好了，我这边也发送完了，现在真的可以结束了。' },
    tip: null,
    banner: null,
  },
  {
    id: 'final-ack',
    phase: 'teardown',
    direction: 'a2b',
    timelineIcon: '⑨',
    timelineLabel: 'ACK',
    packet: { flags: { syn: false, ack: true, fin: false, data: false }, seq: 1022, ack: 5002, payloadLen: 0 },
    stateChanges: [{ role: 'A', from: 'FIN-WAIT-2', to: 'TIME-WAIT' }],
    explanation: 'A 确认 B 的 FIN：回复 ACK，Ack=5002，随后进入 TIME-WAIT，等待 2×MSL 后才真正关闭。',
    dialogue: { speaker: 'A', emoji: '👋', text: '收到，那拜拜！' },
    tip: {
      title: '为什么？',
      text: 'A 不能立刻关闭：若最后的 ACK 丢失，B 会重传 FIN，TIME_WAIT 中的 A 仍能重新应答。',
    },
    banner: null,
  },
  {
    id: 'timewait',
    phase: 'timewait',
    direction: 'none',
    timelineIcon: '🔴',
    timelineLabel: 'TIME_WAIT → CLOSED',
    packet: null,
    stateChanges: [
      { role: 'A', from: 'TIME-WAIT', to: 'CLOSED' },
      { role: 'B', from: 'LAST-ACK', to: 'CLOSED' },
    ],
    explanation: 'A 等待 2×MSL 后进入 CLOSED；B 收到最后一个 ACK 后也进入 CLOSED。至此连接完全释放。',
    dialogue: null,
    tip: null,
    banner: '⏳ TIME_WAIT 等待 → 🔴 CLOSED',
  },
];

/** 步骤总数。 */
export const TOTAL_STEPS: number = TCP_STEPS.length;

/**
 * 计算 stepIndex 时刻双方的当前状态。
 * 从初始状态出发，依次应用 0..stepIndex 各步骤的状态迁移。
 */
export function computeStates(stepIndex: number): Record<TcpRole, TcpStateName> {
  const states: Record<TcpRole, TcpStateName> = { ...INITIAL_STATES };
  const upper = Math.min(stepIndex, TCP_STEPS.length - 1);
  for (let i = 0; i <= upper; i += 1) {
    for (const change of TCP_STEPS[i].stateChanges) {
      states[change.role] = change.to;
    }
  }
  return states;
}

/**
 * 计算 stepIndex 时刻双方在状态链（STATE_CHAINS）中的指针位置。
 * A 的链中 CLOSED 出现两次（首尾各一），因此用 lastIndexOf 定位，
 * 保证「回到 CLOSED」指向链尾而不是链首。
 */
export function computeStatePointers(stepIndex: number): Record<TcpRole, number> {
  const states = computeStates(stepIndex);
  const pointers: Record<TcpRole, number> = {
    A: 0,
    B: 0,
  };
  (Object.keys(pointers) as TcpRole[]).forEach((role) => {
    pointers[role] = computeChainIndex(role, states[role]);
  });
  return pointers;
}

/** 将某个角色的当前状态映射到状态链下标。 */
function computeChainIndex(role: TcpRole, state: TcpStateName): number {
  const chain = role === 'A'
    ? (['CLOSED', 'SYN-SENT', 'ESTABLISHED', 'FIN-WAIT-1', 'FIN-WAIT-2', 'TIME-WAIT', 'CLOSED'] as TcpStateName[])
    : (['LISTEN', 'SYN-RECEIVED', 'ESTABLISHED', 'CLOSE-WAIT', 'LAST-ACK', 'CLOSED'] as TcpStateName[]);
  return Math.max(0, chain.lastIndexOf(state));
}

/**
 * 生成报文的 Flags 展示文案：DATA 优先，其余按 SYN/ACK/FIN 用 + 连接。
 */
export function flagsText(packet: TcpPacket): string {
  if (packet.flags.data) {
    return 'DATA';
  }
  const parts: string[] = [];
  if (packet.flags.syn) parts.push('SYN');
  if (packet.flags.ack) parts.push('ACK');
  if (packet.flags.fin) parts.push('FIN');
  return parts.join('+') || '—';
}

/**
 * 生成报文的 Seq/Ack/Len 展示文案（仅包含非空字段）。
 */
export function seqAckText(packet: TcpPacket): string {
  const bits: string[] = [];
  if (packet.seq !== null) bits.push(`Seq=${packet.seq}`);
  if (packet.ack !== null) bits.push(`Ack=${packet.ack}`);
  if (packet.payloadLen > 0) bits.push(`Len=${packet.payloadLen}`);
  return bits.join(' ');
}
