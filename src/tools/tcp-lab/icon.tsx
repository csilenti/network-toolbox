/**
 * TCP 连接演示 —— 工具图标（内联 SVG，跟随 currentColor）。
 * 图形：左右两个端点节点（生命线）+ 一来一回带箭头的报文连线，表达 TCP 握手。
 */
export function TcpLabIcon({ size = 20 }: { size?: number }) {
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
      {/* 左右两条生命线（端点节点） */}
      <path d="M5 4v16" />
      <path d="M19 4v16" />
      {/* A → B 的报文（带右向箭头） */}
      <path d="M5 9h10.5" strokeWidth="1.4" />
      <path d="m13.6 7 2.4 2-2.4 2" strokeWidth="1.4" />
      {/* B → A 的报文（带左向箭头） */}
      <path d="M19 15H8.5" strokeWidth="1.4" />
      <path d="m10.4 13-2.4 2 2.4 2" strokeWidth="1.4" />
    </svg>
  );
}
