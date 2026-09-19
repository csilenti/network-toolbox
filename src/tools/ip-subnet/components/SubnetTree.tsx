import { useEffect, useRef } from 'react';
import type { DivisionSuccess, SubnetEntry } from '../utils/subnet';
import { ipToDotted } from '../utils/ip';
import { scrollBehavior } from '../utils/motion';
import type { ScrollRequest } from '../types';
import { TREE_MODE_MAX } from '../types';

export interface SubnetTreeProps {
  division: DivisionSuccess;
  selectedId: number;
  onSelect: (id: number) => void;
  /** 表格侧发起的联动滚动请求（target === 'tree' 时生效）。 */
  scrollRequest: ScrollRequest | null;
}

/** 单张子网卡片（树模式与网格模式共用）。 */
function SubnetCard({
  entry,
  newPrefix,
  selected,
  onSelect,
  cardRef,
}: {
  entry: SubnetEntry;
  newPrefix: number;
  selected: boolean;
  onSelect: () => void;
  cardRef: (el: HTMLButtonElement | null) => void;
}) {
  return (
    <button
      type="button"
      ref={cardRef}
      className={`subnet-card mono ${selected ? 'is-selected' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
    >
      <span className="subnet-card-index">#{entry.index + 1}</span>
      <span className="subnet-card-cidr">
        {ipToDotted(entry.network)}/{newPrefix}
      </span>
      <span className="subnet-card-meta">
        {entry.usableHosts > 0 ? `可用 ${entry.usableHosts} 台` : '无可用主机'}
      </span>
    </button>
  );
}

/**
 * 树状图：
 *  - 子网 ≤ TREE_MODE_MAX 时使用真正的树状分层布局（根节点 + CSS 连接线）；
 *  - 超过时自动切换为紧凑网格卡片模式，避免 DOM 爆炸。
 * 与结果表格双向联动：接收 scrollRequest 把选中卡片滚入可视区
 * （用 scrollTop/scrollLeft 计算，禁用 scrollIntoView 以免影响外层滚动）。
 */
export function SubnetTree({ division, selectedId, onSelect, scrollRequest }: SubnetTreeProps) {
  const { baseNetwork, basePrefix, newPrefix, subnets } = division;
  const treeMode = subnets.length <= TREE_MODE_MAX;

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // 表格 → 树：把选中卡片滚入容器可视区（横纵双向判断）
  useEffect(() => {
    if (!scrollRequest || scrollRequest.target !== 'tree') return;
    const container = scrollRef.current;
    const el = cardRefs.current[scrollRequest.id];
    if (!container || !el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const behavior = scrollBehavior();
    if (eRect.left < cRect.left || eRect.right > cRect.right) {
      container.scrollTo({
        left: container.scrollLeft + (eRect.left - cRect.left) - 24,
        behavior,
      });
    }
    if (eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
      container.scrollTo({
        top: container.scrollTop + (eRect.top - cRect.top) - 24,
        behavior,
      });
    }
  }, [scrollRequest]);

  return (
    <section className="subnet-tree" aria-label="子网树状图">
      <div className="panel-title-row">
        <h2 className="panel-title">子网划分结果</h2>
        <span className="panel-caption">
          共 <strong className="mono">{subnets.length}</strong>{' '}
          个子网，点击卡片查看详情
        </span>
      </div>

      <div className="tree-scroll" ref={scrollRef}>
        {treeMode ? (
          <div className="tree-layout">
            {/* 根节点：原始网络 */}
            <div className="tree-root-row">
              <div className="tree-root-card mono">
                <span className="tree-root-label">原始网络</span>
                <span className="tree-root-cidr">
                  {ipToDotted(baseNetwork)}/{basePrefix}
                </span>
                {division.borrowedBits > 0 && (
                  <span className="tree-root-badge">
                    借 {division.borrowedBits} bit → /{newPrefix}
                  </span>
                )}
              </div>
            </div>

            {subnets.length > 1 && <div className="tree-stem" aria-hidden="true" />}

            {/* 子节点层：每个 child 自带垂直短线；水平总线由 ::after 拼接 */}
            <div className="tree-children">
              {subnets.map((entry) => (
                <div key={entry.index} className="tree-child">
                  <SubnetCard
                    entry={entry}
                    newPrefix={newPrefix}
                    selected={entry.index === selectedId}
                    onSelect={() => onSelect(entry.index)}
                    cardRef={(el) => {
                      cardRefs.current[entry.index] = el;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="subnet-grid">
            {subnets.map((entry) => (
              <SubnetCard
                key={entry.index}
                entry={entry}
                newPrefix={newPrefix}
                selected={entry.index === selectedId}
                onSelect={() => onSelect(entry.index)}
                cardRef={(el) => {
                  cardRefs.current[entry.index] = el;
                }}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
