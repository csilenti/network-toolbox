/**
 * 路由匹配演示 —— 纯函数层单元测试。
 * 覆盖任务要求第十一节全部用例：步骤结构、判定正确性、胜出/转发文案、
 * 逐步映射一致性（全量遍历）、错误处理。
 */
import { describe, expect, it } from 'vitest';
import { DEFAULT_ROUTES, queryRoute } from '../../route-analysis/utils/route';
import type { RouteEntry } from '../../route-analysis/types';
import type { DemoStep } from '../types';
import { buildDemoSteps, computeRouteStates } from './demo';

/** 192.168.1.200 + 默认表的标准 11 步 kind 序列（任务要求第六节）。 */
const KIND_SEQ_200 = [
  'arrive',
  'compare',
  'compare',
  'compare',
  'compare',
  'compare',
  'compare',
  'finals',
  'winner',
  'forward',
  'done',
] as const;

/** 辅助：取出某步骤类型的全部步骤。 */
function stepsOfKind(steps: readonly DemoStep[], kind: DemoStep['kind']): DemoStep[] {
  return steps.filter((s) => s.kind === kind);
}

/** 辅助：按 routeId 取 compare 步。 */
function compareOf(steps: readonly DemoStep[], routeId: number): DemoStep {
  const step = steps.find((s) => s.kind === 'compare' && s.routeId === routeId);
  expect(step).toBeDefined();
  return step as DemoStep;
}

/* ============================================================
 * 步骤结构（任务要求第十一节第 1 组）
 * ============================================================ */

describe('步骤结构：默认表 + 192.168.1.200', () => {
  const result = buildDemoSteps('192.168.1.200', DEFAULT_ROUTES);

  it('ok:true 且总步数 = 1 + 6 + 4 = 11', () => {
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.steps).toHaveLength(11);
    }
  });

  it('kind 序列：arrive → compare×6 → finals → winner → forward → done', () => {
    if (result.ok) {
      expect(result.steps.map((s) => s.kind)).toEqual([...KIND_SEQ_200]);
    }
  });

  it('compare 步 routeId 顺序为 1~6（表序）', () => {
    if (result.ok) {
      expect(stepsOfKind(result.steps, 'compare').map((s) => s.routeId)).toEqual([1, 2, 3, 4, 5, 6]);
    }
  });

  it('id 连续递增（0~10）且每步 title/description 非空', () => {
    if (result.ok) {
      result.steps.forEach((step, idx) => {
        expect(step.id).toBe(idx);
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.description.length).toBeGreaterThan(0);
      });
    }
  });

  it('arrive 步说明数据包到达且含目的 IP', () => {
    if (result.ok) {
      const arrive = result.steps[0];
      expect(arrive.kind).toBe('arrive');
      expect(arrive.description).toContain('192.168.1.200');
      expect(arrive.description).toContain('到达');
    }
  });
});

/* ============================================================
 * 判定正确性（任务要求第十一节第 2 组）
 * ============================================================ */

describe('判定正确性：192.168.1.200', () => {
  const result = buildDemoSteps('192.168.1.200', DEFAULT_ROUTES);
  if (!result.ok) throw new Error('buildDemoSteps 应当成功');

  it('#1/#2/#6 hit，#3/#4/#5 miss', () => {
    expect(compareOf(result.steps, 1).matchState).toBe('hit');
    expect(compareOf(result.steps, 2).matchState).toBe('hit');
    expect(compareOf(result.steps, 6).matchState).toBe('hit');
    expect(compareOf(result.steps, 3).matchState).toBe('miss');
    expect(compareOf(result.steps, 4).matchState).toBe('miss');
    expect(compareOf(result.steps, 5).matchState).toBe('miss');
  });

  it('compare 步 description 给出精确 AND 比对值', () => {
    expect(compareOf(result.steps, 3).description).toContain(
      '192.168.1.200 AND 255.255.255.128 = 192.168.1.128',
    );
    expect(compareOf(result.steps, 4).description).toContain(
      '192.168.1.200 AND 255.0.0.0 = 192.0.0.0',
    );
    expect(compareOf(result.steps, 1).description).toContain(
      '192.168.1.200 AND 0.0.0.0 = 0.0.0.0',
    );
  });

  it('hit 步含「匹配」与前缀标注；miss 步含「不匹配」', () => {
    const hit6 = compareOf(result.steps, 6);
    expect(hit6.description).toContain('匹配');
    expect(hit6.description).toContain('/25');
    expect(hit6.andText).toBe('192.168.1.200 AND 255.255.255.128 = 192.168.1.128');
    const miss5 = compareOf(result.steps, 5);
    expect(miss5.description).toContain('不匹配');
  });

  it('finals 步候选集为表序 [1, 2, 6]', () => {
    const finals = stepsOfKind(result.steps, 'finals')[0];
    expect(finals.finalists).toEqual([1, 2, 6]);
  });
});

