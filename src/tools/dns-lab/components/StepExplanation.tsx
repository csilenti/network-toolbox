/**
 * 「当前发生了什么？」卡片 —— 步骤序号、阶段（区分递归查询段 / 迭代查询段）、
 * 方向、教学解释、趣味对话气泡与 💡 提示（需求第十五/十六/二十二节）。
 */
import { SERVER_MAP } from '../data';
import { PHASE_LABELS } from '../types';
import type { DnsStep, ViewMode } from '../types';

interface StepExplanationProps {
  /** 当前步骤；为 null 表示尚未开始。 */
  step: DnsStep | null;
  /** 当前步骤索引（0 起）。 */
  stepIndex: number;
  /** 步骤总数。 */
  total: number;
  /** 视图模式：学习模式突出对话，协议模式突出报文。 */
  mode: ViewMode;
}

/** 递归查询段 / 迭代查询段的可视化区分（本工具最重要的教学点）。 */
function ScopeBadge({ phase }: { phase: DnsStep['phase'] }) {
  if (phase === 'recursive-query') {
    return (
      <div className="exp-scope exp-scope-rec">
        <b>递归查询段</b>
        客户端只向递归 DNS 发这一次请求，剩下的事情全部交给它
      </div>
    );
  }
  if (phase === 'iterative-query') {
    return (
      <div className="exp-scope exp-scope-iter">
        <b>迭代查询段</b>
        递归 DNS 自己逐级追问 Root → TLD → 权威，客户端并不参与
      </div>
    );
  }
  return null;
}

/**
 * 当前步骤解释卡片。
 */
export function StepExplanation({ step, stepIndex, total, mode }: StepExplanationProps) {
  if (!step) {
    return (
      <section className="panel exp-panel" style={{ animationDelay: '140ms' }}>
        <div className="panel-title-row">
          <h2 className="panel-title">当前发生了什么？</h2>
          <span className="panel-caption">等待开始解析</span>
        </div>
        <p className="exp-text exp-text--idle">
          输入一个域名，点击「开始解析」。你将亲眼看到：本地两级缓存 → 递归查询 →
          递归 DNS 逐级迭代 → 权威 DNS 给出答案 → 结果返回并写入缓存。
        </p>
      </section>
    );
  }

  const sourceName = SERVER_MAP[step.source].name;
  const targetName = SERVER_MAP[step.target].name;
  const directionText =
    step.source === step.target ? '无报文传输' : `${sourceName} → ${targetName}`;

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
      <ScopeBadge phase={step.phase} />

      <div className="exp-meta">
        <span className="exp-direction mono">{directionText}</span>
        {step.packet && (
          <span className={`flag-chip mono${step.cacheHit ? ' flag-chip-hit' : ''}`}>
            {step.packet.isResponse ? 'RESPONSE' : 'QUERY'}
          </span>
        )}
      </div>

      <p className="exp-text">{step.explanation}</p>

      {step.dialogue.length > 0 && (
        <div className="exp-dialogues">
          {step.dialogue.map((line) => (
            <div key={`${line.speaker}-${line.text}`} className="exp-dialogue">
              <span className="exp-dialogue-avatar" aria-hidden="true">
                {line.emoji}
              </span>
              <div className="exp-dialogue-body">
                <span className="exp-dialogue-name">{line.speaker}</span>
                <p className="exp-dialogue-text">“{line.text}”</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {step.tip && (
        <div className="exp-tip">
          <span className="exp-tip-label">💡 提示</span>
          <p>{step.tip}</p>
        </div>
      )}

      <p className="exp-note">
        趣味对话仅是教学隐喻，实际 DNS 报文中不存在这些自然语言 —— 真正传输的是结构化的查询与响应字段。
      </p>
    </section>
  );
}
