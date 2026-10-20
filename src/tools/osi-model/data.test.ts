/**
 * OSI / TCP-IP 模型对照 —— 数据与映射纯函数测试（任务要求第十节）。
 * 只测纯函数与数据，不渲染组件。
 */
import { describe, expect, it } from 'vitest';
import { MAPPING, OSI_LAYERS, TCPIP_LAYERS } from './data';
import { getCounterpart, validateMapping } from './utils/mapping';
import type { LayerInfo } from './types';

/** 按 id 精确取层（不存在则让断言失败）。 */
function byId(layers: readonly LayerInfo[], id: string): LayerInfo {
  const layer = layers.find((item) => item.id === id);
  expect(layer, `层 ${id} 应存在`).toBeDefined();
  return layer as LayerInfo;
}

// ============================================================
// 一、数据完整性
// ============================================================

describe('数据完整性', () => {
  it('OSI_LAYERS 恰 7 条，编号 7~1 递减无重复', () => {
    expect(OSI_LAYERS).toHaveLength(7);
    expect(OSI_LAYERS.map((l) => l.number)).toEqual([7, 6, 5, 4, 3, 2, 1]);
    expect(new Set(OSI_LAYERS.map((l) => l.number)).size).toBe(7);
    expect(new Set(OSI_LAYERS.map((l) => l.id)).size).toBe(7);
  });

  it('TCPIP_LAYERS 恰 4 条，编号 4~1 递减无重复', () => {
    expect(TCPIP_LAYERS).toHaveLength(4);
    expect(TCPIP_LAYERS.map((l) => l.number)).toEqual([4, 3, 2, 1]);
    expect(new Set(TCPIP_LAYERS.map((l) => l.id)).size).toBe(4);
  });

  it('每条层的 stack 与编号前缀一致', () => {
    for (const layer of [...OSI_LAYERS, ...TCPIP_LAYERS]) {
      expect(layer.id.startsWith(`${layer.stack}-`)).toBe(true);
    }
  });

  it('每条层含 name/nameEn/duty/protocols/pdu 且非空', () => {
    for (const layer of [...OSI_LAYERS, ...TCPIP_LAYERS]) {
      expect(layer.name.trim().length).toBeGreaterThan(0);
      expect(layer.nameEn.trim().length).toBeGreaterThan(0);
      expect(layer.duty.trim().length).toBeGreaterThan(0);
      expect(layer.protocols.length).toBeGreaterThan(0);
      expect(layer.pdu.trim().length).toBeGreaterThan(0);
    }
  });

  it('PDU 抽断言：OSI L4=段、L3=包、L2=帧、L1=比特', () => {
    expect(byId(OSI_LAYERS, 'osi-4').pdu).toBe('段（Segment）');
    expect(byId(OSI_LAYERS, 'osi-3').pdu).toBe('包（Packet）');
    expect(byId(OSI_LAYERS, 'osi-2').pdu).toBe('帧（Frame）');
    expect(byId(OSI_LAYERS, 'osi-1').pdu).toBe('比特（Bit）');
  });

  it('PDU 抽断言：OSI 上三层均为数据（Data）', () => {
    for (const id of ['osi-7', 'osi-6', 'osi-5']) {
      expect(byId(OSI_LAYERS, id).pdu).toBe('数据（Data）');
    }
  });

  it('教学备注：ARP 争议注在网络层，L1/L2 划分注在网络接口层', () => {
    expect(byId(OSI_LAYERS, 'osi-3').note).toContain('争议');
    expect(byId(TCPIP_LAYERS, 'tcpip-1').note).toContain('L1/L2');
  });
});

// ============================================================
// 二、映射一致性
// ============================================================

