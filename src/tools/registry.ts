import type { ComponentType } from 'react';
import IPSubnetTool from './ip-subnet/IPSubnetTool';
import { IPSubnetIcon } from './ip-subnet/icon';
import TCPLabTool from './tcp-lab/TCPLabTool';
import { TcpLabIcon } from './tcp-lab/icon';

/**
 * 工具注册表 —— 新增工具的唯一入口。
 *
 * 添加一个新工具只需三步：
 *  1. 在 src/tools/ 下新建目录，实现工具组件（默认导出）与图标组件；
 *  2. 在下方数组中注册 { id, name, description, icon, component }；
 *  3. 完成。侧边栏与工作区将自动渲染新工具，无需改动任何布局代码。
 */
export interface ToolDefinition {
  /** 全局唯一 id，同时作为 URL 语义与 React key。 */
  id: string;
  /** 工具名（侧边栏与工作区标题使用）。 */
  name: string;
  /** 一句话描述（侧边栏折叠态以外的展示）。 */
  description: string;
  /** 内联 SVG 图标组件。 */
  icon: ComponentType<{ size?: number }>;
  /** 工具主组件（无 props）。 */
  component: ComponentType;
}

export const toolRegistry: ToolDefinition[] = [
  {
    id: 'ip-subnet',
    name: 'IP 划分演示',
    description: '网络号、主机号与子网划分可视化',
    icon: IPSubnetIcon,
    component: IPSubnetTool,
  },
  {
    id: 'tcp-lab',
    name: 'TCP 连接演示',
    description: '三次握手与四次挥手动画实验室',
    icon: TcpLabIcon,
    component: TCPLabTool,
  },
];
