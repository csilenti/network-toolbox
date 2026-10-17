/**
 * 网络单位换算计算器 —— 单位表与换算核心（纯函数层）。
 *
 * 换算数学规则（任务要求第七节）：
 * - 比特率统一到基准 bps（每级 1000 进制）；字节率与数据大小统一到基准 B；
 * - 比特 ⇄ 字节固定 8 倍（1 B = 8 bit），不随 K/M/G 前缀缩放；
 * - 十进制（SI）每级 1000，二进制（IEC）每级 1024；
 * - 基准换算倍率全部为精确整数（≤ 2^40，均在 IEEE 754 精确表示范围内），
 *   避免「逐级乘 1000/1024」的浮点累积误差。
 */

import type {
  ChainStep,
  DownloadEstimate,
  ParseErrorKind,
  ParseResult,
  UnitDef,
} from '../types';

/* ============================================================
   单位表（唯一数据源，组件内禁止再硬编码）
   ============================================================ */

/** 比特率单位（十进制，基准 bps）。 */
export const BIT_RATE_UNITS: readonly UnitDef[] = [
  { id: 'bps', label: 'bps', baseFactor: 1, system: 'bit-byte', kind: 'bit-rate' },
  { id: 'Kbps', label: 'Kbps', baseFactor: 1e3, system: 'bit-byte', kind: 'bit-rate' },
  { id: 'Mbps', label: 'Mbps', baseFactor: 1e6, system: 'bit-byte', kind: 'bit-rate' },
  { id: 'Gbps', label: 'Gbps', baseFactor: 1e9, system: 'bit-byte', kind: 'bit-rate' },
  { id: 'Tbps', label: 'Tbps', baseFactor: 1e12, system: 'bit-byte', kind: 'bit-rate' },
];

/** 字节率单位（十进制；baseFactor 相对基准 B）。 */
export const BYTE_RATE_UNITS: readonly UnitDef[] = [
  { id: 'B/s', label: 'B/s', baseFactor: 1, system: 'bit-byte', kind: 'byte-rate' },
  { id: 'KB/s', label: 'KB/s', baseFactor: 1e3, system: 'bit-byte', kind: 'byte-rate' },
  { id: 'MB/s', label: 'MB/s', baseFactor: 1e6, system: 'bit-byte', kind: 'byte-rate' },
  { id: 'GB/s', label: 'GB/s', baseFactor: 1e9, system: 'bit-byte', kind: 'byte-rate' },
];

/** 数据大小：十进制（SI，1000 进制，基准 B）。 */
export const SIZE_DECIMAL_UNITS: readonly UnitDef[] = [
  { id: 'B', label: 'B', baseFactor: 1, system: 'decimal', kind: 'size' },
  { id: 'KB', label: 'KB', baseFactor: 1e3, system: 'decimal', kind: 'size' },
  { id: 'MB', label: 'MB', baseFactor: 1e6, system: 'decimal', kind: 'size' },
  { id: 'GB', label: 'GB', baseFactor: 1e9, system: 'decimal', kind: 'size' },
  { id: 'TB', label: 'TB', baseFactor: 1e12, system: 'decimal', kind: 'size' },
];

/** 数据大小：二进制（IEC，1024 进制，基准 B）。 */
export const SIZE_BINARY_UNITS: readonly UnitDef[] = [
  { id: 'KiB', label: 'KiB', baseFactor: 2 ** 10, system: 'binary', kind: 'size' },
  { id: 'MiB', label: 'MiB', baseFactor: 2 ** 20, system: 'binary', kind: 'size' },
  { id: 'GiB', label: 'GiB', baseFactor: 2 ** 30, system: 'binary', kind: 'size' },
  { id: 'TiB', label: 'TiB', baseFactor: 2 ** 40, system: 'binary', kind: 'size' },
];

/** 数据大小全量单位（十进制 + 二进制同台，共 9 个）。 */
export const SIZE_UNITS: readonly UnitDef[] = [...SIZE_DECIMAL_UNITS, ...SIZE_BINARY_UNITS];

