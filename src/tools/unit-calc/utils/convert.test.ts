/**
 * 网络单位换算计算器 —— 纯函数计算层单元测试。
 * 覆盖任务要求第十一节全部用例：常规精确值 / 边界与错误 / 格式化 / 无 NaN·Infinity。
 * 只测纯函数层，不渲染任何组件。
 */
import { describe, expect, it } from 'vitest';
import type { UnitDef } from '../types';
import {
  BANDWIDTH_UNITS,
  BIT_RATE_UNITS,
  BYTE_RATE_UNITS,
  DOWNLOAD_BW_UNITS,
  DOWNLOAD_SIZE_UNITS,
  ERR_BW_ZERO,
  ERR_CHARS,
  ERR_NEGATIVE,
  ERR_NOTATION,
  ERR_OVERFLOW,
  SIZE_BINARY_UNITS,
  SIZE_DECIMAL_UNITS,
  SIZE_UNITS,
  buildChain,
  buildDownloadChain,
  counterpartSizeUnit,
  convert,
  estimateDownload,
  formatDuration,
  formatNumber,
  parseDecimal,
  unitById,
} from './units';

/** 辅助：按 id 取单位（表内必然存在，缺失即测试失败）。 */
function unit(units: readonly UnitDef[], id: string): UnitDef {
  const found = units.find((u) => u.id === id);
  if (!found) throw new Error(`unit ${id} not found`);
  return found;
}

const Mbps = unit(BIT_RATE_UNITS, 'Mbps');
const MBps = unit(BYTE_RATE_UNITS, 'MB/s');
const bps = unit(BIT_RATE_UNITS, 'bps');
const B = unit(SIZE_DECIMAL_UNITS, 'B');
const KB = unit(SIZE_DECIMAL_UNITS, 'KB');
const MB = unit(SIZE_DECIMAL_UNITS, 'MB');
const GB = unit(SIZE_DECIMAL_UNITS, 'GB');
const TB = unit(SIZE_DECIMAL_UNITS, 'TB');
const KiB = unit(SIZE_BINARY_UNITS, 'KiB');
const MiB = unit(SIZE_BINARY_UNITS, 'MiB');
const GiB = unit(SIZE_BINARY_UNITS, 'GiB');
const TiB = unit(SIZE_BINARY_UNITS, 'TiB');

/* ============================================================
   单位表完整性
   ============================================================ */

describe('单位表完整性', () => {
  it('带宽类别共 9 个单位（5 比特率 + 4 字节率）', () => {
    expect(BANDWIDTH_UNITS).toHaveLength(9);
    expect(BIT_RATE_UNITS.map((u) => u.id)).toEqual(['bps', 'Kbps', 'Mbps', 'Gbps', 'Tbps']);
    expect(BYTE_RATE_UNITS.map((u) => u.id)).toEqual(['B/s', 'KB/s', 'MB/s', 'GB/s']);
  });

  it('数据大小类别共 9 个单位（5 十进制 + 4 二进制）', () => {
    expect(SIZE_UNITS).toHaveLength(9);
    expect(SIZE_DECIMAL_UNITS.map((u) => u.id)).toEqual(['B', 'KB', 'MB', 'GB', 'TB']);
    expect(SIZE_BINARY_UNITS.map((u) => u.id)).toEqual(['KiB', 'MiB', 'GiB', 'TiB']);
  });

  it('下载时间类别单位符合任务要求第四节清单', () => {
    expect(DOWNLOAD_SIZE_UNITS.map((u) => u.id)).toEqual(['B', 'KB', 'MB', 'GB', 'KiB', 'MiB', 'GiB']);
    expect(DOWNLOAD_BW_UNITS.map((u) => u.id)).toEqual(['bps', 'Kbps', 'Mbps', 'Gbps']);
  });

  it('全部 baseFactor 为正且 id 唯一', () => {
    const all = [...BANDWIDTH_UNITS, ...SIZE_UNITS];
    const ids = all.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of all) {
      expect(u.baseFactor).toBeGreaterThan(0);
      expect(Number.isFinite(u.baseFactor)).toBe(true);
    }
  });

  it('counterpartSizeUnit：KB⇄KiB、MB⇄MiB、GB⇄GiB、TB⇄TiB', () => {
    expect(counterpartSizeUnit(KB)?.id).toBe('KiB');
    expect(counterpartSizeUnit(MB)?.id).toBe('MiB');
    expect(counterpartSizeUnit(GB)?.id).toBe('GiB');
    expect(counterpartSizeUnit(TB)?.id).toBe('TiB');
    expect(counterpartSizeUnit(KiB)?.id).toBe('KB');
    expect(counterpartSizeUnit(MiB)?.id).toBe('MB');
    expect(counterpartSizeUnit(GiB)?.id).toBe('GB');
    expect(counterpartSizeUnit(TiB)?.id).toBe('TB');
    expect(counterpartSizeUnit(B)?.id).toBe('KiB');
  });
});

