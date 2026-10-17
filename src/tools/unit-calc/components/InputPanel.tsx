/**
 * 输入面板：数值输入 + 源单位下拉（下载时间类别为双行：文件大小 + 带宽）。
 * 输入即算，无提交按钮；非法输入给教学化行内中文提示，输入中（空）不报错。
 */
import type { UnitCategory, UnitDef } from '../types';

export interface InputPanelProps {
  /** 当前类别。 */
  category: UnitCategory;
  /* ---- 单值类别（bandwidth / size）---- */
  /** 数值输入文本（受控）。 */
  valueText: string;
  /** 源单位 id（受控）。 */
  valueUnitId: string;
  /** 源单位候选列表。 */
  valueUnits: readonly UnitDef[];
  /** 数值行内错误提示；null 表示合法或等待输入。 */
  valueError: string | null;
  /** 数值为空（等待态）。 */
  valueWaiting: boolean;
  /* ---- 下载时间类别 ---- */
  sizeText: string;
  sizeUnitId: string;
  sizeUnits: readonly UnitDef[];
  sizeError: string | null;
  sizeWaiting: boolean;
  bwText: string;
  bwUnitId: string;
  bwUnits: readonly UnitDef[];
  bwError: string | null;
  bwWaiting: boolean;
  /* ---- 回调 ---- */
  onValueChange: (v: string) => void;
  onValueUnitChange: (id: string) => void;
  onSizeChange: (v: string) => void;
  onSizeUnitChange: (id: string) => void;
  onBwChange: (v: string) => void;
  onBwUnitChange: (id: string) => void;
  /** 一键填入示例。 */
  onExample: () => void;
  /** 清空全部输入。 */
  onClear: () => void;
}

/** 各类别标题。 */
const TITLES: Record<UnitCategory, string> = {
  bandwidth: '带宽 / 速率换算',
  size: '数据大小换算',
  'download-time': '下载时间估算',
};

/** 各类别说明文案。 */
const CAPTIONS: Record<UnitCategory, string> = {
  bandwidth: '输入任意速率值，立刻换算到其余全部比特率 / 字节率单位 —— 注意 1 B/s = 8 bps',
  size: '十进制（KB/MB/GB）与二进制（KiB/MiB/GiB）同台对照：1 KB = 1000 B ≠ 1 KiB = 1024 B',
  'download-time': '文件大小 ÷ 带宽 = 理论下载时间（大小换算为 bit 后除以带宽 bps）',
};

/** 下拉选项文案：数据大小类单位明确标注 1000 进制 / 1024 进制（任务要求第四节）。 */
function unitOptionLabel(u: UnitDef, annotateSystem: boolean): string {
  if (!annotateSystem) {
    return u.label;
  }
  return `${u.label}（${u.system === 'binary' ? '1024 进制' : '1000 进制'}）`;
}

interface NumberFieldProps {
  id: string;
  label: string;
  hint?: string;
  placeholder: string;
  text: string;
  error: string | null;
  waiting: boolean;
  waitingHint: string;
  onChange: (v: string) => void;
}

/** 数值输入 + 行内错误 / 等待提示。 */
function NumberField({ id, label, hint, placeholder, text, error, waiting, waitingHint, onChange }: NumberFieldProps) {
  return (
    <div className="uc-field">
      <label className="uc-field-label" htmlFor={id}>
        {label}
        {hint ? <span className="uc-field-hint">{hint}</span> : null}
      </label>
      <input
        id={id}
        className={`text-input mono${error ? ' is-invalid' : ''}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        value={text}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error ? (
        <p className="uc-field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : waiting ? (
        <p className="uc-waiting-hint">{waitingHint}</p>
      ) : null}
    </div>
  );
}

interface UnitSelectProps {
  id: string;
  label: string;
  units: readonly UnitDef[];
  value: string;
  annotateSystem: boolean;
  onChange: (id: string) => void;
}

/** 源单位下拉（十进制 / 二进制同台下拉，明确标注进制）。 */
function UnitSelect({ id, label, units, value, annotateSystem, onChange }: UnitSelectProps) {
  return (
    <div className="uc-field">
      <label className="uc-field-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="text-input mono uc-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {unitOptionLabel(u, annotateSystem)}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 输入面板：单值类别单行；下载时间类别双行（文件大小 + 带宽）。 */
export function InputPanel(props: InputPanelProps) {
  const {
    category,
    valueText,
    valueUnitId,
    valueUnits,
    valueError,
    valueWaiting,
    sizeText,
    sizeUnitId,
    sizeUnits,
    sizeError,
    sizeWaiting,
    bwText,
    bwUnitId,
    bwUnits,
    bwError,
    bwWaiting,
    onValueChange,
    onValueUnitChange,
    onSizeChange,
    onSizeUnitChange,
    onBwChange,
    onBwUnitChange,
    onExample,
    onClear,
  } = props;

  const isDownload = category === 'download-time';

  return (
    <section aria-label="换算输入">
      <div className="uc-input-head">
        <h2 className="panel-title">{TITLES[category]}</h2>
        <p className="panel-caption">{CAPTIONS[category]}</p>
      </div>

      {!isDownload ? (
        <div className="uc-input-row">
          <NumberField
            id="uc-value-input"
            label="数值"
            placeholder={category === 'bandwidth' ? '如 100' : '如 1'}
            text={valueText}
            error={valueError}
            waiting={valueWaiting}
            waitingHint="输入数值后自动换算"
            onChange={onValueChange}
          />
          <UnitSelect
            id="uc-value-unit"
            label="源单位"
            units={valueUnits}
            value={valueUnitId}
            annotateSystem={category === 'size'}
            onChange={onValueUnitChange}
          />
        </div>
      ) : (
        <>
          <div className="uc-input-row">
            <NumberField
              id="uc-size-input"
              label="文件大小"
              placeholder="如 100"
              text={sizeText}
              error={sizeError}
              waiting={sizeWaiting}
              waitingHint="输入文件大小后自动换算"
              onChange={onSizeChange}
            />
            <UnitSelect
              id="uc-size-unit"
              label="大小单位"
              units={sizeUnits}
              value={sizeUnitId}
              annotateSystem
              onChange={onSizeUnitChange}
            />
          </div>
          <div className="uc-input-row">
            <NumberField
              id="uc-bw-input"
              label="带宽"
              hint="比特率"
              placeholder="如 100"
              text={bwText}
              error={bwError}
              waiting={bwWaiting}
              waitingHint="输入带宽后自动换算"
              onChange={onBwChange}
            />
            <UnitSelect
              id="uc-bw-unit"
              label="带宽单位"
              units={bwUnits}
              value={bwUnitId}
              annotateSystem={false}
              onChange={onBwUnitChange}
            />
          </div>
        </>
      )}

      <div className="uc-actions">
        <button type="button" className="btn" onClick={onExample}>
          示例
        </button>
        <button type="button" className="btn btn-ghost" onClick={onClear}>
          清空
        </button>
      </div>
    </section>
  );
}