/** 带宽 / 速率类别全量单位（比特率 + 字节率，共 9 个）。 */
export const BANDWIDTH_UNITS: readonly UnitDef[] = [...BIT_RATE_UNITS, ...BYTE_RATE_UNITS];

/** 下载时间类别：文件大小可选单位（任务要求第四节：B/KB/MB/GB/KiB/MiB/GiB）。 */
export const DOWNLOAD_SIZE_UNITS: readonly UnitDef[] = SIZE_UNITS.filter((u) =>
  ['B', 'KB', 'MB', 'GB', 'KiB', 'MiB', 'GiB'].includes(u.id),
);

/** 下载时间类别：带宽可选单位（任务要求第四节：bps/Kbps/Mbps/Gbps）。 */
export const DOWNLOAD_BW_UNITS: readonly UnitDef[] = BIT_RATE_UNITS.filter((u) => u.id !== 'Tbps');

/** 兜底单位常量（下拉项受控于本表，实际不会命中兜底）。 */
export const FALLBACK_MBPS: UnitDef = BIT_RATE_UNITS[2];
export const FALLBACK_MB_RATE: UnitDef = BYTE_RATE_UNITS[2];
export const FALLBACK_SIZE_UNIT: UnitDef = SIZE_DECIMAL_UNITS[2];
export const FALLBACK_BPS: UnitDef = BIT_RATE_UNITS[0];

/** 按 id 查找单位；找不到时返回兜底单位（保证永不为 undefined）。 */
export function unitById(units: readonly UnitDef[], id: string, fallback: UnitDef): UnitDef {
  return units.find((u) => u.id === id) ?? fallback;
}

/** 数据大小十进制 ⇄ 二进制的经典对照单位（KB⇄KiB、MB⇄MiB……，用于换算链展示）。 */
export function counterpartSizeUnit(unit: UnitDef): UnitDef | null {
  const decIdx = SIZE_DECIMAL_UNITS.findIndex((u) => u.id === unit.id);
  if (decIdx >= 0) {
    return SIZE_BINARY_UNITS[Math.max(0, decIdx - 1)] ?? null;
  }
  const binIdx = SIZE_BINARY_UNITS.findIndex((u) => u.id === unit.id);
  if (binIdx >= 0) {
    return SIZE_DECIMAL_UNITS[Math.min(binIdx + 1, SIZE_DECIMAL_UNITS.length - 1)] ?? null;
  }
  return null;
}

/* ============================================================
   数值解析（任务要求第六节 —— 硬性验收核心）
   ============================================================ */

/** 输入上限：1e15（上限本身合法，超过即溢出）。 */
export const MAX_INPUT = 1e15;

/** 严格十进制正则：仅数字 + 可选的一段小数（拒绝 0x10、1e1、+5、空格等）。 */
const STRICT_DECIMAL_RE = /^\d+(\.\d+)?$/;

/** 可识别的「其他进制 / 计数法」特征：十六进制、科学计数法、下划线分隔、二进制字面量（1010b）。 */
const NOTATION_RE = /(0[xX])|([eE][+-]?\d)|(_)|(\d[bB]$)|(^[oO][xX])/;

export const ERR_NEGATIVE = '数值不能为负，请输入 0 或正数';
export const ERR_CHARS = '请输入合法的十进制数字，仅支持数字与小数点';
export const ERR_NOTATION = '仅支持十进制数字，不支持十六进制 / 科学计数法等其他表示';
export const ERR_OVERFLOW = '数值过大，超出本工具支持范围（上限 10¹⁵）';
export const ERR_BW_ZERO = '带宽需大于 0 才能估算下载时间';

/**
 * 严格解析非负十进制数（trim 后）。
 * - 空输入 → 等待态（kind: 'empty'，UI 不报错）；
 * - 负数 → ERR_NEGATIVE；非法字符 → ERR_CHARS；
 * - 十六进制 / 科学计数法 / 下划线 / 二进制字面量 / 加号 → ERR_NOTATION；
 * - > 1e15 → ERR_OVERFLOW。
 */
