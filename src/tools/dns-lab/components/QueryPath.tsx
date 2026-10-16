/**
 * 查询路径 —— 页面视觉核心（需求第六/七/二十一/二十四节）。
 *
 * 七个节点纵向排列（用户设备 → 浏览器缓存 → OS 缓存 → 递归 → 根 → TLD → 权威），
 * 已过节点 ✓、当前节点 ● 呼吸高亮、未到节点 ○；当前步骤的报文卡片沿路径飞行
 * （CSS keyframes，查询 ↓ 青色 / 响应 ↑ 紫色 / 缓存 ⟳ 琥珀），接收节点脉冲；
 * 历史步骤以短标签留痕在目标节点旁。
 *
 * 几何约定：每个节点固定 96px 高（.dns-node），图标中心位于
 * y = index * 96 + 48 —— 飞行动画的 --from-y / --to-y 由此计算。
 */
import type { CSSProperties } from 'react';
import { DNS_SERVERS, getRegisteredDomain, getTld } from '../data';
import type { DnsServerType, DnsStep } from '../types';

/** 与 CSS 中 .dns-node 的高度保持一致。 */
const NODE_HEIGHT = 96;

interface QueryPathProps {
  /** 全部步骤（结构化状态机数据）；为 null 表示尚未开始解析。 */
  steps: readonly DnsStep[] | null;
  /** 当前步骤索引。 */
  stepIndex: number;
  /** 播放速度倍率（控制飞行动画时长）。 */
  speed: number;
  /** 正在解析的域名（用于动态化 TLD / 权威节点名称）。 */
  domain: string | null;
  /** 点击飞行卡片 / 留痕标签时的回调（跳转到对应步骤）。 */
  onSelectStep: (index: number) => void;
}

/** 节点在路径中的下标。 */
function nodeIndex(type: DnsServerType): number {
  return DNS_SERVERS.findIndex((server) => server.id === type);
}

/** 飞行卡片的视觉分类：query ↓ / response ↑ / cache ⟳。 */
function flightClass(step: DnsStep): string {
  if (step.type === 'query') return 'is-query';
  if (step.type === 'cache') return 'is-cache';
  return 'is-response';
}

/** 飞行卡片的方向箭头。 */
function flightArrow(step: DnsStep): string {
  if (step.type === 'query') return '↓';
  if (step.type === 'cache') return '⟳';
  return '↑';
}

/** 飞行卡片的标题行。 */
function flightTitle(step: DnsStep): string {
  if (step.type === 'query') return 'DNS QUERY';
  if (step.type === 'cache') return 'CHECK CACHE';
  if (step.packet?.answers === 0) return 'REFERRAL';
  return 'ANSWER';
}

/** 飞行卡片的详情行。 */
function flightDetail(step: DnsStep): string {
  if (step.type === 'cache') return step.cacheHit ? '⚡ Cache HIT' : '缓存查询…';
  const packet = step.packet;
  if (!packet) return '';
  if (packet.isResponse && packet.answers === 0 && packet.authority) {
    return packet.authority;
  }
  const data = packet.data ? ` → ${packet.data}` : '';
  return `${packet.qname}${data}`;
}

/**
 * 查询路径面板。
 */
