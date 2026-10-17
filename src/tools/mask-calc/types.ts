/**
 * 子网掩码计算器 —— UI 共享类型与数据模型。
 *
 * 数据模型与任务要求第九节一一对应；错误均为结构化的
 * discriminated union，供 UI 渲染教学化中文提示。
 */
import type { IpParseError } from '../ip-subnet/utils/ip';

/** 掩码信息（三种表示一体：前缀 / 点分掩码 / 通配符 / 二进制）。 */
export interface MaskInfo {
  /** 0~32 的 CIDR 前缀长度。 */
  prefix: number;
  /** 点分十进制掩码，如 255.255.255.0。 */
  mask: string;
  /** 通配符掩码（反掩码），ACL 常用；/32 → 0.0.0.0。 */
  wildcard: string;
  /** 32 位二进制串（按 octet 分隔），如 11111111.11111111.11111111.00000000。 */
  binary: string;
}

/** 网段完整档案（结果卡的数据来源）。 */
export interface SubnetInfo {
  /** 网络地址（IP AND 掩码）。 */
  network: string;
  /** 广播地址（主机位全 1）。 */
  broadcast: string;
  /** 总地址数 2^(32-prefix)；/0 → 2^32 = 4294967296。 */
  totalHosts: number;
  /** 可用主机数（按第六节边界规则：/31 → 2、/32 → 1、其余 2^(32-prefix) − 2）。 */
  usableHosts: number;
  /** 首个可用地址；理论上恒有值（含 /31、/32 特例），null 仅为类型完备兜底。 */
  firstUsable: string | null;
  /** 最后一个可用地址。 */
  lastUsable: string | null;
  /** 地址类别（按 IP 首八位：0-127 A / 128-191 B / 192-223 C / 224-239 D / 240-255 E）。 */
  ipClass: 'A' | 'B' | 'C' | 'D' | 'E';
  /** 类别的一句中文解释（classful 仅供参考）。 */
  classNote: string;
  /** 是否为 RFC 1918 私有地址或 127/8 回环地址。 */
  isPrivate: boolean;
  /** 私有 / 回环标记的中文说明。 */
  privateNote?: string;
}

/** 掩码解析错误（discriminated union，kind 决定提示文案与建议卡）。 */
export type MaskError =
  | { kind: 'format'; message: string }
  | { kind: 'range'; message: string }
  | {
      kind: 'discontinuous';
      message: string;
      /** 位不连续时给出的最近似合法掩码建议（点分十进制）。 */
      suggestion: string;
    };

/** CIDR 前缀输入的解析结果。 */
export type CidrParseResult =
  | { ok: true; prefix: number }
  | { ok: false; message: string };

/** 网段计算结果：成功携带网段档案与掩码信息，失败携带结构化错误。 */
export type SubnetResult =
  | { ok: true; info: SubnetInfo; maskInfo: MaskInfo }
  | { ok: false; error: CalcError };

/** 网段计算错误：IP 解析错误复用 ip-subnet 的类型，前缀错误为本工具自有。 */
export type CalcError =
  | IpParseError
  | { kind: 'invalid_prefix'; message: string };

/** 分步计算过程的单步数据（第七节 6 步）。 */
export interface StepData {
  /** 步骤标题，如「掩码转二进制」。 */
  title: string;
  /** 步骤正文（中文说明，含关键数值）。 */
  detail: string;
  /** 可选的二进制串展示行。 */
  binary?: string;
}