export function parseDecimal(raw: string): ParseResult {
  const t = raw.trim();
  if (t === '') {
    return { ok: false, error: '', kind: 'empty' };
  }
  if (t.startsWith('-')) {
    return { ok: false, error: ERR_NEGATIVE, kind: 'negative' };
  }
  if (t.startsWith('+')) {
    return { ok: false, error: ERR_NOTATION, kind: 'notation' };
  }
  if (STRICT_DECIMAL_RE.test(t)) {
    const value = Number(t);
    if (!Number.isFinite(value) || value > MAX_INPUT) {
      return { ok: false, error: ERR_OVERFLOW, kind: 'overflow' };
    }
    return { ok: true, value };
  }
  if (NOTATION_RE.test(t)) {
    return { ok: false, error: ERR_NOTATION, kind: 'notation' };
  }
  return { ok: false, error: ERR_CHARS, kind: 'chars' };
}

/** 解析错误类别 → 是否为等待态（空输入）。 */
export function isWaitingKind(kind: ParseErrorKind): boolean {
  return kind === 'empty';
}

/* ============================================================
   换算核心
   ============================================================ */

/**
 * 任意单位 ⇄ 任意单位换算：源单位 → 统一基准（bps 或 B）→ 目标单位。
 * 比特 ⇄ 字节维度跨越时固定 8 倍；基准倍率均为精确整数，避免逐级浮点累积。
 * 入参异常（非有限 / 负数）与结果溢出时兜底返回 0，任何情况不产生 NaN / Infinity。
 */
export function convert(value: number, from: UnitDef, to: UnitDef): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  const fromIsBit = from.kind === 'bit-rate';
  const toIsBit = to.kind === 'bit-rate';

  // 源单位 → 基准
  let baseBits = 0;
  let baseBytes = 0;
  if (fromIsBit) {
    baseBits = value * from.baseFactor;
  } else {
    baseBytes = value * from.baseFactor;
  }
  // 跨维度：固定 8 倍（1 B = 8 bit）
  if (fromIsBit && !toIsBit) {
    baseBytes = baseBits / 8;
  } else if (!fromIsBit && toIsBit) {
    baseBits = baseBytes * 8;
  }

  const base = toIsBit ? baseBits : baseBytes;
  const result = base / to.baseFactor;
  return Number.isFinite(result) ? result : 0;
}

/**
 * 下载时间估算：大小 → bit（×8）÷ 带宽（bps）→ 秒。
 * - 带宽为 0 → 中文错误；
 * - 文件大小为 0 → 正常返回秒数 0（瞬间完成，由 UI 补充「文件为空」）。
 */
export function estimateDownload(
  sizeValue: number,
  sizeUnit: UnitDef,
  bwValue: number,
  bwUnit: UnitDef,
): DownloadEstimate {
  if (!Number.isFinite(sizeValue) || !Number.isFinite(bwValue) || sizeValue < 0 || bwValue < 0) {
    return { ok: false, error: ERR_CHARS };
  }
  if (bwValue === 0) {
    return { ok: false, error: ERR_BW_ZERO };
  }
  if (sizeValue === 0) {
    return { ok: true, seconds: 0 };
  }
  const bits = sizeValue * sizeUnit.baseFactor * 8;
  const bps = bwValue * bwUnit.baseFactor;
  const seconds = bits / bps;
  if (!Number.isFinite(seconds)) {
    return { ok: false, error: ERR_OVERFLOW };
  }
  return { ok: true, seconds };
}

/* ============================================================
   数字 / 时长格式化（任何情况不得输出 NaN / Infinity / undefined）
   ============================================================ */

const SUPERSCRIPT_MAP: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

/** 整数 → 上标字符串（科学计数法指数用），如 -7 → '⁻⁷'。 */
function toSuperscript(n: number): string {
  return String(n)
    .split('')
    .map((ch) => SUPERSCRIPT_MAP[ch] ?? ch)
    .join('');
}

