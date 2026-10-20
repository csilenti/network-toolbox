/**
 * OSI / TCP-IP 模型对照 —— 层详情面板（任务要求第四/五/八节）。
 * 展示选中/悬停层的四要素：功能说明 / 典型协议 chips / PDU / 设备 chips + 教学备注；
 * 未选中任何层时显示引导态。
 */
import type { LayerInfo } from '../types';

export interface LayerDetailProps {
  /** 当前展示层（悬停层优先于选中层）；null 表示引导态。 */
  layer: LayerInfo | null;
}

/** 详情区块：标题 + 内容。 */
function DetailBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="om-detail-block">
      <h4 className="om-detail-label">{label}</h4>
      <div className="om-detail-body">{children}</div>
    </div>
  );
}

/** chips 行：数组为空时显示占位「—」。 */
function Chips({ items }: { items: readonly string[] }) {
  if (items.length === 0) {
    return <span className="om-chip om-chip--empty">—（教学中通常不涉及）</span>;
  }
  return (
    <>
      {items.map((item) => (
        <span key={item} className="om-chip">
          {item}
        </span>
      ))}
    </>
  );
}

export function LayerDetail({ layer }: LayerDetailProps) {
  if (!layer) {
    return (
      <div className="om-detail om-detail--guide" role="status">
        <span className="om-guide-badge" aria-hidden="true">
          ?
        </span>
        <div>
          <h3 className="panel-title">层详情</h3>
          <p className="om-guide-text">点击或悬停任意层，查看该层的功能说明、典型协议、数据单元与设备。</p>
        </div>
      </div>
    );
  }

  const stackLabel = layer.stack === 'osi' ? 'OSI' : 'TCP/IP';

  return (
    <div className="om-detail" aria-live="polite">
      <div className="om-detail-head">
        <h3 className="panel-title">层详情</h3>
        <span className="om-detail-title">
          <span className="om-detail-stack">{stackLabel}</span>
          <span className="om-detail-num">第 {layer.number} 层</span>
          <strong>{layer.name}</strong>
          <span className="om-detail-en">{layer.nameEn}</span>
        </span>
      </div>

      <div className="om-detail-grid">
        <DetailBlock label="功能说明">{layer.duty}</DetailBlock>
        <DetailBlock label="数据单元 PDU">
          <span className="om-pdu">{layer.pdu}</span>
        </DetailBlock>
        <DetailBlock label="典型协议">
          <span className="om-chips">
            <Chips items={layer.protocols} />
          </span>
        </DetailBlock>
        <DetailBlock label="相关设备">
          <span className="om-chips">
            <Chips items={layer.devices} />
          </span>
        </DetailBlock>
      </div>

      {layer.note && (
        <aside className="om-note" role="note">
          <span className="om-note-badge" aria-hidden="true">
            💡
          </span>
          <p>{layer.note}</p>
        </aside>
      )}
    </div>
  );
}
