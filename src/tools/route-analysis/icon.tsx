/**
 * 路由表分析器的工具图标（内联 SVG，跟随 currentColor）。
 * 图形：一根路标杆 + 两块指向相反方向的指示牌，
 * 呼应「一张路由表里该走哪条」的最长前缀匹配主题。
 */
export function RouteAnalysisIcon({ size = 20 }: { size?: number }) {
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
      {/* 路标杆 */}
      <path d="M12 21V3.5" />
      {/* 底座 */}
      <path d="M8.5 21h7" />
      {/* 右向指示牌（含箭头端） */}
      <path d="M12 4.5h5l2 2-2 2h-5z" />
      {/* 左向指示牌（含箭头端） */}
      <path d="M12 10H7l-2 2 2 2h5z" />
      {/* 路径分叉意象：标杆下的两条去向 */}
      <path d="M12 15.5c0 2 2.2 2.5 3.5 4" strokeDasharray="1.6 2" strokeWidth="1.4" />
      <path d="M12 15.5c0 2-2.2 2.5-3.5 4" strokeDasharray="1.6 2" strokeWidth="1.4" />
    </svg>
  );
}