/** 纯数字整数部分加千分位。 */
function groupThousands(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 去掉小数尾部多余的 0 与孤立的小数点。 */
function trimTrailingZeros(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/** 科学计数法展示：1.25×10²¹（用于 ≥1e16 的极大值与 <1e-6 的极小值）。 */
function toScientific(n: number): string {
  const abs = Math.abs(n);
  let exp = Math.floor(Math.log10(abs));
  let mantStr = trimTrailingZeros((n / Math.pow(10, exp)).toFixed(4));
  // toFixed 四舍五入可能使尾数进位到 10（如 9.99999 → 10.0000）
  if (Math.abs(Number(mantStr)) >= 10) {
    exp += 1;
    mantStr = trimTrailingZeros((n / Math.pow(10, exp)).toFixed(4));
  }
  return `${mantStr}×10${toSuperscript(exp)}`;
}

/**
 * 数字格式化：千分位 + 智能小数位。
 * - 整数（< 1e16）：千分位、无小数；
 * - 小数：约 6 位有效数字，尾部去零；
 * - ≥ 1e16 或 < 1e-6：科学计数法；
 * - 非有限值（NaN / Infinity 等）：兜底显示 '—'，绝不渲染 NaN / Infinity 字样。
 */
export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) {
    return '—';
  }
  if (n === 0) {
    return '0';
  }
  const abs = Math.abs(n);
  if (abs >= 1e16 || abs < 1e-6) {
    return toScientific(n);
  }
  // 6 位有效数字 → 依数量级推导小数位
  const digitsBefore = Math.floor(Math.log10(abs)) + 1;
  const decimals = Math.max(0, 6 - digitsBefore);
  const fixed = trimTrailingZeros(n.toFixed(decimals));
  const [intPart, fracPart] = fixed.split('.');
  const sign = n < 0 ? '-' : '';
  const grouped = groupThousands(intPart);
  return fracPart ? `${sign}${grouped}.${fracPart}` : `${sign}${grouped}`;
}

/** 固定 2 位小数的秒数展示（千分位）。 */
function formatSecondsFixed(s: number): string {
  const [intPart, fracPart] = s.toFixed(2).split('.');
  return `${groupThousands(intPart)}.${fracPart}`;
}

/**
 * 秒数 → 人性化时长（任务要求第七节 / 第十一节分级格式）：
 * - 0 → 「瞬间完成」；
 * - < 0.01 秒 → 交给 formatNumber（极小值科学计数法）；
 * - < 60 秒 → 保留 2 位小数（59.50 秒）；
 * - ≥ 60 秒 → 「X 分 Y 秒」；≥ 1 小时 → 「X 小时 Y 分钟」。
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '—';
  }
  if (seconds === 0) {
    return '瞬间完成';
  }
  const s = Math.round(seconds * 100) / 100;
  if (s < 0.01) {
    return `${formatNumber(seconds)} 秒`;
  }
  if (s < 60) {
    return `${formatSecondsFixed(s)} 秒`;
  }
  if (s < 3600) {
    const minutes = Math.floor(s / 60);
    const secs = trimTrailingZeros(formatSecondsFixed(s - minutes * 60));
    return `${formatNumber(minutes)} 分 ${secs} 秒`;
  }
  let hours = Math.floor(s / 3600);
  let minutes = Math.round((s - hours * 3600) / 60);
  if (minutes >= 60) {
    hours += 1;
    minutes -= 60;
  }
  return `${formatNumber(hours)} 小时 ${minutes} 分钟`;
}

/* ============================================================
   换算关系链（中间步骤展示）
   ============================================================ */

/**
 * 单值换算链：源单位 → 基准（bps / B）→（跨维度 ×8）→ 目标单位。
 * 每步给出「算式 + 进制说明」，供 ConversionChain 组件渲染。
 */