/* ============================================================
   数值解析（第六节全部错误场景）
   ============================================================ */

describe('parseDecimal：合法输入', () => {
  it('0 合法', () => {
    expect(parseDecimal('0')).toEqual({ ok: true, value: 0 });
  });
  it('前导零 007 → 7', () => {
    expect(parseDecimal('007')).toEqual({ ok: true, value: 7 });
  });
  it('小数 1.5 / 0.75', () => {
    expect(parseDecimal('1.5')).toEqual({ ok: true, value: 1.5 });
    expect(parseDecimal('0.75')).toEqual({ ok: true, value: 0.75 });
  });
  it('前后空格 trim 后合法', () => {
    expect(parseDecimal('  100 ')).toEqual({ ok: true, value: 100 });
  });
  it('上限值 1e15（十进制展开写法）合法', () => {
    expect(parseDecimal('1000000000000000')).toEqual({ ok: true, value: 1e15 });
  });
});

describe('parseDecimal：空输入 → 等待态', () => {
  it('空字符串', () => {
    const r = parseDecimal('');
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.kind).toBe('empty');
  });
  it('纯空格', () => {
    const r = parseDecimal('   ');
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.kind).toBe('empty');
  });
});

describe('parseDecimal：负数错误', () => {
  it('-100 → 负数错误', () => {
    const r = parseDecimal('-100');
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.kind).toBe('negative');
    expect(r.ok ? null : r.error).toBe(ERR_NEGATIVE);
  });
  it('单独的 - → 负数错误', () => {
    const r = parseDecimal('-');
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error).toBe(ERR_NEGATIVE);
  });
});

describe('parseDecimal：非法字符错误', () => {
  const cases = ['abc', '１２３', '12 34', '12.3.4', '1.', '.5'];
  for (const c of cases) {
    it(`"${c}" → 字符非法错误`, () => {
      const r = parseDecimal(c);
      expect(r.ok).toBe(false);
      expect(r.ok ? null : r.error).toBe(ERR_CHARS);
    });
  }
});

describe('parseDecimal：超范围表示错误', () => {
  const cases = ['0x1F', '1e3', '1E5', '1_000', '+5', '1010b', '0x'];
  for (const c of cases) {
    it(`"${c}" → 表示法错误`, () => {
      const r = parseDecimal(c);
      expect(r.ok).toBe(false);
      expect(r.ok ? null : r.error).toBe(ERR_NOTATION);
    });
  }
  // 说明：任务要求第六节（硬性）要求严格正则 /^\d+(\.\d+)?$/ 拒绝一切科学计数法
  // 文本（含 "1e3"）；第十一节「1e15 合法」指数值 10¹⁵ 在上限内（十进制展开写法），
  // 故 "1e15" 同样按表示法错误处理。
  it('"1e15" 文本按严格正则拒绝为表示法错误', () => {
    const r = parseDecimal('1e15');
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error).toBe(ERR_NOTATION);
  });
});

describe('parseDecimal：溢出错误', () => {
  it('10000000000000000（1e16 展开写法）→ 溢出', () => {
    const r = parseDecimal('10000000000000000');
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error).toBe(ERR_OVERFLOW);
  });
  it('1e15.1 → 溢出', () => {
    const r = parseDecimal('1000000000000000.1');
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error).toBe(ERR_OVERFLOW);
  });
});

