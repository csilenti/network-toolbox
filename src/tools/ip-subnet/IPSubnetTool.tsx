import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ipToDotted, parseIpDetailed, prefixToMask } from './utils/ip';
import { divideSubnets } from './utils/subnet';
import type { DivideMode, DivideResult } from './utils/subnet';
import type { ScrollRequest } from './types';
import { STAGGER_MS } from './types';
import { InputPanel } from './components/InputPanel';
import { BinaryVisualizer } from './components/BinaryVisualizer';
import { CalculationSteps } from './components/CalculationSteps';
import { SubnetTree } from './components/SubnetTree';
import { SubnetDetail } from './components/SubnetDetail';
import { ResultTable } from './components/ResultTable';
import { ErrorNotice } from './components/ErrorNotice';
import './ip-subnet.css';

/** 页面默认演示值：加载即呈现 192.168.1.0/24 划 4 个子网的完整示例。 */
const DEFAULTS = {
  ip: '192.168.1.0',
  prefix: 24,
  mode: 'count' as DivideMode,
  countValue: 4,
  hostsValue: 62,
};

/** 各卡片的错峰入场延迟。 */
const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * STAGGER_MS}ms` });

/**
 * IP 划分演示 —— 工具容器。
 * 负责状态提升：输入参数（IP / 前缀 / 模式 / 数值）与 selectedId 均在此层持有，
 * 表格与树状图通过同一 selectedId + scrollRequest 实现双向联动。
 */
export default function IPSubnetTool() {
  const [ipText, setIpText] = useState<string>(DEFAULTS.ip);
  const [prefix, setPrefix] = useState<number>(DEFAULTS.prefix);
  const [mode, setMode] = useState<DivideMode>(DEFAULTS.mode);
  const [countValue, setCountValue] = useState<number>(DEFAULTS.countValue);
  const [hostsValue, setHostsValue] = useState<number>(DEFAULTS.hostsValue);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [scrollRequest, setScrollRequest] = useState<ScrollRequest | null>(null);
  const nonceRef = useRef<number>(0);

  // ---- IP 解析与划分计算（纯函数，useMemo 缓存） ----
  const ipParse = useMemo(() => parseIpDetailed(ipText), [ipText]);

  const division: DivideResult = useMemo(() => {
    if (!ipParse.ok) {
      return {
        ok: false,
        error: { kind: 'invalid_ip', message: ipParse.error.message },
      };
    }
    return divideSubnets({
      ip: ipParse.value,
      prefix,
      mode,
      value: mode === 'count' ? countValue : hostsValue,
    });
  }, [ipParse, prefix, mode, countValue, hostsValue]);

  // ---- 结果规模变化时校正选中项，保证 selectedId 永远有效 ----
  useEffect(() => {
    if (division.ok && selectedId >= division.result.subnets.length) {
      setSelectedId(0);
    }
  }, [division, selectedId]);

  const handleSelect = useCallback((id: number, source: 'tree' | 'table') => {
    setSelectedId(id);
    // 点击树 → 滚动表格；点击表格 → 滚动树
    nonceRef.current += 1;
    setScrollRequest({
      target: source === 'tree' ? 'table' : 'tree',
      id,
      nonce: nonceRef.current,
    });
  }, []);

  const handleReset = useCallback(() => {
    setIpText(DEFAULTS.ip);
    setPrefix(DEFAULTS.prefix);
    setMode(DEFAULTS.mode);
    setCountValue(DEFAULTS.countValue);
    setHostsValue(DEFAULTS.hostsValue);
    setSelectedId(0);
    setScrollRequest(null);
  }, []);

  const handleModeChange = useCallback((next: DivideMode) => {
    setMode(next);
  }, []);

  // ---- 派生展示数据 ----
  const ok = division.ok;
  const d = ok ? division.result : null;
  const safeSelectedId = d && selectedId < d.subnets.length ? selectedId : 0;
  const selectedEntry = d ? d.subnets[safeSelectedId] : null;

  // IP 文本非法：教学提示在输入面板内联展示，主区域显示错误解释卡
  if (!ipParse.ok) {
    return (
      <div className="tool ip-tool">
        <ToolHeader />
        <section className="panel tool-section" style={stagger(0)}>
          <InputPanel
            ipText={ipText}
            ipError={ipParse.error}
            prefix={prefix}
            mode={mode}
            countValue={countValue}
            hostsValue={hostsValue}
            onIpChange={setIpText}
            onPrefixChange={setPrefix}
            onModeChange={handleModeChange}
            onCountChange={setCountValue}
            onHostsChange={setHostsValue}
            onReset={handleReset}
          />
        </section>
        <section className="panel tool-section" style={stagger(1)}>
          <ErrorNotice
            error={{ kind: 'invalid_ip', message: ipParse.error.message }}
          />
        </section>
      </div>
    );
  }

  return (
    <div className="tool ip-tool">
      <ToolHeader />

      {/* a. 输入面板 */}
      <section className="panel tool-section" style={stagger(0)}>
        <InputPanel
          ipText={ipText}
          ipError={null}
          prefix={prefix}
          mode={mode}
          countValue={countValue}
          hostsValue={hostsValue}
          onIpChange={setIpText}
          onPrefixChange={setPrefix}
          onModeChange={handleModeChange}
          onCountChange={setCountValue}
          onHostsChange={setHostsValue}
          onReset={handleReset}
        />
      </section>

      {!ok && (
        <>
          {/* 划分参数错误：教学化解释 + 未划分的二进制结构 */}
          <section className="panel tool-section" style={stagger(1)}>
            <ErrorNotice error={division.error} />
          </section>
          <section className="panel tool-section" style={stagger(2)}>
            <BinaryVisualizer
              baseNetwork={ipParse.value}
              basePrefix={prefix}
              newPrefix={prefix}
            />
          </section>
        </>
      )}

      {ok && d && (
        <>
          {/* 自动归一化提示 */}
          {d.normalized && (
            <div className="notice notice-info tool-section" style={stagger(0.5)} role="status">
              输入的 IP 含有非 0 主机位，已自动归一化到网络地址{' '}
              <strong className="mono">{ipToDotted(d.baseNetwork)}</strong>
              （掩码 <span className="mono">{prefixToMask(d.basePrefix)}</span>），
              以下划分均以该网络地址为基准。
            </div>
          )}

          {/* b. 二进制可视化 */}
          <section className="panel tool-section" style={stagger(1)}>
            <BinaryVisualizer
              baseNetwork={d.baseNetwork}
              basePrefix={d.basePrefix}
              newPrefix={d.newPrefix}
            />
          </section>

          {/* c. 计算过程 */}
          <section className="panel tool-section" style={stagger(2)}>
            <CalculationSteps division={d} />
          </section>

          {/* d. 树状图 */}
          <section className="panel tool-section" style={stagger(3)}>
            <SubnetTree
              division={d}
              selectedId={safeSelectedId}
              onSelect={(id) => handleSelect(id, 'tree')}
              scrollRequest={scrollRequest}
            />
          </section>

          {/* e. 详情面板（含设备数量可视化） */}
          {selectedEntry && (
            <section className="panel tool-section" style={stagger(4)}>
              <SubnetDetail entry={selectedEntry} division={d} />
            </section>
          )}

          {/* f. 结果总览表 */}
          <section className="panel tool-section" style={stagger(5)}>
            <ResultTable
              subnets={d.subnets}
              newPrefix={d.newPrefix}
              selectedId={safeSelectedId}
              onSelect={(id) => handleSelect(id, 'table')}
              scrollRequest={scrollRequest}
            />
          </section>

          {/* g. 底部轻量说明 */}
          <footer className="tool-footnote tool-section" style={stagger(6)}>
            说明：网络地址（主机位全 0）与广播地址（主机位全 1）不可分配给主机，
            因此每个子网的可用主机数 = 2<sup>{d.hostBits}</sup> − 2。
          </footer>
        </>
      )}
    </div>
  );
}

/** 工具标题区（唯一 h1）。 */
function ToolHeader() {
  return (
    <header className="tool-header">
      <h1>IP 划分演示</h1>
      <p className="tool-subtitle">
        通过可视化方式理解 IP 地址中的网络号、主机号以及子网划分过程
      </p>
    </header>
  );
}
