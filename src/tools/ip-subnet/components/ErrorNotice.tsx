import type { DivideError } from '../utils/subnet';
import { MAX_TEACHING_SUBNETS } from '../utils/subnet';

/**
 * 划分失败时的教学化错误解释卡。
 * 将 utils 返回的结构化错误（discriminated union）渲染为
 * 带关键数字高亮的中文解释，绝不只显示一行 Error。
 */
export function ErrorNotice({ error }: { error: DivideError }) {
  return (
    <section className="panel error-notice" role="alert" aria-live="polite">
      <div className="error-head">
        <span className="error-badge" aria-hidden="true">
          !
        </span>
        <h2 className="panel-title">暂时无法完成这次划分</h2>
      </div>

      {error.kind === 'not_enough_bits' && (
        <div className="error-body">
          <p className="error-summary">{error.message}</p>
          <ul className="error-facts">
            <li>
              当前可借出的主机位：<code className="mono">{error.availableBits}</code> bit
            </li>
            <li>
              完成划分需要借用：<code className="mono">{error.requestedBits}</code> bit
            </li>
            <li>
              当前网络最多可划出：
              <code className="mono">{error.maxSubnets.toLocaleString('en-US')}</code> 个子网
            </li>
            <li>
              你请求的子网数：
              <code className="mono">{error.requestedSubnets.toLocaleString('en-US')}</code> 个
            </li>
          </ul>
        </div>
      )}

      {error.kind === 'too_many_subnets' && (
        <div className="error-body">
          <p className="error-summary">{error.message}</p>
          <ul className="error-facts">
            <li>
              需要借用的位数：<code className="mono">{error.borrowedBits}</code> bit
            </li>
            <li>
              将产生的子网数：
              <code className="mono">{error.requestedSubnets.toLocaleString('en-US')}</code> 个
            </li>
            <li>
              教学演示上限：
              <code className="mono">{MAX_TEACHING_SUBNETS}</code> 个（借位 ≤ 8 bit）
            </li>
          </ul>
        </div>
      )}

      {error.kind === 'hosts_exceed_capacity' && (
        <div className="error-body">
          <p className="error-summary">{error.message}</p>
          <ul className="error-facts">
            <li>
              当前网络的主机位：<code className="mono">{error.availableHostBits}</code> bit
            </li>
            <li>
              最多可容纳的可用主机：
              <code className="mono">{error.maxHosts.toLocaleString('en-US')}</code> 台
            </li>
            <li>
              你请求的每子网主机数：
              <code className="mono">{error.requestedHosts.toLocaleString('en-US')}</code> 台
            </li>
          </ul>
        </div>
      )}

      {error.kind === 'invalid_value' && (
        <div className="error-body">
          <p className="error-summary">{error.message}</p>
        </div>
      )}

      {(error.kind === 'invalid_ip' || error.kind === 'invalid_prefix') && (
        <div className="error-body">
          <p className="error-summary">{error.message}</p>
        </div>
      )}
    </section>
  );
}
