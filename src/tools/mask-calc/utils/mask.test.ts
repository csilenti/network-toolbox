/**
 * 子网掩码计算器 —— 纯函数计算层单元测试。
 * 覆盖任务要求第十三节全部用例：正常 / 边界 / 非法 / 0~32 全量往返一致性。
 */
import { describe, expect, it } from 'vitest';
import { prefixToMask } from '../../ip-subnet/utils/ip';
import {
  calcSubnet,
  calcSubnetFromInt,
  isValidMask,
  maskInfoOf,
  maskToPrefix,
  suggestNearestMask,
} from './mask';
import { buildSteps } from './steps';

/** 辅助：断言 maskToPrefix 成功并返回前缀。 */
function expectPrefix(mask: string, prefix: number) {
  const r = maskToPrefix(mask);
  expect(typeof r).toBe('number');
  expect(r).toBe(prefix);
}

/** 辅助：断言 maskToPrefix 失败并返回指定 kind 的错误。 */
function expectMaskError(mask: string, kind: 'format' | 'range' | 'discontinuous') {
  const r = maskToPrefix(mask);
  expect(typeof r).not.toBe('number');
  expect((r as { error: { kind: string } }).error.kind).toBe(kind);
}

describe('正常输入：/24 + 192.168.1.100', () => {
  const r = calcSubnet('192.168.1.100', 24);
  it('计算成功', () => expect(r.ok).toBe(true));

  it('network = 192.168.1.0', () => {
    expect(r.ok && r.info.network).toBe('192.168.1.0');
  });
  it('broadcast = 192.168.1.255', () => {
    expect(r.ok && r.info.broadcast).toBe('192.168.1.255');
  });
  it('usable = 254', () => {
    expect(r.ok && r.info.usableHosts).toBe(254);
  });
  it('range = 192.168.1.1 ~ 192.168.1.254', () => {
    expect(r.ok && r.info.firstUsable).toBe('192.168.1.1');
    expect(r.ok && r.info.lastUsable).toBe('192.168.1.254');
  });
  it('C 类', () => {
    expect(r.ok && r.info.ipClass).toBe('C');
  });
  it('total = 256，wildcard = 0.0.0.255', () => {
    expect(r.ok && r.info.totalHosts).toBe(256);
    expect(r.ok && r.maskInfo.wildcard).toBe('0.0.0.255');
  });
});

describe('正常输入：其他前缀', () => {
  it('/16 + 172.16.5.9 → B 类、私有地址标记', () => {
    const r = calcSubnet('172.16.5.9', 16);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.info.ipClass).toBe('B');
    expect(r.info.isPrivate).toBe(true);
    expect(r.info.privateNote).toContain('RFC 1918');
    expect(r.info.network).toBe('172.16.0.0');
  });

  it('/8 + 10.1.2.3 → A 类、私有，usable = 16777214', () => {
    const r = calcSubnet('10.1.2.3', 8);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.info.ipClass).toBe('A');
    expect(r.info.isPrivate).toBe(true);
    expect(r.info.network).toBe('10.0.0.0');
    expect(r.info.broadcast).toBe('10.255.255.255');
    expect(r.info.usableHosts).toBe(16777214);
  });

  it('/28 + 192.168.1.100 → usable 14，range 正确', () => {
    const r = calcSubnet('192.168.1.100', 28);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.info.network).toBe('192.168.1.96');
    expect(r.info.broadcast).toBe('192.168.1.111');
    expect(r.info.usableHosts).toBe(14);
    expect(r.info.firstUsable).toBe('192.168.1.97');
    expect(r.info.lastUsable).toBe('192.168.1.110');
  });

  it('掩码 255.255.255.240 ⇄ /28 双向换算一致', () => {
    expectPrefix('255.255.255.240', 28);
    expect(prefixToMask(28)).toBe('255.255.255.240');
  });

  it('公网地址 8.8.8.8/24 → 非私有', () => {
    const r = calcSubnet('8.8.8.8', 24);
    expect(r.ok && r.info.isPrivate).toBe(false);
  });

  it('回环 127.0.0.1/8 → 标记为回环地址', () => {
    const r = calcSubnet('127.0.0.1', 8);
    expect(r.ok && r.info.isPrivate).toBe(true);
    expect(r.ok && r.info.privateNote).toContain('回环');
  });

  it('D 类 224.0.0.5、E 类 250.1.2.3', () => {
    const d = calcSubnet('224.0.0.5', 24);
    const e = calcSubnet('250.1.2.3', 8);
    expect(d.ok && d.info.ipClass).toBe('D');
    expect(e.ok && e.info.ipClass).toBe('E');
  });
});