export function buildChain(value: number, from: UnitDef, to: UnitDef): ChainStep[] {
  const steps: ChainStep[] = [];
  const result = convert(value, from, to);
  const fmtV = formatNumber(value);
  const fromIsBit = from.kind === 'bit-rate';
  const toIsBit = to.kind === 'bit-rate';

  // ① 源单位 → 基准
  if (fromIsBit) {
    const bits = value * from.baseFactor;
    steps.push({
      title: '换算到比特基准',
      detail: `${fmtV} ${from.label} × ${formatNumber(from.baseFactor)} = ${formatNumber(bits)} bps（比特率每级 1000 进制）`,
    });
  } else {
    const bytes = value * from.baseFactor;
    const sysNote = from.system === 'binary' ? '二进制每级 1024 进制' : '十进制每级 1000 进制';
    steps.push({
      title: '换算到字节基准',
      detail: `${fmtV} ${from.label} × ${formatNumber(from.baseFactor)} = ${formatNumber(bytes)} B（${sysNote}）`,
    });
  }

  // ② 跨维度：比特 ⇄ 字节固定 8 倍
  if (fromIsBit && !toIsBit) {
    const bits = value * from.baseFactor;
    steps.push({
      title: '比特 → 字节（1 B = 8 bit）',
      detail: `${formatNumber(bits)} bps ÷ 8 = ${formatNumber(bits / 8)} B`,
    });
  } else if (!fromIsBit && toIsBit) {
    const bytes = value * from.baseFactor;
    steps.push({
      title: '字节 → 比特（1 B = 8 bit）',
      detail: `${formatNumber(bytes)} B × 8 = ${formatNumber(bytes * 8)} bps`,
    });
  }

  // ③ 基准 → 目标单位
  const baseLabel = toIsBit ? 'bps' : 'B';
  const baseValue = toIsBit
    ? fromIsBit
      ? value * from.baseFactor
      : (value * from.baseFactor) * 8
    : fromIsBit
      ? (value * from.baseFactor) / 8
      : value * from.baseFactor;
  if (to.baseFactor === 1) {
    steps.push({
      title: '基准即目标单位',
      detail: `${formatNumber(baseValue)} ${baseLabel} = ${formatNumber(result)} ${to.label}`,
    });
  } else {
    const sysNote = to.system === 'binary' ? '二进制 1024 进制' : '十进制 1000 进制';
    steps.push({
      title: '基准换算到目标单位',
      detail: `${formatNumber(baseValue)} ${baseLabel} ÷ ${formatNumber(to.baseFactor)} = ${formatNumber(result)} ${to.label}（${sysNote}）`,
    });
  }
  return steps;
}

/**
 * 下载时间换算链：大小 → B → bit ÷ 带宽（bps）→ 秒。
 */
export function buildDownloadChain(
  sizeValue: number,
  sizeUnit: UnitDef,
  bwValue: number,
  bwUnit: UnitDef,
): ChainStep[] {
  const bytes = sizeValue * sizeUnit.baseFactor;
  const bits = bytes * 8;
  const bps = bwValue * bwUnit.baseFactor;
  const seconds = bps > 0 ? bits / bps : 0;
  return [
    {
      title: '① 大小换算为字节',
      detail: `${formatNumber(sizeValue)} ${sizeUnit.label} × ${formatNumber(sizeUnit.baseFactor)} = ${formatNumber(bytes)} B`,
    },
    {
      title: '② 字节换算为比特（1 B = 8 bit）',
      detail: `${formatNumber(bytes)} B × 8 = ${formatNumber(bits)} bit`,
    },
    {
      title: '③ 带宽换算为 bps',
      detail: `${formatNumber(bwValue)} ${bwUnit.label} × ${formatNumber(bwUnit.baseFactor)} = ${formatNumber(bps)} bps`,
    },
    {
      title: '④ 时间 = 数据量 ÷ 带宽',
      detail: `${formatNumber(bits)} bit ÷ ${formatNumber(bps)} bps = ${formatDuration(seconds)}`,
    },
  ];
}
