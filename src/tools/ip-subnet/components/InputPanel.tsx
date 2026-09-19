import { useEffect, useState, type CSSProperties } from 'react';
import type { IpParseError } from '../utils/ip';
import { parseMaskDetailed, prefixToMask } from '../utils/ip';
import type { DivideMode } from '../utils/subnet';
import { MAX_TEACHING_SUBNETS } from '../utils/subnet';

export interface InputPanelProps {
  ipText: string;
  /** IP 解析错误（由父组件解析后传入），null 表示当前输入合法。 */
  ipError: IpParseError | null;
  prefix: number;
  mode: DivideMode;
  countValue: number;
  hostsValue: number;
  onIpChange: (value: string) => void;
  /** 前缀与掩码双向联动统一走这里（入参始终为合法的 0–32 前缀）。 */
  onPrefixChange: (value: number) => void;
  onModeChange: (mode: DivideMode) => void;
  onCountChange: (value: number) => void;
  onHostsChange: (value: number) => void;
  onReset: () => void;
}

/** 将任意输入收敛到 [min, max] 的整数。 */
function clampInt(raw: number, min: number, max: number): number {
  if (!Number.isFinite(raw)) return min;
  return Math.min(max, Math.max(min, Math.round(raw)));
}

/**
 * 输入面板：IP 地址、前缀 / 子网掩码双向联动、
 * 划分方式（按子网数量 / 按主机数）与对应数值输入（数字框 + 滑块）、重置。
 */
