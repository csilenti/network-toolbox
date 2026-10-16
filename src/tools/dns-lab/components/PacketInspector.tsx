/**
 * DNS 报文详情 —— 模拟报文字段查看器（需求第十七节）。
 * Query 展示 Transaction ID / Flags 0x0100 / Questions / QNAME / QTYPE / QCLASS；
 * ANSWER 响应展示 Flags 0x8180 / Answers / TTL / DATA；
 * Referral 响应展示 Answers=0 与 Authority / Additional 语义。
 */
import type { DnsStep } from '../types';

interface PacketInspectorProps {
  /** 当前步骤；为 null 表示尚未开始。 */
  step: DnsStep | null;
}

/** 报文种类标题。 */
function packetTitle(step: DnsStep): string {
  if (step.type === 'cache') return '本地缓存查询（无 DNS 报文）';
  const packet = step.packet;
  if (!packet) return '无报文';
  if (!packet.isResponse) return 'DNS Query（查询）';
  return packet.answers === 0 ? 'DNS Response（Referral 指引）' : 'DNS Response（ANSWER 回答）';
}

/**
 * 报文详情面板。
 */
export function PacketInspector({ step }: PacketInspectorProps) {
  const packet = step?.packet ?? null;

  const emptyText = !step
    ? '开始解析后，这里展示当前 DNS 报文的字段'
    : step.type === 'cache'
      ? '本地缓存检查不产生 DNS 报文 —— 它发生在本机内部'
      : '此步骤没有报文传输';

  return (
    <section className="panel pkt-panel" style={{ animationDelay: '210ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">DNS 报文详情</h2>
        <span className="panel-caption">{step ? packetTitle(step) : '模拟数据 · 符合真实 DNS 概念'}</span>
      </div>

      {!packet ? (
        <div className="pkt-empty">
          <span aria-hidden="true">🛰️</span>
          {emptyText}
        </div>
      ) : (
        <dl className="pkt-rows">
          <div className="pkt-row">
            <dt>Transaction ID（事务 ID）</dt>
            <dd>{packet.transactionId}</dd>
          </div>
          <div className="pkt-row">
            <dt>Flags（标志位）</dt>
            <dd>
              {packet.flags}
              <small className="pkt-row-hint">
                {packet.isResponse ? 'QR=1 响应 · RA=1 支持递归' : 'QR=0 查询 · RD=1 请求递归'}
              </small>
            </dd>
          </div>
          <div className="pkt-row">
            <dt>Questions（问题数）</dt>
            <dd>{packet.questions}</dd>
          </div>
          {packet.isResponse && (
            <div className="pkt-row">
              <dt>Answers（回答数）</dt>
              <dd>
                {packet.answers ?? 0}
                {packet.answers === 0 && (
                  <small className="pkt-row-hint">（无最终答案，仅提供下一步指引）</small>
                )}
              </dd>
            </div>
          )}
          <div className="pkt-row">
            <dt>QNAME / NAME（查询名）</dt>
            <dd>{packet.qname}</dd>
          </div>
          <div className="pkt-row">
            <dt>{packet.isResponse ? 'TYPE（记录类型）' : 'QTYPE（查询类型）'}</dt>
            <dd>{packet.qtype}</dd>
          </div>
          <div className="pkt-row">
            <dt>{packet.isResponse ? 'CLASS（记录类）' : 'QCLASS（查询类）'}</dt>
            <dd>{packet.qclass}</dd>
          </div>
          {packet.isResponse && packet.answers !== 0 && (
            <>
              <div className="pkt-row">
                <dt>TTL（生存时间）</dt>
                <dd>{packet.ttl ?? 0}s</dd>
              </div>
              <div className="pkt-row">
                <dt>DATA（记录数据）</dt>
                <dd>{packet.data ?? '—'}</dd>
              </div>
            </>
          )}
          {packet.isResponse && packet.answers === 0 && (
            <>
              <div className="pkt-row pkt-row-wide">
                <dt>Authority（授权区）</dt>
                <dd>{packet.authority ?? '—'}</dd>
              </div>
              <div className="pkt-row pkt-row-wide">
                <dt>Additional（附加区）</dt>
                <dd>{packet.additional ?? '—'}</dd>
              </div>
            </>
          )}
        </dl>
      )}
    </section>
  );
}
