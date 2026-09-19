import { useEffect, useRef } from 'react';
import type { SubnetEntry } from '../utils/subnet';
import { ipToDotted } from '../utils/ip';
import { scrollBehavior } from '../utils/motion';
import type { ScrollRequest } from '../types';

export interface ResultTableProps {
  subnets: SubnetEntry[];
  newPrefix: number;
  selectedId: number;
  onSelect: (id: number) => void;
  /** 树状图侧发起的联动滚动请求（target === 'table' 时生效）。 */
  scrollRequest: ScrollRequest | null;
}

/**
 * 结果总览表：序号 / 网络地址 / 可用 IP 范围 / 广播地址 / 可用主机。
 * 与树状图双向联动：点击行选中子网，并请求树状图滚动；
 * 同时响应来自树状图的滚动请求，把选中行滚入表格可视区。
 */
export function ResultTable({
  subnets,
  newPrefix,
  selectedId,
  onSelect,
  scrollRequest,
}: ResultTableProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  // 树 → 表格：把选中行滚入表格可视区
  useEffect(() => {
    if (!scrollRequest || scrollRequest.target !== 'table') return;
    const container = scrollRef.current;
    const el = rowRefs.current[scrollRequest.id];
    if (!container || !el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const behavior = scrollBehavior();
    if (eRect.top < cRect.top || eRect.bottom > cRect.bottom) {
      container.scrollTo({
        top: container.scrollTop + (eRect.top - cRect.top) - 40,
        behavior,
      });
    }
  }, [scrollRequest]);

  return (
    <section className="result-table-section" aria-label="子网划分结果总览表">
      <div className="panel-title-row">
        <h2 className="panel-title">结果总览</h2>
        <span className="panel-caption">
          点击行可在上方树状图中定位对应子网
        </span>
      </div>

      <div className="table-scroll" ref={scrollRef}>
        <table className="result-table">
          <thead>
            <tr>
              <th scope="col" className="col-index">
                序号
              </th>
              <th scope="col">网络地址</th>
              <th scope="col">可用 IP 范围</th>
              <th scope="col">广播地址</th>
              <th scope="col" className="col-num">
                可用主机
              </th>
            </tr>
          </thead>
          <tbody>
            {subnets.map((entry) => {
              const selected = entry.index === selectedId;
              return (
                <tr
                  key={entry.index}
                  ref={(el) => {
                    rowRefs.current[entry.index] = el;
                  }}
                  className={`result-row ${selected ? 'is-selected' : ''}`}
                  tabIndex={0}
                  aria-current={selected ? 'true' : undefined}
                  onClick={() => onSelect(entry.index)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(entry.index);
                    }
                  }}
                >
                  <td className="col-index mono">{entry.index + 1}</td>
                  <td className="mono">
                    {ipToDotted(entry.network)}/{newPrefix}
                  </td>
                  <td className="mono">
                    {entry.first !== null && entry.last !== null
                      ? `${ipToDotted(entry.first)} – ${ipToDotted(entry.last)}`
                      : '—'}
                  </td>
                  <td className="mono">{ipToDotted(entry.broadcast)}</td>
                  <td className="col-num mono">
                    {entry.usableHosts > 0 ? entry.usableHosts : '0*'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="table-footnote">
        * 网络地址（主机位全 0）与广播地址（主机位全 1）不可分配给主机；
        前缀为 /31、/32 时可用主机数为 0，详见上方说明。
      </p>
    </section>
  );
}
