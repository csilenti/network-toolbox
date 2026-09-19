/**
 * IP 划分演示工具内部的 UI 共享类型与常量。
 */

/** 表格 ↔ 树状图双向联动时的滚动请求：
 *  target 指明「哪个组件需要把 id 对应的行/卡片滚入可视区」。 */
export interface ScrollRequest {
  target: 'tree' | 'table';
  /** 子网序号（SubnetEntry.index，0 起始）。 */
  id: number;
  /** 递增序号，保证同一目标重复点击也能触发 effect。 */
  nonce: number;
}

/** 子网数 ≤ 该值时树状图使用真正的树状分层布局，否则切换为紧凑网格。 */
export const TREE_MODE_MAX = 16;

/** 入场动画的错峰基数（毫秒）。 */
export const STAGGER_MS = 90;
