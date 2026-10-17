/**
 * 胜出路由转发详情卡（任务要求第五节第 3 区）。
 * winner 步后展示胜出条目详情；forward 步追加交付说明；done 步追加「本次经历」统计。
 * 无候选集（不可达兜底）时展示教学提示卡。
 */
import type { RouteEntry } from '../../route-analysis/types';
import type { DemoStep } from '../types';

interface WinnerCardProps {
  /** 当前步骤数组（null = 未开始，不渲染）。 */
  steps: readonly DemoStep[] | null;
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 路由表（按 winnerId 找回胜出条目）。 */
  routes: readonly RouteEntry[];
}

/**
 * 胜出路由转发详情。
 */
export function WinnerCard({ steps, stepIndex, routes }: WinnerCardProps) {
  if (steps === null) {
    return null;
  }

  const doneIdx = steps.findIndex((s) => s.kind === 'done');
  const unreachableStep = doneIdx >= 0 && steps[doneIdx].unreachable === true ? steps[doneIdx] : null;

  // ---- 兜底：不可达（预设表含默认路由，正常不出现） ----
  if (unreachableStep !== null && stepIndex >= doneIdx) {
    return (
      <section className="panel rmd-winner-panel rmd-unreachable" role="alert" aria-live="polite">
        <span className="rmd-unreachable-badge" aria-hidden="true">
          ⚠
        </span>
        <div className="rmd-unreachable-body">
          <h3>目的网络不可达</h3>
          <p>{unreachableStep.description}</p>
        </div>
      </section>
    );
  }

  const winnerIdx = steps.findIndex((s) => s.kind === 'winner');
  if (winnerIdx < 0 || stepIndex < winnerIdx) {
    return null;
  }

  const winnerStep = steps[winnerIdx];
  const winner = routes.find((r) => r.id === winnerStep.winnerId) ?? null;
  if (winner === null) {
    return null;
  }

  const forwardIdx = steps.findIndex((s) => s.kind === 'forward');
  const showForward = forwardIdx >= 0 && stepIndex >= forwardIdx;
  const doneStep = doneIdx >= 0 && stepIndex >= doneIdx ? steps[doneIdx] : null;

  return (
    <section className="panel rmd-winner-panel" aria-label="胜出路由转发详情">
      <div className="rmd-winner-head">
        <h2 className="panel-title">🏆 胜出路由转发详情</h2>
        <p className="panel-caption">路由器按这条表项转发数据包</p>
      </div>

      <div className="rmd-winner-card">
        <div className="rmd-winner-route mono">
          <span className="rmd-winner-trophy" aria-hidden="true">
            🏆
          </span>
          #{winner.id} {winner.network}/{winner.prefix}
        </div>
        <dl className="rmd-result-grid">
          <div className="rmd-result-row">
            <dt>出接口</dt>
            <dd className="mono">{winner.interfaceName}</dd>
          </div>
          <div className="rmd-result-row">
            <dt>下一跳</dt>
            <dd className="mono">{winner.nextHop ?? '直连交付（无需下一跳）'}</dd>
          </div>
          <div className="rmd-result-row">
            <dt>路由类型</dt>
            <dd>{winner.type}</dd>
          </div>
          <div className="rmd-result-row">
            <dt>metric</dt>
            <dd className="mono">{winner.metric}</dd>
          </div>
        </dl>
        <p className="rmd-winner-reason">💡 {winnerStep.description}</p>
        {showForward && forwardIdx >= 0 && (
          <p className="rmd-forward-line">📮 {steps[forwardIdx].description}</p>
        )}
        {doneStep?.stats && (
          <div className="rmd-done-stats">
            <span className="rmd-done-title">本次经历</span>
            <span className="rmd-done-chip">{doneStep.stats.compares} 条比对</span>
            <span className="rmd-done-chip is-hit">{doneStep.stats.hits} 条命中</span>
            <span className="rmd-done-chip is-miss">{doneStep.stats.misses} 条不匹配</span>
            <span className="rmd-done-chip is-winner">🏆 #{doneStep.stats.winnerId} 胜出</span>
          </div>
        )}
      </div>
    </section>
  );
}
