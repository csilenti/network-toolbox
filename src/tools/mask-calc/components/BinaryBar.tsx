import { useEffect, useRef, useState } from 'react';
import { ipToBinary, ipToOctets, maskBits } from '../../ip-subnet/utils/ip';
import { maskInfoOf } from '../utils/mask';

export interface BinaryBarProps {
  /** 32 位整数形式的 IP 地址。 */
  ip: number;
  /** CIDR 前缀（网络位数），0~32。 */
  prefix: number;
}

/**
 * 32 bit 二进制掩码位条（本工具专属视觉元素）：
 * 上半部为 IP 的 4 个 octet 十进制 + 32 个 bit 格子，
 * 按「网络位 | 主机位」双色着色（延续 ip-subnet 的三色语义中的两色）；
 * 下半部为掩码 32 bit 行，1 位即网络位、0 位即主机位，上下对齐。
 * 前缀变化时格子以 CSS transition 平滑换色并伴随一次向上脉冲。
 */
export function BinaryBar({ ip, prefix }: BinaryBarProps) {
  const bits = ipToBinary(ip);
  const octets = ipToOctets(ip);
  const maskBinary = ipToBinary(maskBits(prefix));
  const maskInfo = maskInfoOf(prefix);
  const hostBits = 32 - prefix;

  // ---- 前缀变化脉冲：受影响的 bit 区间短暂加动画类 ----
  const [pulseRange, setPulseRange] = useState<{ from: number; to: number } | null>(null);
  const prevPrefixRef = useRef<number>(prefix);

  useEffect(() => {
    const prev = prevPrefixRef.current;
    if (prev === prefix) return undefined;
    prevPrefixRef.current = prefix;
    setPulseRange({ from: Math.min(prev, prefix), to: Math.max(prev, prefix) });
    const timer = window.setTimeout(() => setPulseRange(null), 500);
    return () => window.clearTimeout(timer);
  }, [prefix]);

  const isPulsing = (i: number) =>
    pulseRange !== null && i >= pulseRange.from && i < pulseRange.to;

  return (
    <section className="mc-binary" aria-label="IP 与掩码的二进制位条">
      <div className="mc-binary-head">
        <h2 className="panel-title">二进制位条</h2>
        <span className="mc-binary-caption mono">
          {octets.join('.')}/{prefix} · 网络位 {prefix} bit · 主机位 {hostBits} bit
        </span>
      </div>

      <div className="mc-bit-block">
        <p className="mc-bit-block-title">
          IP 地址
          <span className="mono mc-bit-block-value">{octets.join('.')}/{prefix}</span>
        </p>

        {/* octet 十进制行：4 格，各跨 8 列 */}
        <div className="mc-bit-grid mc-octet-row" aria-hidden="true">
          {octets.map((o, i) => (
            <span key={`mc-oct-${i}`} className="mc-octet mono">
              {o}
            </span>
          ))}
        </div>

        {/* 32 bit 格子行：网络位 / 主机位双色 */}
        <div className="mc-bit-grid">
          {bits.split('').map((b, i) => {
            const isNet = i < prefix;
            const classes = [
              'mc-bit',
              isNet ? 'mc-bit-net' : 'mc-bit-host',
              i === prefix ? 'mc-seg-start' : '',
              isPulsing(i) ? 'is-pulsing' : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <span key={`ip-${i}`} className={classes} title={`第 ${i + 1} 位 · ${isNet ? '网络位' : '主机位'}`}>
                {b}
              </span>
            );
          })}
        </div>
      </div>

      {/* 掩码 32 bit 行 */}
      <div className="mc-bit-block mc-bit-block-mask">
        <p className="mc-bit-block-title">
          子网掩码
          <span className="mono mc-bit-block-value">
            {maskInfo.mask}（通配符 {maskInfo.wildcard}）
          </span>
        </p>
        <div className="mc-bit-grid">
          {maskBinary.split('').map((b, i) => (
            <span
              key={`mask-${i}`}
              className={`mc-bit ${b === '1' ? 'mc-bit-one' : 'mc-bit-zero'} ${i === prefix ? 'mc-seg-start' : ''}`}
              title={`掩码第 ${i + 1} 位`}
            >
              {b}
            </span>
          ))}
        </div>
        <p className="mc-mask-legend">
          <span className="mc-legend-dot mc-legend-net" aria-hidden="true" />
          掩码为 1 的位 = 网络位（{prefix} bit）
          <span className="mc-legend-dot mc-legend-host" aria-hidden="true" />
          掩码为 0 的位 = 主机位（{hostBits} bit）
        </p>
      </div>
    </section>
  );
}
