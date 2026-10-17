/**
 * 类别切换标签：带宽/速率、数据大小、下载时间。
 */
import type { UnitCategory } from '../types';

/** 三个换算类别的标签配置。 */
const TABS: readonly { id: UnitCategory; label: string; hint: string }[] = [
  { id: 'bandwidth', label: '带宽 / 速率', hint: 'Mbps ⇄ MB/s' },
  { id: 'size', label: '数据大小', hint: 'KB ⇄ KiB' },
  { id: 'download-time', label: '下载时间', hint: '大小 ÷ 带宽' },
];

export interface CategoryTabsProps {
  /** 当前激活类别。 */
  category: UnitCategory;
  /** 切换回调。 */
  onChange: (category: UnitCategory) => void;
}

/** 三类别切换标签组（role=tablist，键盘可达）。 */
export function CategoryTabs({ category, onChange }: CategoryTabsProps) {
  return (
    <div className="uc-tabs" role="tablist" aria-label="换算类别">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={category === tab.id}
          className={`uc-tab${category === tab.id ? ' is-active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="uc-tab-label">{tab.label}</span>
          <span className="uc-tab-hint mono">{tab.hint}</span>
        </button>
      ))}
    </div>
  );
}
