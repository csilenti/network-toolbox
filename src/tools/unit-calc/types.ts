/**
 * 网络单位换算计算器 —— 数据模型与共享类型。
 *
 * 与任务要求第八节一一对应：独立计算层、纯函数、
 * 组件内禁止硬编码换算表；错误均为结构化联合类型，
 * 供 UI 渲染教学化中文提示。
 */

/** 三大换算类别。 */
export type UnitCategory = 'bandwidth' | 'size' | 'download-time';

/**
 * 单位所属体系：
 * - decimal / binary：数据大小类的十进制（SI，1000 进制）与二进制（IEC，1024 进制）；
 * - bit-byte：速率类单位（比特率 / 字节率），参与固定 8 倍的 bit ⇄ Byte 换算。
 */
export type UnitSystem = 'decimal' | 'binary' | 'bit-byte';

/** 单位种类：比特率 / 字节率 / 数据大小。 */
export type UnitKind = 'bit-rate' | 'byte-rate' | 'size';

/** 单个单位定义。 */
export interface UnitDef {
  /** 单位标识，如 'Mbps' | 'MiB'。 */
  id: string;
  /** 展示名。 */
  label: string;
  /** 相对基准的倍数（比特率基准 bps；字节率与数据大小基准 B）。 */
  baseFactor: number;
  /** 所属体系（见 UnitSystem）。 */
  system: UnitSystem;
  /** 单位种类。 */
  kind: UnitKind;
}

/** 数值解析错误类别（empty 表示等待态，不报错）。 */
export type ParseErrorKind = 'empty' | 'negative' | 'chars' | 'notation' | 'overflow';

/** 数值解析结果：成功携带数值，失败携带中文错误文案与错误类别。 */
export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; error: string; kind: ParseErrorKind };

/** 下载时间估算结果：成功携带秒数，失败携带中文错误文案。 */
export type DownloadEstimate =
  | { ok: true; seconds: number }
  | { ok: false; error: string };

/** 换算关系链的单步数据。 */
export interface ChainStep {
  /** 步骤标题，如「换算到比特基准」。 */
  title: string;
  /** 步骤正文（含关键数值的算式说明）。 */
  detail: string;
}
