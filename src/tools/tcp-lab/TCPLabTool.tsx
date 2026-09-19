/**
 * TCP 连接演示 —— 工具容器。
 *
 * 职责：
 *  - 持有 stepIndex / playing / speed / mode 四个顶层状态；
 *  - 自动播放用 useEffect + 单个 setInterval 驱动 stepIndex 前进
 *    （速度倍率控制间隔，到末步自动停止），与单步执行共用同一 stepIndex；
 *  - 由 steps.ts 的结构化状态机推导双方当前 TCP 状态。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeStatePointers, TCP_STEPS, TOTAL_STEPS } from './steps';
import { SequenceDiagram } from './components/SequenceDiagram';
import { StateTracker } from './components/StateTracker';
import { StepExplanation } from './components/StepExplanation';
import { PacketInspector } from './components/PacketInspector';
import { Timeline } from './components/Timeline';
import { Controls } from './components/Controls';
import { WhyCards } from './components/WhyCards';
import type { SpeedOption, ViewMode } from './types';
import './tcp-lab.css';

/** 自动播放的基准步间隔（1× 时每步 2200ms，速度倍率直接相除）。 */
const AUTO_PLAY_INTERVAL_MS = 2200;

/**
 * TCP 连接演示主组件。
 */
export default function TCPLabTool() {
  /** 当前步骤索引（自动播放与单步共用的唯一状态源）。 */
  const [stepIndex, setStepIndex] = useState<number>(0);
  /** 是否自动播放中。 */
  const [playing, setPlaying] = useState<boolean>(false);
  /** 播放速度倍率，默认 1×。 */
  const [speed, setSpeed] = useState<SpeedOption>(1);
  /** 视图模式：学习模式 / 协议模式。 */
  const [mode, setMode] = useState<ViewMode>('learn');

  const currentStep = TCP_STEPS[stepIndex];

  // ---- 双方状态链指针（由 stepIndex 推导，纯函数缓存） ----
  const statePointers = useMemo(() => computeStatePointers(stepIndex), [stepIndex]);

  // ---- 自动播放：单个 interval，功能更新到末步封顶 ----
  useEffect(() => {
    if (!playing) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setStepIndex((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
    }, AUTO_PLAY_INTERVAL_MS / speed);
    return () => window.clearInterval(timer);
  }, [playing, speed]);

  // ---- 到达末步自动停止 ----
  useEffect(() => {
    if (playing && stepIndex >= TOTAL_STEPS - 1) {
      setPlaying(false);
    }
  }, [playing, stepIndex]);

  // ---- 控制回调 ----
  const handleTogglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, TOTAL_STEPS - 1));
  }, []);

  const handlePrev = useCallback(() => {
    setStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleReset = useCallback(() => {
    setStepIndex(0);
    setPlaying(false);
  }, []);

  const handleSpeedChange = useCallback((next: SpeedOption) => {
    setSpeed(next);
  }, []);

  const handleModeChange = useCallback((next: ViewMode) => {
    setMode(next);
  }, []);

  /** 时间轴跳转：仅设置索引，飞行动画按步骤 id 自动重放。 */
  const handleJump = useCallback((index: number) => {
    setStepIndex(index);
  }, []);

  return (
    <div className="tool-page tcp-root" data-mode={mode}>
      <header className="tcp-header">
        <h1>TCP 连接演示</h1>
        <p className="tcp-subtitle">
          三次握手、数据传输与四次挥手的完整生命周期 —— 一个可以亲手操作的 TCP 协议动画实验室
        </p>
      </header>

      <div className="tcp-layout">
        <div className="tcp-col-main">
          <SequenceDiagram steps={TCP_STEPS} stepIndex={stepIndex} speed={speed} />
          <Controls
            playing={playing}
            speed={speed}
            mode={mode}
            stepIndex={stepIndex}
            total={TOTAL_STEPS}
            onTogglePlay={handleTogglePlay}
            onPrev={handlePrev}
            onNext={handleNext}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
            onModeChange={handleModeChange}
          />
        </div>

        <div className="tcp-col-side">
          <StepExplanation
            step={currentStep}
            stepIndex={stepIndex}
            total={TOTAL_STEPS}
            mode={mode}
          />
          <PacketInspector step={currentStep} />
        </div>
      </div>

      <StateTracker pointers={statePointers} changes={currentStep.stateChanges} />

      <Timeline steps={TCP_STEPS} stepIndex={stepIndex} onSelect={handleJump} />

      <WhyCards />

      <p className="tcp-footnote">
        Seq / Ack 逻辑：SYN 与 FIN 各消耗一个序列号，纯 ACK 不消耗序列号，数据按字节数消耗序列号。
      </p>
    </div>
  );
}
