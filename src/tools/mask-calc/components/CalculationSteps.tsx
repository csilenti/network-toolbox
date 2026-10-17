import type { StepData } from '../types';

export interface CalculationStepsProps {
  /** 由 utils/steps.ts 生成的 6 步推导链路。 */
  steps: StepData[];
}

/**
 * 分步计算过程（IP ⊕ 掩码逐位 AND）：垂直时间线式步骤卡，
 * 关键数字等宽高亮，逐条错峰入场；步骤数据全部来自纯函数层。
 */
export function CalculationSteps({ steps }: CalculationStepsProps) {
  return (
    <section className="mc-steps" aria-label="分步计算过程">
      <h2 className="panel-title mc-steps-title">
        分步计算过程
        <span className="panel-caption">IP AND 掩码如何一步步得到网段信息</span>
      </h2>
      <ol className="mc-steps-list">
        {steps.map((step, i) => (
          <li
            key={step.title}
            className="mc-step-item"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="mc-step-dot" aria-hidden="true" />
            <div className="mc-step-body">
              <p className="mc-step-head">
                <span className="mc-step-num mono">第 {i + 1} 步</span>
                <span className="mc-step-title">{step.title}</span>
              </p>
              <p className="mc-step-detail">{step.detail}</p>
              {step.binary && <p className="mc-step-binary mono">{step.binary}</p>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