describe('边界值', () => {
  it('/31：usable=2，range=两地址，total=2（RFC 3021）', () => {
    const r = calcSubnet('10.0.0.2', 31);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.info.totalHosts).toBe(2);
    expect(r.info.usableHosts).toBe(2);
    expect(r.info.network).toBe('10.0.0.2');
    expect(r.info.broadcast).toBe('10.0.0.3');
    expect(r.info.firstUsable).toBe('10.0.0.2');
    expect(r.info.lastUsable).toBe('10.0.0.3');
  });

  it('/32：usable=1，range=单地址，wildcard=0.0.0.0', () => {
    const r = calcSubnet('192.168.1.100', 32);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.info.totalHosts).toBe(1);
    expect(r.info.usableHosts).toBe(1);
    expect(r.info.network).toBe('192.168.1.100');
    expect(r.info.broadcast).toBe('192.168.1.100');
    expect(r.info.firstUsable).toBe('192.168.1.100');
    expect(r.info.lastUsable).toBe('192.168.1.100');
    expect(r.maskInfo.wildcard).toBe('0.0.0.0');
    expect(r.maskInfo.mask).toBe('255.255.255.255');
  });

  it('/0：mask=0.0.0.0，network=0.0.0.0，broadcast=255.255.255.255，usable=2^32−2', () => {
    const r = calcSubnet('192.168.1.100', 0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.maskInfo.mask).toBe('0.0.0.0');
    expect(r.maskInfo.wildcard).toBe('255.255.255.255');
    expect(r.info.network).toBe('0.0.0.0');
    expect(r.info.broadcast).toBe('255.255.255.255');
    expect(r.info.totalHosts).toBe(4294967296);
    expect(r.info.usableHosts).toBe(4294967294);
    expect(r.info.firstUsable).toBe('0.0.0.1');
    expect(r.info.lastUsable).toBe('255.255.255.254');
  });

  it('/1：usable=2^31−2，network=128.0.0.0', () => {
    const r = calcSubnet('192.168.1.100', 1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.maskInfo.mask).toBe('128.0.0.0');
    expect(r.info.network).toBe('128.0.0.0');
    expect(r.info.broadcast).toBe('255.255.255.255');
    expect(r.info.totalHosts).toBe(2147483648);
    expect(r.info.usableHosts).toBe(2147483646);
  });

  it('/30：usable=2（最小常规网段）', () => {
    const r = calcSubnet('192.168.1.100', 30);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.maskInfo.mask).toBe('255.255.255.252');
    expect(r.info.network).toBe('192.168.1.100');
    expect(r.info.broadcast).toBe('192.168.1.103');
    expect(r.info.usableHosts).toBe(2);
    expect(r.info.firstUsable).toBe('192.168.1.101');
    expect(r.info.lastUsable).toBe('192.168.1.102');
  });
});

describe('非法输入：掩码', () => {
  it('255.0.255.0（位不连续）→ 明确报错并给出建议', () => {
    expectMaskError('255.0.255.0', 'discontinuous');
    expect(isValidMask('255.0.255.0')).toBe(false);
    expect(suggestNearestMask('255.0.255.0')).toBe('255.255.0.0');
  });

  it('256.1.1.1 → range 报错', () => {
    expectMaskError('256.1.1.1', 'range');
    expect(isValidMask('256.1.1.1')).toBe(false);
  });

  it('掩码缺段（255.255.0）→ format 报错', () => {
    expectMaskError('255.255.0', 'format');
  });

  it('非数字（abc / 255.255.255.x）→ format 报错', () => {
    expectMaskError('abc', 'format');
    expectMaskError('255.255.255.x', 'format');
  });

  it('合法掩码判断：255.255.255.0 / 0.0.0.0 / 255.255.255.255 均合法', () => {
    expect(isValidMask('255.255.255.0')).toBe(true);
    expect(isValidMask('0.0.0.0')).toBe(true);
    expect(isValidMask('255.255.255.255')).toBe(true);
    expect(isValidMask('128.0.0.0')).toBe(true);
  });

  it('0.0.0.0 → 前缀 0；255.255.255.255 → 前缀 32', () => {
    expectPrefix('0.0.0.0', 0);
    expectPrefix('255.255.255.255', 32);
  });
});