/* ============================================================
   换算精确值（第七节）
   ============================================================ */

describe('convert：带宽 / 速率', () => {
  it('100 Mbps = 12.5 MB/s（经典考点）', () => {
    expect(convert(100, Mbps, MBps)).toBe(12.5);
  });
  it('1 Gbps = 125,000,000 B/s', () => {
    expect(convert(1, unit(BIT_RATE_UNITS, 'Gbps'), unit(BYTE_RATE_UNITS, 'B/s'))).toBe(125000000);
  });
  it('1 Tbps = 1000 Gbps', () => {
    expect(convert(1, unit(BIT_RATE_UNITS, 'Tbps'), unit(BIT_RATE_UNITS, 'Gbps'))).toBe(1000);
  });
  it('8 B/s = 64 bps（比特字节 8 倍关系）', () => {
    expect(convert(8, unit(BYTE_RATE_UNITS, 'B/s'), bps)).toBe(64);
  });
  it('1 Mbps = 1,000,000 bps', () => {
    expect(convert(1, Mbps, bps)).toBe(1000000);
  });
  it('100 Mbps = 0.1 Gbps', () => {
    expect(convert(100, Mbps, unit(BIT_RATE_UNITS, 'Gbps'))).toBe(0.1);
  });
  it('1 MB/s = 8 Mbps', () => {
    expect(convert(1, MBps, Mbps)).toBe(8);
  });
});

describe('convert：数据大小（十进制 / 二进制 / 交叉）', () => {
  it('1 MB = 1,000,000 B', () => {
    expect(convert(1, MB, B)).toBe(1000000);
  });
  it('1 MiB = 1,048,576 B', () => {
    expect(convert(1, MiB, B)).toBe(1048576);
  });
  it('1 GB = 1,000,000,000 B', () => {
    expect(convert(1, GB, B)).toBe(1e9);
  });
  it('1 GiB = 1,073,741,824 B', () => {
    expect(convert(1, GiB, B)).toBe(1073741824);
  });
  it('交叉：1 MB = 0.95367431640625 MiB（精确值）', () => {
    expect(convert(1, MB, MiB)).toBe(0.95367431640625);
  });
  it('交叉：1 KiB = 1.024 KB', () => {
    expect(convert(1, KiB, KB)).toBe(1.024);
  });
  it('1 TB = 931.32… GiB', () => {
    expect(convert(1, TB, GiB)).toBeCloseTo(931.3225746154785, 6);
  });
  it('1 TiB = 1099.511627776 GB', () => {
    expect(convert(1, TiB, GB)).toBeCloseTo(1099.511627776, 6);
  });
  it('0 值换算恒为 0', () => {
    expect(convert(0, Mbps, MBps)).toBe(0);
    expect(convert(0, TB, B)).toBe(0);
  });
  it('同一单位换算为自身', () => {
    expect(convert(3.25, Mbps, Mbps)).toBe(3.25);
    expect(convert(7, MiB, MiB)).toBe(7);
  });
});

/* ============================================================
   下载时间估算
   ============================================================ */

describe('estimateDownload', () => {
  it('100 MB @ 100 Mbps = 8 秒（精确）', () => {
    const r = estimateDownload(100, MB, 100, Mbps);
    expect(r.ok).toBe(true);
    expect(r.ok ? r.seconds : null).toBe(8);
  });
  it('1 GiB @ 50 Mbps = 171.79869184 秒（精确）', () => {
    const r = estimateDownload(1, GiB, 50, Mbps);
    expect(r.ok).toBe(true);
    expect(r.ok ? r.seconds : null).toBe(171.79869184);
  });
  it('500 MB @ 100 Mbps = 40 秒', () => {
    const r = estimateDownload(500, MB, 100, Mbps);
    expect(r.ok ? r.seconds : null).toBe(40);
  });
  it('带宽 0 → 中文错误', () => {
    const r = estimateDownload(100, MB, 0, Mbps);
    expect(r.ok).toBe(false);
    expect(r.ok ? null : r.error).toBe(ERR_BW_ZERO);
  });
  it('文件大小 0 → 正常返回秒数 0（瞬间完成）', () => {
    const r = estimateDownload(0, MB, 100, Mbps);
    expect(r.ok).toBe(true);
    expect(r.ok ? r.seconds : null).toBe(0);
  });
  it('带宽为最小单位 1 bps 时仍为有限值', () => {
    const r = estimateDownload(1e15, GB, 1, bps);
    expect(r.ok).toBe(true);
    expect(Number.isFinite(r.ok ? r.seconds : NaN)).toBe(true);
  });
});

