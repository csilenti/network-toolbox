/**
 * 换算关系链：中间换算路径展示（如 Mbps → bps → B/s → MB/s）。
 */
import type { ChainStep } from '../types';

/** 步骤序号（链式步骤通常 ≤ 4，超出时降级为 ·）。 */
const MARKS = ['①', '②', '③', '④', '⑤', '⑥'];

export interface ConversionChainProps {
  /** 链式步骤（空数组时不渲染）。 */
  steps: ChainStep[];
  /** 路径摘要（显示在标题右侧）。 */
  caption?: string;
}

/** 换算关系链组件。 */
export function ConversionChain({ steps, caption }: ConversionChainProps) {
  if (steps.length === 0) {
    return null;
  }
  return (
    <section aria-label="换算关系链">
      <div className="uc-result-head">
        <h2 className="panel-title">换算关系链</h2>
        {caption ? <span className="uc-result-caption mono">{caption}</span> : null}
      </div>
      <ol className="uc-chain-list">
        {steps.map((step, i) => (
          <li key={step.title} className="uc-chain-item">
            <span className="uc-chain-arrow mono" aria-hidden="true">
              {MARKS[i] ?? '·'}
            </span>
            <span className="uc-chain-title">{step.title}</span>
            <span className="uc-chain-detail mono">{step.detail}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}
