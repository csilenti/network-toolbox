/**
 * 网络单位换算计算器 —— 工具容器。
 * 输入即算（useMemo 纯函数，无播放控制，与 mask-calc 同类）：
 * 三类别各自独立保留输入状态；等待态 / 错误态 / 结果区 / 换算链 / 教学卡由此派生。
 */
import { useCallback, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { STAGGER_MS } from '../ip-subnet/types';
import {
  BANDWIDTH_UNITS,
  BIT_RATE_UNITS,
  DOWNLOAD_BW_UNITS,
  DOWNLOAD_SIZE_UNITS,
  FALLBACK_MBPS,
  FALLBACK_MB_RATE,
  FALLBACK_SIZE_UNIT,
  SIZE_UNITS,
  buildChain,
  buildDownloadChain,
  convert,
  counterpartSizeUnit,
  estimateDownload,
  formatDuration,
  formatNumber,
  parseDecimal,
  unitById,
} from './utils/units';
import type { ChainStep, UnitCategory } from './types';
import type { ResultGridModel } from './components/ResultGrid';
import { CategoryTabs } from './components/CategoryTabs';
import { InputPanel } from './components/InputPanel';
import { ResultGrid } from './components/ResultGrid';
import { ConversionChain } from './components/ConversionChain';
import { TeachingCard } from './components/TeachingCard';
import './unit-calc.css';

/** 各卡片的错峰入场延迟（与既有工具同节奏）。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/** 默认演示值：加载即呈现「100 Mbps → 12.5 MB/s」完整示例（任务要求第三节）。 */
const DEFAULTS = {
  bwText: '100',
  bwUnitId: 'Mbps',
  sizeText: '1',
  sizeUnitId: 'MB',
  dlSizeText: '100',
  dlSizeUnitId: 'MB',
  dlBwText: '100',
  dlBwUnitId: 'Mbps',
} as const;

/** 单值类别（带宽 / 数据大小）的派生视图。 */
interface SingleView {
  /** 空输入等待态。 */
  waiting: boolean;
  /** 非空但非法时的中文错误。 */
  error: string | null;
  /** 结果网格模型；等待 / 错误时为 null。 */
  grid: ResultGridModel | null;
  /** 换算关系链步骤。 */
  chain: ChainStep[];
  /** 链路径摘要。 */
  chainCaption: string;
}

/** 下载时间类别的派生视图。 */
interface DownloadView {
  waiting: boolean;
  /** 两个输入的行内错误（size 优先）。 */
  firstError: string | null;
  sizeError: string | null;
  bwError: string | null;
  /** 各自是否处于空输入等待态。 */
  sizeWaiting: boolean;
  bwWaiting: boolean;
  /** 结果卡模型；等待 / 错误时为 null。 */
  result: ResultGridModel | null;
  chain: ChainStep[];
  chainCaption: string;
}

export default function UnitCalcTool() {
  const [category, setCategory] = useState<UnitCategory>('bandwidth');
  // 三类别输入状态各自独立保留，切换类别不丢失
  const [bwText, setBwText] = useState<string>(DEFAULTS.bwText);
  const [bwUnitId, setBwUnitId] = useState<string>(DEFAULTS.bwUnitId);
  const [sizeText, setSizeText] = useState<string>(DEFAULTS.sizeText);
  const [sizeUnitId, setSizeUnitId] = useState<string>(DEFAULTS.sizeUnitId);
  const [dlSizeText, setDlSizeText] = useState<string>(DEFAULTS.dlSizeText);
  const [dlSizeUnitId, setDlSizeUnitId] = useState<string>(DEFAULTS.dlSizeUnitId);
  const [dlBwText, setDlBwText] = useState<string>(DEFAULTS.dlBwText);
  const [dlBwUnitId, setDlBwUnitId] = useState<string>(DEFAULTS.dlBwUnitId);

  const handleCategoryChange = useCallback((c: UnitCategory) => setCategory(c), []);

  const handleExample = useCallback(() => {
    setBwText(DEFAULTS.bwText);
    setBwUnitId(DEFAULTS.bwUnitId);
    setSizeText(DEFAULTS.sizeText);
    setSizeUnitId(DEFAULTS.sizeUnitId);
    setDlSizeText(DEFAULTS.dlSizeText);
    setDlSizeUnitId(DEFAULTS.dlSizeUnitId);
    setDlBwText(DEFAULTS.dlBwText);
    setDlBwUnitId(DEFAULTS.dlBwUnitId);
  }, []);

  const handleClear = useCallback(() => {
    setBwText('');
    setSizeText('');
    setDlSizeText('');
    setDlBwText('');
  }, []);

  // ---- 带宽 / 数据大小：单值换算派生（纯函数 + useMemo） ----
  const singleView = useMemo<SingleView | null>(() => {
    if (category === 'download-time') {
      return null;
    }
    const isBandwidth = category === 'bandwidth';
    const units = isBandwidth ? BANDWIDTH_UNITS : SIZE_UNITS;
    const rawText = isBandwidth ? bwText : sizeText;
    const source = unitById(
      units,
      isBandwidth ? bwUnitId : sizeUnitId,
      isBandwidth ? FALLBACK_MBPS : FALLBACK_SIZE_UNIT,
    );
    const parsed = parseDecimal(rawText);
    const waiting = !parsed.ok && parsed.kind === 'empty';
    const error = !parsed.ok && parsed.kind !== 'empty' ? parsed.error : null;

    if (!parsed.ok) {
      return { waiting, error, grid: null, chain: [], chainCaption: '' };
    }

    // 网格：其余全部单位逐个换算（源单位位置由 UI 回显输入）
    const rows = units
      .filter((u) => u.id !== source.id)
      .map((u) => ({ unit: u, value: convert(parsed.value, source, u) }));

    // 换算链目标：带宽取对面体系的代表单位（Mbps ⇄ MB/s），大小取十/二进制对照单位
    const target =
      isBandwidth
        ? source.kind === 'bit-rate'
          ? FALLBACK_MB_RATE
          : unitById(BIT_RATE_UNITS, 'Mbps', FALLBACK_MBPS)
        : (counterpartSizeUnit(source) ?? source);
    const chain = buildChain(parsed.value, source, target);
    const crossDim =
      (source.kind === 'bit-rate') !== (target.kind === 'bit-rate') ? ' ×8（1 B = 8 bit）' : '';
    const chainCaption = `${source.label} → 基准 → ${target.label}${crossDim}`;

    const grid: ResultGridModel = {
      mode: 'grid',
      sourceUnit: source,
      sourceEcho: rawText.trim(),
      rows,
    };
    return { waiting, error, grid, chain, chainCaption };
  }, [category, bwText, bwUnitId, sizeText, sizeUnitId]);

  // ---- 下载时间：双输入派生（纯函数 + useMemo） ----
  const downloadView = useMemo<DownloadView | null>(() => {
    if (category !== 'download-time') {
      return null;
    }
    const sizeUnit = unitById(DOWNLOAD_SIZE_UNITS, dlSizeUnitId, FALLBACK_SIZE_UNIT);
    const bwUnit = unitById(DOWNLOAD_BW_UNITS, dlBwUnitId, FALLBACK_MBPS);
    const sizeParsed = parseDecimal(dlSizeText);
    const bwParsed = parseDecimal(dlBwText);
    const sizeWaiting = !sizeParsed.ok && sizeParsed.kind === 'empty';
    const bwWaiting = !bwParsed.ok && bwParsed.kind === 'empty';
    const waiting = sizeWaiting || bwWaiting;
    const sizeError = !sizeParsed.ok && sizeParsed.kind !== 'empty' ? sizeParsed.error : null;
    const bwError = !bwParsed.ok && bwParsed.kind !== 'empty' ? bwParsed.error : null;
    const firstError = sizeError ?? bwError;

    if (!sizeParsed.ok || !bwParsed.ok) {
      return {
        waiting,
        firstError,
        sizeError,
        bwError,
        sizeWaiting,
        bwWaiting,
        result: null,
        chain: [],
        chainCaption: '',
      };
    }

    const estimate = estimateDownload(sizeParsed.value, sizeUnit, bwParsed.value, bwUnit);
    if (!estimate.ok) {
      // 带宽为 0 等估算层错误：以错误卡呈现（错误归属带宽输入）
      return {
        waiting: false,
        firstError: estimate.error,
        sizeError: null,
        bwError: estimate.error,
        sizeWaiting: false,
        bwWaiting: false,
        result: null,
        chain: [],
        chainCaption: '',
      };
    }

    const isEmptyFile = sizeParsed.value === 0;
    const result: ResultGridModel = {
      mode: 'duration',
      headline: isEmptyFile ? '瞬间完成（文件为空）' : formatDuration(estimate.seconds),
      isEmptyFile,
      summary: `文件 ${formatNumber(sizeParsed.value)} ${sizeUnit.label} @ 带宽 ${formatNumber(bwParsed.value)} ${bwUnit.label}`,
    };
    const chain = buildDownloadChain(sizeParsed.value, sizeUnit, bwParsed.value, bwUnit);
    const chainCaption = `${sizeUnit.label} → bit ÷ ${bwUnit.label} → 秒`;
    return {
      waiting: false,
      firstError: null,
      sizeError: null,
      bwError: null,
      sizeWaiting: false,
      bwWaiting: false,
      result,
      chain,
      chainCaption,
    };
  }, [category, dlSizeText, dlSizeUnitId, dlBwText, dlBwUnitId]);

  const isDownload = category === 'download-time';
  const activeView = isDownload ? downloadView : singleView;
  const waiting = activeView?.waiting ?? false;
  const errorMessage = isDownload ? (downloadView?.firstError ?? null) : (singleView?.error ?? null);

  return (
    <div className="tool uc-tool">
      <header className="uc-header">
        <h1>网络单位换算计算器</h1>
        <p className="uc-subtitle">
          比特与字节、十进制与二进制 —— 两对最容易混淆的单位，一次看清
        </p>
      </header>

      {/* a. 类别切换 + 输入面板 */}
      <section className="panel uc-section" style={stagger(0)}>
        <CategoryTabs category={category} onChange={handleCategoryChange} />
        <InputPanel
          category={category}
          valueText={bwText}
          valueUnitId={bwUnitId}
          valueUnits={BANDWIDTH_UNITS}
          valueError={singleView?.error ?? null}
          valueWaiting={singleView?.waiting ?? false}
          sizeText={dlSizeText}
          sizeUnitId={dlSizeUnitId}
          sizeUnits={DOWNLOAD_SIZE_UNITS}
          sizeError={downloadView?.sizeError ?? null}
          sizeWaiting={downloadView?.sizeWaiting ?? false}
          bwText={dlBwText}
          bwUnitId={dlBwUnitId}
          bwUnits={DOWNLOAD_BW_UNITS}
          bwError={downloadView?.bwError ?? null}
          bwWaiting={downloadView?.bwWaiting ?? false}
          onValueChange={setBwText}
          onValueUnitChange={setBwUnitId}
          onSizeChange={setDlSizeText}
          onSizeUnitChange={setDlSizeUnitId}
          onBwChange={setDlBwText}
          onBwUnitChange={setDlBwUnitId}
          onExample={handleExample}
          onClear={handleClear}
        />
      </section>

      {/* 等待态：输入为空时不报错 */}
      {waiting && (
        <section className="panel uc-waiting uc-section" style={stagger(1)} role="status">
          <span className="uc-waiting-badge" aria-hidden="true">
            ⋯
          </span>
          <p>{isDownload ? '输入文件大小与带宽后自动换算' : '输入数值后自动换算'}</p>
        </section>
      )}

      {/* 错误态：教学化中文提示卡 */}
      {!waiting && errorMessage && (
        <section className="panel uc-error-card uc-section" role="alert" aria-live="polite" style={stagger(1)}>
          <div className="uc-error-head">
            <span className="uc-error-badge" aria-hidden="true">
              !
            </span>
            <p className="uc-error-summary">{errorMessage}</p>
          </div>
        </section>
      )}

      {/* b. 结果区 */}
      {!waiting && !errorMessage && singleView?.grid && (
        <section className="panel uc-section" style={stagger(2)}>
          <ResultGrid model={singleView.grid} />
        </section>
      )}
      {!waiting && !errorMessage && downloadView?.result && (
        <section className="panel uc-section" style={stagger(2)}>
          <ResultGrid model={downloadView.result} />
        </section>
      )}

      {/* c. 换算关系链 */}
      {!waiting && !errorMessage && (singleView?.chain.length ?? 0) > 0 && singleView && (
        <section className="panel uc-section" style={stagger(3)}>
          <ConversionChain steps={singleView.chain} caption={singleView.chainCaption} />
        </section>
      )}
      {!waiting && !errorMessage && (downloadView?.chain.length ?? 0) > 0 && downloadView && (
        <section className="panel uc-section" style={stagger(3)}>
          <ConversionChain steps={downloadView.chain} caption={downloadView.chainCaption} />
        </section>
      )}

      {/* d. 💡 教学卡（按类别切换） */}
      <section className="panel uc-section" style={stagger(4)}>
        <TeachingCard category={category} />
      </section>
    </div>
  );
}
