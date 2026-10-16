/**
 * DNS 域名解析演示 —— 工具容器。
 *
 * 职责：
 *  - 持有 domain 输入、submittedRun（提交后的一次解析运行）、stepIndex / playing /
 *    speed / mode，以及缓存模拟的 cacheStore / timeScale 状态；
 *  - 自动播放用 useEffect + 单个 setInterval 驱动 stepIndex 前进（速度倍率控制
 *    间隔，到末步自动停止），与单步执行共用同一 stepIndex；
 *  - 「开始解析」触发 steps.ts 的 buildSteps 生成结构化步骤数组（纯函数），
 *    动画层只负责表现当前状态（需求第二十九节）；
 *  - TTL 倒计时：容器层 interval 按时间加速倍率递减缓存条目的剩余 TTL，
 *    仅在前端演示层面工作（需求第二十节）。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DEFAULT_TTL, getAnswer, isValidDomain } from './data';
import { buildSteps } from './steps';
import { QueryPath } from './components/QueryPath';
import { StepExplanation } from './components/StepExplanation';
import { PacketInspector } from './components/PacketInspector';
import { Timeline } from './components/Timeline';
import { RecordExplorer } from './components/RecordExplorer';
import { Controls } from './components/Controls';
import { WhyCards } from './components/WhyCards';
import { ResultCard } from './components/ResultCard';
import { CachePanel } from './components/CachePanel';
import type { CacheEntry, DnsStep, SpeedOption, TimeScaleOption, ViewMode } from './types';
import './dns-lab.css';

/** 自动播放的基准步间隔（1× 时每步 2200ms，速度倍率直接相除）。 */
const AUTO_PLAY_INTERVAL_MS = 2200;

/** 一次已提交的解析运行（决定步骤数组形态的快照）。 */
interface DnsRun {
  /** 归一化后的域名。 */
  domain: string;
  /** 本次解析是否命中递归侧缓存。 */
  cacheHit: boolean;
  /** 缓存命中时的剩余 TTL（秒）。 */
  ttlRemaining?: number;
}

/**
 * DNS 域名解析演示主组件。
 */
