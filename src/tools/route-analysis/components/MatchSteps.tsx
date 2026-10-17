import type { CSSProperties } from 'react';
import type { RouteEntry, RouteStepData } from '../types';
import { STAGGER_MS } from '../../ip-subnet/types';

export interface MatchStepsProps {
  /** 胜出路由（用于标题）；调用方保证非 null。 */
  winner: RouteEntry;
  /** 分步数据（buildWinnerSteps 的输出，第 1~4 步）。 */
  steps: RouteStepData[];
}

/** 单步错峰入场延迟。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/**
 * 匹配过程详解（任务要求第五节第 4 区 / 第七节）：
 * 胜出条目的 AND 比对逐步展示 —— 掩码展开 → AND 运算 → 比对网络地址 → 三级决胜。
 */
export function MatchSteps(props: MatchStepsProps) {
  const { winner, steps } = props;

  return (
    <section className="panel tool-section ra-section" aria-label="匹配过程详解">
      <div className="ra-steps-head">
        <h2 className="panel-title">匹配过程详解</h2>
        <p className="panel-caption">
          选中条目 <b className="mono">#{winner.id} {winner.network}/{winner.prefix}</b> 的 AND 比对过程
        </p>
      </div>

      <ol className="ra-steps-list">
        {steps.map((step, index) => (
          <li key={`${step.title}-${index}`} className="ra-step-item" style={stagger(index)}>
            <span className="ra-step-dot" aria-hidden="true" />
            <div className="ra-step-body">
              <div className="ra-step-head">
                <span className="ra-step-num mono">第 {index + 1} 步</span>
                <span className="ra-step-title">{step.title}</span>
              </div>
              <p className="ra-step-detail">{step.detail}</p>
              {step.binary && (
                <code className="ra-step-binary mono">{step.binary}</code>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
