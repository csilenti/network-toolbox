import type { ReactNode } from 'react';
import type { MaskInfo, SubnetInfo } from '../types';

export interface ResultCardProps {
  /** 掩码三要素（点分掩码 / 通配符 / 二进制）。 */
  maskInfo: MaskInfo;
  /** 网段完整档案。 */
  info: SubnetInfo;
}

/** 千分位格式化（/0 的 4,294,967,296 也精确可读）。 */
const fmt = (n: number): string => n.toLocaleString('en-US');

/** /31 /32 /0 的 💡 特例说明卡文案。 */
const SPECIAL_NOTES: Record<number, string> = {
  31: 'RFC 3021 点对点链路特殊规定：/31 网段不扣除网络地址与广播地址，两个地址均可直接分配，常用于路由器之间的点对点互连。',
  32: '/32 表示单主机路由：整个网段只有这一个地址，即设备自身，常用于 loopback 接口与主机路由（经典公式 2ⁿ − 2 在此不适用）。',
  0: '掩码 0.0.0.0 匹配任意地址；路由表中的 0.0.0.0/0 表示默认路由——当没有更精确的路由可走时，分组交给默认网关。',
};

/** 结果卡单个字段行。 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mc-result-row">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * 计算结果卡（视觉核心）：第六节全部字段 ——
 * 掩码 / CIDR / 网络地址 / 广播地址 / 可用主机数 / 可用范围 /
 * 通配符掩码 / 地址类别 / 私有标记 / 总地址数，
 * /31 /32 /0 时额外展示 💡 特例说明卡。
 */
export function ResultCard({ maskInfo, info }: ResultCardProps) {
  const specialNote = SPECIAL_NOTES[maskInfo.prefix];

  return (
    <section className="mc-result" aria-label="网段信息计算结果">
      <div className="mc-result-head">
        <h2 className="panel-title">网段信息</h2>
        <span className="mc-result-caption mono">
          {info.network}/{maskInfo.prefix}
        </span>
      </div>

      <dl className="mc-result-grid">
        <Row label="子网掩码">
          <span className="mono mc-strong">{maskInfo.mask}</span>
        </Row>
        <Row label="CIDR 前缀">
          <span className="mono mc-strong mc-accent">/{maskInfo.prefix}</span>
        </Row>
        <Row label="网络地址">
          <span className="mono mc-strong">{info.network}</span>
        </Row>
        <Row label="广播地址">
          <span className="mono mc-strong">{info.broadcast}</span>
        </Row>
        <Row label="可用主机数">
          <span className="mono mc-strong mc-accent">{fmt(info.usableHosts)}</span>
          <span className="mc-row-hint">台</span>
        </Row>
        <Row label="可用主机范围">
          <span className="mono mc-strong">
            {info.firstUsable ?? '—'} ~ {info.lastUsable ?? '—'}
          </span>
        </Row>
        <Row label="通配符掩码">
          <span className="mono mc-strong">{maskInfo.wildcard}</span>
          <span className="mc-row-hint">反掩码，ACL 常用</span>
        </Row>
        <Row label="地址类别">
          <span className="mc-strong mc-class">{info.ipClass} 类</span>
          <span className="mc-row-hint">{info.classNote}（classful 仅为历史概念，现代网络使用 CIDR）</span>
        </Row>
        <Row label="私有地址">
          {info.isPrivate ? (
            <span className="mc-strong mc-warn">{info.privateNote ?? '是'}</span>
          ) : (
            <span className="mc-strong">否（公网地址）</span>
          )}
        </Row>
        <Row label="总地址数">
          <span className="mono mc-strong">{fmt(info.totalHosts)}</span>
          <span className="mc-row-hint">
            2<sup>{32 - maskInfo.prefix}</sup>（含网络地址与广播地址）
          </span>
        </Row>
      </dl>

      {specialNote && (
        <aside className="mc-special-card" role="note">
          <span className="mc-special-badge" aria-hidden="true">
            💡
          </span>
          <p>{specialNote}</p>
        </aside>
      )}
    </section>
  );
}
