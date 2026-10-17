/**
 * 子网掩码计算器的工具图标（内联 SVG，跟随 currentColor）。
 * 图形：一块地址条被掩码分界线切开 —— 左侧实心网络位、
 * 右侧虚线主机位，配一枚 CIDR 斜杠，呼应「掩码 ⇄ 前缀」主题。
 */
export function MaskCalcIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="6.5" width="18" height="11" rx="2.5" />
      {/* 掩码分界线（网络位 | 主机位） */}
      <path d="M10.5 6.5v11" />
      {/* 网络位：实心填充示意 */}
      <path d="M5.6 10h2.2M5.6 12h2.2M5.6 14h2.2" strokeWidth="1.9" />
      {/* 主机位：虚线示意 */}
      <path d="M13.5 12h5.5" strokeDasharray="1.6 2" strokeWidth="1.4" />
      {/* CIDR 斜杠 */}
      <path d="m15.5 16.8 2.6-9.6" strokeWidth="1.4" />
    </svg>
  );
}