export function QueryPath({ steps, stepIndex, speed, domain, onSelectStep }: QueryPathProps) {
  const current = steps ? steps[Math.min(stepIndex, steps.length - 1)] : null;

  // ---- 节点状态：已访问集合 + 当前目标 ----
  const visited = new Set<DnsServerType>();
  if (steps && current) {
    for (let i = 0; i <= stepIndex && i < steps.length; i += 1) {
      visited.add(steps[i].source);
      visited.add(steps[i].target);
    }
  }
  const currentTarget: DnsServerType | null = current ? current.target : null;

  // ---- 历史留痕：每个节点旁展示「以它为终点」的已执行步骤短标签 ----
  const tagsByNode = new Map<DnsServerType, { tag: string; stepIndex: number; id: string }[]>();
  if (steps) {
    steps.forEach((step, i) => {
      if (i > stepIndex) return;
      const list = tagsByNode.get(step.target) ?? [];
      list.push({ tag: step.shortTag, stepIndex: i, id: step.id });
      tagsByNode.set(step.target, list);
    });
  }

  // ---- 当前步骤的飞行动画几何 ----
  const flight =
    current && current.source !== current.target && current.type !== 'result'
      ? {
          key: current.id,
          cls: flightClass(current),
          arrow: flightArrow(current),
          title: flightTitle(current),
          detail: flightDetail(current),
          fromY: nodeIndex(current.source) * NODE_HEIGHT + NODE_HEIGHT / 2,
          toY: nodeIndex(current.target) * NODE_HEIGHT + NODE_HEIGHT / 2,
        }
      : null;

  // TLD / 权威节点名随输入域名动态化（www.baidu.cn → .cn / baidu.cn）
  const tld = domain ? getTld(domain) : null;
  const registered = domain ? getRegisteredDomain(domain) : null;
  const serverLabel = (type: DnsServerType, fallback: string): string => {
    if (type === 'tld' && tld) return `.${tld} 顶级域 DNS`;
    if (type === 'authoritative' && registered) return `${registered} 权威 DNS`;
    return fallback;
  };

  const sceneStyle = {
    '--speed': speed,
  } as CSSProperties;

  return (
    <section className="panel path-panel" style={{ animationDelay: '0ms' }}>
      <div className="panel-title-row">
        <h2 className="panel-title">查询路径</h2>
        <span className="panel-caption">
          递归查询段（客户端 → 递归）+ 迭代查询段（递归 → 根 → TLD → 权威）
        </span>
      </div>

      <div className="dns-path" style={sceneStyle}>
        <span className="dns-path-line" aria-hidden="true" />

        {DNS_SERVERS.map((server, i) => {
          const isCurrent = currentTarget === server.id;
          const isPast = visited.has(server.id) && !isCurrent;
          const statusCls = isCurrent ? 'is-current' : isPast ? 'is-past' : 'is-future';
          const mark = isCurrent ? '●' : isPast ? '✓' : '○';
          const tags = tagsByNode.get(server.id) ?? [];

          return (
            <div
              key={server.id}
              className={`dns-node ${statusCls}`}
              style={{ top: `${i * NODE_HEIGHT}px` } as CSSProperties}
            >
              <span className="dns-node-icon" aria-hidden="true">
                {server.emoji}
              </span>
              <div className="dns-node-text">
                <span className="dns-node-name">{serverLabel(server.type, server.name)}</span>
                <span className="dns-node-sub">{server.subtitle}</span>
                {tags.length > 0 && (
                  <span className="dns-node-tags">
                    {tags.slice(-3).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="dns-node-tag mono"
                        title={`跳到第 ${item.stepIndex + 1} 步`}
                        onClick={() => onSelectStep(item.stepIndex)}
                      >
                        {item.tag}
                      </button>
                    ))}
                  </span>
                )}
              </div>
              <span className="dns-node-mark" aria-hidden="true">
                {mark}
              </span>
            </div>
          );
        })}

        {/* 飞行中的报文卡片（key 绑定步骤 id，步骤切换即重放动画） */}
        {flight && (
          <button
            type="button"
            key={flight.key}
            className={`dns-pkt-fly ${flight.cls}`}
            style={
              {
                '--from-y': `${flight.fromY}px`,
                '--to-y': `${flight.toY}px`,
              } as CSSProperties
            }
            title="查看报文详情（跳转到当前步骤）"
            onClick={() => onSelectStep(Math.min(stepIndex, (steps?.length ?? 1) - 1))}
          >
            <span className="dns-pkt-fly-title">
              {flight.arrow} {flight.title}
            </span>
            <span className="dns-pkt-fly-detail">{flight.detail}</span>
          </button>
        )}

        {/* 结果横幅（解析完成 / 缓存命中） */}
        {current && current.type === 'result' && stepIndex > 0 && (
          <div className="dns-path-banner" key={`banner-${current.id}`}>
            {current.cacheHit ? '⚡ Cache HIT · ' : '✓ '}
            {current.title}
          </div>
        )}

        {/* 未开始解析的空态提示 */}
        {!steps && (
          <div className="dns-path-idle">
            <span aria-hidden="true">🔍</span>
            在上方输入域名并点击「开始解析」，观察 DNS 查询如何一步步跑完
          </div>
        )}
      </div>
    </section>
  );
}
