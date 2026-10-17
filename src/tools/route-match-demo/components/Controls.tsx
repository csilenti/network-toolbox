/**
 * 控制条 —— 上一步 / 下一步 / 自动播放 / 暂停 / 重置 / 速度（任务要求第四节 ⭐）。
 * 自动播放与单步共用容器中的同一个 stepIndex 状态源（结构参照 tcp-lab Controls）。
 */
import type { SpeedOption } from '../types';

/** 可选速度倍率（任务要求第四节：0.5× / 1× / 2× / 4×）。 */
const SPEEDS: readonly SpeedOption[] = [0.5, 1, 2, 4];

interface ControlsProps {
  /** 是否正在自动播放。 */
  playing: boolean;
  /** 当前速度倍率。 */
  speed: SpeedOption;
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 步骤总数。 */
  total: number;
  /** 是否已开始演示（未开始时禁用播放/单步）。 */
  hasRun: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  onSpeedChange: (speed: SpeedOption) => void;
}

/**
 * 播放控制面板。
 */
export function Controls({
  playing,
  speed,
  stepIndex,
  total,
  hasRun,
  onTogglePlay,
  onPrev,
  onNext,
  onReset,
  onSpeedChange,
}: ControlsProps) {
  const last = Math.max(0, total - 1);
  return (
    <section className="panel rmd-ctl-panel" style={{ animationDelay: '70ms' }}>
      <div className="rmd-ctl-main">
        <button type="button" className="btn btn-primary" onClick={onTogglePlay} disabled={!hasRun}>
          {playing ? '⏸ 暂停' : '▶ 自动播放'}
        </button>
        <button type="button" className="btn" onClick={onPrev} disabled={!hasRun || stepIndex === 0}>
          ⏮ 上一步
        </button>
        <button type="button" className="btn" onClick={onNext} disabled={!hasRun || stepIndex >= last}>
          ⏭ 下一步
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReset} disabled={!hasRun}>
          ↻ 重置
        </button>
      </div>

      <div className="rmd-ctl-row">
        <div className="rmd-ctl-group">
          <span className="rmd-ctl-label">速度</span>
          <div className="rmd-seg" role="group" aria-label="播放速度">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                className={`rmd-seg-item${speed === s ? ' is-active' : ''}`}
                onClick={() => onSpeedChange(s)}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>

        <span className="rmd-ctl-progress">
          {hasRun ? `当前：第 ${stepIndex + 1} / ${total} 步` : '尚未开始演示'}
        </span>
      </div>
    </section>
  );
}
