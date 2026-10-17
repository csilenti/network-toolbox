import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { MatchStep, RouteEntry, RouteType } from '../types';
import { ROUTE_TYPES, parseRouteInput, validateMetric } from '../utils/route';
import { STAGGER_MS } from '../../ip-subnet/types';

/** 新增条目时向容器提交的完整载荷（已通过全部行内校验）。 */
export interface RouteAddPayload {
  network: string;
  prefix: number;
  interfaceName: string;
  nextHop: string | null;
  type: RouteType;
  metric: number;
}

export interface RouteTableProps {
  routes: RouteEntry[];
  /** 查询结果的逐条判定（与 routes 同序）。 */
  steps: MatchStep[];
  /** 决赛圈 routeId 列表。 */
  finalists: number[];
  /** 当前胜出条目 id；null 表示不可达或无有效查询。 */
  winnerId: number | null;
  /** 是否存在有效查询（决定徽标与原因是否展示）。 */
  active: boolean;
  onDelete: (id: number) => void;
  onAdd: (payload: RouteAddPayload) => void;
  /** 恢复默认教学路由表。 */
  onReset: () => void;
}

/** 卡片错峰入场延迟（与 mask-calc 同款）。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/** 条目上的实时判定徽标样式与文案。 */
function badgeOf(
  active: boolean,
  step: MatchStep | undefined,
  isWinner: boolean,
  prefix: number,
): { className: string; text: string } {
  if (!active || !step) {
    return { className: 'ra-badge-idle', text: '等待查询' };
  }
  if (isWinner) {
    return { className: 'ra-badge-winner', text: '🏆 选中' };
  }
  if (step.matched) {
    return { className: 'ra-badge-match', text: `✓ 匹配 · 前缀 ${prefix}` };
  }
  return { className: 'ra-badge-miss', text: '✗ 不匹配' };
}

/**
 * 路由表条目卡片列表（本工具专属视觉元素：条目卡片 + 匹配判定徽标）。
 * 支持删除、行内校验的新增表单与恢复默认；每条卡片实时显示
 * ✓ 匹配 · 前缀 N / ✗ 不匹配 / 🏆 选中 徽标与一句话判定原因。
 */
