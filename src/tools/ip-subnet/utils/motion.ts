/**
 * 动效相关的浏览器环境辅助函数。
 * 集中处理 prefers-reduced-motion，使 JS 驱动的滚动行为与 CSS 降级保持一致。
 */

/** 用户是否偏好减少动态效果。 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 根据系统动效偏好返回滚动行为。 */
export function scrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
