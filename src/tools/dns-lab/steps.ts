/**
 * DNS 域名解析演示 —— 核心状态机：动态生成结构化步骤数组（需求第二十九节）。
 *
 * 两条路径：
 *  - 完整链路（12 步）：输入 → 浏览器缓存 → OS 缓存 → 递归查询（客户端→递归）
 *    → 迭代查询（递归→根→.com→权威，含两条 Referral）→ ANSWER → 返回 → 写缓存；
 *  - 缓存命中链路（6 步）：输入 → 浏览器缓存 → OS 缓存 → 递归查询
 *    → ⚡递归缓存命中直接返回 → 解析完成（需求第十九节）。
 *
 * 教学约束（需求第三十七节）：状态机明确区分
 *  「递归查询段」（客户端 → 递归，客户端只发一次请求）与
 *  「迭代查询段」（递归 → 根 → TLD → 权威，递归自己逐级追问）。
 */
import { DEFAULT_TTL, getAnswer, getRegisteredDomain, getTld } from './data';
import type { DnsPacket, DnsStep } from './types';

/** 查询报文的 Flags（RD=1，标准递归查询）。 */
const QUERY_FLAGS = '0x0100';
/** 响应报文的 Flags（QR=1 + RD + RA）。 */
const RESPONSE_FLAGS = '0x8180';

/** 按序号生成确定性的事务 ID（教学模拟值）。 */
function txId(seed: number): string {
  return `0x${(0x24a6 + seed * 0x13f7).toString(16)}`;
}

/** buildSteps 的选项。 */
export interface BuildStepsOptions {
  /** 本次解析是否命中递归服务器缓存（决定走哪条链路）。 */
  cacheHit: boolean;
  /** 缓存命中时递归侧记录的剩余 TTL（秒）。 */
  ttlRemaining?: number;
}

/**
 * 构造 ANSWER 响应报文。
 */
function answerPacket(
  domain: string,
  tx: string,
  ip: string,
  ttl: number,
): DnsPacket {
  return {
    transactionId: tx,
    flags: RESPONSE_FLAGS,
    isResponse: true,
    questions: 1,
    qname: domain,
    qtype: 'A',
    qclass: 'IN',
    answers: 1,
    ttl,
    data: ip,
  };
}

/**
 * 构造 Referral 响应报文：Answers=0，指向下一级服务器（Authority / Additional 语义）。
 */
function referralPacket(
  domain: string,
  tx: string,
  authority: string,
): DnsPacket {
  return {
    transactionId: tx,
    flags: RESPONSE_FLAGS,
    isResponse: true,
    questions: 1,
    qname: domain,
    // Question 区回显原查询（QTYPE 仍为 A）；NS 记录位于 Authority / Additional 区。
    qtype: 'A',
    qclass: 'IN',
    answers: 0,
    authority,
    additional: 'Additional 区附带下一级服务器的地址（演示数据）',
  };
}

/** 构造查询报文。 */
function queryPacket(domain: string, tx: string): DnsPacket {
  return {
    transactionId: tx,
    flags: QUERY_FLAGS,
    isResponse: false,
    questions: 1,
    qname: domain,
    qtype: 'A',
    qclass: 'IN',
  };
}

/**
 * 「输入域名 / 缓存检查」这两类步骤在两条链路中完全一致，提取为公共段。
 */
