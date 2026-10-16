/**
 * DNS Resolution Timeline —— 横向步骤胶囊（需求第二十六节）。
 * 当前步骤自动高亮，点击任一步骤可跳转并重放该步动画。
 */
import type { DnsStep } from '../types';

interface TimelineProps {
  /** 全部步骤；为 null 表示尚未开始。 */
  steps: readonly DnsStep[] | null;
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 点击跳转回调。 */
  onSelect: (index: number) => void;
}

/**
 * 时间轴面板。
 */
export function Timeline({ steps, stepIndex, onSelect }: TimelineProps) {
  return (
    <section className="panel dns-tl-panel" style={{ animationDelay: '280ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">DNS Resolution Timeline</h2>
        <span className="panel-caption">点击任一步骤可直接跳转并重放该步动画</span>
      </div>

      {!steps ? (
        <div className="dns-tl-empty">开始解析后，完整时间线会在这里出现</div>
      ) : (
        <div className="dns-tl-row" role="tablist" aria-label="DNS 解析步骤">
          {steps.map((step, i) => {
            const cls =
              i === stepIndex ? 'is-current' : i < stepIndex ? 'is-past' : 'is-future';
            return (
              <button
                key={step.id}
                type="button"
                className={`dns-tl-chip ${cls}`}
                onClick={() => onSelect(i)}
                aria-current={i === stepIndex ? 'step' : undefined}
                title={`第 ${i + 1} 步 · ${step.title}`}
              >
                <span className="dns-tl-icon" aria-hidden="true">
                  {step.timelineIcon}
                </span>
                <span className="dns-tl-label">{step.timelineLabel}</span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
