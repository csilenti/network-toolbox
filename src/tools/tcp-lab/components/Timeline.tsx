/**
 * 完整流程时间轴 —— 横向步骤胶囊（需求第十八节）。
 * 当前步骤高亮，已过步骤着色，未来步骤置灰；点击任一步骤跳转并重放该步动画。
 */
import type { TcpStep } from '../types';

interface TimelineProps {
  /** 全部步骤。 */
  steps: readonly TcpStep[];
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 点击跳转回调（跳转 = 设置步骤索引并重放该步骤动画）。 */
  onSelect: (index: number) => void;
}

/**
 * 时间轴面板。
 */
export function Timeline({ steps, stepIndex, onSelect }: TimelineProps) {
  return (
    <section className="panel tl-panel" style={{ animationDelay: '280ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">完整流程时间轴</h2>
        <span className="panel-caption">点击任一步骤可直接跳转并重放该步动画</span>
      </div>

      <div className="tl-row" role="tablist" aria-label="TCP 生命周期步骤">
        {steps.map((step, i) => {
          const cls =
            i === stepIndex ? 'is-current' : i < stepIndex ? 'is-past' : 'is-future';
          return (
            <button
              key={step.id}
              type="button"
              className={`tl-chip ${cls}`}
              onClick={() => onSelect(i)}
              aria-current={i === stepIndex ? 'step' : undefined}
              title={`第 ${i + 1} 步 · ${step.timelineLabel}`}
            >
              <span className="tl-icon" aria-hidden="true">
                {step.timelineIcon}
              </span>
              <span className="tl-label">{step.timelineLabel}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
