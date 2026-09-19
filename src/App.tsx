import { useState } from 'react';
import { AppLayout } from './layout/AppLayout';
import { toolRegistry } from './tools/registry';

/**
 * 应用根组件：持有当前激活工具的 id，
 * 具体渲染交由 AppLayout（侧边栏 + 工作区）完成。
 * key 绑定工具 id，切换工具时重挂载，从而重放入场动画并复位工具内部状态。
 */
export default function App() {
  const [activeToolId, setActiveToolId] = useState<string>(toolRegistry[0]?.id ?? '');

  const activeTool =
    toolRegistry.find((tool) => tool.id === activeToolId) ?? toolRegistry[0];

  if (!activeTool) {
    return (
      <div className="app-shell app-shell--empty">
        <p>工具注册表为空，请检查 src/tools/registry.ts。</p>
      </div>
    );
  }

  const ActiveTool = activeTool.component;

  return (
    <AppLayout
      tools={toolRegistry}
      activeToolId={activeTool.id}
      onSelectTool={setActiveToolId}
    >
      <div className="tool-page" key={activeTool.id}>
        <ActiveTool />
      </div>
    </AppLayout>
  );
}
