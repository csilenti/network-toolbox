/**
 * DNS 域名解析演示 —— 模拟数据层（需求第二十八节）。
 * 独立数据模型：服务器拓扑、域名解析库、记录类型知识卡与模拟兜底策略。
 * 禁止在组件模板中硬编码这些数据；全部 IP 均为教学演示数据，不做真实查询。
 */
import type { DnsRecord, DnsServer, DnsServerType } from './types';

/** 演示默认 TTL（秒），需求第二十节。 */
export const DEFAULT_TTL = 3600;

/**
 * 演示拓扑节点 —— 顺序即 Query Path 的渲染顺序（需求第三/六节）。
 * 注意拓扑刻意把「本地两级缓存」画在客户端与递归服务器之间，
 * 但教学文案会明确：客户端 → 递归是递归查询，递归 → 各级是迭代查询（需求第三十七节）。
 */
export const DNS_SERVERS: readonly DnsServer[] = [
  { id: 'client', type: 'client', name: '用户设备', subtitle: '浏览器 · 发起解析', emoji: '💻' },
  { id: 'browser_cache', type: 'browser_cache', name: '浏览器缓存', subtitle: 'Browser DNS Cache', emoji: '🗂' },
  { id: 'os_cache', type: 'os_cache', name: '操作系统缓存', subtitle: 'OS DNS Cache · hosts', emoji: '🧠' },
  { id: 'recursive', type: 'recursive', name: 'DNS 递归服务器', subtitle: 'Recursive DNS Server', emoji: '🔎' },
  { id: 'root', type: 'root', name: '根 DNS', subtitle: 'Root DNS · 「.」', emoji: '🌐' },
  { id: 'tld', type: 'tld', name: '.com 顶级域 DNS', subtitle: 'TLD DNS Server', emoji: '🌐' },
  { id: 'authoritative', type: 'authoritative', name: 'example.com 权威 DNS', subtitle: 'Authoritative DNS', emoji: '🏛' },
];

/** 按节点类型快速查找。 */
export const SERVER_MAP: Readonly<Record<DnsServerType, DnsServer>> = DNS_SERVERS.reduce(
  (map, server) => {
    map[server.type] = server;
    return map;
  },
  {} as Record<DnsServerType, DnsServer>,
);

/**
 * 预置域名解析库（需求第四节）。
 * 每个域名可挂多条记录；主流程只取第一条 A 记录。
 */
export const DOMAIN_RECORDS: Readonly<Record<string, readonly DnsRecord[]>> = {
  'www.example.com': [
    { name: 'www.example.com', type: 'A', value: '93.184.216.34', ttl: DEFAULT_TTL },
    { name: 'www.example.com', type: 'AAAA', value: '2001:db8::1', ttl: DEFAULT_TTL },
  ],
  'www.baidu.com': [
    { name: 'www.baidu.com', type: 'A', value: '110.242.68.4', ttl: 600 },
  ],
  'www.github.com': [
    { name: 'www.github.com', type: 'A', value: '140.82.112.3', ttl: DEFAULT_TTL },
  ],
  'mail.example.com': [
    { name: 'mail.example.com', type: 'A', value: '93.184.216.35', ttl: DEFAULT_TTL },
  ],
  'api.example.com': [
    { name: 'api.example.com', type: 'A', value: '93.184.216.40', ttl: 300 },
  ],
  'example.com': [
    { name: 'example.com', type: 'MX', value: 'mail.example.com', ttl: DEFAULT_TTL },
    { name: 'example.com', type: 'NS', value: 'ns1.example.com', ttl: DEFAULT_TTL },
  ],
};

/** Record Explorer 的单条知识卡：示例记录 + 一句中文解释（需求第十八节）。 */
export interface RecordExplainerEntry {
  record: DnsRecord;
  explanation: string;
}

/** 五种记录类型的示例与解释。 */
export const RECORD_EXPLAINER: readonly RecordExplainerEntry[] = [
  {
    record: { name: 'www.example.com', type: 'A', value: '93.184.216.34' },
    explanation: 'IPv4 地址记录：把域名映射到一个 32 位 IPv4 地址，是最常见的记录类型。',
  },
  {
    record: { name: 'www.example.com', type: 'AAAA', value: '2001:db8::1' },
    explanation: 'IPv6 地址记录：作用与 A 记录相同，只是映射到 128 位的 IPv6 地址。',
  },
  {
    record: { name: 'www.example.com', type: 'CNAME', value: 'example.cdn.com' },
    explanation: '别名记录：把域名指向另一个域名，常见于 CDN 场景 —— 客户端还要对目标域名再解析一次。',
  },
  {
    record: { name: 'example.com', type: 'MX', value: 'mail.example.com' },
    explanation: '邮件服务器记录：告诉发信方「发给 @example.com 的邮件应投递到哪台邮件服务器」。',
  },
  {
    record: { name: 'example.com', type: 'NS', value: 'ns1.example.com' },
    explanation: '权威服务器记录：指定由哪台 DNS 服务器负责回答该域名的查询。',
  },
];

/**
 * 校验用户输入是否像一个合法域名（需求第三十四节）。
 * 至少两段、每段为字母/数字/连字符的组合。
 */
export function isValidDomain(input: string): boolean {
  const domain = input.trim().toLowerCase();
  if (!domain || domain.length > 253) {
    return false;
  }
  const labels = domain.split('.');
  if (labels.length < 2) {
    return false;
  }
  return labels.every((label) => /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(label));
}

/** 提取顶级域（最后一段），如 www.example.com → com。 */
export function getTld(domain: string): string {
  const labels = domain.split('.');
  return labels[labels.length - 1] ?? 'com';
}

/** 提取注册域（最后两段，演示用），如 www.example.com → example.com。 */
export function getRegisteredDomain(domain: string): string {
  const labels = domain.split('.');
  if (labels.length < 2) {
    return domain;
  }
  return labels.slice(-2).join('.');
}

/**
 * 未收录域名的模拟兜底：按域名哈希确定性生成 TEST-NET-3（203.0.113.0/24）
 * 文档专用网段的 IP，保证同一域名每次演示结果一致。
 */
export function simulateIp(domain: string): string {
  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }
  return `203.0.113.${(hash % 250) + 1}`;
}

/**
 * 查询某域名的 A 记录答案（模拟）：优先取预置库，否则走兜底生成。
 */
export function getAnswer(domain: string): DnsRecord {
  const records = DOMAIN_RECORDS[domain];
  const aRecord = records?.find((record) => record.type === 'A');
  if (aRecord) {
    return aRecord;
  }
  return { name: domain, type: 'A', value: simulateIp(domain), ttl: DEFAULT_TTL };
}