/* ============================================================
   格式化
   ============================================================ */

describe('formatDuration：任务要求第十一节分级格式', () => {
  it('0 秒 → 瞬间完成', () => {
    expect(formatDuration(0)).toBe('瞬间完成');
  });
  it('59.5 秒 → 「59.50 秒」', () => {
    expect(formatDuration(59.5)).toBe('59.50 秒');
  });
  it('8 秒 → 「8.00 秒」', () => {
    expect(formatDuration(8)).toBe('8.00 秒');
  });
  it('90 秒 → 「1 分 30 秒」', () => {
    expect(formatDuration(90)).toBe('1 分 30 秒');
  });
  it('60 秒 → 「1 分 0 秒」', () => {
    expect(formatDuration(60)).toBe('1 分 0 秒');
  });
  it('5400 秒 → 「1 小时 30 分钟」', () => {
    expect(formatDuration(5400)).toBe('1 小时 30 分钟');
  });
  it('3661 秒 → 「1 小时 1 分钟」', () => {
    expect(formatDuration(3661)).toBe('1 小时 1 分钟');
  });
  it('0.004 秒 → 「0.004 秒」（极小值不显示 0.00）', () => {
    expect(formatDuration(0.004)).toBe('0.004 秒');
  });
  it('1e-7 秒 → 科学计数法', () => {
    expect(formatDuration(1e-7)).toBe('1×10⁻⁷ 秒');
  });
  it('负数 / 非有限值 → 兜底「—」', () => {
    expect(formatDuration(-1)).toBe('—');
    expect(formatDuration(NaN)).toBe('—');
    expect(formatDuration(Infinity)).toBe('—');
  });
});

describe('formatNumber：千分位 + 智能小数位', () => {
  it('12,500,000', () => {
    expect(formatNumber(12500000)).toBe('12,500,000');
  });
  it('12.5 → 「12.5」（尾部去零）', () => {
    expect(formatNumber(12.5)).toBe('12.5');
  });
  it('0.95367431640625 → 6 位有效数字「0.953674」', () => {
    expect(formatNumber(0.95367431640625)).toBe('0.953674');
  });
  it('1e15 → 千分位展开', () => {
    expect(formatNumber(1e15)).toBe('1,000,000,000,000,000');
  });
  it('1234567.89 → 6 位有效数字「1,234,568」', () => {
    expect(formatNumber(1234567.89)).toBe('1,234,568');
  });
  it('0 → 「0」', () => {
    expect(formatNumber(0)).toBe('0');
  });
  it('极小值 1e-7 → 科学计数法「1×10⁻⁷」', () => {
    expect(formatNumber(1e-7)).toBe('1×10⁻⁷');
  });
  it('0.0000015 → 十进制展开「0.0000015」', () => {
    expect(formatNumber(0.0000015)).toBe('0.0000015');
  });
  it('极大值 1.25e21 → 「1.25×10²¹」', () => {
    expect(formatNumber(1.25e21)).toBe('1.25×10²¹');
  });
  it('NaN / Infinity → 兜底「—」，绝不渲染 NaN / Infinity 字样', () => {
    expect(formatNumber(NaN)).toBe('—');
    expect(formatNumber(Infinity)).toBe('—');
    expect(formatNumber(-Infinity)).toBe('—');
  });
});

/* ============================================================
   无 NaN / Infinity 全量扫描（含 1e15 极端值）
   ============================================================ */

