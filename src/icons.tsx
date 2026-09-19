/**
 * 全站通用内联 SVG 图标（一律跟随 currentColor，不引入图标库）。
 */

export interface IconProps {
  size?: number;
}

/** 项目 Logo：三色网络拓扑节点（青 / 琥珀 / 灰紫，呼应全站语义色）。 */
export function BrandLogo({ size = 28 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="var(--accent-strong)" />
      <path
        d="M10 11h12M10 11l6 11M22 11l-6 11"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="10" cy="11" r="3.1" fill="#ffffff" />
      <circle cx="22" cy="11" r="3.1" fill="#FCD34D" />
      <circle cx="16" cy="22" r="3.1" fill="#C4B5FD" />
    </svg>
  );
}

/** 汉堡菜单（移动端抽屉开关）。 */
export function MenuIcon({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

/** 侧边栏折叠 / 展开箭头。 */
export function ChevronIcon({ size = 18 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

/** 侧边栏占位分组的小圆点图标。 */
export function DotIcon({ size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3.4" strokeDasharray="2.6 2.6" />
    </svg>
  );
}
