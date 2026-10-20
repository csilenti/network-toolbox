/**
 * OSI / TCP-IP 模型对照 —— 数据层（任务要求第三节、第六节）。
 * 层级数据以任务文件第三节两张表为准逐字落实；禁止在组件内硬编码层级数据。
 * 组织模式与 dns-lab/data.ts 一致：独立数据文件 + 类型 + 纯函数。
 */
import type { LayerInfo, LayerMapping } from './types';

/**
 * OSI 七层数据（左栏，自上而下，编号 7~1）。
 * 层号 / 名称 / 功能说明 / 典型协议 / PDU / 相关设备均逐字取自任务文件第三节表格。
 * 注意：L3 的 ARP 带星号（归属争议，见 note）。
 */
export const OSI_LAYERS: readonly LayerInfo[] = [
  {
    id: 'osi-7',
    stack: 'osi',
    number: 7,
    name: '应用层',
    nameEn: 'Application',
    duty: '为应用程序提供网络服务接口',
    protocols: ['HTTP', 'HTTPS', 'DNS', 'SMTP', 'FTP', 'SSH'],
    pdu: '数据（Data）',
    devices: ['应用层网关', '防火墙'],
  },
  {
    id: 'osi-6',
    stack: 'osi',
    number: 6,
    name: '表示层',
    nameEn: 'Presentation',
    duty: '数据格式转换、加密解密、压缩',
    protocols: ['TLS/SSL', 'JPEG', 'ASCII'],
    pdu: '数据（Data）',
    devices: [],
  },
  {
    id: 'osi-5',
    stack: 'osi',
    number: 5,
    name: '会话层',
    nameEn: 'Session',
    duty: '建立、管理、终止会话',
    protocols: ['NetBIOS', 'RPC'],
    pdu: '数据（Data）',
    devices: [],
  },
  {
    id: 'osi-4',
    stack: 'osi',
    number: 4,
    name: '传输层',
    nameEn: 'Transport',
    duty: '端到端可靠传输、流量控制、复用端口',
    protocols: ['TCP', 'UDP'],
    pdu: '段（Segment）',
    devices: ['防火墙', '负载均衡器'],
  },
  {
    id: 'osi-3',
    stack: 'osi',
    number: 3,
    name: '网络层',
    nameEn: 'Network',
    duty: '逻辑寻址与路由选择',
    protocols: ['IP', 'ICMP', 'ARP*', 'OSPF'],
    pdu: '包（Packet）',
    devices: ['路由器', '三层交换机'],
    note: 'ARP 的归属在教学上存在争议（工作在 L2/L3 之间），表中标注于网络层仅为常见教学归类，不算错误。',
  },
  {
    id: 'osi-2',
    stack: 'osi',
    number: 2,
    name: '数据链路层',
    nameEn: 'Data Link',
    duty: '成帧、MAC 寻址、差错检测',
    protocols: ['以太网', 'PPP', 'VLAN'],
    pdu: '帧（Frame）',
    devices: ['交换机', '网桥', '网卡'],
  },
  {
    id: 'osi-1',
    stack: 'osi',
    number: 1,
    name: '物理层',
    nameEn: 'Physical',
    duty: '比特流传输、电气/光信号规范',
    protocols: ['RJ45', '光纤', 'Wi-Fi 物理规范'],
    pdu: '比特（Bit）',
    devices: ['中继器', '集线器', '网线'],
  },
];

/**
 * TCP/IP 四层数据（右栏，自上而下，编号 4~1）。
 * 「覆盖 OSI 层」与「说明」逐字取自任务文件第三节第二张表；
 * 四要素中的协议 / PDU / 设备按其覆盖的 OSI 层对应合并补全。
 */
export const TCPIP_LAYERS: readonly LayerInfo[] = [
  {
    id: 'tcpip-4',
    stack: 'tcpip',
    number: 4,
    name: '应用层',
    nameEn: 'Application',
    duty: '合并了 OSI 上三层（应用 / 表示 / 会话）的功能：会话与表示的细节并入应用实现',
    protocols: ['HTTP', 'HTTPS', 'DNS', 'SMTP', 'FTP', 'SSH', 'TLS/SSL', 'NetBIOS', 'RPC'],
    pdu: '数据（Data）',
    devices: ['应用层网关', '防火墙'],
    note: '覆盖 OSI 第 7 + 6 + 5 层：会话/表示功能并入应用实现。',
  },
  {
    id: 'tcpip-3',
    stack: 'tcpip',
    number: 3,
    name: '传输层',
    nameEn: 'Transport',
    duty: 'TCP/UDP，与 OSI 传输层一致',
    protocols: ['TCP', 'UDP'],
    pdu: '段（Segment）',
    devices: ['防火墙', '负载均衡器'],
    note: '覆盖 OSI 第 4 层，与 OSI 传输层一致。',
  },
  {
    id: 'tcpip-2',
    stack: 'tcpip',
    number: 2,
    name: '网际层',
    nameEn: 'Internet',
    duty: 'IP 层，也称互联网层',
    protocols: ['IP', 'ICMP', 'ARP*', 'OSPF'],
    pdu: '包（Packet）',
    devices: ['路由器', '三层交换机'],
    note: '覆盖 OSI 第 3 层（IP 层，也称互联网层）。',
  },
  {
    id: 'tcpip-1',
    stack: 'tcpip',
    number: 1,
    name: '网络接口层',
    nameEn: 'Network Interface',
    duty: '也称链路层；TCP/IP 未明确规定 L1/L2 划分',
    protocols: ['以太网', 'PPP', 'VLAN', 'RJ45', '光纤', 'Wi-Fi 物理规范'],
    pdu: '帧（Frame）/ 比特（Bit）',
    devices: ['交换机', '网桥', '网卡', '中继器', '集线器', '网线'],
    note: '覆盖 OSI 第 2 + 1 层；TCP/IP 模型未明确规定网络接口层内部 L1/L2 的划分。',
  },
];

/**
 * 双向映射表（任务要求第三节第二张表 + 第四节映射关系）：
 *  - OSI 7 / 6 / 5 → TCP/IP 应用层
 *  - OSI 4 → TCP/IP 传输层
 *  - OSI 3 → TCP/IP 网际层
 *  - OSI 2 / 1 → TCP/IP 网络接口层
 * 反向（TCP/IP id → OSI ids）同表收录，互为逆映射。
 */
export const MAPPING: LayerMapping = {
  // ---- OSI → TCP/IP ----
  'osi-7': ['tcpip-4'],
  'osi-6': ['tcpip-4'],
  'osi-5': ['tcpip-4'],
  'osi-4': ['tcpip-3'],
  'osi-3': ['tcpip-2'],
  'osi-2': ['tcpip-1'],
  'osi-1': ['tcpip-1'],
  // ---- TCP/IP → OSI（逆映射） ----
  'tcpip-4': ['osi-7', 'osi-6', 'osi-5'],
  'tcpip-3': ['osi-4'],
  'tcpip-2': ['osi-3'],
  'tcpip-1': ['osi-2', 'osi-1'],
};
