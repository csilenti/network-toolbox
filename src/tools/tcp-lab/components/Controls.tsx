/**
 * 控制条 —— 自动播放/暂停、单步、重置、速度与视图模式切换（需求第七/十九/二十节）。
 * 自动播放与单步共用容器中的同一个 stepIndex 状态源。
 */
import type { SpeedOption, ViewMode } from '../types';

/** 可选速度倍率。 */
const SPEEDS: readonly SpeedOption[] = [0.5, 1, 1.5, 2];

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
  onTogglePlay,
  onPrev,
  onNext,
  onReset,
  onSpeedChange,
  onModeChange,
}: ControlsProps) {
  return (
    <section className="panel ctl-panel" style={{ animationDelay: '70ms' }}>
      <div className="ctl-main">
        <button type="button" className="btn btn-primary" onClick={onTogglePlay}>
          {playing ? '⏸ 暂停' : '▶ 自动播放'}
        </button>
        <button type="button" className="btn" onClick={onPrev} disabled={stepIndex === 0}>
          ⏮ 上一步
        </button>
        <button type="button" className="btn" onClick={onNext} disabled={stepIndex >= total - 1}>
          ⏭ 下一步
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReset}>
          ↻ 重新开始
        </button>
      </div>

      <div className="ctl-row">
        <div className="ctl-group">
          <span className="ctl-label">速度</span>
          <div className="seg" role="group" aria-label="播放速度">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`seg-item${speed === s ? ' is-active' : ''}`}
                onClick={() => onSpeedChange(s)}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <div className="ctl-group">
          <span className="ctl-label">视图</span>
          <div className="seg" role="group" aria-label="视图模式">
            <button
              type="button"
              className={`seg-item${mode === 'learn' ? ' is-active' : ''}`}
              onClick={() => onModeChange('learn')}
              aria-pressed={mode === 'learn'}
            >
              学习模式
            </button>
            <button
              type="button"
              className={`seg-item${mode === 'protocol' ? ' is-active' : ''}`}
              onClick={() => onModeChange('protocol')}
              aria-pressed={mode === 'protocol'}
            >
              协议模式
            </button>
          </div>
        </div>

        <span className="ctl-progress">
          当前：第 {stepIndex + 1} / {total} 步
        </span>
      </div>
    </section>
  );
}
