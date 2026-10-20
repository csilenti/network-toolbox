/**
 * OSI / TCP-IP 模型对照 —— 层间映射连接线（任务要求第四/五节）。
 * SVG 绘制：默认淡色，交互时对应映射线描边高亮；≤720px 由 CSS 隐藏，
 * 改为对应层底色联动（见 osi-model.css）。
 */
import { MAPPING, OSI_LAYERS, TCPIP_LAYERS } from '../data';

export interface MappingLinesProps {
  /** 当前激活层（悬停优先于选中）；null 时全部连线保持淡色。 */
  activeId: string | null;
}

interface LineSeg {
  /** 连线唯一键：from->to。 */
  key: string;
  /** 起点纵坐标（OSI 侧，viewBox 百分比 0~100）。 */
  y1: number;
  /** 终点纵坐标（TCP/IP 侧）。 */
  y2: number;
  /** 是否随当前激活层高亮。 */
  isOn: boolean;
}

/** 层在自身堆叠中的垂直中心（0-based 索引 + 0.5）/ 总数 × 100。 */
function centerY(index: number, total: number): number {
  return ((index + 0.5) / total) * 100;
}

export function MappingLines({ activeId }: MappingLinesProps) {
  const tcpipIndex = new Map(TCPIP_LAYERS.map((layer, i) => [layer.id, i]));

  const segs: LineSeg[] = [];
  OSI_LAYERS.forEach((osi, i) => {
    const y1 = centerY(i, OSI_LAYERS.length);
    for (const target of MAPPING[osi.id] ?? []) {
      const j = tcpipIndex.get(target);
      if (j === undefined) continue;
      segs.push({
        key: `${osi.id}->${target}`,
        y1,
        y2: centerY(j, TCPIP_LAYERS.length),
        isOn: activeId === osi.id || activeId === target,
      });
    }
  });

  return (
    <svg
      className="om-lines"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {segs.map((seg) => (
        <path
          key={seg.key}
          className={`om-line${seg.isOn ? ' is-on' : ''}`}
          d={`M 0 ${seg.y1.toFixed(2)} C 40 ${seg.y1.toFixed(2)}, 60 ${seg.y2.toFixed(2)}, 100 ${seg.y2.toFixed(2)}`}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
