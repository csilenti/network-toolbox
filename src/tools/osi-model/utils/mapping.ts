/**
 * OSI / TCP-IP 模型对照 —— 映射纯函数（任务要求第六节）。
 * getCounterpart：查对侧映射；validateMapping：双向互逆校验（测试用）。
 */
import { MAPPING } from '../data';
import type { LayerMapping, LayerStack } from '../types';

/** 从层 id 推断其所属堆叠（id 约定：'osi-*' / 'tcpip-*'）。 */
export function stackOf(layerId: string): LayerStack | null {
  if (layerId.startsWith('osi-')) return 'osi';
  if (layerId.startsWith('tcpip-')) return 'tcpip';
  return null;
}

/**
 * 查询某层在对侧堆叠中的映射层 id 集合。
 * @param stack  调用方所在堆叠（'osi' | 'tcpip'）
 * @param layerId 层 id（如 'osi-6' / 'tcpip-4'）
 * @returns 对侧层 id 数组；id 与堆叠不符或无映射时返回空数组。
 */
export function getCounterpart(stack: LayerStack, layerId: string): string[] {
  if (stackOf(layerId) !== stack) {
    return [];
  }
  return MAPPING[layerId] ?? [];
}

/**
 * MAPPING 双向一致性校验：每条映射 a → b 必须能在反向 b → a 中找到 a。
 * @param mapping 待校验映射表（默认校验 data.ts 的 MAPPING，便于测试注入）
 * @returns 全部互逆返回 true，否则 false。
 */
export function validateMapping(mapping: LayerMapping = MAPPING): boolean {
  for (const [id, targets] of Object.entries(mapping)) {
    for (const target of targets) {
      const back = mapping[target];
      if (!back || !back.includes(id)) {
        return false;
      }
    }
  }
  return true;
}
