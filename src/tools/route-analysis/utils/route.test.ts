/**
 * 路由表分析器 —— 纯函数计算层单元测试。
 * 覆盖任务要求第十二节全部用例：常规 / 边界 / 非法输入 / 归一化 / 分步数据。
 */
import { describe, expect, it } from 'vitest';
import { parseIpDetailed } from '../../ip-subnet/utils/ip';
import type { RouteEntry, QueryResult } from '../types';
import {
  DEFAULT_ROUTES,
  buildMatchSteps,
  buildWinnerSteps,
  parseRouteInput,
  queryRoute,
  validateMetric,
} from './route';

/** 辅助：取某条路由的判定步骤。 */
function stepOf(result: QueryResult, routeId: number) {
  const step = result.steps.find((s) => s.routeId === routeId);
  expect(step).toBeDefined();
  return step as NonNullable<typeof step>;
}

/** 辅助：构造路由条目（全部字段显式给出，类型安全）。 */
function entry(partial: Partial<RouteEntry> & Pick<RouteEntry, 'id' | 'network' | 'prefix'>): RouteEntry {
  return {
    interfaceName: 'eth0',
    nextHop: null,
    type: '静态',
    metric: 10,
    ...partial,
  };
}

/* ============================================================
 * 常规查询（默认教学路由表，任务要求第十二节「常规」5 条）
 * ============================================================ */

