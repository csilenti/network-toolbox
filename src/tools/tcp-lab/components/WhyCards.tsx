/**
 * 固定知识卡 —— 「为什么三次 vs 四次」与「TIME_WAIT 是什么」（需求第十三/十四节）。
 * 第一张卡配一个小图示，用动画语言（箭头行）体现 SYN+ACK 合并与 FIN/ACK 独立的差别。
 */

/** 建立连接的迷你报文行（SYN 与 ACK 合并 → 3 次）。 */
const HANDSHAKE_LANES: readonly string[] = [
  'A ─────── SYN ───────→ B',
  'A ←── SYN + ACK ────── B',
  'A ─────── ACK ───────→ B',
];

/** 断开连接的迷你报文行（ACK 与 FIN 独立 → 4 次）。 */
const TEARDOWN_LANES: readonly string[] = [
  'A ─────── FIN ───────→ B',
  'A ←────── ACK ─────── B',
  'A ←────── FIN ─────── B',
  'A ─────── ACK ───────→ B',
];

/**
 * 两张知识卡（静态内容，不依赖播放状态）。
 */
export function WhyCards() {
  return (
    <div className="why-grid">
      <article className="panel why-card" style={{ animationDelay: '350ms' }}>
        <h3 className="why-title">为什么建立连接要三次，断开却要四次？</h3>
        <p className="why-text">
          建立连接时，B 的「确认」与「我也要同步」可以合并在同一个报文（SYN+ACK）里发送，
          因此三次交互即可。而断开连接时，双方关闭各自的「发送方向」是相对独立的：
          B 收到 FIN 后可能还有数据没有发完，必须先回 ACK 确认，等自己数据发完后再发 FIN，
          所以 ACK 与 FIN 通常分成两个报文，四次挥手由此而来。
        </p>
        <div className="why-mini">
          <div className="why-mini-group">
            <span className="why-mini-caption">建立连接 · SYN 与 ACK 可合并 → 3 次</span>
            {HANDSHAKE_LANES.map((lane) => (
              <span key={lane} className="why-lane">
                {lane}
              </span>
            ))}
          </div>
          <div className="why-mini-group">
            <span className="why-mini-caption">断开连接 · ACK 与 FIN 相对独立 → 4 次</span>
            {TEARDOWN_LANES.map((lane) => (
              <span key={lane} className="why-lane">
                {lane}
              </span>
            ))}
          </div>
        </div>
      </article>

      <article className="panel why-card" style={{ animationDelay: '420ms' }}>
        <h3 className="why-title">⏳ TIME_WAIT 是什么？</h3>
        <p className="why-text">
          TIME_WAIT 是 TCP 主动关闭连接的一方在关闭后保留的一段状态，用于确保网络中的旧报文
          不会干扰后续连接，并让对端有机会重传 FIN 时得到 ACK。
        </p>
        <p className="why-text">
          如果没有 TIME_WAIT：A 发出的最后一个 ACK 一旦丢失，B 会收不到确认而重传 FIN，
          此时早已关闭的 A 将无法应答，连接就无法干净地结束。
        </p>
        <div className="why-note">
          <span className="why-note-label">在本演示中</span>
          A 发出最后一个 ACK 后进入 TIME_WAIT，等待 2×MSL（报文最大生存时间）后才真正
          CLOSED；B 收到 ACK 后直接进入 CLOSED。因此时序图最后一段里 A 的关闭总是比 B 更「晚」。
        </div>
      </article>
    </div>
  );
}
