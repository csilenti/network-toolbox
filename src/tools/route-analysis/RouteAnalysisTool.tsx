import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { parseIpDetailed } from '../ip-subnet/utils/ip';
import { STAGGER_MS } from '../ip-subnet/types';
import { DEFAULT_ROUTES, buildWinnerSteps, queryRoute } from './utils/route';
import type { RouteEntry } from './types';
import { QueryInput } from './components/QueryInput';
import { RouteTable } from './components/RouteTable';
import type { RouteAddPayload } from './components/RouteTable';
import { WinnerCard } from './components/WinnerCard';
import { MatchSteps } from './components/MatchSteps';
import './route-analysis.css';

/** 默认演示值：任务要求第三节的经典示例 —— 输入即出完整判定过程。 */
const DEFAULT_IP = '192.168.1.200';

/** 各区块的错峰入场延迟。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/**
 * 路由表分析器 —— 工具容器。
 * 输入即算（useMemo 纯函数，无播放控制）：目的 IP + 可编辑路由表 →
 * 三级匹配判定（匹配筛选 → 最长前缀 → metric 决胜）全部由 utils/route.ts 派生，
 * 组件内不硬编码任何判定逻辑。
 */
export default function RouteAnalysisTool() {
  const [ipText, setIpText] = useState<string>(DEFAULT_IP);
  const [routes, setRoutes] = useState<RouteEntry[]>(() => DEFAULT_ROUTES.map((r) => ({ ...r })));

  // ---- 派生计算（纯函数 + useMemo） ----
  const ipParse = useMemo(() => parseIpDetailed(ipText), [ipText]);
  const waiting = ipText.trim() === '';
  const ipError = !waiting && !ipParse.ok ? ipParse.error.message : null;

  const result = useMemo(
    () => (ipParse.ok ? queryRoute(ipText, routes) : null),
    [ipParse, ipText, routes],
  );

  const winnerSteps = useMemo(
    () => (result !== null ? buildWinnerSteps(ipText, result) : []),
    [ipText, result],
  );

  // ---- 路由表管理 ----
  const handleDelete = useCallback((id: number) => {
    setRoutes((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleAdd = useCallback((payload: RouteAddPayload) => {
    setRoutes((prev) => {
      const nextId = prev.reduce((max, r) => Math.max(max, r.id), 0) + 1;
      const entry: RouteEntry = { id: nextId, ...payload };
      return [...prev, entry];
    });
  }, []);

  const handleReset = useCallback(() => {
    setRoutes(DEFAULT_ROUTES.map((r) => ({ ...r })));
  }, []);

  const handleExample = useCallback(() => setIpText(DEFAULT_IP), []);
  const handleClear = useCallback(() => setIpText(''), []);

  const active = ipParse.ok && result !== null;
  const winner = result?.winner ?? null;

  return (
    <div className="tool ra-tool">
      <header className="ra-header">
        <h1>路由表分析器</h1>
        <p className="ra-subtitle">
          最长前缀匹配不是背出来的规则，是一条一条比出来的结果 —— 逐条判定、决赛圈、三级决胜全程可见
        </p>
      </header>

      {/* a. 目的 IP 查询（输入即算） */}
      <QueryInput
        ipText={ipText}
        error={ipError}
        onIpChange={setIpText}
        onExample={handleExample}
        onClear={handleClear}
      />

      {/* 等待态：目的 IP 为空时不报错、不计算 */}
      {waiting && (
        <section className="panel ra-waiting tool-section ra-section" style={stagger(1)} role="status">
          <span className="ra-waiting-badge" aria-hidden="true">
            ⋯
          </span>
          <p>输入目的 IP 后自动分析：路由表逐条判定、决赛圈与胜出转发详情将实时呈现。</p>
        </section>
      )}

      {/* IP 非法：教学化错误卡 */}
      {ipError && (
        <section
          className="panel ra-error-card tool-section ra-section"
          role="alert"
          aria-live="polite"
          style={stagger(1)}
        >
          <div className="ra-error-head">
            <span className="ra-error-badge" aria-hidden="true">
              !
            </span>
            <p className="ra-error-summary">{ipError}</p>
          </div>
        </section>
      )}

      {/* b. 路由表（常驻：条目卡片 + 实时判定徽标 + 增删/恢复默认） */}
      <RouteTable
        routes={routes}
        steps={result?.steps ?? []}
        finalists={result?.finalists ?? []}
        winnerId={winner?.id ?? null}
        active={active}
        onDelete={handleDelete}
        onAdd={handleAdd}
        onReset={handleReset}
      />

      {/* c. 胜出路由转发详情 / 不可达教学提示 */}
      {result !== null && <WinnerCard winner={winner} winnerReason={result.winnerReason} />}

      {/* d. 匹配过程详解（胜出条目的 AND 逐步比对） */}
      {winner !== null && winnerSteps.length > 0 && <MatchSteps winner={winner} steps={winnerSteps} />}

      {/* 底部概念说明（任务要求第六节教学点） */}
      <footer className="ra-footnote tool-section ra-section" style={stagger(4)}>
        <ul className="ra-concepts">
          <li>
            <strong>三级决策：</strong>
            先做「目的IP AND 掩码 == 网络地址」的匹配筛选，再在候选集中取最长前缀，
            同前缀多条时按 metric 最小者胜出，metric 相同则命中表中靠前的一条（等价路由）。
          </li>
          <li>
            <strong>默认路由 0.0.0.0/0：</strong>
            掩码为 0，任何目的地址与它 AND 的结果都是 0.0.0.0 —— 匹配一切，但前缀最短，
            只在没有更长匹配时兜底。
          </li>
          <li>
            <strong>/32 主机路由：</strong>
            只匹配单个地址，前缀最长，一旦命中必然优先于所有网段路由。
          </li>
          <li>
            <strong>等价路由：</strong>
            同前缀且 metric 相同的多条路由在真实路由器上会做负载均衡；本工具按教学惯例
            命中表中靠前的一条并明确标记。
          </li>
        </ul>
      </footer>
    </div>
  );
}
