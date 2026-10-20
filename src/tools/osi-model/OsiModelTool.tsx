/**
 * OSI / TCP-IP 模型对照 —— 工具容器（任务要求第四节双向联动交互）。
 * hoveredId / selectedId 双状态：悬停优先于选中，移出回落到选中层；
 * 点击持久选中，再点同一层取消。useMemo 派生当前展示层与对侧联动层集合。
 */
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { OSI_LAYERS, TCPIP_LAYERS } from './data';
import { getCounterpart } from './utils/mapping';
import type { LayerInfo } from './types';
import { LayerStack } from './components/LayerStack';
import { MappingLines } from './components/MappingLines';
import { LayerDetail } from './components/LayerDetail';
import { TeachingCard } from './components/TeachingCard';
import { STAGGER_MS } from '../ip-subnet/types';
import './osi-model.css';

/** 各区块的错峰入场延迟（沿用项目 stagger 模式）。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/** 在两份层数据中按 id 查找层。 */
function findLayer(id: string): LayerInfo | null {
  return OSI_LAYERS.find((l) => l.id === id) ?? TCPIP_LAYERS.find((l) => l.id === id) ?? null;
}

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

/**
 * OSI / TCP-IP 模型对照 —— 即时交互类工具（无播放控制）。
 * 数据流：hoveredId/selectedId → activeId → 详情面板 + 对侧联动高亮 + 连线高亮。
 */
export default function OsiModelTool() {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 悬停优先于选中：预览另一层时显示另一层信息，移出回到选中层
  const activeId = hoveredId ?? selectedId;

  /** 点击切换持久选中；再点同一层取消选中。 */
  const handleSelect = useCallback((layer: LayerInfo) => {
    setSelectedId((prev) => (prev === layer.id ? null : layer.id));
  }, []);

  /** 悬停进入 / 移出（null 表示移出）。 */
  const handleHover = useCallback((layer: LayerInfo | null) => {
    setHoveredId(layer ? layer.id : null);
  }, []);

  // ---- 派生：当前展示层 ----
  const activeLayer = useMemo(() => (activeId ? findLayer(activeId) : null), [activeId]);

  // ---- 派生：对侧联动层集合（映射连线两端之外的第三处高亮） ----
  const linkedIds = useMemo(() => {
    if (!activeId || !activeLayer) {
      return EMPTY_SET;
    }
    return new Set(getCounterpart(activeLayer.stack, activeId));
  }, [activeId, activeLayer]);

  return (
    <div className="tool om-tool">
      <header className="om-header">
        <h1>OSI / TCP-IP 模型对照</h1>
        <p className="om-subtitle">
          OSI 是理论参考模型，TCP/IP 是事实标准 —— 左右并排一点，对应关系一目了然。
          点击或悬停任一层，双向联动查看四要素。
        </p>
      </header>

      {/* a. 双栈对照板：左 OSI 七层 / 中映射连线 / 右 TCP-IP 四层 */}
      <section className="panel tool-section" style={stagger(0)}>
        <div className="om-board">
          <LayerStack
            stack="osi"
            title="OSI 七层"
            layers={OSI_LAYERS}
            activeId={activeId}
            linkedIds={linkedIds}
            onSelect={handleSelect}
            onHover={handleHover}
          />
          <MappingLines activeId={activeId} />
          <LayerStack
            stack="tcpip"
            title="TCP/IP 四层"
            layers={TCPIP_LAYERS}
            activeId={activeId}
            linkedIds={linkedIds}
            onSelect={handleSelect}
            onHover={handleHover}
          />
        </div>
        <p className="om-board-hint">
          悬停为临时预览，点击持久选中，再点同一层取消；激活层与它的对侧对应层会同步高亮。
        </p>
      </section>

      {/* b. 层详情面板（四要素） */}
      <section className="panel tool-section" style={stagger(1)}>
        <LayerDetail layer={activeLayer} />
      </section>

      {/* c. 教学卡 */}
      <section className="panel tool-section" style={stagger(2)}>
        <TeachingCard />
      </section>
    </div>
  );
}
