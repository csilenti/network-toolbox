import { BrandLogo, ChevronIcon, DotIcon } from '../icons';
import type { ToolDefinition } from '../tools/registry';

export interface SidebarProps {
  tools: ToolDefinition[];
  activeToolId: string;
  collapsed: boolean;
  drawerOpen: boolean;
  onSelectTool: (id: string) => void;
  onToggleCollapse: () => void;
  onCloseDrawer: () => void;
}

/** 「更多工具开发中…」的纯视觉占位项（不可点击、不注册假数据）。 */
const PLACEHOLDER_NAMES = ['端口连通性演示', '子网速查卡'];

/**
 * 左侧边栏：项目品牌 + 由 registry 配置驱动的工具列表 +
 * 「更多工具开发中…」占位分组 + 折叠按钮。
 * 桌面端 240px 可折叠为 68px 图标栏；窄屏（≤ 900px）由 CSS 切换为抽屉。
 */
export function Sidebar({
  tools,
  activeToolId,
  collapsed,
  drawerOpen,
  onSelectTool,
  onToggleCollapse,
  onCloseDrawer,
}: SidebarProps) {
  const classes = [
    'sidebar',
    collapsed ? 'is-collapsed' : '',
    drawerOpen ? 'is-open' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes} aria-label="工具导航">
      <div className="sidebar-brand">
        <span className="sidebar-logo">
          <BrandLogo size={collapsed ? 26 : 30} />
        </span>
        <span className="sidebar-brand-text">
          <span className="sidebar-title">辅助工具台</span>
          <span className="sidebar-subtitle">NETWORK TOOLBOX</span>
        </span>
      </div>

      <p className="sidebar-section-label">工具箱</p>
      <nav className="sidebar-nav" aria-label="工具列表">
        {tools.map((tool) => {
          const Icon = tool.icon;
          const active = tool.id === activeToolId;
          return (
            <button
              key={tool.id}
              type="button"
              className={`tool-item ${active ? 'is-active' : ''}`}
              onClick={() => onSelectTool(tool.id)}
              title={tool.name}
              aria-current={active ? 'page' : undefined}
            >
              <span className="tool-item-icon">
                <Icon size={20} />
              </span>
              <span className="tool-item-text">
                <span className="tool-item-name">{tool.name}</span>
                <span className="tool-item-desc">{tool.description}</span>
              </span>
            </button>
          );
        })}
      </nav>

      <p className="sidebar-section-label">更多工具开发中…</p>
      <div className="sidebar-nav sidebar-nav--placeholder" aria-hidden="true">
        {PLACEHOLDER_NAMES.map((name) => (
          <div key={name} className="tool-item is-placeholder">
            <span className="tool-item-icon">
              <DotIcon size={20} />
            </span>
            <span className="tool-item-text">
              <span className="tool-item-name">{name}</span>
              <span className="tool-item-desc">规划中</span>
            </span>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="sidebar-collapse"
        onClick={onToggleCollapse}
        aria-label={collapsed ? '展开侧边栏' : '折叠侧边栏'}
        aria-expanded={!collapsed}
      >
        <span className={`sidebar-collapse-icon ${collapsed ? 'is-flipped' : ''}`}>
          <ChevronIcon size={17} />
        </span>
        <span className="sidebar-collapse-text">收起</span>
      </button>

      {/* 移动端抽屉遮罩（由 CSS 控制显示，桌面端永远隐藏） */}
      <button
        type="button"
        className="sidebar-close"
        onClick={onCloseDrawer}
        aria-label="关闭菜单"
      >
        ×
      </button>
    </aside>
  );
}
