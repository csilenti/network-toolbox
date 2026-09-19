import type { ReactNode } from 'react';
import type { DivisionSuccess } from '../utils/subnet';
import { ipToDotted } from '../utils/ip';
import { prefixToMask } from '../utils/ip';

interface StepItem {
  key: string;
  node: ReactNode;
}

const fmt = (n: number): string => n.toLocaleString('en-US');

/** 数字高亮的等宽强调。 */
function Num({ children }: { children: ReactNode }) {
  return <code className="step-num mono">{children}</code>;
}

/** 网络号语义色强调。 */
function Net({ children }: { children: ReactNode }) {
  return <strong className="hl-net mono">{children}</strong>;
}

/** 子网号语义色强调。 */
function Sub({ children }: { children: ReactNode }) {
  return <strong className="hl-subnet mono">{children}</strong>;
}

/** 主机号语义色强调。 */
function Host({ children }: { children: ReactNode }) {
  return <strong className="hl-host mono">{children}</strong>;
}

/** 上标形式的幂：2ⁿ。 */
function Pow({ n }: { n: number }) {
  return (
    <span className="mono">
      2<sup>{n}</sup>
    </span>
  );
}

/**
 * 计算过程：垂直时间线式的 Step-by-Step 步骤卡。
 * 依据划分模式（按子网数量 / 按主机数）生成不同的推导链路，
 * 关键数字以语义色 + 等宽字体高亮，逐条错峰入场。
 */
export function CalculationSteps({ division }: { division: DivisionSuccess }) {
  const d = division;
  const steps: StepItem[] = [];

  const baseMask = prefixToMask(d.basePrefix);
  const newMask = prefixToMask(d.newPrefix);

  // ① 原始网络（两种模式共用）
  steps.push({
    key: 'base',
    node: (
      <>
        确定原始网络：
        <Net>{ipToDotted(d.baseNetwork)}/{d.basePrefix}</Net>
        （掩码 <Num>{baseMask}</Num>）
        {d.normalized && (
          <span className="step-note">
            输入地址含非 0 主机位，已自动归一化到网络地址 {ipToDotted(d.baseNetwork)}
          </span>
        )}
      </>
    ),
  });

  if (d.mode === 'count') {
    steps.push({
      key: 'need',
      node: (
        <>
          需要 <Num>{fmt(d.requestedValue)}</Num> 个子网：
          <Pow n={d.borrowedBits} /> = <Num>{fmt(d.actualSubnets)}</Num> ≥{' '}
          <Num>{fmt(d.requestedValue)}</Num>，需向主机位借用 <Sub>{d.borrowedBits} bit</Sub>
          {d.actualSubnets > d.requestedValue && (
            <span className="step-note">
              子网数需为 2 的幂，实际划出 {fmt(d.actualSubnets)} 个（略多于需求）
            </span>
          )}
        </>
      ),
    });
    steps.push({
      key: 'prefix',
      node: (
        <>
          前缀从 <Num>/{d.basePrefix}</Num> 增至 <Sub>/{d.newPrefix}</Sub>，新掩码{' '}
          <Num>{newMask}</Num>
        </>
      ),
    });
  } else {
    steps.push({
      key: 'need',
      node: (
        <>
          每个子网需要容纳 <Host>{fmt(d.requestedValue)}</Host> 台主机：
          <Pow n={d.hostBits} /> − 2 = <Num>{fmt(d.usableHosts)}</Num> ≥{' '}
          <Num>{fmt(d.requestedValue)}</Num>，需要 <Host>{d.hostBits} 个主机位</Host>
        </>
      ),
    });
    steps.push({
      key: 'prefix',
      node: (
        <>
          前缀定为 <Num>32 − {d.hostBits} = /{d.newPrefix}</Num>，新掩码{' '}
          <Num>{newMask}</Num>
        </>
      ),
    });
    steps.push({
      key: 'borrow',
      node: (
        <>
          相当于向主机位借用了 <Sub>{d.borrowedBits} bit</Sub>（
          <Num>/{d.basePrefix}</Num> → <Sub>/{d.newPrefix}</Sub>）
        </>
      ),
    });
    steps.push({
      key: 'howmany',
      node: (
        <>
          一共可以划出 <Sub>{fmt(d.actualSubnets)}</Sub> 个这样的子网（
          <Pow n={d.borrowedBits} /> = <Num>{fmt(d.actualSubnets)}</Num>）
        </>
      ),
    });
  }

  // 主机位与地址块（两种模式共用）
  steps.push({
    key: 'hostbits',
    node: (
      <>
        每个子网剩余 <Host>{d.hostBits} 个主机位</Host>（32 − {d.newPrefix} ={' '}
        {d.hostBits}）
      </>
    ),
  });
  steps.push({
    key: 'block',
    node: (
      <>
        每个子网共 <Num>{fmt(d.blockSize)}</Num> 个地址（<Pow n={d.hostBits} /> ={' '}
        <Num>{fmt(d.blockSize)}</Num>）
      </>
    ),
  });
  steps.push({
    key: 'usable',
    node: (
      <>
        可用主机 <Net>{fmt(d.usableHosts)}</Net> 台（{fmt(d.blockSize)} − 2，减去
        <span className="step-keyword">网络地址</span>与
        <span className="step-keyword">广播地址</span>）
      </>
    ),
  });

  return (
    <section className="calc-steps" aria-label="计算过程">
      <h2 className="panel-title">计算过程</h2>
      <ol className="steps-list">
        {steps.map((step, i) => (
          <li
            key={step.key}
            className="step-item"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="step-dot" aria-hidden="true" />
            <div className="step-body">{step.node}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
