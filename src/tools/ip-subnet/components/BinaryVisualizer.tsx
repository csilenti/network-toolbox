import { useEffect, useRef, useState } from 'react';
import { ipToBinary, ipToOctets, maskBits, prefixToMask } from '../utils/ip';

export interface BinaryVisualizerProps {
  /** 归一化后的基准网络地址（32 位整数）。 */
  baseNetwork: number;
  /** 原始前缀（网络号边界）。 */
  basePrefix: number;
  /** 划分后的新前缀（未划分时等于 basePrefix）。 */
  newPrefix: number;
}

type Segment = 'net' | 'subnet' | 'host';

const SEG_CLASS: Record<Segment, string> = {
  net: 'bit-net',
  subnet: 'bit-subnet',
  host: 'bit-host',
};

const SEG_NAME: Record<Segment, string> = {
  net: '网络号',
  subnet: '子网号',
  host: '主机号',
};

/** 判断第 i 位（0 起始）属于哪个语义段。 */
function segmentOf(i: number, basePrefix: number, newPrefix: number): Segment {
  if (i < basePrefix) return 'net';
  if (i < newPrefix) return 'subnet';
  return 'host';
}

/**
 * 二进制可视化（核心视觉）：
 * 上半部为网络地址的 4 个 octet 十进制 + 32 个 bit 格子，
 * 按「网络号 | 子网号 | 主机号」三段着色并带标签括线与分隔竖线；
 * 下半部为子网掩码的 32 bit 行，与网络号区域上下对齐。
 *
 * 借位动画：前缀变化时，被借 / 释放的 bit 格子以 CSS transition 平滑换色，
 * 并伴随一次向上位移脉冲（reduced-motion 下全部关闭）。
 */
export function BinaryVisualizer({ baseNetwork, basePrefix, newPrefix }: BinaryVisualizerProps) {
  const bits = ipToBinary(baseNetwork);
  const octets = ipToOctets(baseNetwork);
  const maskArr = ipToBinary(maskBits(newPrefix));
  const borrowed = newPrefix - basePrefix;

  // ---- 借位脉冲：监测 newPrefix 变化，对受影响的 bit 区间短暂加动画类 ----
  const [pulseRange, setPulseRange] = useState<{ from: number; to: number } | null>(null);
  const prevNewPrefixRef = useRef<number>(newPrefix);

  useEffect(() => {
    const prev = prevNewPrefixRef.current;
    if (prev === newPrefix) return undefined;
    prevNewPrefixRef.current = newPrefix;
    setPulseRange({ from: Math.min(prev, newPrefix), to: Math.max(prev, newPrefix) });
    const timer = window.setTimeout(() => setPulseRange(null), 500);
    return () => window.clearTimeout(timer);
  }, [newPrefix]);

  const isPulsing = (i: number) =>
    pulseRange !== null && i >= pulseRange.from && i < pulseRange.to;

  return (
    <section className="binary-visualizer" aria-label="IP 地址二进制可视化">
      <div className="bv-head">
        <h2 className="panel-title">二进制结构</h2>
        <span className="bv-caption mono">
          {octets.join('.')}/{basePrefix}
          {borrowed > 0 ? ` → /${newPrefix}（借 ${borrowed} bit）` : ''}
        </span>
      </div>

      {/* ===== 上半部：网络地址 32 bit ===== */}
      <div className="bv-block">
        <p className="bv-block-title">
          网络地址
          <span className="mono bv-block-value">
            {octets.join('.')}/{newPrefix}
          </span>
        </p>

        {/* octet 十进制行：4 格，各跨 8 列 */}
        <div className="bv-grid bv-octet-row" aria-hidden="true">
          {octets.map((o, i) => (
            <span key={`oct-${i}`} className="bv-octet mono">
              {o}
            </span>
          ))}
        </div>

        {/* 语义段标签行（括线） */}
        <div className="bv-grid bv-label-row" aria-hidden="true">
          {basePrefix > 0 && (
            <span
              className="seg-label seg-label-net"
              style={{ gridColumn: `1 / span ${basePrefix}` }}
            >
              {SEG_NAME.net} · {basePrefix} bit
            </span>
          )}
          {borrowed > 0 && (
            <span
              className="seg-label seg-label-subnet"
              style={{ gridColumn: `${basePrefix + 1} / span ${borrowed}` }}
            >
              {SEG_NAME.subnet} · {borrowed} bit
            </span>
          )}
          {32 - newPrefix > 0 && (
            <span
              className="seg-label seg-label-host"
              style={{ gridColumn: `${newPrefix + 1} / span ${32 - newPrefix}` }}
            >
              {SEG_NAME.host} · {32 - newPrefix} bit
            </span>
          )}
        </div>

        {/* 32 bit 格子行 */}
        <div className="bv-grid bv-bit-row">
          {bits.split('').map((b, i) => {
            const seg = segmentOf(i, basePrefix, newPrefix);
            const classes = [
              'bit',
              SEG_CLASS[seg],
              i === basePrefix || i === newPrefix ? 'seg-start' : '',
              isPulsing(i) ? 'is-pulsing' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <span key={i} className={classes} title={`第 ${i + 1} 位 · ${SEG_NAME[seg]}`}>
                {b}
              </span>
            );
          })}
        </div>
      </div>

      {/* ===== 下半部：子网掩码 32 bit ===== */}
      <div className="bv-block bv-block-mask">
        <p className="bv-block-title">
          子网掩码
          <span className="mono bv-block-value">
            {prefixToMask(newPrefix)}/{newPrefix}
          </span>
        </p>
        <div className="bv-grid bv-bit-row bv-mask-row">
          {maskArr.split('').map((b, i) => {
            const classes = [
              'bit',
              'bit-mask',
              b === '1' ? 'bit-mask-one' : 'bit-mask-zero',
              i === newPrefix ? 'seg-start' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <span key={i} className={classes} title={`掩码第 ${i + 1} 位`}>
                {b}
              </span>
            );
          })}
        </div>
        <p className="bv-mask-legend">
          <span className="legend-dot legend-dot-one" aria-hidden="true" />
          掩码为 1 的位对应网络号
          {borrowed > 0 ? '与子网号' : ''}
          部分；为 0 的位对应主机号部分。
        </p>
      </div>
    </section>
  );
}
