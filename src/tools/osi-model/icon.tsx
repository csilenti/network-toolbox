/**
 * OSI / TCP-IP 模型对照的工具图标（内联 SVG，跟随 currentColor）。
 * 图形：左右两组分层堆叠卡片 + 一条映射连线，呼应「双栈对照」主题。
 */
export function OsiModelIcon({ size = 20 }: { size?: number }) {
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
      {/* 左侧 OSI 堆叠（4 条示意） */}
      <rect x="2.5" y="3.5" width="8" height="3.4" rx="1" />
      <rect x="2.5" y="8.6" width="8" height="3.4" rx="1" />
      <rect x="2.5" y="13.7" width="8" height="3.4" rx="1" />
      <rect x="2.5" y="18.8" width="8" height="2.6" rx="1" />
      {/* 右侧 TCP/IP 堆叠（2 条示意） */}
      <rect x="16.5" y="3.5" width="5" height="7.4" rx="1" />
      <rect x="16.5" y="13.7" width="5" height="7.7" rx="1" />
      {/* 映射连线 */}
      <path d="M10.5 5.2H16.5" strokeDasharray="1.8 2" strokeWidth="1.4" />
      <path d="M10.5 20.1H16.5" strokeDasharray="1.8 2" strokeWidth="1.4" />
      <path d="M10.5 15.4H16.5" strokeWidth="1.4" />
    </svg>
  );
}
