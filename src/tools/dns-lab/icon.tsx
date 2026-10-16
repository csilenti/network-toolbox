/**
 * DNS 域名解析演示 —— 工具图标（内联 SVG，跟随 currentColor）。
 * 图形：地球（根/层级）+ 放大镜（查询），表达「在域名层级中查找答案」。
 */
export function DnsLabIcon({ size = 20 }: { size?: number }) {
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
      {/* 地球轮廓 */}
      <circle cx="10.5" cy="10.5" r="7.2" />
      {/* 经线（子午线） */}
      <path d="M3.3 10.5h14.4" strokeWidth="1.4" />
      {/* 纬线上半弧 */}
      <path d="M10.5 3.3c2.2 2 3.4 4.5 3.4 7.2s-1.2 5.2-3.4 7.2c-2.2-2-3.4-4.5-3.4-7.2s1.2-5.2 3.4-7.2Z" strokeWidth="1.4" />
      {/* 放大镜：镜柄 + 镜圈（叠在地球右下角，表达「查询」） */}
      <circle cx="16.8" cy="16.8" r="3.4" strokeWidth="1.9" />
      <path d="m19.4 19.4 2.4 2.4" strokeWidth="1.9" />
    </svg>
  );
}
