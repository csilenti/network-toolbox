/**
 * TCP 报文详情 —— 模拟报文字段查看器（需求第十五节）。
 * 数据为模拟值，但 Flags / Seq / Ack 逻辑与状态机严格一致；
 * 无当前报文的步骤（连接建立 / TIME_WAIT）显示空态。
 */
import type { TcpStep } from '../types';

/** A 端（客户端）使用的临时端口。 */
const PORT_A = 52001;
/** B 端（服务器）监听的端口。 */
const PORT_B = 80;
/** 双方通告的接收窗口。 */
const WINDOW_SIZE = 65535;

/** 全部 Flags 项（未置位的也展示，灰态）。 */
const ALL_FLAGS: ReadonlyArray<{ key: 'syn' | 'ack' | 'fin' | 'data'; label: string }> = [
  { key: 'syn', label: 'SYN' },
  { key: 'ack', label: 'ACK' },
  { key: 'fin', label: 'FIN' },
  { key: 'data', label: 'Data' },
];

interface PacketInspectorProps {
  /** 当前步骤（据此推导端口方向与字段值）。 */
  step: TcpStep;
}

/**
 * 报文详情面板：Source/Destination Port、Flags、Seq、Ack、Length、Window。
 */
export function PacketInspector({ step }: PacketInspectorProps) {
  const packet = step.packet;

  if (!packet) {
    return (
      <section className="panel pkt-panel" style={{ animationDelay: '210ms' }}>
        <div className="panel-title-row">
          <h2 className="panel-title">TCP 报文详情</h2>
          <span className="panel-caption">TCP Segment · 模拟数据</span>
        </div>
        <div className="pkt-empty">
          <span aria-hidden="true">🛰️</span>
          此步骤没有报文传输
          <small>{step.phase === 'handshake' ? '连接已建立，双方进入 ESTABLISHED' : 'TIME_WAIT 等待结束后连接释放'}</small>
        </div>
      </section>
    );
  }

  const sourcePort = step.direction === 'b2a' ? PORT_B : PORT_A;
  const destPort = step.direction === 'b2a' ? PORT_A : PORT_B;

  return (
    <section className="panel pkt-panel" style={{ animationDelay: '210ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">TCP 报文详情</h2>
        <span className="panel-caption">TCP Segment · 模拟数据</span>
      </div>

      <dl className="pkt-rows">
        <div className="pkt-row">
          <dt>Source Port（源端口）</dt>
          <dd>{sourcePort}</dd>
        </div>
        <div className="pkt-row">
          <dt>Destination Port（目标端口）</dt>
          <dd>{destPort}</dd>
        </div>
        <div className="pkt-row pkt-row-flags">
          <dt>Flags（标志位）</dt>
          <dd className="pkt-flags">
            {ALL_FLAGS.map(({ key, label }) => (
              <span key={key} className={`pkt-flag mono${packet.flags[key] ? ' is-on' : ''}`}>
                {label}
              </span>
            ))}
          </dd>
        </div>
        <div className="pkt-row">
          <dt>Sequence Number（序列号）</dt>
          <dd>{packet.seq ?? '—'}</dd>
        </div>
        <div className="pkt-row">
          <dt>Acknowledgment Number（确认号）</dt>
          <dd>
            {packet.ack ?? '—'}
            {packet.ack === null && <small className="pkt-row-hint">（未确认任何序列号）</small>}
          </dd>
        </div>
        <div className="pkt-row">
          <dt>Data Length（数据长度）</dt>
          <dd>{packet.payloadLen > 0 ? `${packet.payloadLen} 字节` : '0'}</dd>
        </div>
        <div className="pkt-row">
          <dt>Window Size（窗口大小）</dt>
          <dd>{WINDOW_SIZE}</dd>
        </div>
      </dl>
    </section>
  );
}