describe('全量换算扫描：任何情况不产生 NaN / Infinity', () => {
  it('带宽类别全单位 × 全单位 × {0, 1, 1e15}', () => {
    for (const from of BANDWIDTH_UNITS) {
      for (const to of BANDWIDTH_UNITS) {
        for (const v of [0, 1, 1e15]) {
          const r = convert(v, from, to);
          expect(Number.isFinite(r)).toBe(true);
        }
      }
    }
  });
  it('数据大小类别全单位 × 全单位 × {0, 1, 1e15}', () => {
    for (const from of SIZE_UNITS) {
      for (const to of SIZE_UNITS) {
        for (const v of [0, 1, 1e15]) {
          const r = convert(v, from, to);
          expect(Number.isFinite(r)).toBe(true);
        }
      }
    }
  });
  it('跨类别（比特率 ⇄ 数据大小）扫描同样有限', () => {
    for (const from of BIT_RATE_UNITS) {
      for (const to of SIZE_UNITS) {
        expect(Number.isFinite(convert(1e15, from, to))).toBe(true);
      }
    }
    for (const from of SIZE_UNITS) {
      for (const to of BIT_RATE_UNITS) {
        expect(Number.isFinite(convert(1e15, from, to))).toBe(true);
      }
    }
  });
  it('溢出在解析层先被拦截（1e16 展开写法与 1e16 文本均不进入换算）', () => {
    expect(parseDecimal('10000000000000000').ok).toBe(false);
    expect(parseDecimal('1e16').ok).toBe(false);
  });
  it('formatNumber 对全部扫描结果输出有限字符串', () => {
    for (const from of [...BANDWIDTH_UNITS, ...SIZE_UNITS]) {
      for (const to of [...BANDWIDTH_UNITS, ...SIZE_UNITS]) {
        const s = formatNumber(convert(1e15, from, to));
        expect(s).not.toMatch(/NaN|Infinity|undefined/);
      }
    }
  });
});

/* ============================================================
   换算关系链
   ============================================================ */

describe('buildChain：换算关系链', () => {
  it('100 Mbps → MB/s：3 步且结果含 12.5', () => {
    const steps = buildChain(100, Mbps, MBps);
    expect(steps).toHaveLength(3);
    expect(steps[0].detail).toContain('100,000,000 bps');
    expect(steps[1].detail).toContain('÷ 8');
    expect(steps[2].detail).toContain('12.5 MB/s');
  });
  it('1 MB → MiB：无跨维度步骤且结果为精确值', () => {
    const steps = buildChain(1, MB, MiB);
    expect(steps).toHaveLength(2);
    expect(steps[1].detail).toContain('0.953674');
  });
  it('12.5 MB/s → Mbps：字节 → 比特 ×8 方向', () => {
    const steps = buildChain(12.5, MBps, Mbps);
    expect(steps.some((s) => s.detail.includes('× 8'))).toBe(true);
    expect(steps[steps.length - 1].detail).toContain('100 Mbps');
  });
});

describe('buildDownloadChain：下载时间链', () => {
  it('100 MB @ 100 Mbps：4 步且最终为 8.00 秒', () => {
    const steps = buildDownloadChain(100, MB, 100, Mbps);
    expect(steps).toHaveLength(4);
    expect(steps[0].detail).toContain('100,000,000 B');
    expect(steps[1].detail).toContain('800,000,000 bit');
    expect(steps[2].detail).toContain('100,000,000 bps');
    expect(steps[3].detail).toContain('8.00 秒');
  });
});

/* ============================================================
   工具函数兜底
   ============================================================ */

describe('unitById：命中与兜底', () => {
  it('命中返回对应单位', () => {
    expect(unitById(BIT_RATE_UNITS, 'Mbps', BIT_RATE_UNITS[0]).id).toBe('Mbps');
  });
  it('未命中返回兜底单位，永不为 undefined', () => {
    expect(unitById(BIT_RATE_UNITS, 'nope', BIT_RATE_UNITS[0]).id).toBe('bps');
  });
});
