/**
 * IP 划分演示工具的工具图标（内联 SVG，跟随 currentColor）。
 * 图形：一枚被虚线切分的地址块 —— 呼应「子网划分」主题。
 */
export function IPSubnetIcon({ size = 20 }: { size?: number }) {
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
      <rect x="3" y="6" width="18" height="12" rx="2.5" />
      <path d="M9.5 6v12" strokeDasharray="2.4 2.2" />
      <circle cx="6.2" cy="12" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10.4" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="18.4" cy="13.6" r="0.9" fill="currentColor" stroke="none" />
      <path d="M15 10.4 18.4 13.6" strokeWidth="1.2" />
    </svg>
  );
}
