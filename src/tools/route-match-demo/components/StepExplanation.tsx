/**
 * 「当前发生了什么？」—— 逐步判定文案面板（任务要求第五节第 2 区）。
 * 展示第 N / M 步、步骤类型徽标与该步的 title / description。
 */
import type { DemoStep, DemoStepKind } from '../types';

/** 步骤类型 → 展示标签。 */
const KIND_LABEL: Record<DemoStepKind, string> = {
  arrive: '① 数据包到达',
  compare: '② 逐条比对',
  finals: '③ 决赛圈',
  winner: '④ 胜出揭晓',
  forward: '⑤ 转发交付',
  done: '⑥ 完成总结',
};

interface StepExplanationProps {
  /** 当前步骤数组（null = 未开始）。 */
  steps: readonly DemoStep[] | null;
  /** 当前步骤索引。 */
  stepIndex: number;
}

/**
 * 步骤解释面板。
 */
export function StepExplanation({ steps, stepIndex }: StepExplanationProps) {
  if (steps === null || steps.length === 0) {
    return (
      <section className="panel rmd-exp-panel" aria-label="当前发生了什么">
        <h2 className="panel-title">当前发生了什么？</h2>
        <p className="rmd-exp-idle">
          输入目的 IP 并点击「开始演示」，数据包就会出发，逐条询问路由表里的每一条路由。
        </p>
      </section>
    );
  }

  const step = steps[Math.min(stepIndex, steps.length - 1)];
  return (
    <section className="panel rmd-exp-panel" aria-label="当前发生了什么" aria-live="polite">
      <h2 className="panel-title">当前发生了什么？</h2>
      <div className="rmd-exp-meta">
        <span className="rmd-exp-progress">
          第 {stepIndex + 1} / {steps.length} 步
        </span>
        <span className={`rmd-exp-kind is-kind-${step.kind}`}>{KIND_LABEL[step.kind]}</span>
      </div>
      <h3 className="rmd-exp-title">{step.title}</h3>
      <p className="rmd-exp-desc">{step.description}</p>
    </section>
  );
}
