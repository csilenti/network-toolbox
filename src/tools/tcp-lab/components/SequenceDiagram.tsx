/**
 * 序列图 —— 中央动画区。
 *
 * 结构：左右两个端点节点（💻 Client A / 🖥 Server B）+ 两条垂直生命线 +
 * 逐行「报文通道」。历史步骤以静态箭头留痕，当前步骤的报文卡片沿连线飞行
 * （CSS keyframes，由「当前步骤变化」这一状态驱动），接收节点高亮脉冲。
 */
import type { CSSProperties } from 'react';
import { flagsText, seqAckText } from '../steps';
import type { TcpPacket, TcpStep } from '../types';

/** 生成报文的短标签（两行：Flags / Seq·Ack·Len）。 */
function packetLabel(packet: TcpPacket): { flags: string; detail: string } {
  return { flags: flagsText(packet), detail: seqAckText(packet) };
}

interface SequenceDiagramProps {
  /** 全部步骤（结构化状态机数据）。 */
  steps: readonly TcpStep[];
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 播放速度倍率（控制报文飞行动画时长）。 */
  speed: number;
}

/**
 * 中央序列图：节点 + 生命线 + 报文通道 + 飞行中的报文卡片。
 */
export function SequenceDiagram({ steps, stepIndex, speed }: SequenceDiagramProps) {
  const current = steps[stepIndex];
  /** 当前步骤的接收方（无报文步骤不触发）。 */
  const receiverRole: 'A' | 'B' | null =
    current.direction === 'none' ? null : current.direction === 'b2a' ? 'A' : 'B';
  /** 飞行动画时长随速度倍率缩放。 */
  const sceneStyle = { '--speed': speed } as CSSProperties;

  return (
    <section className="panel seq-panel" style={{ animationDelay: '0ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">通信场景</h2>
        <span className="panel-caption">A（客户端）↔ B（服务器）· 报文沿生命线飞行</span>
      </div>

      <div className="seq-scene" style={sceneStyle}>
        {/* 生命线 */}
        <span className="seq-lifeline seq-lifeline-a" aria-hidden="true" />
        <span className="seq-lifeline seq-lifeline-b" aria-hidden="true" />
        <span className="seq-net-label" aria-hidden="true">网 络</span>

        {/* 端点节点：接收方高亮脉冲（key 绑定步骤 id 以重放动画） */}
        {(['A', 'B'] as const).map((role) => {
          const isReceiver = receiverRole === role;
          const isSender = receiverRole !== null && receiverRole !== role;
          const cls = [
            'seq-node',
            role === 'A' ? 'seq-node-a' : 'seq-node-b',
            isSender ? 'is-sending' : '',
            isReceiver ? 'is-receiving' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <div key={isReceiver ? `node-${current.id}` : `node-static-${role}`} className={cls}>
              <span className="seq-node-emoji">{role === 'A' ? '💻' : '🖥'}</span>
              <span className="seq-node-name">{role === 'A' ? 'Client A' : 'Server B'}</span>
              <span className="seq-node-caption">{role === 'A' ? '客户端 · 主动方' : '服务器 · 被动方'}</span>
            </div>
          );
        })}

        {/* 报文通道：历史留痕 + 当前飞行 + 未来占位 */}
        <div className="seq-lanes">
          {steps.map((step, i) => {
            const cls = ['seq-lane'];
            if (i < stepIndex) cls.push('is-past');
            if (i === stepIndex) cls.push('is-current');
            if (i > stepIndex) cls.push('is-future');

            return (
              <div key={step.id} className={cls.join(' ')}>
                {step.direction === 'none' ? (
                  i <= stepIndex && <span className="seq-banner">{step.banner}</span>
                ) : i > stepIndex ? (
                  <span className="seq-lane-dots" aria-hidden="true" />
                ) : (
                  step.packet && (
                    <>
                      <span
                        className={`seq-arrow ${step.direction === 'a2b' ? 'is-a2b' : 'is-b2a'}`}
                        aria-hidden="true"
                      >
                        <span className="seq-arrow-head" />
                      </span>
                      <span className="seq-pkt-label">
                        <b>{packetLabel(step.packet).flags}</b>
                        <i>{packetLabel(step.packet).detail}</i>
                      </span>
                      {i === stepIndex && (
                        <span
                          key={`fly-${step.id}`}
                          className={`seq-pkt-fly ${step.direction === 'a2b' ? 'is-a2b' : 'is-b2a'}`}
                        >
                          <span className="seq-pkt-fly-title">📦 TCP · {packetLabel(step.packet).flags}</span>
                          <span className="seq-pkt-fly-detail">{packetLabel(step.packet).detail}</span>
                        </span>
                      )}
                    </>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
