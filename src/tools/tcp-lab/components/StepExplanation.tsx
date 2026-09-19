/**
 * 「当前发生了什么？」卡片 —— 步骤序号、方向、Flags、解释文案、
 * 趣味对话气泡与 💡 教学提示（需求第五/八/二十一节）。
 */
import { PHASE_LABELS } from '../types';
import type { TcpStep, ViewMode } from '../types';

/** 提取报文中置位的 Flags 标签列表。 */
function activeFlagLabels(step: TcpStep): string[] {
  if (!step.packet) return [];
  const { flags } = step.packet;
  const labels: string[] = [];
  if (flags.syn) labels.push('SYN');
  if (flags.ack) labels.push('ACK');
  if (flags.fin) labels.push('FIN');
  if (flags.data) labels.push('DATA');
  return labels;
}

interface StepExplanationProps {
  /** 当前步骤。 */
  step: TcpStep;
  /** 当前步骤索引（0 起）。 */
  stepIndex: number;
  /** 步骤总数。 */
  total: number;
  /** 视图模式：学习模式突出对话，协议模式突出 Flags。 */
  mode: ViewMode;
}

/**
 * 当前步骤解释卡片。
 */
export function StepExplanation({ step, stepIndex, total, mode }: StepExplanationProps) {
  const directionText =
    step.direction === 'a2b' ? 'A → B' : step.direction === 'b2a' ? 'B → A' : '无报文交互';
  const flagLabels = activeFlagLabels(step);

  return (
    <section
      className={`panel exp-panel exp-panel--${mode}`}
      style={{ animationDelay: '140ms' }}
    >
      <div className="panel-title-row">
        <h2 className="panel-title">当前发生了什么？</h2>
        <span className="panel-caption">
          第 {stepIndex + 1} 步 / 共 {total} 步
        </span>
      </div>

      <p className="exp-phase">{PHASE_LABELS[step.phase]}</p>

      <div className="exp-meta">
        <span className="exp-direction mono">{directionText}</span>
        {flagLabels.length > 0 ? (
          <span className="exp-flags">
            {flagLabels.map((label) => (
              <span key={label} className={`flag-chip mono${label === 'DATA' ? ' flag-chip-data' : ''}`}>
                {label}
              </span>
            ))}
          </span>
        ) : (
          <span className="exp-flags-empty">此步骤无报文，仅状态推进</span>
        )}
      </div>

      <p className="exp-text">{step.explanation}</p>

      {step.dialogue && (
        <div className={`exp-dialogue exp-dialogue-${step.dialogue.speaker.toLowerCase()}`}>
          <span className="exp-dialogue-avatar" aria-hidden="true">
            {step.dialogue.emoji}
          </span>
          <div className="exp-dialogue-body">
            <span className="exp-dialogue-name">
              {step.dialogue.speaker === 'A' ? 'Client A' : 'Server B'}
            </span>
            <p className="exp-dialogue-text">“{step.dialogue.text}”</p>
          </div>
        </div>
      )}

      {step.tip && (
        <div className="exp-tip">
          <span className="exp-tip-label">💡 {step.tip.title}</span>
          <p>{step.tip.text}</p>
        </div>
      )}

      <p className="exp-note">
        趣味对话仅用于帮助理解，实际网络中传输的是 TCP 报文及其控制字段。
      </p>
    </section>
  );
}
