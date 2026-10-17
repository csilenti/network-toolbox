/**
 * 路由匹配演示 —— 数据模型（任务要求第八节）。
 *
 * 步骤数组由 buildDemoSteps 纯函数生成；判定徽标为「累积状态」，
 * 由 computeRouteStates 纯函数从 stepIndex 推导（无动画副作用）。
 */
import type { RouteEntry } from '../route-analysis/types';

/** 步骤类型（任务要求第六节的 11 步结构）。 */
export type DemoStepKind = 'arrive' | 'compare' | 'finals' | 'winner' | 'forward' | 'done';

/** 路由条目在动画区的视觉状态（纯函数映射的输出）。 */
export type RouteVisualState = 'pending' | 'hit' | 'miss' | 'finalist' | 'winner';

/** 播放速度倍率。 */
export type SpeedOption = 0.5 | 1 | 2 | 4;

/** done 步的「本次经历」统计。 */
export interface DemoStats {
  /** 本次比对的条目总数。 */
  compares: number;
  /** 命中（进入候选集）条数。 */
  hits: number;
  /** 不匹配条数。 */
  misses: number;
  /** 胜出条目 id。 */
  winnerId: number;
}

/** 结构化演示步骤（任务要求第八节 DemoStep）。 */
export interface DemoStep {
  /** 步骤 id，等于其在数组中的下标，恒连续递增。 */
  id: number;
  kind: DemoStepKind;
  /** 关联的路由条目 id（compare / winner / forward 步）。 */
  routeId?: number;
  title: string;
  description: string;
  /** compare 步的判定结果。 */
  matchState?: 'hit' | 'miss';
  /** compare 步的 AND 比对式，如 "192.168.1.200 AND 255.255.255.128 = 192.168.1.128"。 */
  andText?: string;
  /** finals 步：候选集 routeId（按表序）。 */
  finalists?: number[];
  /** winner / forward / done 步：胜出条目 id。 */
  winnerId?: number;
  /** done 步：本次经历统计。 */
  stats?: DemoStats;
  /** 无候选集兜底标记（预设表含默认路由，正常不出现）。 */
  unreachable?: boolean;
}

/** buildDemoSteps 的返回类型：非法 IP → ok:false + 中文错误。 */
export type BuildDemoResult =
  | { ok: true; steps: DemoStep[] }
  | { ok: false; error: string };

/** 导出条目类型，供本工具组件引用（只读复用 route-analysis 的类型定义）。 */
export type { RouteEntry };
