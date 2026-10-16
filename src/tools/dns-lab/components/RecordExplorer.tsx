/**
 * DNS Record Explorer —— 五种记录类型示例与解释（需求第十八节）。
 * 静态知识扩展区，不参与主动画。
 */
import { RECORD_EXPLAINER } from '../data';

/**
 * 记录类型浏览卡片。
 */
export function RecordExplorer() {
  return (
    <section className="panel rec-panel" style={{ animationDelay: '350ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">DNS Record Explorer</h2>
        <span className="panel-caption">A / AAAA / CNAME / MX / NS —— 五种常见记录类型</span>
      </div>

      <div className="rec-grid">
        {RECORD_EXPLAINER.map(({ record, explanation }) => (
          <article key={`${record.name}-${record.type}`} className="rec-card">
            <header className="rec-card-head">
              <span className={`rec-type rec-type-${record.type.toLowerCase()}`}>{record.type}</span>
              <span className="rec-name mono">{record.name}</span>
            </header>
            <p className="rec-value mono" title={record.value}>
              {record.value}
            </p>
            <p className="rec-explain">{explanation}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
