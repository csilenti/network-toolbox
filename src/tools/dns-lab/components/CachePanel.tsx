/**
 * DNS 缓存面板 —— 展示客户端侧缓存记录与 TTL 倒计时（需求第十九/二十节）。
 * 倒计时由容器层的 interval 按模拟时间加速倍率递减（并非真实等待），
 * 仅在前端演示层面工作；TTL 归零显示 Cache Expired。
 */
import type { CacheEntry, TimeScaleOption } from '../types';

/** 可选的模拟时间加速倍率。 */
const TIME_SCALES: readonly TimeScaleOption[] = [1, 10, 100];

interface CachePanelProps {
  /** 是否开启缓存模拟。 */
  enabled: boolean;
  /** 当前缓存条目（domain → entry）。 */
  entries: Readonly<Record<string, CacheEntry>>;
  /** 模拟时间加速倍率。 */
  timeScale: TimeScaleOption;
  /** 正在解析 / 刚解析的域名（高亮显示）。 */
  activeDomain: string | null;
  onTimeScaleChange: (scale: TimeScaleOption) => void;
}

/**
 * 缓存与 TTL 面板。
 */
export function CachePanel({ enabled, entries, timeScale, activeDomain, onTimeScaleChange }: CachePanelProps) {
  if (!enabled) {
    return (
      <section className="panel cache-panel" style={{ animationDelay: '280ms' }}>
        <div className="panel-title-row">
          <h2 className="panel-title">DNS 缓存与 TTL</h2>
          <span className="panel-caption">未启用缓存模拟</span>
        </div>
        <div className="pkt-empty">
          <span aria-hidden="true">🗂</span>
          勾选顶部「模拟 DNS 缓存」后，这里将展示已缓存的记录与 TTL 倒计时
        </div>
      </section>
    );
  }

  const list = Object.values(entries);

  return (
    <section className="panel cache-panel" style={{ animationDelay: '280ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">DNS 缓存与 TTL</h2>
        <div className="dns-ctl-group">
          <span className="dns-ctl-label">模拟时间加速</span>
          <div className="dns-seg" role="group" aria-label="模拟时间加速倍率">
            {TIME_SCALES.map((scale) => (
              <button
                key={scale}
                type="button"
                className={`dns-seg-item${timeScale === scale ? ' is-active' : ''}`}
                onClick={() => onTimeScaleChange(scale)}
                aria-pressed={timeScale === scale}
              >
                {scale}×
              </button>
            ))}
          </div>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="pkt-empty">
          <span aria-hidden="true">🗂</span>
          尚无缓存记录 —— 完成一次完整解析后，结果会写入这里
        </div>
      ) : (
        <ul className="cache-list">
          {list.map((entry) => {
            const expired = entry.remaining <= 0;
            const percent = expired ? 0 : Math.round((entry.remaining / entry.total) * 100);
            const isActive = activeDomain === entry.domain;
            return (
              <li
                key={entry.domain}
                className={`cache-item${expired ? ' is-expired' : ''}${isActive ? ' is-active' : ''}`}
              >
                <div className="cache-item-head">
                  <span className="cache-domain mono">{entry.domain}</span>
                  {expired ? (
                    <span className="cache-expired-badge">Cache Expired</span>
                  ) : (
                    <span className="cache-ttl mono">TTL {entry.remaining}s</span>
                  )}
                </div>
                <div className="cache-item-body">
                  <span className="cache-value mono">
                    {entry.record.type} → {entry.record.value}
                  </span>
                  {!expired && (
                    <span className="cache-bar" aria-hidden="true">
                      <span className="cache-bar-fill" style={{ width: `${percent}%` }} />
                    </span>
                  )}
                </div>
                {expired && (
                  <p className="cache-expired-note">记录已过期，下次解析将重新走完整链路</p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
