/**
 * 分步计算过程生成（任务要求第七节 6 步）：
 * 掩码转二进制 → IP 转二进制 → 逐位 AND → 网络地址 → 广播地址 → 可用范围。
 *
 * 纯数据层：只产出 StepData[]，由 CalculationSteps 组件负责渲染。
 */
import {
  broadcastOf,
  ipToBinary,
  ipToDotted,
  maskBits,
  networkOf,
} from '../../ip-subnet/utils/ip';
import type { StepData } from '../types';

/**
 * 以「IP + 前缀」生成 6 步推导链路。
 * 前缀为 0~32（由调用方保证），/31 /32 /0 的第 6 步按边界规则给出特例文案。
 */
export function buildSteps(ip: number, prefix: number): StepData[] {
  const p = Math.min(32, Math.max(0, Math.trunc(prefix)));
  const maskInt = maskBits(p);
  const maskBinary = ipToBinary(maskInt);
  const ipBinary = ipToBinary(ip);
  const net = networkOf(ip, p);
  const bcast = broadcastOf(ip, p);
  const netBinary = ipToBinary(net);
  const hostBits = 32 - p;

  const grouped = (bits: string): string =>
    `${bits.slice(0, 8)}.${bits.slice(8, 16)}.${bits.slice(16, 24)}.${bits.slice(24, 32)}`;

  const steps: StepData[] = [
    {
      title: '掩码转二进制',
      detail: `掩码 ${ipToDotted(maskInt)} 的二进制是前 ${p} 位连续的 1、后 ${hostBits} 位连续的 0（${p} 个网络位）。`,
      binary: grouped(maskBinary),
    },
    {
      title: 'IP 转二进制',
      detail: `IP ${ipToDotted(ip)} 按每 8 位一组展开为 32 位二进制。`,
      binary: grouped(ipBinary),
    },
    {
      title: '逐位 AND 运算',
      detail: `IP 与掩码逐位 AND：前 ${p} 位（网络位）掩码为 1，AND 后保留 IP 原值；后 ${hostBits} 位（主机位）掩码为 0，AND 后清零。`,
    },
    {
      title: '得到网络地址',
      detail: `AND 的结果即网络地址 ${ipToDotted(net)} —— 同一网段内所有主机做此运算都会得到它。`,
      binary: grouped(netBinary),
    },
    {
      title: '求广播地址',
      detail:
        hostBits === 0
          ? `主机位为 0 位，广播地址即网络地址本身：${ipToDotted(bcast)}。`
          : `把 ${hostBits} 个主机位全部置 1，得到广播地址 ${ipToDotted(bcast)} —— 发往它的分组会被网段内所有主机接收。`,
    },
  ];

  // 第 6 步：可用范围（按第六节边界规则区分特例）
  const total = 2 ** hostBits;
  if (p === 31) {
    steps.push({
      title: '求可用范围（/31 特例）',
      detail: `按 RFC 3021 点对点链路规定，/31 网段不扣除网络与广播地址，两个地址 ${ipToDotted(net)} 与 ${ipToDotted(bcast)} 都可直接使用，可用主机数 = 2。`,
    });
  } else if (p === 32) {
    steps.push({
      title: '求可用范围（/32 特例）',
      detail: `/32 是单主机路由：整个网段只有 ${ipToDotted(ip)} 这一个地址，它本身就是可用地址，可用主机数 = 1。`,
    });
  } else {
    steps.push({
      title: '求可用范围',
      detail: `扣除网络地址与广播地址，可用范围 ${ipToDotted(net + 1)} ~ ${ipToDotted(bcast - 1)}，共 2^${hostBits} − 2 = ${total - 2} 台可用主机。`,
    });
  }

  return steps;
}
