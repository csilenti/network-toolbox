# 辅助工具台 · Network Toolbox

面向计算机网络学习场景的「辅助工具台」Web 应用框架。当前内置一个工具：**IP 划分演示**——通过二进制可视化、分步推导、树状图与结果联动，帮助学习者直观理解 IP 地址中的网络号、主机号与子网划分（借位）过程。

## 功能特性

**IP 划分演示**
- 前缀（/24）与子网掩码（255.255.255.0）双向联动，支持「按子网数量」与「按每子网主机数」两种划分模式
- 32 bit 逐位可视化：网络号 / 子网号 / 主机号三色语义标注，前缀变化时呈现**借位动画**
- Step-by-Step 计算过程逐步推导（为什么借 2 bit、为什么 /24 变 /26、为什么可用主机是 2^n − 2）
- 子网树状图与结果总览表双向联动高亮，点击节点查看网络地址 / 可用范围 / 广播地址 / 容量可视化
- 全部错误输入均给出教学化中文解释（主机位不足、非法掩码、非网络地址自动归一化等）

**平台能力**
- 工具注册表驱动：新增工具只需「新建模块 + 一行注册」，侧边栏与路由自动接入
- 响应式布局（桌面三栏 / 平板折叠 / 移动端抽屉），`prefers-reduced-motion` 动效降级，正文对比度 ≥ 4.5:1

## 截图

> 待补充：`docs/screenshot-ip-subnet.png`（建议截取默认演示页：192.168.1.0/24 划分 4 个子网的完整视图）

## 技术栈

- Vite 5 + React 18 + TypeScript（strict）
- 手写 CSS（CSS 变量 design tokens，不使用 UI 框架）
- 字体：IBM Plex Mono / IBM Plex Sans（Google Fonts，`display=swap`），中文回退 Noto Sans SC 系统字体
- 图标全部为内联 SVG，动画仅使用 CSS transition/keyframes + React state

## 快速开始

```bash
npm install       # 安装依赖（如网络慢可切换 npmmirror 镜像）
npm run dev       # 本地开发，默认 http://localhost:5173
npm run build     # 类型检查（tsc --noEmit）+ 生产构建
npm run preview   # 预览生产构建产物
```

## 目录结构

```
src/
├── main.tsx / App.tsx          # 入口与工具路由（按注册表渲染）
├── icons.tsx                   # 全站通用内联 SVG 图标
├── styles/
│   ├── tokens.css              # 颜色 / 字阶 / 间距 / 圆角 / 阴影 / 动效变量
│   ├── base.css                # 重置 / 排版 / 焦点 / 氛围层 / 动效降级
│   └── layout.css              # 应用外壳 / 侧边栏 / 响应式断点
├── layout/
│   ├── AppLayout.tsx           # Sidebar + 工作区（窄屏抽屉化）
│   └── Sidebar.tsx             # 注册表驱动的工具导航
└── tools/
    ├── registry.ts             # 工具注册表（唯一注册入口）
    └── ip-subnet/
        ├── IPSubnetTool.tsx    # 工具容器：状态提升（参数 + selectedId + 联动滚动）
        ├── ip-subnet.css       # 工具专属样式
        ├── components/         # InputPanel / BinaryVisualizer / CalculationSteps
        │                       # SubnetTree / SubnetDetail / ResultTable / ErrorNotice
        └── utils/              # ip.ts / subnet.ts（纯函数算法层）/ motion.ts
```

## 核心设计

- **语义三色系统**：网络号 = 深青（teal）、子网号 = 琥珀（amber）、主机号 = 灰紫，贯穿二进制格子、步骤说明、树状图与详情面板。
- **借位动画**：前缀变化时，被借用的 bit 格子以 CSS transition 平滑换色并伴随位移脉冲；`prefers-reduced-motion` 下全部动效自动关闭。
- **双向联动**：结果表与树状图共享 `selectedId`，点击任一侧，另一侧高亮并滚动到可视区（使用 `scrollTop/scrollLeft` 计算，不使用 `scrollIntoView`）。
- **教学化错误**：无法划分时（主机位不足 / 超出教学上限等）返回结构化错误并渲染带关键数字的中文解释，而非裸 Error。

## 如何新增一个工具（三步）

1. 在 `src/tools/` 下新建目录，实现工具组件（默认导出，内部自行组织状态）与一个内联 SVG 图标组件；
2. 在 `src/tools/registry.ts` 的 `toolRegistry` 数组中注册：
   ```ts
   {
     id: 'my-tool',            // 全局唯一
     name: '工具名称',
     description: '一句话描述',
     icon: MyToolIcon,
     component: MyTool,
   }
   ```
3. 完成——侧边栏与工作区会自动渲染新工具，无需改动任何布局代码。

## 路线图

- [x] IP 划分演示（当前版本）
- [ ] 子网掩码计算
- [ ] 进制转换
- [ ] TCP 三次握手演示
- [ ] 路由表分析
- [ ] OSI / TCP-IP 模型可视化

## 贡献

欢迎通过 Issue / Pull Request 贡献新工具或改进。提交信息请遵循 [GIT-GUIDE.md](./GIT-GUIDE.md) 中的 Conventional Commits 规范，新功能请在独立分支上开发后合入主分支。

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。
