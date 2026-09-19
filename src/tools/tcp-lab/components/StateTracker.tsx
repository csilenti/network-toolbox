/**
 * TCP 状态可视化 —— 左右两侧展示 A、B 双方的状态链。
 * 当前状态实心高亮 ●，已过状态描边，未到状态空心 ○（需求第九节）。
 */
import { STATE_CHAINS } from '../types';
import type { TcpRole, TcpStateChange } from '../types';

interface StateTrackerProps {
  /** 双方在状态链中的当前下标（由容器根据 stepIndex 计算）。 */
  pointers: Record<TcpRole, number>;
  /** 当前步骤触发的状态迁移（用于展示 from → to）。 */
  changes: readonly TcpStateChange[];
}

/**
 * 状态机面板：A / B 两列状态链。
 */
export function StateTracker({ pointers, changes }: StateTrackerProps) {
  return (
    <section className="panel state-panel" style={{ animationDelay: '70ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">TCP 状态机</h2>
        <span className="panel-caption">● 当前状态 · ○ 已经过 / 尚未到达</span>
      </div>

      <div className="state-track">
        {(['A', 'B'] as const).map((role) => {
          const chain = STATE_CHAINS[role];
          const pointer = pointers[role];
          const change = changes.find((c) => c.role === role) ?? null;
          return (
            <div key={role} className="state-chain">
              <h3 className="state-chain-title">
                {role === 'A' ? '💻 Client A' : '🖥 Server B'}
              </h3>
              {change ? (
                <p className="state-chain-change">
                  <span className="mono">{change.from}</span>
                  <span className="state-change-arrow" aria-hidden="true"> → </span>
                  <span className="mono">{change.to}</span>
                </p>
              ) : (
                <p className="state-chain-change state-chain-change--idle">本步状态无变化</p>
              )}
              <ol className="state-list">
                {chain.map((state, i) => {
                  const cls =
                    i < pointer ? 'is-past' : i === pointer ? 'is-current' : 'is-future';
                  return (
                    <li key={`${state}-${i}`} className={`state-node ${cls}`}>
                      <span className="state-dot" aria-hidden="true" />
                      <span className="mono">{state}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
