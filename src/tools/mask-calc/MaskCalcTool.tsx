import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { parseIpDetailed, prefixToMask } from '../ip-subnet/utils/ip';
import { STAGGER_MS } from '../ip-subnet/types';
import { calcSubnet, maskToPrefix } from './utils/mask';
import { buildSteps } from './utils/steps';
import type { MaskError } from './types';
import { InputPanel } from './components/InputPanel';
import { BinaryBar } from './components/BinaryBar';
import { ResultCard } from './components/ResultCard';
import { CalculationSteps } from './components/CalculationSteps';
import './mask-calc.css';

/** 默认演示值：加载即呈现 192.168.1.100/24 的完整示例（任务要求第三节）。 */
const DEFAULTS = {
  ip: '192.168.1.100',
  prefix: 24,
} as const;

const EXAMPLE = DEFAULTS;

/** 校验 CIDR 文本：合法返回前缀；等待返回 null；非法返回错误文案。 */
function parseCidrText(raw: string): { prefix: number } | null | string {
  const trimmed = raw.trim();
  if (trimmed === '') return null;
  // 严格十进制整数：拒绝 "0x10"、"1e1" 等被 Number() 宽松接受的形式
  if (!/^\d+$/.test(trimmed)) {
    return '前缀范围 0~32，应为该区间内的整数';
  }
  const n = Number(trimmed);
  if (n < 0 || n > 32) {
    return '前缀范围 0~32';
  }
  return { prefix: n };
}

/** 各卡片的错峰入场延迟。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/**
 * 子网掩码计算器 —— 工具容器。
 * 输入即算（useMemo 纯函数，无播放控制）：掩码 ⇄ CIDR 双向联动在
 * onChange 处理器内完成，规范化状态为 prefix；结果 / 位条 / 分步均由此派生。
 */
