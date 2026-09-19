import type { DivisionSuccess, SubnetEntry } from '../utils/subnet';
import { ipToBinary, ipToDotted } from '../utils/ip';

export interface SubnetDetailProps {
  /** 当前选中的子网（父组件保证传入有效项）。 */
  entry: SubnetEntry;
  /** 所属划分结果（提供段边界与地址块大小）。 */
  division: DivisionSuccess;
}

/** 语义段配置：起止（0 起始，含头不含尾）、名称、色类。 */
const SEGMENTS = [
  { name: '网络号', cls: 'seg-net' },
  { name: '子网号', cls: 'seg-subnet' },
  { name: '主机号', cls: 'seg-host' },
] as const;

/**
 * 子网详情面板：
 * 左侧为地址信息列表，右侧为该子网的 32 bit 二进制分解（三段着色）
 * 与设备数量可视化（≤ 64 台用点阵，> 64 台用比例条 + 大数字）。
 */
export function SubnetDetail({ entry, division }: SubnetDetailProps) {
  const { basePrefix, newPrefix, blockSize } = division;
  const bits = ipToBinary(entry.network);
  const usable = entry.usableHosts;
  const hasUsable = usable > 0;

  // 设备数量可视化：点阵最多 64 个 DOM，超过则切换为比例条
  const dotsVisible = hasUsable && usable <= 64;

  const rows: Array<{ label: string; value: string; hint?: string }> = [
    { label: '网络地址', value: `${ipToDotted(entry.network)}/${newPrefix}` },
    {
      label: '第一个可用',
      value: entry.first !== null ? ipToDotted(entry.first) : '—',
      hint: hasUsable ? undefined : '主机位不足 2 位',
    },
    {
      label: '最后一个可用',
      value: entry.last !== null ? ipToDotted(entry.last) : '—',
    },
    { label: '广播地址', value: ipToDotted(entry.broadcast) },
    {
      label: '可用主机数',
      value: String(usable),
      hint: division.note ?? undefined,
    },
  ];

  return (
    <section className="subnet-detail" aria-label={`子网 ${entry.index + 1} 详情`}>
      <div className="panel-title-row">
        <h2 className="panel-title">
          子网 <span className="mono detail-index">#{entry.index + 1}</span> 详情
        </h2>
        <span className="detail-cidr mono">
          {ipToDotted(entry.network)}/{newPrefix}
        </span>
      </div>

      <div className="detail-grid">
        {/* ---- 左：地址信息 ---- */}
        <dl className="detail-info">
          {rows.map((row) => (
            <div key={row.label} className="detail-info-row">
              <dt>{row.label}</dt>
              <dd>
                <span className="mono detail-value">{row.value}</span>
                {row.hint && <span className="detail-hint">{row.hint}</span>}
              </dd>
            </div>
          ))}
        </dl>

        {/* ---- 右：二进制分解 + 设备可视化 ---- */}
        <div className="detail-visual">
          <p className="detail-subtitle">32 bit 二进制分解</p>
          <div className="mini-bits" role="img" aria-label="该子网网络地址的二进制分解">
            {bits.split('').map((b, i) => {
              const cls =
                i < basePrefix ? SEGMENTS[0].cls : i < newPrefix ? SEGMENTS[1].cls : SEGMENTS[2].cls;
              return (
                <span key={i} className={`mini-bit mono ${cls}`} title={`第 ${i + 1} 位`}>
                  {b}
                </span>
              );
            })}
          </div>
          <div className="detail-legend">
            <span className="legend-item">
              <span className="legend-dot legend-net" aria-hidden="true" />
              网络号 {basePrefix} bit
            </span>
            {newPrefix > basePrefix && (
              <span className="legend-item">
                <span className="legend-dot legend-subnet" aria-hidden="true" />
                子网号 {newPrefix - basePrefix} bit
              </span>
            )}
            <span className="legend-item">
              <span className="legend-dot legend-host" aria-hidden="true" />
              主机号 {32 - newPrefix} bit
            </span>
          </div>

          <p className="detail-subtitle">设备数量可视化</p>
          {dotsVisible ? (
            <div
              className="device-dots"
              role="img"
              aria-label={`每个方块代表 1 台可用设备，共 ${usable} 台`}
            >
              {Array.from({ length: usable }, (_, i) => (
                <span key={i} className="device-dot" title={`可用主机 #${i + 1}`} />
              ))}
            </div>
          ) : hasUsable ? (
            <div className="device-bar">
              <div className="device-bar-head">
                <span className="device-count mono">{usable.toLocaleString('en-US')}</span>
                <span className="device-bar-caption">
                  台可用主机 / 共 {blockSize.toLocaleString('en-US')} 个地址
                </span>
              </div>
              <div
                className="device-bar-track"
                role="img"
                aria-label={`可用主机 ${usable} 台，总地址 ${blockSize} 个`}
              >
                <div
                  className="device-bar-fill"
                  style={{ width: `${(usable / blockSize) * 100}%` }}
                />
              </div>
              <p className="device-bar-note">
                其中 2 个地址保留（网络地址与广播地址），其余可分配给主机。
              </p>
            </div>
          ) : (
            <p className="device-empty">
              该子网没有传统意义上的可用主机位（可用地址 0 台），因此没有可绘制的设备点阵。
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
