/**
 * 路由匹配演示 —— 侧边栏图标。
 * 意象：路由条目列表 + 沿列表向下遍历的路径箭头（逐条匹配）。
 */
export function RouteMatchDemoIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* 三条路由条目 */}
      <rect x="2.5" y="2.5" width="13" height="4.6" rx="1.4" />
      <rect x="5" y="9.7" width="13" height="4.6" rx="1.4" />
      <rect x="2.5" y="16.9" width="13" height="4.6" rx="1.4" />
      {/* 沿列表向下的匹配路径与箭头 */}
      <path d="M20.5 4v12.6" />
      <path d="M17.6 13.7l2.9 2.9 2.9-2.9" />
    </svg>
  );
}
