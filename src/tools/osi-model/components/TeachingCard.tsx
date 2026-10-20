/**
 * OSI / TCP-IP 模型对照 —— 教学卡（任务要求第三节 💡、第九节范围）。
 * 理论模型 vs 事实标准 + 五层混合模型说明（仅文字提及，不做独立视图）。
 */
export function TeachingCard() {
  return (
    <aside className="om-teaching" role="note" aria-label="教学说明">
      <span className="om-teaching-badge" aria-hidden="true">
        💡
      </span>
      <div className="om-teaching-body">
        <h3 className="om-teaching-title">理论模型 vs 事实标准</h3>
        <p>
          <strong>OSI</strong> 是 ISO 制定的<strong>理论参考模型</strong>（先有模型后有协议）；
          <strong>TCP/IP</strong> 是互联网的<strong>事实标准</strong>（先有协议后有模型）。
        </p>
        <p>
          另有把物理层单独从网络接口层拆出来的「<strong>五层混合模型</strong>」教材说法
          （应用、传输、网络、数据链路、物理），常见于《计算机网络》课程教学。
        </p>
      </div>
    </aside>
  );
}
