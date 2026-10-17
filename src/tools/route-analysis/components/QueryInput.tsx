import type { CSSProperties } from 'react';
import { STAGGER_MS } from '../../ip-subnet/types';

export interface QueryInputProps {
  /** 目的 IP 输入框文本（受控）。 */
  ipText: string;
  /** 行内错误提示；null 表示当前合法或等待输入。 */
  error: string | null;
  onIpChange: (value: string) => void;
  /** 一键填入默认示例 192.168.1.200。 */
  onExample: () => void;
  /** 清空输入。 */
  onClear: () => void;
}

/** 卡片错峰入场延迟（与 mask-calc 同款）。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/**
 * 目的 IP 查询面板（任务要求第四节交互 1 ⭐）。
 * 输入即算，无提交按钮；非法输入给教学化行内提示，输入中不报错。
 */
export function QueryInput(props: QueryInputProps) {
  const { ipText, error, onIpChange, onExample, onClear } = props;

  return (
    <section className="panel tool-section ra-section" style={stagger(0)} aria-label="目的 IP 查询">
      <div className="ra-input-head">
        <h2 className="panel-title">目的 IP 查询</h2>
        <p className="panel-caption">
          拿着目的地址在路由表里逐条比对 —— 输入即算，看看路由器会把包从哪块网卡送出去
        </p>
      </div>

      <div className="ra-query-row">
        <div className="field field--ip">
          <label className="ra-field-label" htmlFor="ra-ip-input">
            目的 IP <span className="ra-field-hint">路由器按「最长前缀匹配」为它选路</span>
          </label>
          <input
            id="ra-ip-input"
            className={`text-input mono ${error ? 'is-invalid' : ''}`}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            spellCheck={false}
            placeholder="192.168.1.200"
            value={ipText}
            onChange={(e) => onIpChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'ra-ip-error' : undefined}
          />
          {error && (
            <p className="ra-field-error" id="ra-ip-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="ra-quick-actions">
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