export default function MaskCalcTool() {
  const [ipText, setIpText] = useState<string>(DEFAULTS.ip);
  const [maskText, setMaskText] = useState<string>(prefixToMask(DEFAULTS.prefix));
  const [cidrText, setCidrText] = useState<string>(String(DEFAULTS.prefix));
  const [prefix, setPrefix] = useState<number>(DEFAULTS.prefix);
  const [maskError, setMaskError] = useState<MaskError | null>(null);
  const [cidrError, setCidrError] = useState<string | null>(null);

  // ---- 掩码输入：合法则联动 CIDR 与前缀；非法则行内教学提示 ----
  const handleMaskChange = useCallback((raw: string) => {
    setMaskText(raw);
    if (raw.trim() === '') {
      // 输入中（未完成）：不报错，进入等待态
      setMaskError(null);
      return;
    }
    const parsed = maskToPrefix(raw);
    if (typeof parsed === 'number') {
      setMaskError(null);
      setPrefix(parsed);
      setCidrText(String(parsed));
    } else {
      setMaskError(parsed.error);
    }
  }, []);

  // ---- CIDR 输入：合法则联动掩码与前缀 ----
  const handleCidrChange = useCallback((raw: string) => {
    setCidrText(raw);
    const parsed = parseCidrText(raw);
    if (parsed === null) {
      setCidrError(null);
      return;
    }
    if (typeof parsed === 'string') {
      setCidrError(parsed);
      return;
    }
    setCidrError(null);
    setPrefix(parsed.prefix);
    setMaskText(prefixToMask(parsed.prefix));
  }, []);

  const handleExample = useCallback(() => {
    setIpText(EXAMPLE.ip);
    setPrefix(EXAMPLE.prefix);
    setMaskText(prefixToMask(EXAMPLE.prefix));
    setCidrText(String(EXAMPLE.prefix));
    setMaskError(null);
    setCidrError(null);
  }, []);

  const handleClear = useCallback(() => {
    setIpText('');
    setMaskText('');
    setCidrText('');
    setMaskError(null);
    setCidrError(null);
  }, []);

  // ---- 派生计算（纯函数 + useMemo） ----
  const ipParse = useMemo(() => parseIpDetailed(ipText), [ipText]);

  /** 等待态：任一输入为空时不报错、不计算，显示等待提示。 */
  const waiting = ipText.trim() === '' || maskText.trim() === '' || cidrText.trim() === '';

  const subnet = useMemo(
    () => (ipParse.ok ? calcSubnet(ipText, prefix) : null),
    [ipParse, ipText, prefix],
  );

  const steps = useMemo(
    () => (ipParse.ok ? buildSteps(ipParse.value, prefix) : []),
    [ipParse, prefix],
  );

  const ipErrorMessage = !ipParse.ok && ipParse.error.kind !== 'empty' ? ipParse.error.message : null;

  return (
    <div className="tool mc-tool">
      <header className="mc-header">
        <h1>子网掩码计算器</h1>
        <p className="mc-subtitle">
          掩码、前缀、二进制三位一体 —— 输入任意一种表示，立刻看到另外两种和整个网段的全貌
        </p>
      </header>

      {/* a. 输入面板 */}
      <section className="panel tool-section" style={stagger(0)}>
        <InputPanel
          maskText={maskText}
          cidrText={cidrText}
          ipText={ipText}
          maskError={maskError}
          cidrError={cidrError}
          onMaskChange={handleMaskChange}
          onCidrChange={handleCidrChange}
          onIpChange={setIpText}
          onExample={handleExample}
          onClear={handleClear}
        />
      </section>

      {/* 等待态：输入未完成时不报错 */}
      {waiting && (
        <section className="panel mc-waiting tool-section" style={stagger(1)} role="status">
          <span className="mc-waiting-badge" aria-hidden="true">
            ⋯
          </span>
          <p>输入 IP 与掩码 / 前缀后，这里将实时呈现网络地址、广播地址、可用范围等完整网段信息。</p>
        </section>
      )}

      {/* IP 非法：教学化错误卡（沿用 ip-subnet 的错误风格） */}
      {ipErrorMessage && (
        <section className="panel mc-error-card tool-section" role="alert" aria-live="polite" style={stagger(1)}>
          <div className="mc-error-head">
            <span className="mc-error-badge" aria-hidden="true">
              !
            </span>
            <p className="mc-error-summary">{ipErrorMessage}</p>
          </div>
        </section>
      )}

      {/* 结果区：位条 + 结果卡 + 分步过程 */}
      {!waiting && ipParse.ok && subnet?.ok && (
        <>
          <section className="panel tool-section" style={stagger(1)}>
            <BinaryBar ip={ipParse.value} prefix={prefix} />
          </section>

          <section className="panel tool-section" style={stagger(2)}>
            <ResultCard maskInfo={subnet.maskInfo} info={subnet.info} />
          </section>

          <section className="panel tool-section" style={stagger(3)}>
            <CalculationSteps steps={steps} />
          </section>
        </>
      )}

      {/* 底部概念说明（任务要求第八节） */}
      <footer className="mc-footnote tool-section" style={stagger(4)}>
        <ul className="mc-concepts">
          <li>
            <strong>CIDR 前缀 vs 点分掩码：</strong>
            两者是同一个掩码的两种写法。掩码合法的充要条件是二进制表示为「连续的 1 后跟连续的 0」，
            前缀即从左起连续 1 的个数。
          </li>
          <li>
            <strong>地址类别的局限：</strong>
            A/B/C/D/E 分类（classful）是历史概念，现代网络使用 CIDR（classless）按需划分，类别仅作参考展示。
          </li>
          <li>
            <strong>/31 与 /32 的特例：</strong>
            经典公式「可用 = 2ⁿ − 2」在 /31、/32 时不适用，须按 RFC 3021 与主机路由惯例处理。
          </li>
        </ul>
      </footer>
    </div>
  );
}
