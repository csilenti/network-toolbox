/**
 * 网络单位换算计算器的工具图标（内联 SVG，跟随 currentColor）。
 * 图形：比特（小方块）→ 字节（大方块）的 8 倍关系，
 * 配上下双向换算箭头，呼应「任意单位 ⇄ 任意单位」主题。
 */
export function UnitCalcIcon({ size = 20 }: { size?: number }) {
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
      {/* 比特（小方块）→ 字节（大方块） */}
      <rect x="3" y="4.5" width="6" height="6" rx="1.5" />
      <rect x="13" y="3" width="8" height="9" rx="1.5" />
      <path d="M9.6 7.5h2.4" strokeWidth="1.4" />
      {/* 双向换算箭头 */}
      <path d="M4 14.5h13" />
      <path d="m14 11.5 3 3-3 3" />
      <path d="M20 20.5H7" />
      <path d="m10 17.5-3 3 3 3" />
    </svg>
  );
}