export function RouteTable(props: RouteTableProps) {
  const { routes, steps, finalists, winnerId, active, onDelete, onAdd, onReset } = props;

  // ---- 新增表单状态（行内校验，输入中不报错） ----
  const [networkText, setNetworkText] = useState('');
  const [interfaceText, setInterfaceText] = useState('eth0');
  const [nextHopText, setNextHopText] = useState('');
  const [type, setType] = useState<RouteType>('静态');
  const [metricText, setMetricText] = useState('10');

  const networkParse = useMemo(() => parseRouteInput(networkText), [networkText]);
  const networkError =
    networkText.trim() === '' ? null : networkParse.ok ? null : networkParse.error.message;
  const networkHint =
    networkParse.ok && networkParse.normalized
      ? `已归一化为网络地址 ${networkParse.network}/${networkParse.prefix}`
      : null;

  const metricCheck = useMemo(() => validateMetric(metricText), [metricText]);
  const metricError = metricCheck.ok ? null : metricCheck.message;

  const trimmedInterface = interfaceText.trim();
  const interfaceError = trimmedInterface === '' ? '接口名不能为空，例如 eth0' : null;

  const canAdd = networkParse.ok && metricCheck.ok && interfaceError === null;

  const stepById = useMemo(() => new Map(steps.map((s) => [s.routeId, s])), [steps]);
  const finalistSet = useMemo(() => new Set(finalists), [finalists]);

  const handleAdd = () => {
    if (!networkParse.ok || !metricCheck.ok || interfaceError !== null) return;
    const nextHop = type === '直连' || nextHopText.trim() === '' ? null : nextHopText.trim();
    onAdd({
      network: networkParse.network,
      prefix: networkParse.prefix,
      interfaceName: trimmedInterface,
      nextHop,
      type,
      metric: metricCheck.metric,
    });
    setNetworkText('');
    setNextHopText('');
  };

  return (
    <section className="panel tool-section ra-section" aria-label="教学路由表">
      <div className="ra-table-head">
        <div>
          <h2 className="panel-title">教学路由表</h2>
          <p className="panel-caption">
            每个条目实时显示判定徽标；「最长前缀匹配不是背出来的规则，是一条一条比出来的结果」
          </p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          恢复默认
        </button>
      </div>

      <div className="ra-route-list">
        {routes.length === 0 && (
          <p className="ra-empty" role="status">
            路由表为空：任何目的地址都不可达。可新增条目或点击「恢复默认」还原教学路由表。
          </p>
        )}
        {routes.map((routeItem, index) => {
          const step = stepById.get(routeItem.id);
          const isWinner = active && winnerId === routeItem.id;
          const isFinalist = active && step?.matched === true && !isWinner && finalistSet.has(routeItem.id);
          const badge = badgeOf(active, step, isWinner, routeItem.prefix);
          return (
            <article
              key={routeItem.id}
              className={`ra-route-card ${isWinner ? 'is-winner' : ''}`}
              style={stagger(index)}
              aria-label={`路由条目 #${routeItem.id}`}
            >
              <header className="ra-route-head">
                <span className="ra-route-id mono">#{routeItem.id}</span>
                <span className="ra-route-net mono">
                  {routeItem.network}/{routeItem.prefix}
                </span>
                <span className={`ra-badge ${badge.className}`} role="status">
                  {badge.text}
                </span>
                {isFinalist && <span className="ra-finalist-tag">决赛圈</span>}
                <button
                  type="button"
                  className="ra-delete-btn"
                  onClick={() => onDelete(routeItem.id)}
                  aria-label={`删除条目 #${routeItem.id}`}
                >
                  删除
                </button>
              </header>

              <div className="ra-route-meta">
                <span>
                  接口 <b className="mono">{routeItem.interfaceName}</b>
                </span>
                <span>
                  下一跳 <b className="mono">{routeItem.nextHop ?? '直连'}</b>
                </span>
                <span>
                  类型 <b>{routeItem.type}</b>
                </span>
                <span>
                  metric <b className="mono">{routeItem.metric}</b>
                </span>
              </div>

              {active && step && (
                <p className={`ra-reason ${step.matched ? 'is-match' : 'is-miss'}`}>{step.reason}</p>
              )}
            </article>
          );
        })}
      </div>

      {/* ---- 新增条目表单（行内校验，非法不进表） ---- */}
      <div className="ra-add-form">
        <h3 className="ra-add-title">新增路由条目</h3>
        <div className="ra-add-grid">
          <div className="field">
            <label className="ra-field-label" htmlFor="ra-add-network">
              目的网络 <span className="ra-field-hint">192.168.2.0/24 或 192.168.2.0 255.255.255.0</span>
            </label>
            <input
              id="ra-add-network"
              className={`text-input mono ${networkError ? 'is-invalid' : ''}`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="192.168.2.0/24"
              value={networkText}
              onChange={(e) => setNetworkText(e.target.value)}
              aria-invalid={networkError ? true : undefined}
              aria-describedby={networkError ? 'ra-add-network-error' : networkHint ? 'ra-add-network-hint' : undefined}
            />
            {networkError && (
              <p className="ra-field-error" id="ra-add-network-error" role="alert">
                {networkError}
              </p>
            )}
            {networkHint && (
              <p className="ra-form-hint" id="ra-add-network-hint" role="status">
                💡 {networkHint}
              </p>
            )}
          </div>

          <div className="field">
            <label className="ra-field-label" htmlFor="ra-add-interface">
              接口
            </label>
            <input
              id="ra-add-interface"
              className={`text-input mono ${interfaceError ? 'is-invalid' : ''}`}
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="eth0"
              value={interfaceText}
              onChange={(e) => setInterfaceText(e.target.value)}
              aria-invalid={interfaceError ? true : undefined}
              aria-describedby={interfaceError ? 'ra-add-interface-error' : undefined}
            />
            {interfaceError && (
              <p className="ra-field-error" id="ra-add-interface-error" role="alert">
                {interfaceError}
              </p>
            )}
          </div>

          <div className="field">
            <label className="ra-field-label" htmlFor="ra-add-nexthop">
              下一跳 <span className="ra-field-hint">直连可留空</span>
            </label>
            <input
              id="ra-add-nexthop"
              className="text-input mono"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder="192.168.2.1"
              value={nextHopText}
              onChange={(e) => setNextHopText(e.target.value)}
            />
          </div>

          <div className="field">
            <label className="ra-field-label" htmlFor="ra-add-type">
              类型
            </label>
            <select
              id="ra-add-type"
              className="text-input"
              value={type}
              onChange={(e) => setType(e.target.value as RouteType)}
            >
              {ROUTE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="ra-field-label" htmlFor="ra-add-metric">
              metric <span className="ra-field-hint">非负整数，越小越优</span>
            </label>
            <input
              id="ra-add-metric"
              className={`text-input mono ${metricError ? 'is-invalid' : ''}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="10"
              value={metricText}
              onChange={(e) => setMetricText(e.target.value)}
              aria-invalid={metricError ? true : undefined}
              aria-describedby={metricError ? 'ra-add-metric-error' : undefined}
            />
            {metricError && (
              <p className="ra-field-error" id="ra-add-metric-error" role="alert">
                {metricError}
              </p>
            )}
          </div>

          <div className="ra-add-actions">
            <button type="button" className="btn" disabled={!canAdd} onClick={handleAdd}>
              添加条目
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