describe('常规：默认表查 192.168.1.200 → 胜出 #6 /25', () => {
  const r = queryRoute('192.168.1.200', DEFAULT_ROUTES);

  it('胜出 #6，前缀 25', () => {
    expect(r.winner?.id).toBe(6);
    expect(r.winner?.prefix).toBe(25);
    expect(r.winner?.network).toBe('192.168.1.128');
  });

  it('决赛圈含 #2 /24 与 #1 /0（表序 [1, 2, 6]）', () => {
    expect(r.finalists).toEqual([1, 2, 6]);
  });

  it('#3、#4、#5 不匹配，原因含 AND 结果与网络地址两个值', () => {
    for (const id of [3, 4, 5]) {
      const step = stepOf(r, id);
      expect(step.matched).toBe(false);
      expect(step.reason).toContain('不相等');
      expect(step.reason).toContain('网络地址');
    }
    expect(stepOf(r, 3).reason).toContain('192.168.1.0');
  });

  it('胜出原因说明最长前缀', () => {
    expect(r.winnerReason).toContain('#6');
    expect(r.winnerReason).toContain('/25');
    expect(r.winnerReason).toContain('最长前缀');
  });

  it('全部 6 条都有逐条判定', () => {
    expect(r.steps).toHaveLength(6);
    expect(r.steps.map((s) => s.routeId)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('常规：其余 4 条基础查询', () => {
  it('10.5.5.5 → 胜出 #4 /8', () => {
    const r = queryRoute('10.5.5.5', DEFAULT_ROUTES);
    expect(r.winner?.id).toBe(4);
    expect(r.winner?.prefix).toBe(8);
    expect(r.finalists).toEqual([1, 4]);
  });

  it('172.16.5.66 → 胜出 #5 /24（OSPF）', () => {
    const r = queryRoute('172.16.5.66', DEFAULT_ROUTES);
    expect(r.winner?.id).toBe(5);
    expect(r.winner?.type).toBe('OSPF');
  });

  it('8.8.8.8 → 胜出默认路由 #1（仅 /0 匹配）', () => {
    const r = queryRoute('8.8.8.8', DEFAULT_ROUTES);
    expect(r.winner?.id).toBe(1);
    expect(r.winner?.prefix).toBe(0);
    expect(r.finalists).toEqual([1]);
    expect(r.winnerReason).toContain('最长前缀');
  });

  it('直连胜出 nextHop 为 null；静态胜出给出下一跳', () => {
    const direct = queryRoute('192.168.1.200', DEFAULT_ROUTES);
    expect(direct.winner?.type).toBe('直连');
    expect(direct.winner?.nextHop).toBeNull();

    const staticRoute = queryRoute('8.8.8.8', DEFAULT_ROUTES);
    expect(staticRoute.winner?.type).toBe('静态');
    expect(staticRoute.winner?.nextHop).toBe('192.168.1.1');
  });
});

/* ============================================================
 * 边界（任务要求第十二节「边界」5 条）
 * ============================================================ */

describe('边界：/32 主机路由必然优先', () => {
  const routes: RouteEntry[] = [
    ...DEFAULT_ROUTES,
    entry({ id: 7, network: '192.168.1.200', prefix: 32, interfaceName: 'eth9' }),
  ];

  it('查 192.168.1.200 → 胜出 /32 而非 /25', () => {
    const r = queryRoute('192.168.1.200', routes);
    expect(r.winner?.id).toBe(7);
    expect(r.winner?.prefix).toBe(32);
    expect(r.finalists).toEqual([1, 2, 6, 7]);
  });

  it('/32 不影响相邻地址', () => {
    const r = queryRoute('192.168.1.201', routes);
    expect(r.winner?.id).toBe(6);
  });
});

describe('边界：默认路由兜底', () => {
  it('删除所有更长匹配后 0.0.0.0/0 仍命中任意 IP', () => {
    const onlyDefault = DEFAULT_ROUTES.filter((r) => r.id === 1);
    const r = queryRoute('203.0.113.9', onlyDefault);
    expect(r.winner?.id).toBe(1);
    expect(r.finalists).toEqual([1]);
  });

  it('删除默认路由且无其它匹配 → 不可达 + 教学提示', () => {
    const noDefault = DEFAULT_ROUTES.filter((r) => r.prefix > 0);
    const r = queryRoute('8.8.8.8', noDefault);
    expect(r.winner).toBeNull();
    expect(r.finalists).toEqual([]);
    expect(r.winnerReason).toContain('不可达');
    expect(r.winnerReason).toContain('0.0.0.0/0');
  });
});

describe('边界：同前缀冲突由 metric 决胜', () => {
  const routes: RouteEntry[] = [
    entry({ id: 1, network: '10.0.0.0', prefix: 24, interfaceName: 'eth0', nextHop: '10.0.0.1', metric: 20 }),
    entry({ id: 2, network: '10.0.0.0', prefix: 24, interfaceName: 'eth1', nextHop: '10.0.1.1', metric: 5 }),
    entry({ id: 3, network: '0.0.0.0', prefix: 0, nextHop: '192.168.1.1', metric: 10 }),
  ];

  it('metric 小者胜出，winnerReason 说明', () => {
    const r = queryRoute('10.0.0.77', routes);
    expect(r.winner?.id).toBe(2);
    expect(r.winnerReason).toContain('metric 最小（5）');
    expect(r.winnerReason).toContain('/24');
  });

  it('同前缀同 metric → 命中表中靠前者 + 等价路由提示', () => {
    const equal: RouteEntry[] = routes.map((r) =>
      r.id === 2 ? { ...r, metric: 20 } : r,
    );
    const r = queryRoute('10.0.0.77', equal);
    expect(r.winner?.id).toBe(1);
    expect(r.winnerReason).toContain('等价路由');
    expect(r.winnerReason).toContain('靠前');
    expect(r.winnerReason).toContain('负载均衡');
  });
});

describe('边界：网络地址 / 广播地址作为目的 IP', () => {
  it('192.168.1.0 同时落进 #2 /24 与 #3 /25 → /25 胜出', () => {
    const r = queryRoute('192.168.1.0', DEFAULT_ROUTES);
    expect(r.finalists).toEqual([1, 2, 3]);
    expect(r.winner?.id).toBe(3);
    expect(r.winner?.prefix).toBe(25);
  });

  it('广播地址 192.168.1.255 落进 #2 /24 与 #6 /25 → /25 胜出', () => {
    const r = queryRoute('192.168.1.255', DEFAULT_ROUTES);
    expect(r.finalists).toEqual([1, 2, 6]);
    expect(r.winner?.id).toBe(6);
  });

  it('0.0.0.0 作为目的 IP 仅被默认路由匹配', () => {
    const r = queryRoute('0.0.0.0', DEFAULT_ROUTES);
    expect(r.finalists).toEqual([1]);
    expect(r.winner?.id).toBe(1);
  });
});

/* ============================================================
 * 非法输入（任务要求第十二节「非法输入」）
 * ============================================================ */

describe('非法目的 IP（五种）', () => {
  const cases: Array<[string, string]> = [
    ['999.1.1.1', 'range'],
    ['192.168.1', 'format'],
    ['192.168.1.1.1', 'format'],
    ['abc', 'format'],
    ['１９２.１６８.１.１', 'format'],
  ];

  it.each(cases)('%s 被拒绝（kind = %s）', (ip, kind) => {
    const parsed = parseIpDetailed(ip);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.error.kind).toBe(kind);
      expect(parsed.error.message.length).toBeGreaterThan(0);
    }
  });

  it('queryRoute 对非法 IP 恒不抛异常，winner 为 null', () => {
    for (const [ip] of cases) {
      const r = queryRoute(ip, DEFAULT_ROUTES);
      expect(r.winner).toBeNull();
      expect(r.finalists).toEqual([]);
    }
  });
});

describe('非法条目输入（parseRouteInput）', () => {
  it('255.0.255.0 位不连续 → mask 错误', () => {
    const r = parseRouteInput('192.168.1.0 255.0.255.0');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('mask');
      expect(r.error.message).toContain('连续');
    }
  });

  it('/33 → prefix 错误', () => {
    const r = parseRouteInput('192.168.1.0/33');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('prefix');
      expect(r.error.message).toContain('0~32');
    }
  });

  it('缺段 192.168.1 → ip 错误', () => {
    const r = parseRouteInput('192.168.1/24');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('ip');
      expect(r.error.message).toContain('4 段');
    }
  });

  it('非数字段 → ip 错误', () => {
    const r = parseRouteInput('192.168.abc.0/24');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('ip');
  });

  it('超 255 段 → ip 错误', () => {
    const r = parseRouteInput('256.168.1.0/24');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('ip');
  });

  it('裸地址（无前缀无掩码）→ format 错误并给出示例', () => {
    const r = parseRouteInput('192.168.1.0');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe('format');
      expect(r.error.message).toContain('192.168.1.0/24');
    }
  });

  it('前缀非整数 → prefix 错误', () => {
    const r = parseRouteInput('192.168.1.0/abc');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('prefix');
  });

  it('空输入 → format 错误', () => {
    const r = parseRouteInput('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe('format');
  });
});

