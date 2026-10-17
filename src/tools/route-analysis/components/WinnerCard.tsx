import type { RouteEntry } from '../types';

export interface WinnerCardProps {
  /** 胜出路由；null = 目的网络不可达。 */
  winner: RouteEntry | null;
  /** 胜出原因 / 不可达原因（教学化文案，由纯函数层生成）。 */
  winnerReason: string;
}

/**
 * 胜出路由转发详情卡（任务要求第五节第 3 区）：
 * 直连 → 直接交付；静态/动态 → 转发给下一跳。
 * 不可达时显示教学提示卡（默认路由教学）。
 */
export function WinnerCard(props: WinnerCardProps) {
  const { winner, winnerReason } = props;

  if (winner === null) {
    return (
      <section className="panel tool-section ra-section ra-unreachable" role="alert" aria-live="polite">
        <span className="ra-unreachable-badge" aria-hidden="true">
          ⚠
        </span>
        <div className="ra-unreachable-body">
          <h3>目的网络不可达</h3>
          <p>{winnerReason}</p>
          <p className="ra-unreachable-tip">
            💡 0.0.0.0/0 是前缀最短的路由：它匹配一切目的地址，只在没有更长匹配时兜底 ——
            这正是「最长前缀匹配」的另一面。
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel tool-section ra-section" aria-label="胜出路由转发详情">
      <div className="ra-winner-head">
        <h2 className="panel-title">胜出路由转发详情</h2>
        <p className="panel-caption">路由器按这条表项转发数据包</p>
      </div>

      <div className="ra-winner-card">
        <div className="ra-winner-route mono">
          <span className="ra-winner-trophy" aria-hidden="true">
            🏆
          </span>
          #{winner.id} {winner.network}/{winner.prefix}
        </div>
        <dl className="ra-result-grid">
          <div className="ra-result-row">
            <dt>出接口</dt>
            <dd className="mono">{winner.interfaceName}</dd>
          </div>
          <div className="ra-result-row">
            <dt>下一跳</dt>
            <dd className="mono">{winner.nextHop ?? '直连交付（无需下一跳）'}</dd>
          </div>
          <div className="ra-result-row">
            <dt>路由类型</dt>
            <dd>{winner.type}</dd>
          </div>
          <div className="ra-result-row">
            <dt>metric</dt>
            <dd className="mono">{winner.metric}</dd>
          </div>
        </dl>
        <p className="ra-winner-reason">💡 {winnerReason}</p>
      </div>
    </section>
  );
}
