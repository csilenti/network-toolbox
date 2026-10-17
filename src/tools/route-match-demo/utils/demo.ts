/**
 * 路由匹配演示 —— 纯函数核心层（无任何 UI 依赖）。
 *
 *  - buildDemoSteps(ip, routes)：生成任务要求第六节的 11 步结构化步骤数组
 *    （arrive → compare×N → finals → winner → forward → done）；
 *    IP 校验复用 route-analysis 同源的解析纯函数（ip-subnet/utils/ip），
 *    非法 → ok:false + 中文教学化错误；
 *    compare 步用无符号 32 位位运算判定（与 route-analysis 的 queryRoute 完全同写法），
 *    并在 description 中给出 AND 比对值；
 *  - computeRouteStates(steps, stepIndex)：任意 stepIndex → 每条路由的当前视觉状态
 *    （pending / hit / miss / finalist / winner），累积状态由纯函数推导，无动画副作用。
 */
import { ipToDotted, maskBits, parseIpDetailed, prefixToMask } from '../../ip-subnet/utils/ip';
import type { RouteEntry } from '../../route-analysis/types';
import type { BuildDemoResult, DemoStep, DemoStats, RouteVisualState } from '../types';

/** 候选集的可读描述，如 "{#1: /0, #2: /24, #6: /25}"。 */
function describeCandidates(hits: readonly RouteEntry[]): string {
  const items = hits.map((r) => `#${r.id}: /${r.prefix}`);
  return `{${items.join(', ')}}`;
}

/**
 * 生成路由匹配演示的完整步骤数组（任务要求第六节）。
 *
 * 步骤结构：arrive(1) + compare(每条路由一步) + finals + winner + forward + done；
 * 无候选集（理论上预设表不会出现）时兜底为 arrive + compare×N + 不可达 done。
 * 恒不抛出异常：IP 或条目非法时返回 ok:false / 判为不匹配。
 */
export function buildDemoSteps(ip: string, routes: readonly RouteEntry[]): BuildDemoResult {
  const trimmed = ip.trim();
  if (trimmed === '') {
    return { ok: false, error: '目的 IP 为空：请输入目的 IP，例如 192.168.1.200' };
  }
  const parsed = parseIpDetailed(trimmed);
  if (!parsed.ok) {
    return { ok: false, error: `目的 IP 非法：${parsed.error.message}` };
  }

  const ipInt = parsed.value;
  const ipText = trimmed;
  const steps: DemoStep[] = [];

  // ---- Step 0：数据包到达 ----
  steps.push({
    id: 0,
    kind: 'arrive',
    title: '数据包到达',
    description: `📦 携带目的 IP ${ipText} 的数据包到达路由器，将按路由表从上到下逐条比对，寻找最匹配的路由。`,
  });

  // ---- Step 1~N：逐条比对（无符号 32 位位运算） ----
  const hits: RouteEntry[] = [];
  for (const route of routes) {
    const netResult = parseIpDetailed(route.network);
    const maskDotted = prefixToMask(route.prefix);
    const andInt = (ipInt & maskBits(route.prefix)) >>> 0;
    const andDotted = ipToDotted(andInt);
    const andText = `${ipText} AND ${maskDotted} = ${andDotted}`;
    const matched = netResult.ok && andInt === netResult.value;

    steps.push({
      id: steps.length,
      kind: 'compare',
      routeId: route.id,
      title: `比对 #${route.id} ${route.network}/${route.prefix}`,
      andText,
      matchState: matched ? 'hit' : 'miss',
      description: matched
        ? `${andText}，与网络地址 ${route.network} 相等 → ✓ 匹配，进入候选集（前缀 /${route.prefix}）`
        : `${andText}，与网络地址 ${route.network} 不相等 → ✗ 不匹配`,
    });
    if (matched) {
      hits.push(route);
    }
  }

  // ---- 兜底：无候选集 → 不可达（预设表含默认路由，正常不出现） ----
  if (hits.length === 0) {
    steps.push({
      id: steps.length,
      kind: 'done',
      title: '演示结束',
      unreachable: true,
      description:
        `没有任何路由条目匹配目的地址 ${ipText} → 目的网络不可达。` +
        '预设路由表包含 0.0.0.0/0 默认路由（匹配一切目的地址），正常不会出现这种情况。',
    });
    return { ok: true, steps };
  }

  // ---- Step N+1：决赛圈（候选集） ----
  const finalistIds = hits.map((r) => r.id);
  steps.push({
    id: steps.length,
    kind: 'finals',
    finalists: finalistIds,
    title: '决赛圈：谁的前缀最长？',
    description:
      `${routes.length} 条全部比对完毕：候选集 ${describeCandidates(hits)}（共 ${hits.length} 条）` +
      ' —— 前缀越长掩码越精确，谁的前缀最长谁就最匹配。',
  });

  // ---- Step N+2：胜出揭晓（最长前缀；等价时取表序靠前并文案说明） ----
  const maxPrefix = Math.max(...hits.map((r) => r.prefix));
  const longest = hits.filter((r) => r.prefix === maxPrefix);
  const winner = longest[0];
  const tieNote =
    longest.length > 1
      ? `最长前缀 /${maxPrefix} 有 ${longest.length} 条（等价路由，取表中靠前的 #${winner.id}，真实路由器会在其间负载均衡）`
      : `最长前缀 /${maxPrefix} 且唯一（/${maxPrefix} > 其余候选前缀）`;
  steps.push({
    id: steps.length,
    kind: 'winner',
    routeId: winner.id,
    winnerId: winner.id,
    title: `🏆 #${winner.id} ${winner.network}/${winner.prefix} 胜出`,
    description:
      `候选集 ${describeCandidates(hits)} 中 ${tieNote} → 🏆 #${winner.id} 胜出` +
      `（最长前缀匹配：目的地址 ${ipText} 落在 ${winner.network}/${winner.prefix} 网段内）`,
  });

  // ---- Step N+3：转发交付（直连 → 接口直接交付；静态/动态 → 下一跳） ----
  const forwardText =
    winner.nextHop === null
      ? `胜出条目 #${winner.id} 为${winner.type}路由：数据包从接口 ${winner.interfaceName} 直接交付给目的主机（无需下一跳）。`
      : `胜出条目 #${winner.id} 为${winner.type}路由：数据包从接口 ${winner.interfaceName} 转发至下一跳 ${winner.nextHop}。`;
  steps.push({
    id: steps.length,
    kind: 'forward',
    routeId: winner.id,
    winnerId: winner.id,
    title: '转发交付',
    description: forwardText,
  });

  // ---- Step N+4：完成总结（本次经历统计） ----
  const stats: DemoStats = {
    compares: routes.length,
    hits: hits.length,
    misses: routes.length - hits.length,
    winnerId: winner.id,
  };
  steps.push({
    id: steps.length,
    kind: 'done',
    winnerId: winner.id,
    stats,
    title: '完成总结',
    description:
      `本次演示结束：数据包共经历 ${stats.compares} 条比对（${stats.hits} 条命中、${stats.misses} 条不匹配），` +
      `最终由 🏆 #${winner.id} ${winner.network}/${winner.prefix} 胜出并完成转发。`,
  });

  return { ok: true, steps };
}

