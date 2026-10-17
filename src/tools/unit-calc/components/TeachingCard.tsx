/**
 * 💡 教学卡：按类别切换的易错点说明。
 */
import type { UnitCategory } from '../types';

/** 各类别的教学文案（任务要求第二节 / 第四节）。 */
const TEACHING: Record<UnitCategory, string> = {
  bandwidth:
    '运营商标称的「百兆宽带」是 100 Mbps（比特每秒），而下载软件显示的是 MB/s（字节每秒）。' +
    '1 字节 = 8 比特，所以 100 Mbps ÷ 8 = 12.5 MB/s —— 这就是百兆宽带理论下载峰值只有 12.5 MB/s 的原因。' +
    '注意：K / M / G 前缀对比特和字节都是 1000 进制，8 倍关系只发生在 bit ⇄ Byte 这一级。',
  size:
    '1 KB = 1,000 B（十进制 SI），1 KiB = 1,024 B（二进制 IEC）。' +
    '1 MiB = 1,048,576 B，比 1 MB（1,000,000 B）大约 4.9% —— 这就是 1 MB ≠ 1 MiB 的原因。' +
    '硬盘厂商标称十进制容量（1 TB = 10¹² B），而操作系统按二进制换算：10¹² ÷ 2⁴⁰ ≈ 0.909，' +
    '所以 1 TB 硬盘在电脑里只显示约 931 GiB，并不是硬盘缩水了。',
  'download-time':
    '这里算出的是理论峰值时间：实际下载还要扣除 TCP/IP 协议头开销、握手与拥塞控制的爬坡时间，' +
    '并受 Wi-Fi 信号、服务器限速等影响，通常只能达到理论值的 50%~90%。',
};

export interface TeachingCardProps {
  /** 当前类别。 */
  category: UnitCategory;
}

/** 💡 教学卡组件。 */
export function TeachingCard({ category }: TeachingCardProps) {
  return (
    <aside className="uc-teaching" role="note">
      <span className="uc-teaching-badge" aria-hidden="true">
        💡
      </span>
      <p>{TEACHING[category]}</p>
    </aside>
  );
}
