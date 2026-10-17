/**
 * 路由匹配演示 —— 工具容器。
 *
 * 职责：
 *  - 持有 ipInput / runIp（提交后的一次演示运行）/ stepIndex / playing / speed；
 *  - 「开始演示」触发 buildDemoSteps 纯函数生成结构化步骤数组（11 步）；
 *  - 自动播放用 useEffect + 单个 setInterval 驱动 stepIndex 前进（速度倍率
 *    控制间隔，到末步自动停止），与单步执行共用同一 stepIndex（无 setTimeout 嵌套）；
 *  - 速度倍率经 --speed CSS 变量同时控制飞行动画时长（任务要求第四节）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { DEFAULT_ROUTES } from '../route-analysis/utils/route';
import { buildDemoSteps } from './utils/demo';
import { DemoTable } from './components/DemoTable';
import { StepExplanation } from './components/StepExplanation';
import { WinnerCard } from './components/WinnerCard';
import { Controls } from './components/Controls';
import type { DemoStep, SpeedOption } from './types';
import './route-match-demo.css';

/** 自动播放的基准步间隔（1× 时每步 2200ms，速度倍率直接相除）。 */
const AUTO_PLAY_INTERVAL_MS = 2200;

/** 预设目的 IP（任务要求第三节）。 */
const PRESET_IPS: readonly string[] = ['192.168.1.200', '10.5.5.5', '8.8.8.8'];

/**
 * 路由匹配演示主组件。
 */
export default function RouteMatchDemoTool() {
  /** 输入框中的目的 IP 草稿。 */
  const [ipInput, setIpInput] = useState<string>('192.168.1.200');
  /** 已提交的演示运行（null = 未开始）。 */
  const [runIp, setRunIp] = useState<string | null>(null);
  /** 当前步骤索引（自动播放与单步共用的唯一状态源）。 */
  const [stepIndex, setStepIndex] = useState<number>(0);
  /** 是否自动播放中。 */
  const [playing, setPlaying] = useState<boolean>(false);
  /** 播放速度倍率，默认 1×。 */
  const [speed, setSpeed] = useState<SpeedOption>(1);
  /** 输入校验 / 交互提示错误。 */
  const [error, setError] = useState<string | null>(null);

  // ---- 由运行快照生成步骤数组（纯函数，路由表固定为预设 6 条） ----
  const steps = useMemo<readonly DemoStep[] | null>(() => {
    if (runIp === null) {
      return null;
    }
    const result = buildDemoSteps(runIp, DEFAULT_ROUTES);
    return result.ok ? result.steps : null;
  }, [runIp]);

  const total = steps?.length ?? 0;
  const last = Math.max(0, total - 1);
  const completed = steps !== null && stepIndex >= last;

  // ---- 自动播放：单个 interval，功能更新到末步封顶 ----
  useEffect(() => {
    if (!playing || !steps) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
    }, AUTO_PLAY_INTERVAL_MS / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed, steps]);

  // ---- 到达末步自动停止 ----
  useEffect(() => {
    if (playing && steps && stepIndex >= steps.length - 1) {
      setPlaying(false);
    }
  }, [playing, stepIndex, steps]);

  // ---- 开始演示（输入校验 + 运行快照） ----
  const handleStart = useCallback(
    (raw?: string) => {
      // 演示进行中（未到末步）禁止破坏当前动画状态（任务要求第九节）
      if (steps !== null && !completed) {
        setError('演示进行中：请先点击「重置」结束当前演示，再重新开始。');
        return;
      }
      const candidate = (raw ?? ipInput).trim();
      if (candidate === '') {
        setError('请输入目的 IP');
        return;
      }
      const result = buildDemoSteps(candidate, DEFAULT_ROUTES);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setRunIp(candidate);
      setStepIndex(0);
      setPlaying(true);
    },
    [ipInput, steps, completed],
  );

  // ---- 预设按钮：填入并立即开始（进行中只填充输入，提示重置） ----
  const handlePreset = useCallback(
    (ip: string) => {
      setIpInput(ip);
      setError(null);
      if (steps === null || completed) {
        const result = buildDemoSteps(ip, DEFAULT_ROUTES);
        if (result.ok) {
          setRunIp(ip);
          setStepIndex(0);
          setPlaying(true);
        }
      }
    },
    [steps, completed],
  );

  // ---- 控制回调 ----
  const handleTogglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, last));
  }, [last]);

  const handlePrev = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setRunIp(null);
    setStepIndex(0);
    setPlaying(false);
    setError(null);
  }, []);

  const handleSpeedChange = useCallback((next: SpeedOption) => {
    setSpeed(next);
  }, []);

  const handleIpInput = useCallback((value: string) => {
    setIpInput(value);
    setError(null);
  }, []);

  // ---- 派生提示：演示进行中修改 IP（不破坏当前动画） ----
  const editingWhileRunning =
    runIp !== null && !completed && ipInput.trim() !== runIp;

  return (
    <div className="tool-page rmd-root" style={{ '--speed': speed } as CSSProperties}>
      <header className="rmd-header">
        <h1>路由匹配演示</h1>
        <p className="rmd-subtitle">
          让数据包化身一个小包裹，从路由表第一条开始逐条飞行比对 —— 亲眼看到最长前缀匹配怎么选出最终路由
        </p>

        <div className="rmd-input-row">
          <label className="rmd-field-label" htmlFor="rmd-ip-input">
            目的 IP
          </label>
          <input
            id="rmd-ip-input"
            type="text"
            className={`text-input mono rmd-ip-input${error ? ' is-invalid' : ''}`}
            value={ipInput}
            placeholder="例如 192.168.1.200"
            spellCheck={false}
            onChange={(event) => handleIpInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleStart();
              }
            }}
            aria-label="目的 IP"
          />
          <button type="button" className="btn btn-primary" onClick={() => handleStart()}>
            开始演示
          </button>
          <div className="rmd-presets" role="group" aria-label="预设目的 IP">
            {PRESET_IPS.map((ip) => (
              <button
                key={ip}
                type="button"
                className="rmd-preset-btn mono"
                onClick={() => handlePreset(ip)}
              >
                {ip}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="rmd-input-error">⚠ {error}</p>}
        {!error && editingWhileRunning && (
          <p className="rmd-input-hint">
            演示进行中：修改 IP 需先点击「重置」再重新演示 —— 当前动画不受影响。
          </p>
        )}
      </header>

      <div className="rmd-layout">
        <div className="rmd-col-main">
          <DemoTable routes={DEFAULT_ROUTES} steps={steps} stepIndex={stepIndex} ip={runIp} />
          <Controls
            playing={playing}
            speed={speed}
            stepIndex={stepIndex}
            total={total}
            hasRun={steps !== null}
            onTogglePlay={handleTogglePlay}
            onPrev={handlePrev}
            onNext={handleNext}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
          />
        </div>

        <div className="rmd-col-side">
          <StepExplanation steps={steps} stepIndex={stepIndex} />
          <WinnerCard steps={steps} stepIndex={stepIndex} routes={DEFAULT_ROUTES} />
        </div>
      </div>

      <p className="rmd-footnote">
        判定逻辑与「路由表分析」完全一致：逐条 (目的 IP AND 掩码) === 网络地址 筛选候选集，
        再按最长前缀（必要时 metric）决胜。路由表固定为预设 6 条，本工具专注演示「过程」。
      </p>
    </div>
  );
}