/**
 * 步骤 → 徽标映射纯函数：任意 stepIndex 映射出每条路由的当前视觉状态。
 *
 * 累积规则（状态不回退）：
 *  1. 已比对的 compare 步：hit → 'hit'，miss → 'miss'；
 *  2. 决赛圈步已过：候选集内的 'hit' 升级为 'finalist'；
 *  3. 胜出步已过：胜出条目标记 'winner'。
 * 未比对或 stepIndex 之前的步骤未涉及 → 'pending'。
 */
export function computeRouteStates(
  steps: readonly DemoStep[],
  stepIndex: number,
): Map<number, RouteVisualState> {
  const states = new Map<number, RouteVisualState>();
  if (steps.length === 0) {
    return states;
  }
  const clamped = Math.max(0, Math.min(stepIndex, steps.length - 1));

  // 1) compare 累积判定
  for (let i = 0; i <= clamped; i += 1) {
    const step = steps[i];
    if (step.kind === 'compare' && typeof step.routeId === 'number' && step.matchState) {
      states.set(step.routeId, step.matchState === 'hit' ? 'hit' : 'miss');
    }
  }

  // 2) finals 已过：候选集内的 hit 升级为 finalist
  const finalsIdx = steps.findIndex((s) => s.kind === 'finals');
  if (finalsIdx >= 0 && finalsIdx <= clamped && steps[finalsIdx].finalists) {
    for (const id of steps[finalsIdx].finalists as number[]) {
      if (states.get(id) === 'hit') {
        states.set(id, 'finalist');
      }
    }
  }

  // 3) winner 已过：胜出条目强标记
  const winnerIdx = steps.findIndex((s) => s.kind === 'winner');
  if (winnerIdx >= 0 && winnerIdx <= clamped && typeof steps[winnerIdx].winnerId === 'number') {
    states.set(steps[winnerIdx].winnerId as number, 'winner');
  }

  return states;
}