function buildCommonPrefix(domain: string): DnsStep[] {
  return [
    {
      id: 'input',
      title: '用户输入域名',
      phase: 'input',
      source: 'client',
      target: 'client',
      type: 'result',
      packet: null,
      explanation:
        '用户想访问一个网站，但浏览器手里只有域名、还没有 IP 地址 —— 把域名「翻译」成 IP 的工作，马上交给 DNS 完成。',
      dialogue: [{ speaker: '用户', emoji: '👤', text: `我要打开 ${domain}，可是它的 IP 是多少呢？` }],
      tip: '真正能定位一台主机的只有 IP 地址；域名只是方便人类记忆的别名。',
      timelineIcon: '①',
      timelineLabel: 'Client Query',
      shortTag: '输入域名',
      cacheHit: false,
    },
    {
      id: 'check-browser-cache',
      title: '检查浏览器缓存',
      phase: 'cache-check',
      source: 'client',
      target: 'browser_cache',
      type: 'cache',
      packet: null,
      explanation:
        '浏览器先翻自己的 DNS 缓存：如果最近解析过这个域名、记录还在 TTL 有效期内，就可以直接使用，完全不必询问任何 DNS 服务器。',
      dialogue: [{ speaker: '浏览器', emoji: '🗂', text: '我先查查自己的小本本……没有这条记录，缓存未命中。' }],
      tip: '浏览器缓存由浏览器进程自己维护，命中时整个解析到此结束。',
      timelineIcon: '②',
      timelineLabel: 'Check Cache',
      shortTag: 'CACHE MISS',
      cacheHit: false,
    },
    {
      id: 'check-os-cache',
      title: '检查操作系统缓存',
      phase: 'cache-check',
      source: 'browser_cache',
      target: 'os_cache',
      type: 'cache',
      packet: null,
      explanation:
        '浏览器缓存没有命中，接着询问操作系统的 DNS 缓存（hosts 文件等本地配置也在这一层）。仍未找到，才真正需要向网络中的 DNS 服务器发起查询。',
      dialogue: [{ speaker: '操作系统', emoji: '🧠', text: '我这里也没有缓存，你只能去问 DNS 服务器了。' }],
      tip: null,
      timelineIcon: '②',
      timelineLabel: 'Check Cache',
      shortTag: 'CACHE MISS',
      cacheHit: false,
    },
    {
      id: 'query-recursive',
      title: '客户端向递归 DNS 发起查询',
      phase: 'recursive-query',
      source: 'os_cache',
      target: 'recursive',
      type: 'query',
      packet: queryPacket(domain, txId(0)),
      explanation:
        '客户端通常只配置一个「DNS 递归服务器」地址（运营商或公共 DNS 提供）。客户端只需向它发起这一次查询，剩下的逐级追问全部由递归服务器代劳 —— 这就是递归查询。',
      dialogue: [
        { speaker: '用户设备', emoji: '💻', text: `DNS 大哥，帮我看看 ${domain} 的 IP 在哪？` },
        { speaker: '递归 DNS', emoji: '🔎', text: '稍等，我去帮你问问。' },
      ],
      tip: '递归查询：客户端只发一次请求，并要求递归服务器最终给出答案。',
      timelineIcon: '③',
      timelineLabel: 'Recursive DNS',
      shortTag: 'QUERY · A?',
      cacheHit: false,
    },
  ];
}

/**
 * 完整链路：递归服务器从根一路迭代到权威 DNS（12 步）。
 */