export default function DnsLabTool() {
  /** 输入框中的域名草稿。 */
  const [domainInput, setDomainInput] = useState<string>('www.example.com');
  /** 当前运行（null = IDLE，未开始）。 */
  const [run, setRun] = useState<DnsRun | null>(null);
  /** 当前步骤索引（自动播放与单步共用的唯一状态源）。 */
  const [stepIndex, setStepIndex] = useState<number>(0);
  /** 是否自动播放中。 */
  const [playing, setPlaying] = useState<boolean>(false);
  /** 播放速度倍率，默认 1×。 */
  const [speed, setSpeed] = useState<SpeedOption>(1);
  /** 视图模式：学习模式 / 协议模式。 */
  const [mode, setMode] = useState<ViewMode>('learn');
  /** 是否启用缓存模拟（默认开启）。 */
  const [cacheEnabled, setCacheEnabled] = useState<boolean>(true);
  /** 客户端侧缓存条目。 */
  const [cacheStore, setCacheStore] = useState<Readonly<Record<string, CacheEntry>>>({});
  /** TTL 的模拟时间加速倍率。 */
  const [timeScale, setTimeScale] = useState<TimeScaleOption>(1);
  /** 输入校验 / 交互提示错误。 */
  const [error, setError] = useState<string | null>(null);

  /** 由运行快照生成步骤数组（纯函数，缓存命中与否在提交时定格）。 */
  const steps = useMemo<readonly DnsStep[] | null>(
    () => (run ? buildSteps(run.domain, { cacheHit: run.cacheHit, ttlRemaining: run.ttlRemaining }) : null),
    [run],
  );
  const total = steps?.length ?? 0;
  const last = Math.max(0, total - 1);
  const currentStep = steps ? steps[Math.min(stepIndex, last)] : null;
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

  // ---- 完整解析完成后：把结果写入缓存（需求第十九/二十节） ----
  useEffect(() => {
    if (!steps || !cacheEnabled || !run || !completed || run.cacheHit) {
      return;
    }
    const answer = getAnswer(run.domain);
    setCacheStore((prev) => ({
      ...prev,
      [run.domain]: {
        domain: run.domain,
        record: answer,
        remaining: answer.ttl ?? DEFAULT_TTL,
        total: answer.ttl ?? DEFAULT_TTL,
      },
    }));
  }, [steps, cacheEnabled, run, completed]);

  // ---- TTL 倒计时：每秒按加速倍率递减（模拟时间，仅演示层面） ----
  useEffect(() => {
    if (!cacheEnabled) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      setCacheStore((prev) => {
        const next: Record<string, CacheEntry> = {};
        let changed = false;
        for (const [key, entry] of Object.entries(prev)) {
          if (entry.remaining > 0) {
            changed = true;
            next[key] = { ...entry, remaining: Math.max(0, entry.remaining - timeScale) };
          } else {
            next[key] = entry;
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cacheEnabled, timeScale]);

  // ---- 开始解析（输入校验 + 运行快照） ----
  const handleStart = useCallback(
    (raw?: string) => {
      const candidate = (raw ?? domainInput).trim().toLowerCase();
      if (!candidate) {
        setError('请输入有效域名');
        return;
      }
      if (!isValidDomain(candidate)) {
        setError('请输入有效的域名，例如：www.example.com');
        return;
      }
      // 解析进行中（未到末步）禁止破坏当前动画状态（需求第三十四节）
      if (steps && !completed) {
        setError('解析进行中：请先点击「重置」结束当前演示，再重新解析。');
        return;
      }
      const cached = cacheEnabled ? cacheStore[candidate] : undefined;
      const cacheHit = !!cached && cached.remaining > 0;
      setError(null);
      setRun({
        domain: candidate,
        cacheHit,
        ttlRemaining: cacheHit ? cached.remaining : undefined,
      });
      setStepIndex(0);
      setPlaying(true);
    },
    [domainInput, steps, completed, cacheEnabled, cacheStore],
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
    setRun(null);
    setStepIndex(0);
    setPlaying(false);
    setError(null);
  }, []);

  const handleJump = useCallback(
    (index: number) => {
      setStepIndex(Math.min(Math.max(index, 0), last));
      setPlaying(false);
    },
    [last],
  );

  const handleSpeedChange = useCallback((next: SpeedOption) => {
    setSpeed(next);
  }, []);

  const handleModeChange = useCallback((next: ViewMode) => {
    setMode(next);
  }, []);

  const handleTimeScaleChange = useCallback((next: TimeScaleOption) => {
    setTimeScale(next);
  }, []);

  const handleToggleCache = useCallback(() => {
    setCacheEnabled((prev) => !prev);
  }, []);

  const handleDomainInput = useCallback((value: string) => {
    setDomainInput(value);
    setError(null);
  }, []);

  /** 再次解析：完成态下重新运行当前域名（开启缓存时将展示命中链路）。 */
  const handleReplay = useCallback(() => {
    if (run) {
      handleStart(run.domain);
    }
  }, [run, handleStart]);

  // ---- 派生提示：解析进行中修改域名（不破坏当前动画） ----
  const normalizedInput = domainInput.trim().toLowerCase();
  const editingWhileRunning = run !== null && !completed && normalizedInput !== run.domain;

  // ---- 结果卡所需数据 ----
  const answerRecord = run ? getAnswer(run.domain) : null;
  const pathText = run?.cacheHit
    ? 'Client → Recursive DNS（⚡ 缓存命中）→ Client'
    : 'Client → Recursive → Root → .com TLD → Authoritative → Recursive → Client';

  return (
    <div className="tool-page dns-root" data-mode={mode}>
      <header className="dns-header">
        <h1>DNS 域名解析实验室</h1>
        <p className="dns-subtitle">
          输入一个域名，亲眼看见它如何被一步步翻译成 IP —— 递归查询、迭代查询与缓存命中全过程
        </p>

        <div className="dns-input-row">
          <input
            type="text"
            className={`text-input dns-domain-input mono${error ? ' is-invalid' : ''}`}
            value={domainInput}
            placeholder="请输入域名，例如 www.example.com"
            spellCheck={false}
            onChange={(event) => handleDomainInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                handleStart();
              }
            }}
            aria-label="请输入域名"
          />
          <button type="button" className="btn btn-primary" onClick={() => handleStart()}>
            开始解析
          </button>
          <label className="dns-cache-toggle">
            <input type="checkbox" checked={cacheEnabled} onChange={handleToggleCache} />
            模拟 DNS 缓存
          </label>
        </div>

        {error && <p className="dns-input-error">⚠ {error}</p>}
        {!error && editingWhileRunning && (
          <p className="dns-input-hint">
            解析进行中：如需解析新域名，请先点击「重置」再重新解析 —— 当前动画不会被破坏。
          </p>
        )}
      </header>

      <div className="dns-layout">
        <div className="dns-col-main">
          <QueryPath
            steps={steps}
            stepIndex={stepIndex}
            speed={speed}
            domain={run?.domain ?? null}
            onSelectStep={handleJump}
          />
          <Controls
            playing={playing}
            speed={speed}
            mode={mode}
            stepIndex={stepIndex}
            total={total}
            hasRun={steps !== null}
            onTogglePlay={handleTogglePlay}
            onPrev={handlePrev}
            onNext={handleNext}
            onReset={handleReset}
            onSpeedChange={handleSpeedChange}
            onModeChange={handleModeChange}
          />
        </div>

        <div className="dns-col-side">
          <StepExplanation step={currentStep} stepIndex={stepIndex} total={total} mode={mode} />
          <PacketInspector step={currentStep} />
          <CachePanel
            enabled={cacheEnabled}
            entries={cacheStore}
            timeScale={timeScale}
            activeDomain={run?.domain ?? null}
            onTimeScaleChange={handleTimeScaleChange}
          />
        </div>
      </div>

      {completed && run && answerRecord && (
        <ResultCard
          domain={run.domain}
          record={answerRecord}
          cacheHit={run.cacheHit}
          pathText={pathText}
          onReplay={handleReplay}
          onReview={() => handleJump(0)}
        />
      )}

      <Timeline steps={steps} stepIndex={stepIndex} onSelect={handleJump} />

      <RecordExplorer />

      <WhyCards />

      <p className="dns-footnote">
        本工具为前端模拟的 DNS 解析实验：所有 IP 均为教学演示数据，不进行真实 DNS 查询。
        实际解析还可能受 hosts 文件、CNAME 链、DNS 负载均衡等因素影响。
      </p>
    </div>
  );
}
