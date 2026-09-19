import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { MenuIcon } from '../icons';
import type { ToolDefinition } from '../tools/registry';
import '../styles/layout.css';
export interface AppLayoutProps {
  tools: ToolDefinition[];
  activeToolId: string;
  onSelectTool: (id: string) => void;
  children: ReactNode;
}

/**
 * 应用布局：左侧 Sidebar + 右侧工作区。
 *  - 桌面端（> 900px）：侧边栏常驻，可折叠为图标栏；
 *  - 窄屏（≤ 900px）：侧边栏变为抽屉，由顶栏汉堡按钮控制。
 */
export function AppLayout({ tools, activeToolId, onSelectTool, children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState<boolean>(false);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  const handleSelectTool = (id: string) => {
    onSelectTool(id);
    setDrawerOpen(false);
  };

  return (
    <div className="app-shell">
      <Sidebar
        tools={tools}
        activeToolId={activeToolId}
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onSelectTool={handleSelectTool}
        onToggleCollapse={() => setCollapsed((v) => !v)}
        onCloseDrawer={() => setDrawerOpen(false)}
      />

      {drawerOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          onClick={() => setDrawerOpen(false)}
          aria-label="关闭菜单"
        />
      )}

      <div className="workspace">
        <header className="workspace-topbar">
          <button
            type="button"
            className="topbar-menu"
            onClick={() => setDrawerOpen(true)}
            aria-label="打开菜单"
            aria-expanded={drawerOpen}
          >
            <MenuIcon size={20} />
          </button>
          <span className="topbar-title">辅助工具台</span>
        </header>
        <main className="workspace-main" id="workspace-main">
          {children}
        </main>
      </div>
    </div>
  );
}