describe('判定正确性：其余三个预设 IP', () => {
  it('192.168.1.100：#3 hit、#6 miss（前缀 /25 内外分界）', () => {
    const r = buildDemoSteps('192.168.1.100', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    expect(compareOf(r.steps, 3).matchState).toBe('hit');
    expect(compareOf(r.steps, 6).matchState).toBe('miss');
    expect(compareOf(r.steps, 2).matchState).toBe('hit');
  });

  it('8.8.8.8：仅 #1 hit（默认路由兜底）', () => {
    const r = buildDemoSteps('8.8.8.8', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    const hits = stepsOfKind(r.steps, 'compare').filter((s) => s.matchState === 'hit');
    expect(hits.map((s) => s.routeId)).toEqual([1]);
  });

  it('10.5.5.5：仅 #1/#4 hit', () => {
    const r = buildDemoSteps('10.5.5.5', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    const hitIds = stepsOfKind(r.steps, 'compare')
      .filter((s) => s.matchState === 'hit')
      .map((s) => s.routeId);
    expect(hitIds).toEqual([1, 4]);
  });
});

/* ============================================================
 * 胜出与转发（任务要求第十一节第 3 组）
 * ============================================================ */

describe('胜出与转发文案', () => {
  it('192.168.1.200：winner 步含路由标识与「最长前缀」', () => {
    const r = buildDemoSteps('192.168.1.200', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    const winner = stepsOfKind(r.steps, 'winner')[0];
    expect(winner.winnerId).toBe(6);
    expect(winner.description).toContain('#6');
    expect(winner.description).toContain('最长前缀');
  });

  it('192.168.1.200：forward 步区分直连（eth1 直接交付）', () => {
    const r = buildDemoSteps('192.168.1.200', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    const forward = stepsOfKind(r.steps, 'forward')[0];
    expect(forward.description).toContain('eth1');
    expect(forward.description).toContain('直接交付');
  });

  it('8.8.8.8：forward 步区分静态（转发至下一跳 192.168.1.1）', () => {
    const r = buildDemoSteps('8.8.8.8', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    const forward = stepsOfKind(r.steps, 'forward')[0];
    expect(forward.description).toContain('下一跳');
    expect(forward.description).toContain('192.168.1.1');
  });

  it('10.5.5.5：胜出 #4 /8（静态，下一跳 10.0.0.1）', () => {
    const r = buildDemoSteps('10.5.5.5', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    const winner = stepsOfKind(r.steps, 'winner')[0];
    expect(winner.winnerId).toBe(4);
    expect(winner.description).toContain('最长前缀');
  });

  it('192.168.1.200：done 步统计 6 条比对 / 3 命中 / 3 不匹配 / #6 胜出', () => {
    const r = buildDemoSteps('192.168.1.200', DEFAULT_ROUTES);
    if (!r.ok) throw new Error('buildDemoSteps 应当成功');
    const done = stepsOfKind(r.steps, 'done')[0];
    expect(done.stats).toEqual({ compares: 6, hits: 3, misses: 3, winnerId: 6 });
    expect(done.description).toContain('6');
  });
});

/* ============================================================
 * 逐步映射一致性（任务要求第十一节第 4 组，全量遍历断言）
 * ============================================================ */

describe('逐步映射一致性：任意 stepIndex 与一次性 queryRoute 一致', () => {
  const IPS = ['192.168.1.200', '192.168.1.100', '8.8.8.8', '10.5.5.5'] as const;

  it.each(IPS)('%s：全量遍历每个 stepIndex，compare 累积状态与 queryRoute 一致', (ip) => {
    const built = buildDemoSteps(ip, DEFAULT_ROUTES);
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const steps = built.steps;

    // 一次性判定基准：命中集合与胜者
    const qr = queryRoute(ip, DEFAULT_ROUTES);
    const hitIds = new Set(qr.steps.filter((s) => s.matched).map((s) => s.routeId));
    expect(qr.winner).not.toBeNull();

    const finalsIdx = steps.findIndex((s) => s.kind === 'finals');
    const winnerIdx = steps.findIndex((s) => s.kind === 'winner');
    const winnerId = winnerIdx >= 0 ? steps[winnerIdx].winnerId : undefined;

    for (let k = 0; k < steps.length; k += 1) {
      const states = computeRouteStates(steps, k);
      for (const route of DEFAULT_ROUTES) {
        const state = states.get(route.id) ?? 'pending';
        const cIdx = steps.findIndex((s) => s.kind === 'compare' && s.routeId === route.id);
        expect(cIdx).toBeGreaterThanOrEqual(0);

        if (cIdx > k) {
          // 尚未比对 → 待定
          expect(state).toBe('pending');
          continue;
        }
        const cs = steps[cIdx];
        if (cs.matchState === 'miss') {
          expect(state).toBe('miss');
        } else if (winnerIdx >= 0 && winnerIdx <= k && winnerId === route.id) {
          expect(state).toBe('winner');
        } else if (finalsIdx >= 0 && finalsIdx <= k) {
          expect(state).toBe('finalist');
        } else {
          expect(state).toBe('hit');
        }
        // 与一次性 queryRoute 对齐：任何非 pending/miss 状态都应在命中集合中
        if (state !== 'pending' && state !== 'miss') {
          expect(hitIds.has(route.id)).toBe(true);
        }
      }
    }
  });

  it.each(IPS)('%s：stepIndex = 0（arrive）时全部 pending', (ip) => {
    const built = buildDemoSteps(ip, DEFAULT_ROUTES);
    if (!built.ok) throw new Error('buildDemoSteps 应当成功');
    const states = computeRouteStates(built.steps, 0);
    for (const route of DEFAULT_ROUTES) {
      expect(states.get(route.id) ?? 'pending').toBe('pending');
    }
  });

  it.each(IPS)('%s：末步时 winner 状态的路由 = queryRoute 胜者', (ip) => {
    const built = buildDemoSteps(ip, DEFAULT_ROUTES);
    if (!built.ok) throw new Error('buildDemoSteps 应当成功');
    const qr = queryRoute(ip, DEFAULT_ROUTES);
    const states = computeRouteStates(built.steps, built.steps.length - 1);
    const winnerStates = [...states.entries()].filter(([, v]) => v === 'winner');
    expect(winnerStates).toHaveLength(1);
    expect(winnerStates[0][0]).toBe(qr.winner?.id);
  });

  it('stepIndex 越界被钳制到末步（不抛异常）', () => {
    const built = buildDemoSteps('192.168.1.200', DEFAULT_ROUTES);
    if (!built.ok) throw new Error('buildDemoSteps 应当成功');
    expect(() => computeRouteStates(built.steps, 999)).not.toThrow();
    const states = computeRouteStates(built.steps, 999);
    expect(states.get(6)).toBe('winner');
  });
});

/* ============================================================
 * 错误处理（任务要求第十一节第 5 组）
 * ============================================================ */

describe('错误处理', () => {
  it('空 IP → ok:false + 中文错误', () => {
    const r = buildDemoSteps('', DEFAULT_ROUTES);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('IP');
      expect(r.error).toContain('请输入');
    }
  });

  it('纯空白 IP → ok:false', () => {
    const r = buildDemoSteps('   ', DEFAULT_ROUTES);
    expect(r.ok).toBe(false);
  });

  it.each(['999.1.1.1', '192.168.1', '192.168.1.1.1', 'abc', '１９２.１６８.１.２００'])(
    '非法 IP %s → ok:false + 非空中文错误',
    (ip) => {
      const r = buildDemoSteps(ip, DEFAULT_ROUTES);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toContain('非法');
        expect(r.error.length).toBeGreaterThan(0);
      }
    },
  );

  it('自定义路由表（子集）同样生成 1 + N + 4 步', () => {
    const small: RouteEntry[] = DEFAULT_ROUTES.slice(0, 2);
    const r = buildDemoSteps('8.8.8.8', small);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.steps).toHaveLength(1 + 2 + 4);
      expect(r.steps.map((s) => s.kind)).toEqual([
        'arrive',
        'compare',
        'compare',
        'finals',
        'winner',
        'forward',
        'done',
      ]);
    }
  });
});