describe('metric 校验', () => {
  it('0 与 110 合法', () => {
    expect(validateMetric('0')).toEqual({ ok: true, metric: 0 });
    expect(validateMetric('110')).toEqual({ ok: true, metric: 110 });
    expect(validateMetric(' 10 ')).toEqual({ ok: true, metric: 10 });
  });

  it('-1、1.5、abc、空串、全角数字均非法', () => {
    for (const bad of ['-1', '1.5', 'abc', '', '１０']) {
      const r = validateMetric(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.message.length).toBeGreaterThan(0);
    }
  });
});

/* ============================================================
 * 归一化（任务要求第十二节）
 * ============================================================ */

describe('归一化', () => {
  it('192.168.1.123/24 → network 192.168.1.0，附提示标记', () => {
    const r = parseRouteInput('192.168.1.123/24');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.network).toBe('192.168.1.0');
      expect(r.prefix).toBe(24);
      expect(r.normalized).toBe(true);
      expect(r.normalizedFrom).toBe('192.168.1.123');
    }
  });

  it('已对齐的 192.168.1.0/24 不标记归一化', () => {
    const r = parseRouteInput('192.168.1.0/24');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.network).toBe('192.168.1.0');
      expect(r.normalized).toBe(false);
      expect(r.normalizedFrom).toBe('');
    }
  });

  it('掩码形式 192.168.1.0 255.255.255.0 → 前缀 24', () => {
    const r = parseRouteInput('192.168.1.0 255.255.255.0');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.network).toBe('192.168.1.0');
      expect(r.prefix).toBe(24);
      expect(r.normalized).toBe(false);
    }
  });

  it('掩码形式同样触发归一化：10.1.2.3 255.0.0.0 → 10.0.0.0', () => {
    const r = parseRouteInput('10.1.2.3 255.0.0.0');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.network).toBe('10.0.0.0');
      expect(r.prefix).toBe(8);
      expect(r.normalized).toBe(true);
      expect(r.normalizedFrom).toBe('10.1.2.3');
    }
  });

  it('/0 与 /32 两个端点前缀合法', () => {
    expect(parseRouteInput('0.0.0.0/0')).toMatchObject({ ok: true, prefix: 0 });
    expect(parseRouteInput('192.168.1.200/32')).toMatchObject({ ok: true, prefix: 32 });
  });
});

/* ============================================================
 * 分步数据（任务要求第七节）
 * ============================================================ */

describe('buildMatchSteps / buildWinnerSteps', () => {
  const entry6 = DEFAULT_ROUTES[5];

  it('胜出条目：3 步 AND 比对，含掩码、二进制、AND 结果', () => {
    const steps = buildMatchSteps('192.168.1.200', entry6);
    expect(steps).toHaveLength(3);
    expect(steps[0].detail).toContain('255.255.255.128');
    expect(steps[0].binary).toContain('10000000');
    expect(steps[1].detail).toBe('目的 IP 192.168.1.200 AND 255.255.255.128 = 192.168.1.128');
    expect(steps[2].detail).toContain('相等');
  });

  it('buildWinnerSteps 追加第 4 步决赛圈说明', () => {
    const result = queryRoute('192.168.1.200', DEFAULT_ROUTES);
    const steps = buildWinnerSteps('192.168.1.200', result);
    expect(steps).toHaveLength(4);
    expect(steps[3].title).toContain('决胜');
    expect(steps[3].detail).toContain('#6');
  });

  it('不匹配条目的第 3 步给出不相等原因', () => {
    const steps = buildMatchSteps('10.0.0.1', DEFAULT_ROUTES[1]);
    expect(steps).toHaveLength(3);
    expect(steps[2].detail).toContain('不相等');
  });

  it('不可达结果 → buildWinnerSteps 返回空数组', () => {
    const result = queryRoute('8.8.8.8', DEFAULT_ROUTES.filter((r) => r.prefix > 0));
    expect(result.winner).toBeNull();
    expect(buildWinnerSteps('8.8.8.8', result)).toEqual([]);
  });
});
