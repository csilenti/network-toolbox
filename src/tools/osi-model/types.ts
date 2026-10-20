/**
 * OSI / TCP-IP 模型对照 —— 类型定义（任务要求第六节）。
 * 纯类型层，无任何运行时逻辑；层级数据与映射全部收敛在 data.ts。
 */

/** 层堆叠归属：OSI 七层（左栏）或 TCP/IP 四层（右栏）。 */
export type LayerStack = 'osi' | 'tcpip';

/**
 * 单个分层的完整档案（任务要求第六节 LayerInfo）。
 * 每层展示四要素：功能说明 / 典型协议 / 数据单元 PDU / 相关设备。
 */
export interface LayerInfo {
  /** 全局唯一 id，形如 'osi-7' / 'tcpip-4'，同时作为映射表键。 */
  id: string;
  /** 所属堆叠。 */
  stack: LayerStack;
  /** 层号：OSI 7~1；TCP/IP 4~1。 */
  number: number;
  /** 中文名。 */
  name: string;
  /** 英文名。 */
  nameEn: string;
  /** 功能说明（1~2 句）。 */
  duty: string;
  /** 典型协议。 */
  protocols: string[];
  /** 数据单元 PDU。 */
  pdu: string;
  /** 相关设备（可为空）。 */
  devices: string[];
  /** 教学备注（如 ARP 归属争议、TCP/IP 未规定 L1/L2 划分）。 */
  note?: string;
}

/**
 * 映射表：OSI id → TCP/IP ids；TCP/IP id → OSI ids。
 * 两个方向同时收录于同一张表（互为逆映射，可由 validateMapping 纯函数校验）。
 */
export type LayerMapping = Record<string, string[]>;
