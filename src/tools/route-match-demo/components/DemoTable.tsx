/**
 * 路由表动画区 —— 视觉核心（任务要求第五节第 1 区）。
 *
 * 路由条目卡片纵向列表；当前判定条目上渲染 📦 数据包卡片，
 * 以 CSS keyframes 沿列表纵向飞入（时长随 --speed CSS 变量缩放，
 * key 绑定步骤 id 保证每步重放）；已判定条目保持 ✓ 高亮 / ✗ 灰化，
 * 候选集与胜出态由 computeRouteStates 纯函数推导（stepIndex 驱动，无动画副作用）。
 */
import { useMemo } from 'react';
import type { RouteEntry } from '../../route-analysis/types';
import type { DemoStep, RouteVisualState } from '../types';
import { computeRouteStates } from '../utils/demo';

/** 视觉状态 → 徽标文案。 */
const BADGE_TEXT: Record<RouteVisualState, string> = {
  pending: '… 未比对',
  hit: '✓ 匹配',
  miss: '✗ 不匹配',
  finalist: '候选集',
  winner: '🏆 胜出',
};

interface DemoTableProps {
  /** 路由表（只读复用 route-analysis 的 DEFAULT_ROUTES）。 */
  routes: readonly RouteEntry[];
  /** 当前步骤数组（null = 未开始，全部待定态）。 */
  steps: readonly DemoStep[] | null;
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 当前目的 IP（未开始为 null）。 */
  ip: string | null;
}

/**
 * 路由表动画区。
 */
export function DemoTable({ routes, steps, stepIndex, ip }: DemoTableProps) {
  // ---- 每条路由的累积视觉状态（stepIndex 纯函数映射） ----
  const states = useMemo(
    () => (steps ? computeRouteStates(steps, stepIndex) : new Map<number, RouteVisualState>()),
    [steps, stepIndex],
  );

  // ---- routeId → compare 步（行内展示 AND 比对式） ----
  const compareByRoute = useMemo(() => {
    const map = new Map<number, DemoStep>();
    if (steps) {
      for (const step of steps) {
        if (step.kind === 'compare' && typeof step.routeId === 'number') {
          map.set(step.routeId, step);
        }
      }
    }
    return map;
  }, [steps]);

  // ---- 当前步骤：compare / winner 时数据包飞到对应条目 ----
  const current = steps ? (steps[Math.min(stepIndex, steps.length - 1)] ?? null) : null;
  const currentRouteId =
    current !== null &&
    (current.kind === 'compare' || current.kind === 'winner' || current.kind === 'forward') &&
    typeof current.routeId === 'number'
      ? current.routeId
      : null;

  return (
    <section className="panel rmd-table-panel" aria-label="路由表动画区">
      <div className="rmd-table-head">
        <h2 className="panel-title">路由表动画区</h2>
        <p className="panel-caption">数据包一跳一跳往下问，问到最后才知道走哪条路</p>
      </div>

      <div className="rmd-packet-dock">
        <span className="rmd-packet-emoji" aria-hidden="true">
          📦
        </span>
        <span className="rmd-packet-name">数据包</span>
        <span className="rmd-packet-ip mono">
          目的 IP：{ip ?? '—（尚未开始）'}
        </span>
      </div>

      <ol className="rmd-route-list">
        {routes.map((route, index) => {
          const state = states.get(route.id) ?? 'pending';
          const compare = compareByRoute.get(route.id);
          const judged = state !== 'pending';
          const isCurrent = currentRouteId === route.id;
          const cls = [
            'rmd-route-card',
            `is-${state}`,
            isCurrent ? 'is-current' : '',
          ]
            .filter(Boolean)
            .join(' ');
          return (
            <li key={route.id} className={cls} style={{ animationDelay: `${index * 40}ms` }}>
              <div className="rmd-row-head">
                <span className="rmd-row-id mono">#{route.id}</span>
                <span className="rmd-row-net mono">
                  {route.network}/{route.prefix}
                </span>
                <span className={`rmd-row-badge is-badge-${state}`}>{BADGE_TEXT[state]}</span>
              </div>
              <div className="rmd-row-meta">
                <span>
                  接口 <b className="mono">{route.interfaceName}</b>
                </span>
                <span>{route.type}</span>
                <span>
                  下一跳 <b className="mono">{route.nextHop ?? '—（直连）'}</b>
                </span>
              </div>
              {judged && compare?.andText && (
                <p className="rmd-row-and mono">{compare.andText}</p>
              )}
              {isCurrent && current !== null && (
                <span key={`fly-${current.id}`} className="rmd-fly-packet" aria-hidden="true">
                  📦
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
