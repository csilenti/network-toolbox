/**
 * OSI / TCP-IP 模型对照 —— 左右两栏层堆叠（任务要求第四/五节）。
 * 每层显示 层号 + 中文名 + 英文名；悬停临时高亮、点击持久选中、再点取消。
 */
import type { LayerInfo, LayerStack } from '../types';

export interface LayerStackProps {
  /** 堆叠归属（仅用于生成有序语义类名）。 */
  stack: LayerStack;
  /** 栏标题（如「OSI 七层」）。 */
  title: string;
  /** 自上而下的层列表。 */
  layers: readonly LayerInfo[];
  /** 当前激活层（悬停优先于选中），该层加 is-active。 */
  activeId: string | null;
  /** 联动高亮的对侧层 id 集合，命中的层加 is-linked。 */
  linkedIds: ReadonlySet<string>;
  /** 点击切换持久选中（再点同一层取消）。 */
  onSelect: (layer: LayerInfo) => void;
  /** 悬停进入 / 移出（null 表示移出）。 */
  onHover: (layer: LayerInfo | null) => void;
}

/** 按层分组取配色组名：上层（应用族）/ 中层（传输+网络）/ 下层（链路+物理）。 */
function groupOf(layer: LayerInfo): string {
  if (layer.stack === 'tcpip') {
    if (layer.number === 4) return 'upper';
    if (layer.number === 3) return 'mid';
    return 'low';
  }
  if (layer.number >= 5) return 'upper';
  if (layer.number >= 3) return 'mid';
  return 'low';
}

export function LayerStack({
  stack,
  title,
  layers,
  activeId,
  linkedIds,
  onSelect,
  onHover,
}: LayerStackProps) {
  return (
    <div className={`om-stack-col om-stack-col--${stack}`}>
      <h3 className="om-stack-title">{title}</h3>
      <div className="om-stack" role="list" aria-label={title}>
        {layers.map((layer) => {
          const isActive = layer.id === activeId;
          const isLinked = linkedIds.has(layer.id);
          const classes = [
            'om-layer',
            `om-layer--${groupOf(layer)}`,
            isActive ? 'is-active' : '',
            isLinked ? 'is-linked' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <button
              key={layer.id}
              type="button"
              role="listitem"
              className={classes}
              aria-pressed={isActive}
              aria-label={`${layer.name}（${layer.nameEn}）`}
              onClick={() => onSelect(layer)}
              onMouseEnter={() => onHover(layer)}
              onMouseLeave={() => onHover(null)}
            >
              <span className="om-layer-num" aria-hidden="true">
                {layer.number}
              </span>
              <span className="om-layer-names">
                <span className="om-layer-name">{layer.name}</span>
                <span className="om-layer-en">{layer.nameEn}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
