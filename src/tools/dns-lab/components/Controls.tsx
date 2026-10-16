/**
 * 控制条 —— 自动播放/暂停、单步、重置、速度与视图模式切换（需求第二十五/二十七节）。
 * 自动播放与单步共用容器中的同一个 stepIndex 状态源。
 */
import type { SpeedOption, ViewMode } from '../types';

/** 可选速度倍率（比 TCP 工具多一档 4×）。 */
const SPEEDS: readonly SpeedOption[] = [0.5, 1, 2, 4];

interface ControlsProps {
  /** 是否正在自动播放。 */
  playing: boolean;
  /** 当前速度倍率。 */
  speed: SpeedOption;
  /** 当前视图模式。 */
  mode: ViewMode;
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 步骤总数。 */
  total: number;
  /** 是否已有进行中 / 已完成的解析。 */
  hasRun: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onSpeedChange: (speed: SpeedOption) => void;
  onModeChange: (mode: ViewMode) => void;
}

/**
 * 控制面板。
 */
export function Controls({
  playing,
  speed,
  mode,
  stepIndex,
  total,
  hasRun,
  onTogglePlay,
  onPrev,
  onNext,
  onReset,
  onSpeedChange,
  onModeChange,
}: ControlsProps) {
  const last = total - 1;

  return (
    <section className="panel dns-ctl-panel" style={{ animationDelay: '70ms' }}>
      <div className="dns-ctl-main">
        <button
          type="button"
          className="btn btn-primary"
          onClick={onTogglePlay}
          disabled={!hasRun}
        >
          {playing ? '⏸ 暂停' : '▶ 自动播放'}
        </button>
        <button type="button" className="btn" onClick={onPrev} disabled={!hasRun || stepIndex === 0}>
          ◀ 上一步
        </button>
        <button type="button" className="btn" onClick={onNext} disabled={!hasRun || stepIndex >= last}>
          ▶ 下一步
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReset} disabled={!hasRun}>
          ↻ 重置
        </button>
      </div>

      <div className="dns-ctl-row">
        <div className="dns-ctl-group">
          <span className="dns-ctl-label">速度</span>
          <div className="dns-seg" role="group" aria-label="播放速度">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`dns-seg-item${speed === s ? ' is-active' : ''}`}
                onClick={() => onSpeedChange(s)}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="dns-ctl-group">
          <span className="dns-ctl-label">视图</span>
          <div className="dns-seg" role="group" aria-label="视图模式">
            <button
              type="button"
              className={`dns-seg-item${mode === 'learn' ? ' is-active' : ''}`}
              onClick={() => onModeChange('learn')}
              aria-pressed={mode === 'learn'}
            >
              学习模式
            </button>
            <button
              type="button"
              className={`dns-seg-item${mode === 'protocol' ? ' is-active' : ''}`}
              onClick={() => onModeChange('protocol')}
              aria-pressed={mode === 'protocol'}
            >
              协议模式
            </button>
          </div>
        </div>

        <span className="dns-ctl-progress">
          {hasRun ? `当前：第 ${stepIndex + 1} / ${total} 步` : '尚未开始解析'}
        </span>
      </div>
    </section>
  );
}
