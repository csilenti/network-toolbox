/**
 * 结果区：换算结果网格（grid 模式）或下载时间结果卡（duration 模式）。
 * grid 模式下源单位位置显示输入回显并高亮，其余单位逐个展示换算结果。
 */
import { formatNumber } from '../utils/units';
import type { UnitDef } from '../types';

/** 换算结果网格的单行数据。 */
export interface ResultRow {
  unit: UnitDef;
  value: number;
}

/** 结果区数据模型（判别联合：网格 / 时长卡）。 */
export type ResultGridModel =
  | { mode: 'grid'; sourceUnit: UnitDef; sourceEcho: string; rows: ResultRow[] }
  | { mode: 'duration'; headline: string; isEmptyFile: boolean; summary: string };

export type ResultGridProps = { model: ResultGridModel };

/** 单位小标签：标注体系与进制（教学提示）。 */
function unitTag(u: UnitDef): string {
  if (u.kind === 'bit-rate') {
    return '比特率 · 1000 进制';
  }
  if (u.kind === 'byte-rate') {
    return '字节率 · 1000 进制';
  }
  return u.system === 'binary' ? '二进制 · 1024 进制' : '十进制 · 1000 进制';
}

/** 换算结果网格：源单位高亮回显 + 其余全部单位。 */
function GridResult({ sourceUnit, sourceEcho, rows }: Extract<ResultGridModel, { mode: 'grid' }>) {
  return (
    <section aria-label="换算结果">
      <div className="uc-result-head">
        <h2 className="panel-title">换算结果</h2>
        <span className="uc-result-caption mono">
          {sourceEcho} {sourceUnit.label}
        </span>
      </div>
      <div className="uc-result-grid">
        <div className="uc-result-cell is-source">
          <span className="uc-result-unit">{unitTag(sourceUnit)}</span>
          <span className="uc-result-value mono">{sourceEcho}</span>
          <span className="uc-result-tag">输入（{sourceUnit.label}）</span>
        </div>
        {rows.map((row) => (
          <div key={row.unit.id} className="uc-result-cell">
            <span className="uc-result-unit">{unitTag(row.unit)}</span>
            <span className="uc-result-value mono">{formatNumber(row.value)}</span>
            <span className="uc-result-tag">{row.unit.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 下载时间结果卡：大字时长 + 输入摘要。 */
function DurationResult({ headline, isEmptyFile, summary }: Extract<ResultGridModel, { mode: 'duration' }>) {
  return (
    <section aria-label="下载时间结果">
      <div className="uc-result-head">
        <h2 className="panel-title">理论下载时间</h2>
        <span className="uc-result-caption">理论峰值</span>
      </div>
      <div className="uc-duration">
        <p className="uc-duration-value mono">{headline}</p>
        <p className="uc-duration-summary">
          {summary}
          {isEmptyFile ? ' · 文件为空，无需传输' : ''}
        </p>
      </div>
    </section>
  );
}

/** 结果区组件入口：按 model.mode 分发。 */
export function ResultGrid({ model }: ResultGridProps) {
  return model.mode === 'grid' ? <GridResult {...model} /> : <DurationResult {...model} />;
}
