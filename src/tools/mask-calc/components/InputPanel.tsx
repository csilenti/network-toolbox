import type { MaskError } from '../types';

export interface InputPanelProps {
  /** 掩码输入框的文本（受控）。 */
  maskText: string;
  /** CIDR 前缀输入框的文本（受控，不含 “/”）。 */
  cidrText: string;
  /** IP 输入框的文本（受控）。 */
  ipText: string;
  /** CIDR 输入的行内错误提示；null 表示当前合法或等待输入。 */
  cidrError: string | null;
  /** 掩码输入的行内错误提示；null 表示当前合法或等待输入。 */
  maskError: MaskError | null;
  onMaskChange: (value: string) => void;
  onCidrChange: (value: string) => void;
  onIpChange: (value: string) => void;
  /** 一键填入默认示例（IP 192.168.1.100 / 24）。 */
  onExample: () => void;
  /** 清空全部输入。 */
  onClear: () => void;
}

/** 掩码 ⇄ CIDR 双向换算符号（视觉锚点）。 */
function SwapBadge() {
  return (
    <div className="mc-swap" aria-hidden="true">
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 8h13" />
        <path d="m14 4.5 3.5 3.5L14 11.5" />
        <path d="M20 16H7" />
        <path d="m10 12.5-3.5 3.5L10 19.5" />
      </svg>
    </div>
  );
}

/**
 * 输入面板：掩码 ⇄ CIDR 双向联动（核心交互）+ IP 地址输入 + 示例 / 清空。
 * 输入即算，无提交按钮；非法输入给教学化行内提示，输入中不报错。
 */
export function InputPanel(props: InputPanelProps) {
  const {
    maskText,
    cidrText,
    ipText,
    cidrError,
    maskError,
    onMaskChange,
    onCidrChange,
    onIpChange,
    onExample,
    onClear,
  } = props;

  return (
    <section className="mc-input-panel" aria-label="掩码换算与网段查询输入">
      <div className="mc-input-head">
        <h2 className="panel-title">掩码 ⇄ CIDR 双向换算</h2>
        <p className="panel-caption">
          前缀是「从左起连续 1 的个数」，点分掩码是把这 32 个比特按 8 位一组写成十进制 —— 两者是同一个掩码的两种写法
        </p>
      </div>

      {/* ---- 掩码 ⇄ CIDR ---- */}
      <div className="mc-swap-grid">
        <div className="field">
          <label className="mc-field-label" htmlFor="mc-mask-input">
            子网掩码
          </label>
          <input
            id="mc-mask-input"
            className={`text-input mono ${maskError ? 'is-invalid' : ''}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="255.255.255.0"
            value={maskText}
            onChange={(e) => onMaskChange(e.target.value)}
            aria-invalid={maskError ? true : undefined}
            aria-describedby={maskError ? 'mc-mask-error' : undefined}
          />
          {maskError && (
            <p className="mc-field-error" id="mc-mask-error" role="alert">
              {maskError.message}
              {maskError.kind === 'discontinuous' && (
                <span className="mc-suggestion">
                  您可能想要：<button
                    type="button"
                    className="mc-suggestion-btn mono"
                    onClick={() => onMaskChange(maskError.suggestion)}
                  >
                    {maskError.suggestion}
                  </button>
                </span>
              )}
            </p>
          )}
        </div>

        <SwapBadge />

        <div className="field">
          <label className="mc-field-label" htmlFor="mc-cidr-input">
            CIDR 前缀 <span className="mc-field-hint">范围 0~32</span>
          </label>
          <div className="mc-cidr-controls">
            <span className="mc-cidr-slash mono" aria-hidden="true">
              /
            </span>
            <input
              id="mc-cidr-input"
              className={`text-input mono ${cidrError ? 'is-invalid' : ''}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              spellCheck={false}
              placeholder="24"
              value={cidrText}
              onChange={(e) => onCidrChange(e.target.value)}
              aria-invalid={cidrError ? true : undefined}
              aria-describedby={cidrError ? 'mc-cidr-error' : undefined}
            />
          </div>
          {cidrError && (
            <p className="mc-field-error" id="mc-cidr-error" role="alert">
              {cidrError}
            </p>
          )}
        </div>
      </div>

      <div className="mc-divider" role="presentation" />

      {/* ---- IP + 示例 / 清空 ---- */}
      <div className="mc-ip-row">
        <div className="field field--ip">
          <label className="mc-field-label" htmlFor="mc-ip-input">
            IP 地址 <span className="mc-field-hint">与掩码做 AND 运算得到所在网段</span>
          </label>
          <input
            id="mc-ip-input"
            className="text-input mono"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="192.168.1.100"
            value={ipText}
            onChange={(e) => onIpChange(e.target.value)}
          />
        </div>
        <div className="mc-quick-actions">
          <button type="button" className="btn" onClick={onExample}>
            示例
          </button>
          <button type="button" className="btn btn-ghost" onClick={onClear}>
            清空
          </button>
        </div>
      </div>
    </section>
  );
}