describe('非法输入：前缀与 IP', () => {
  it('前缀 -1 → 报错', () => {
    const r = calcSubnet('192.168.1.1', -1);
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error.kind).toBe('invalid_prefix');
  });

  it('前缀 33 → 报错', () => {
    const r = calcSubnet('192.168.1.1', 33);
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error.kind).toBe('invalid_prefix');
  });

  it('前缀 24.5（小数）→ 报错', () => {
    const r = calcSubnet('192.168.1.1', 24.5);
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error.kind).toBe('invalid_prefix');
  });

  it('IP 999.1.1.1 → range 报错', () => {
    const r = calcSubnet('999.1.1.1', 24);
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error.kind).toBe('range');
  });

  it('IP 192.168.1（缺段）→ format 报错', () => {
    const r = calcSubnet('192.168.1', 24);
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error.kind).toBe('format');
  });

  it('IP 192.168.1.1.1（多段）→ format 报错', () => {
    const r = calcSubnet('192.168.1.1.1', 24);
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error.kind).toBe('format');
  });
});

describe('换算一致性：0~32 全部 33 个前缀往返', () => {
  it.each(new Array(33).fill(0).map((_, p) => p))(
    '前缀 /%i：prefixToMask ⇄ maskToPrefix 互为逆运算',
    (p) => {
      const mask = prefixToMask(p);
      const back = maskToPrefix(mask);
      expect(typeof back).toBe('number');
      expect(back).toBe(p);
      expect(isValidMask(mask)).toBe(true);
    },
  );

  it('maskInfoOf：/24 的三要素正确', () => {
    const m = maskInfoOf(24);
    expect(m).toEqual({
      prefix: 24,
      mask: '255.255.255.0',
      wildcard: '0.0.0.255',
      binary: '11111111.11111111.11111111.00000000',
    });
  });

  it('calcSubnetFromInt 与 calcSubnet 结果一致', () => {
    const viaText = calcSubnet('192.168.1.100', 28);
    expect(viaText.ok).toBe(true);
    if (!viaText.ok) return;
    const viaInt = calcSubnetFromInt(0xc0a80164, 28);
    expect(viaInt.info).toEqual(viaText.info);
    expect(viaInt.maskInfo).toEqual(viaText.maskInfo);
  });
});

describe('分步计算过程 buildSteps', () => {
  it('192.168.1.100/24 生成 6 步，二进制与关键数值正确', () => {
    const steps = buildSteps(0xc0a80164, 24);
    expect(steps).toHaveLength(6);
    expect(steps[0].binary).toBe('11111111.11111111.11111111.00000000');
    expect(steps[1].binary).toBe('11000000.10101000.00000001.01100100');
    expect(steps[3].binary).toBe('11000000.10101000.00000001.00000000');
    expect(steps[3].detail).toContain('192.168.1.0');
    expect(steps[4].detail).toContain('192.168.1.255');
    expect(steps[5].detail).toContain('192.168.1.1');
    expect(steps[5].detail).toContain('192.168.1.254');
    expect(steps[5].detail).toContain('254');
  });

  it('/31 /32 /0 的第 6 步为特例文案', () => {
    expect(buildSteps(0x0a000002, 31)[5].title).toContain('/31');
    expect(buildSteps(0xc0a80164, 32)[5].title).toContain('/32');
    expect(buildSteps(0xc0a80164, 0)[5].title).not.toContain('扣除');
    expect(buildSteps(0xc0a80164, 0)[5].detail).toContain('4294967294');
  });
});
