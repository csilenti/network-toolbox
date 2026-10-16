/**
 * 最终结果卡（需求第三十五节）：不只显示 IP，而是完整呈现解析结论。
 * 缓存命中路径显示 ⚡ Cache HIT 徽标与缩短后的链路。
 */
import type { DnsRecord } from '../types';

interface ResultCardProps {
  /** 解析的域名。 */
  domain: string;
  /** 最终答案记录。 */
  record: DnsRecord;
  /** 是否为缓存命中路径。 */
  cacheHit: boolean;
  /** 经历的路径描述。 */
  pathText: string;
  onReplay: () => void;
  /** 查看完整解析过程（回到第 1 步）；缓存命中路径不提供。 */
  onReview: () => void;
}

/**
 * 结果卡面板。
 */
export function ResultCard({ domain, record, cacheHit, pathText, onReplay, onReview }: ResultCardProps) {
  return (
    <section className="panel result-panel" style={{ animationDelay: '0ms' }}>
      <div className="result-head">
        <h2 className="result-title">✓ DNS 解析完成</h2>
        {cacheHit && <span className="result-hit-badge">⚡ Cache HIT</span>}
      </div>

      <div className="result-mapping">
        <span className="result-domain mono">{domain}</span>
        <span className="result-arrow" aria-hidden="true">
          ↓
        </span>
        <span className="result-ip mono">{record.value}</span>
      </div>

      <dl className="result-rows">
        <div className="result-row">
          <dt>查询类型</dt>
          <dd className="mono">{record.type}</dd>
        </div>
        <div className="result-row">
          <dt>TTL</dt>
          <dd className="mono">{record.ttl ?? 3600}s</dd>
        </div>
      </dl>

      <div className="result-path">
        <span className="result-path-label">本次经历</span>
        <span className="result-path-text">{pathText}</span>
      </div>

      <div className="result-actions">
        <button type="button" className="btn btn-primary" onClick={onReplay}>
          ↻ 再次解析
        </button>
        {!cacheHit && (
          <button type="button" className="btn" onClick={onReview}>
            查看完整解析过程
          </button>
        )}
      </div>
    </section>
  );
}