export function InputPanel(props: InputPanelProps) {
  const {
    ipText,
    ipError,
    prefix,
    mode,
    countValue,
    hostsValue,
    onIpChange,
    onPrefixChange,
    onModeChange,
    onCountChange,
    onHostsChange,
    onReset,
  } = props;

  // 掩码输入框的本地草稿：外部前缀变化时同步；用户直接输入掩码时
  // 先在本地校验，合法才上抛（上抛后父级 prefix 更新，再由 effect 回流同步）。
  const [maskText, setMaskText] = useState<string>(prefixToMask(prefix));
  const [maskError, setMaskError] = useState<string | null>(null);

  useEffect(() => {
    setMaskText(prefixToMask(prefix));
    setMaskError(null);
  }, [prefix]);

  const handleMaskChange = (raw: string) => {
    setMaskText(raw);
    const parsed = parseMaskDetailed(raw);
    if (parsed.ok) {
      setMaskError(null);
      onPrefixChange(parsed.value);
    } else {
      setMaskError(parsed.error.message);
    }
  };

  const handlePrefixInput = (raw: string) => {
    const n = Number(raw);
    if (raw.trim() === '' || Number.isNaN(n)) return;
    onPrefixChange(clampInt(n, 0, 32));
  };

  return (
    <section className="ip-input-panel" aria-label="划分参数输入">
      <div className="ip-input-head">
        <h2 className="panel-title">划分参数</h2>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          重置
        </button>
      </div>

      <div className="ip-input-grid">
        {/* ---- IP 地址 ---- */}
        <div className="field field--ip">
          <label className="field-label" htmlFor="ip-input">
            IP 地址 <span className="field-hint-inline">IPv4 点分十进制</span>
          </label>
          <input
            id="ip-input"
            className={`text-input mono ${ipError ? 'is-invalid' : ''}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="192.168.1.0"
            value={ipText}
            onChange={(e) => onIpChange(e.target.value)}
            aria-invalid={ipError ? true : undefined}
            aria-describedby={ipError ? 'ip-error' : undefined}
          />
          {ipError && (
            <p className="field-error" id="ip-error" role="alert">
              {ipError.message}
            </p>
          )}
        </div>

        {/* ---- 前缀长度 ---- */}
        <div className="field field--prefix">
          <label className="field-label" htmlFor="prefix-input">
            前缀长度
          </label>
          <div className="prefix-controls">
            <span className="prefix-slash mono" aria-hidden="true">
              /
            </span>
            <input
              id="prefix-input"
              className="text-input mono"
              type="number"
              min={0}
              max={32}
              step={1}
              value={prefix}
              onChange={(e) => handlePrefixInput(e.target.value)}
            />
            <input
              className="range-input"
              style={{ '--fill': `${(prefix / 32) * 100}%` } as CSSProperties}
              type="range"
              min={0}
              max={32}
              step={1}
              value={prefix}
              onChange={(e) => onPrefixChange(Number(e.target.value))}
              aria-label="前缀长度滑块"
            />
          </div>
        </div>

        {/* ---- 子网掩码（与前缀双向联动） ---- */}
        <div className="field field--mask">
          <label className="field-label" htmlFor="mask-input">
            子网掩码 <span className="field-hint-inline">与前缀联动</span>
          </label>
          <input
            id="mask-input"
            className={`text-input mono ${maskError ? 'is-invalid' : ''}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="255.255.255.0"
            value={maskText}
            onChange={(e) => handleMaskChange(e.target.value)}
            aria-invalid={maskError ? true : undefined}
            aria-describedby={maskError ? 'mask-error' : undefined}
          />
          {maskError && (
            <p className="field-error" id="mask-error" role="alert">
              {maskError}
            </p>
          )}
        </div>
      </div>

      <div className="ip-input-divider" role="presentation" />

      {/* ---- 划分方式 ---- */}
      <fieldset className="mode-group">
        <legend className="field-label">划分方式</legend>
        <div className="mode-options" role="radiogroup" aria-label="划分方式">
          <label className="mode-option">
            <input
              type="radio"
              name="divide-mode"
              value="count"
              checked={mode === 'count'}
              onChange={() => onModeChange('count')}
            />
            <span className="mode-option-text">
              <span className="mode-option-name">按子网数量</span>
              <span className="mode-option-desc">需要划出 N 个子网</span>
            </span>
          </label>
          <label className="mode-option">
            <input
              type="radio"
              name="divide-mode"
              value="hosts"
              checked={mode === 'hosts'}
              onChange={() => onModeChange('hosts')}
            />
            <span className="mode-option-text">
              <span className="mode-option-name">按每子网主机数</span>
              <span className="mode-option-desc">每个子网要容纳 H 台主机</span>
            </span>
          </label>
        </div>
      </fieldset>

      {/* ---- 模式对应的数值输入 ---- */}
      {mode === 'count' ? (
        <div className="field value-field">
          <label className="field-label" htmlFor="count-input">
            需要的子网数量
            <span className="field-hint-inline">范围 1–256，超出需借位超过 8 bit</span>
          </label>
          <div className="value-controls">
            <input
              id="count-input"
              className="text-input mono"
              type="number"
              min={1}
              max={MAX_TEACHING_SUBNETS}
              step={1}
              value={countValue}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value.trim() === '' || Number.isNaN(n)) return;
                onCountChange(clampInt(n, 1, MAX_TEACHING_SUBNETS));
              }}
            />
            <input
              className="range-input"
              style={{ '--fill': `${((countValue - 1) / 255) * 100}%` } as CSSProperties}
              type="range"
              min={1}
              max={MAX_TEACHING_SUBNETS}
              step={1}
              value={countValue}
              onChange={(e) => onCountChange(Number(e.target.value))}
              aria-label="子网数量滑块"
            />
          </div>
        </div>
      ) : (
        <div className="field value-field">
          <label className="field-label" htmlFor="hosts-input">
            每子网所需主机数
            <span className="field-hint-inline">范围 2–65534</span>
          </label>
          <div className="value-controls">
            <input
              id="hosts-input"
              className="text-input mono"
              type="number"
              min={2}
              max={65534}
              step={1}
              value={hostsValue}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value.trim() === '' || Number.isNaN(n)) return;
                onHostsChange(clampInt(n, 2, 65534));
              }}
            />
            <input
              className="range-input"
              style={{ '--fill': `${((hostsValue - 2) / 65532) * 100}%` } as CSSProperties}
              type="range"
              min={2}
              max={65534}
              step={1}
              value={hostsValue}
              onChange={(e) => onHostsChange(Number(e.target.value))}
              aria-label="每子网主机数滑块"
            />
          </div>
        </div>
      )}
    </section>
  );
}