describe('映射一致性', () => {
  it('validateMapping：MAPPING 双向互逆成立', () => {
    expect(validateMapping()).toBe(true);
  });

  it('MAPPING 恰好收录全部 11 条层的 id 为键', () => {
    const allIds = [...OSI_LAYERS, ...TCPIP_LAYERS].map((l) => l.id);
    expect(Object.keys(MAPPING).sort()).toEqual([...allIds].sort());
  });

  it('OSI 7/6/5 → TCP/IP 应用层；4 → 传输层；3 → 网际层；2/1 → 网络接口层', () => {
    expect(MAPPING['osi-7']).toEqual(['tcpip-4']);
    expect(MAPPING['osi-6']).toEqual(['tcpip-4']);
    expect(MAPPING['osi-5']).toEqual(['tcpip-4']);
    expect(MAPPING['osi-4']).toEqual(['tcpip-3']);
    expect(MAPPING['osi-3']).toEqual(['tcpip-2']);
    expect(MAPPING['osi-2']).toEqual(['tcpip-1']);
    expect(MAPPING['osi-1']).toEqual(['tcpip-1']);
  });

  it('反向映射：应用层 → 7/6/5；传输层 → 4；网际层 → 3；网络接口层 → 2/1', () => {
    expect(MAPPING['tcpip-4']).toEqual(['osi-7', 'osi-6', 'osi-5']);
    expect(MAPPING['tcpip-3']).toEqual(['osi-4']);
    expect(MAPPING['tcpip-2']).toEqual(['osi-3']);
    expect(MAPPING['tcpip-1']).toEqual(['osi-2', 'osi-1']);
  });

  it('每个 OSI id 的对侧集合反向查询能回到自身（全量双向互逆）', () => {
    for (const layer of OSI_LAYERS) {
      for (const target of MAPPING[layer.id] ?? []) {
        expect(MAPPING[target], `${target} 反向应含 ${layer.id}`).toContain(layer.id);
      }
    }
    for (const layer of TCPIP_LAYERS) {
      for (const target of MAPPING[layer.id] ?? []) {
        expect(MAPPING[target], `${target} 反向应含 ${layer.id}`).toContain(layer.id);
      }
    }
  });

  it('映射目标 id 均属于对侧堆叠', () => {
    for (const [id, targets] of Object.entries(MAPPING)) {
      const selfStack = id.startsWith('osi-') ? 'osi' : 'tcpip';
      for (const target of targets) {
        expect(target.startsWith(selfStack === 'osi' ? 'tcpip-' : 'osi-')).toBe(true);
      }
    }
  });
});

// ============================================================
// 三、协议归类抽查
// ============================================================

describe('协议归类抽查', () => {
  /** 收集 OSI 某协议出现在哪些层。 */
  function osiLayersWith(protocol: string): number[] {
    return OSI_LAYERS.filter((l) => l.protocols.includes(protocol)).map((l) => l.number);
  }

  it('TCP / UDP 仅出现在 OSI 传输层', () => {
    expect(osiLayersWith('TCP')).toEqual([4]);
    expect(osiLayersWith('UDP')).toEqual([4]);
  });

  it('HTTP / DNS 仅出现在 OSI 应用层', () => {
    expect(osiLayersWith('HTTP')).toEqual([7]);
    expect(osiLayersWith('DNS')).toEqual([7]);
  });

  it('IP / ICMP 仅出现在 OSI 网络层', () => {
    expect(osiLayersWith('IP')).toEqual([3]);
    expect(osiLayersWith('ICMP')).toEqual([3]);
  });

  it('以太网仅出现在 OSI 数据链路层', () => {
    expect(osiLayersWith('以太网')).toEqual([2]);
  });

  it('ARP（带星号）标注在网络层，且其他层无同名项', () => {
    expect(osiLayersWith('ARP*')).toEqual([3]);
  });
});

// ============================================================
// 四、getCounterpart
// ============================================================

describe('getCounterpart', () => {
  it('OSI 方向：结果与 MAPPING 逐条一致', () => {
    for (const layer of OSI_LAYERS) {
      expect(getCounterpart('osi', layer.id)).toEqual(MAPPING[layer.id]);
    }
  });

  it('TCP/IP 方向：结果与 MAPPING 逐条一致', () => {
    for (const layer of TCPIP_LAYERS) {
      expect(getCounterpart('tcpip', layer.id)).toEqual(MAPPING[layer.id]);
    }
  });

  it('具体抽查：osi-6 → 应用层；tcpip-4 → 三条 OSI 上层', () => {
    expect(getCounterpart('osi', 'osi-6')).toEqual(['tcpip-4']);
    expect(getCounterpart('tcpip', 'tcpip-4')).toEqual(['osi-7', 'osi-6', 'osi-5']);
  });

  it('id 与堆叠不符时返回空数组；未知 id 返回空数组', () => {
    expect(getCounterpart('tcpip', 'osi-6')).toEqual([]);
    expect(getCounterpart('osi', 'tcpip-4')).toEqual([]);
    expect(getCounterpart('osi', 'osi-99')).toEqual([]);
    expect(getCounterpart('osi', '')).toEqual([]);
  });

  it('与 validateMapping 联动：全量往返互逆', () => {
    for (const layer of [...OSI_LAYERS, ...TCPIP_LAYERS]) {
      for (const target of getCounterpart(layer.stack, layer.id)) {
        const targetStack = target.startsWith('osi-') ? 'osi' : 'tcpip';
        expect(getCounterpart(targetStack, target)).toContain(layer.id);
      }
    }
  });
});
