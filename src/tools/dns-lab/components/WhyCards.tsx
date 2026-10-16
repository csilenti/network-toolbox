/**
 * 固定知识卡 —— 「为什么不能直接输入 IP？」与「递归查询 vs 迭代查询」（需求第二十三/十五节）。
 * 不占主视觉，静态内容不依赖播放状态。
 */

/** 递归段的迷你示意（客户端只发一次请求）。 */
const RECURSIVE_LANES: readonly string[] = [
  '客户端 ───「帮我找 IP」───→ 递归 DNS   （只发这一次）',
  '客户端 ←──── 最终答案 ─────  递归 DNS',
];

/** 迭代段的迷你示意（递归自己逐级追问）。 */
const ITERATIVE_LANES: readonly string[] = [
  '递归 DNS ──→ 根 DNS      「.com 去哪问？」',
  '递归 DNS ──→ .com DNS    「权威 DNS 去哪问？」',
  '递归 DNS ──→ 权威 DNS    「拿到最终 ANSWER」',
];

/**
 * 两张知识卡。
 */
export function WhyCards() {
  return (
    <div className="dns-why-grid">
      <article className="panel dns-why-card" style={{ animationDelay: '420ms' }}>
        <h3 className="dns-why-title">为什么不能直接输入 IP？</h3>
        <p className="dns-why-text">
          因为 <b>www.example.com</b> 比 <b className="mono">93.184.216.34</b> 容易记忆得多。
          DNS 就像互联网的「电话簿」：你记住名字（域名），它负责查出号码（IP 地址）。
          域名可以换服务器而不影响用户，IP 却做不到这一点。
        </p>
        <div className="dns-why-note">
          <span className="dns-why-note-label">一句话记住</span>
          域名 ↓ IP 地址，DNS 就是完成这个翻译动作的系统。
        </div>
      </article>

      <article className="panel dns-why-card" style={{ animationDelay: '490ms' }}>
        <h3 className="dns-why-title">递归查询 vs 迭代查询</h3>
        <p className="dns-why-text">
          两者发生在<b>不同的链路</b>上：客户端与递归 DNS 之间是<b>递归查询</b>（只发一次请求，
          要求对方给出最终答案）；递归 DNS 与根 / TLD / 权威之间是<b>迭代查询</b>
          （每一级只告诉你「下一步问谁」）。千万别把 DNS 简化成「客户端 → 根 → .com → 权威」。
        </p>
        <div className="dns-why-mini">
          <div className="dns-why-mini-group">
            <span className="dns-why-mini-caption">递归查询 · 客户端 ⇄ 递归 DNS</span>
            {RECURSIVE_LANES.map((lane) => (
              <span key={lane} className="dns-why-lane">
                {lane}
              </span>
            ))}
          </div>
          <div className="dns-why-mini-group">
            <span className="dns-why-mini-caption">迭代查询 · 递归 DNS 逐级追问</span>
            {ITERATIVE_LANES.map((lane) => (
              <span key={lane} className="dns-why-lane">
                {lane}
              </span>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