function buildFullSteps(domain: string): readonly DnsStep[] {
  const answer = getAnswer(domain);
  const ip = answer.value;
  const ttl = answer.ttl ?? DEFAULT_TTL;
  const tld = getTld(domain);
  const registered = getRegisteredDomain(domain);

  const prefix = buildCommonPrefix(domain);

  const iterativeSteps: DnsStep[] = [
    {
      id: 'query-root',
      title: '递归 DNS 查询根 DNS',
      phase: 'iterative-query',
      source: 'recursive',
      target: 'root',
      type: 'query',
      packet: queryPacket(domain, txId(1)),
      explanation:
        '递归服务器也不知道答案，于是开始「迭代查询」：拿着完整域名去问根 DNS。注意 —— 客户端并不参与这一段，这是递归服务器自己的迭代之旅。',
      dialogue: [{ speaker: '递归 DNS', emoji: '🔎', text: `根 DNS，${domain} 的 IP 是多少？` }],
      tip: '迭代查询：每一级服务器若不掌握最终答案，就返回「下一级该问谁」。',
      timelineIcon: '④',
      timelineLabel: 'Root DNS',
      shortTag: 'QUERY · A?',
      cacheHit: false,
    },
    {
      id: 'root-referral',
      title: '根 DNS 返回 Referral：去问 .com',
      phase: 'iterative-query',
      source: 'root',
      target: 'recursive',
      type: 'response',
      packet: referralPacket(domain, txId(1), `.${tld} 顶级域 DNS 服务器（NS）`),
      explanation:
        '根 DNS 并不负责告诉你最终 IP：它只管理顶级域这一层的索引，于是返回一条 Referral（指引）响应：\u201c.com 顶级域 DNS 在这里。\u201d\nRoot DNS ≠ 最终答案，它只提供下一步查询方向。',
      dialogue: [{ speaker: '根 DNS', emoji: '🌐', text: `我不知道具体 IP，但 .${tld} 的事情你去问它。` }],
      tip: 'Referral 响应的 Answers=0，真正有用的信息在 Authority / Additional 区。',
      timelineIcon: '④',
      timelineLabel: 'Root DNS',
      shortTag: `Referral → .${tld}`,
      cacheHit: false,
    },
    {
      id: 'query-tld',
      title: '递归 DNS 查询顶级域 DNS',
      phase: 'iterative-query',
      source: 'recursive',
      target: 'tld',
      type: 'query',
      packet: queryPacket(domain, txId(2)),
      explanation:
        '拿到根 DNS 的指引后，递归服务器改问顶级域 DNS。顶级域 DNS 负责 .com（以及其它顶级域）这一层域名的索引。',
      dialogue: [{ speaker: '递归 DNS', emoji: '🔎', text: `.${tld} 大哥，${registered} 的权威 DNS 在哪里？` }],
      tip: null,
      timelineIcon: '⑤',
      timelineLabel: '.com DNS',
      shortTag: 'QUERY · A?',
      cacheHit: false,
    },
    {
      id: 'tld-referral',
      title: '顶级域 DNS 返回 Referral：去问权威',
      phase: 'iterative-query',
      source: 'tld',
      target: 'recursive',
      type: 'response',
      packet: referralPacket(domain, txId(2), `${registered} 权威 DNS 服务器（NS）`),
      explanation:
        '顶级域 DNS 通常也不会直接返回最终 IP，它返回另一条 Referral：注册域的权威 DNS 在哪里。每一步迭代，递归服务器都在向「真正知道答案的服务器」靠近。',
      dialogue: [{ speaker: `.${tld} DNS`, emoji: '🌐', text: `${registered} 的权威 DNS 在那里。` }],
      tip: null,
      timelineIcon: '⑤',
      timelineLabel: '.com DNS',
      shortTag: `Referral → ${registered}`,
      cacheHit: false,
    },
    {
      id: 'query-authoritative',
      title: '递归 DNS 查询权威 DNS',
      phase: 'iterative-query',
      source: 'recursive',
      target: 'authoritative',
      type: 'query',
      packet: queryPacket(domain, txId(3)),
      explanation:
        '递归服务器来到最后一站：注册域的权威 DNS。它保存着该域名的正式记录（Zone Data），是唯一有权给出最终答案的地方。',
      dialogue: [{ speaker: '递归 DNS', emoji: '🔎', text: `权威 DNS，${domain} 到底是多少？` }],
      tip: null,
      timelineIcon: '⑥',
      timelineLabel: 'Authoritative DNS',
      shortTag: 'QUERY · A?',
      cacheHit: false,
    },
    {
      id: 'authoritative-answer',
      title: '权威 DNS 返回 ANSWER',
      phase: 'iterative-query',
      source: 'authoritative',
      target: 'recursive',
      type: 'response',
      packet: answerPacket(domain, txId(3), ip, ttl),
      explanation: `权威 DNS 查到正式记录，返回 ANSWER 响应：${domain} 的 A 记录指向 ${ip}，TTL=${ttl} —— 表示这条记录在 ${ttl} 秒内可以被放心缓存。`,
      dialogue: [{ speaker: '权威 DNS', emoji: '🏛', text: `找到了！${domain} 是 ${ip}。` }],
      tip: 'TTL（Time To Live）：记录允许被缓存的时间；越长缓存收益越大，但记录更新生效越慢。',
      timelineIcon: '⑥',
      timelineLabel: 'Authoritative DNS',
      shortTag: `ANSWER · ${ip}`,
      cacheHit: false,
    },
  ];

  const returnSteps: DnsStep[] = [
    {
      id: 'return-result',
      title: '递归 DNS 把答案交还客户端',
      phase: 'return',
      source: 'recursive',
      target: 'client',
      type: 'response',
      packet: answerPacket(domain, txId(0), ip, ttl),
      explanation:
        '递归服务器把最终答案沿原路交还客户端，兑现最初那次「递归查询」的承诺。客户端拿到 IP 后，即可与目标服务器建立 TCP 连接开始通信。',
      dialogue: [
        { speaker: '递归 DNS', emoji: '🔎', text: '查到了，给你。' },
        { speaker: '用户设备', emoji: '💻', text: '收到，谢谢！' },
      ],
      tip: null,
      timelineIcon: '⑦',
      timelineLabel: 'Return Result',
      shortTag: `ANSWER · ${ip}`,
      cacheHit: false,
    },
    {
      id: 'cache-result',
      title: '解析完成，结果写入缓存',
      phase: 'cache-result',
      source: 'client',
      target: 'client',
      type: 'result',
      packet: null,
      explanation: `解析完成：${domain} → ${ip}。这条 A 记录同时被写入各级缓存（本演示记录到客户端一侧），TTL 倒计时开始 —— 下次再访问，也许根本不需要走完整链路。`,
      dialogue: [],
      tip: '实际解析还可能受 hosts 文件、CNAME 链、DNS 负载均衡等因素影响；本工具模拟的是最典型的一条 A 记录链路。',
      timelineIcon: '⑧',
      timelineLabel: 'Cache',
      shortTag: '写入缓存',
      cacheHit: false,
    },
  ];

  return [...prefix, ...iterativeSteps, ...returnSteps];
}

/**
 * 缓存命中链路（6 步，需求第十九节）：
 * 输入 → 浏览器缓存 → OS 缓存 → 递归查询 → ⚡递归缓存命中直接返回 → 解析完成。
 */
function buildCacheHitSteps(domain: string, ttlRemaining: number): readonly DnsStep[] {
  const answer = getAnswer(domain);
  const ip = answer.value;

  const prefix = buildCommonPrefix(domain);

  const hitSteps: DnsStep[] = [
    {
      id: 'recursive-cache-hit',
      title: '⚡ 递归 DNS 缓存命中，直接返回',
      phase: 'return',
      source: 'recursive',
      target: 'client',
      type: 'response',
      packet: answerPacket(domain, txId(0), ip, ttlRemaining),
      explanation:
        '递归服务器自己缓存过这条记录（且仍在 TTL 有效期内），根本不需要去问根、顶级域和权威 DNS —— 直接把缓存的答案返回。查询链路从 5 跳缩短到 1 跳，这就是 DNS 缓存的威力。',
      dialogue: [{ speaker: '递归 DNS', emoji: '⚡', text: '这个我上次刚查过，直接给你！' }],
      tip: `缓存剩余 TTL：${ttlRemaining}s；TTL 归零（Cache Expired）后必须重新走完整链路。`,
      timelineIcon: '⑦',
      timelineLabel: 'Return Result',
      shortTag: '⚡ CACHE HIT',
      cacheHit: true,
    },
    {
      id: 'cache-hit-result',
      title: 'DNS 解析完成（缓存命中）',
      phase: 'cache-result',
      source: 'client',
      target: 'client',
      type: 'result',
      packet: null,
      explanation: `解析完成（缓存命中）：${domain} → ${ip}。这一次没有访问任何权威服务器 —— 缓存正是互联网能扛住海量域名查询的关键。`,
      dialogue: [],
      tip: '对比第一次的完整解析：链路大幅缩短，延迟显著降低。',
      timelineIcon: '⑧',
      timelineLabel: 'Cache',
      shortTag: '⚡ Cache HIT',
      cacheHit: true,
    },
  ];

  return [...prefix, ...hitSteps];
}

/**
 * 状态机入口：根据域名与缓存命中情况动态生成步骤数组（纯函数）。
 */
export function buildSteps(domain: string, options: BuildStepsOptions): readonly DnsStep[] {
  if (options.cacheHit) {
    return buildCacheHitSteps(domain, options.ttlRemaining ?? DEFAULT_TTL);
  }
  return buildFullSteps(domain);
}
