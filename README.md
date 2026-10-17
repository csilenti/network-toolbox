# 辅助工具台 · Network Toolbox

面向计算机网络学习场景的「辅助工具台」Web 应用框架。当前内置七个工具：

- **IP 划分演示**——通过二进制可视化、分步推导、树状图与结果联动，帮助学习者直观理解 IP 地址中的网络号、主机号与子网划分（借位）过程。
- **TCP 连接演示**——「可亲手操作的 TCP 协议动画实验室」：以结构化状态机驱动数据包飞行动画，配合趣味对话与真实报文字段双栏对照，完整演示三次握手 → 数据传输 → 四次挥手 → TIME_WAIT 的 TCP 连接生命周期。
- **DNS 域名解析演示**——「DNS 域名解析实验室」：输入域名后以动画完整呈现 浏览器缓存 → 操作系统缓存 → 递归 DNS → 根 DNS → 顶级域 DNS → 权威 DNS 的逐级查询与返回，明确区分递归查询与迭代查询，支持缓存命中（Cache HIT）与 TTL 倒计时模拟。
- **路由匹配演示**——「数据包一跳一跳往下问，问到最后才知道走哪条路」：数据包卡片沿路由表逐条飞行比对（AND 运算实时展示），✓ 命中 / ✗ 未命中累积高亮，最终最长前缀胜出并交付；支持单步 / 自动播放 / 速度 0.5×~4×。
- **子网掩码计算器**——掩码与 CIDR 的双向换算速查工具：输入 IP + 掩码/前缀即时得到网络地址、广播地址、可用主机范围、通配符掩码、地址类别等信息，附 32 bit 二进制位条与分步 AND 运算过程，精确处理 /31、/32、/0 边界特例。
- **网络单位换算**——带宽、数据大小与下载时间三类换算：Mbps ⇄ MB/s（比特/字节 8 倍关系）、KB/MB/GB 十进制与 KiB/MiB/GiB 二进制严格区分交叉换算、文件大小 + 带宽 → 理论下载时间，附换算关系链与「百兆宽带为什么只有 12.5 MB/s」等教学卡。
- **路由表分析**——「最长前缀匹配不是背出来的规则，是一条一条比出来的结果」：输入目的 IP，逐条展示路由表的匹配判定（✓匹配 / ✗不匹配 / 🏆选中），完整呈现 匹配筛选 → 最长前缀 → metric 决胜 三级决策，支持路由条目增删改与恢复默认。

## 功能特性

**IP 划分演示**
- 前缀（/24）与子网掩码（255.255.255.0）双向联动，支持「按子网数量」与「按每子网主机数」两种划分模式
- 32 bit 逐位可视化：网络号 / 子网号 / 主机号三色语义标注，前缀变化时呈现**借位动画**
- Step-by-Step 计算过程逐步推导（为什么借 2 bit、为什么 /24 变 /26、为什么可用主机是 2^n − 2）
- 子网树状图与结果总览表双向联动高亮，点击节点查看网络地址 / 可用范围 / 广播地址 / 容量可视化
- 全部错误输入均给出教学化中文解释（主机位不足、非法掩码、非网络地址自动归一化等）

**TCP 连接演示**
- 完整生命周期 11 步状态机：三次握手（SYN → SYN+ACK → ACK）→ 连接建立 → 数据传输（DATA/ACK）→ 四次挥手（FIN → ACK → FIN → ACK）→ TIME_WAIT → CLOSED
- 协议逻辑严格准确：SYN/FIN 消耗一个序列号、纯 ACK 不消耗，Seq/Ack 动态变化实时可查（如 SYN Seq=1000 → 对端 Ack=1001）
- 双栏「人话 ↔ 报文」对照：上层趣味对话（“你好，我想和你建立 TCP 连接。”），下层真实 TCP Flags / Seq / Ack / 端口 / 窗口字段，明确区分比喻与协议
- A / B 双端 TCP 状态链可视化（CLOSED→SYN-SENT→ESTABLISHED→…→TIME-WAIT / LISTEN→SYN-RECEIVED→…→LAST-ACK），当前状态高亮
- 播放控制：自动播放 / 暂停 / 单步 / 上一步 / 重置，速度 0.5×~2× 可调；时间轴点击任意步骤直接跳转
- 「当前发生了什么」逐步解释 + 知识卡片（为什么三次握手四次挥手、TIME_WAIT 是什么）
- 学习模式 / 协议模式双视角，共用同一底层状态机

**DNS 域名解析演示**
- 完整解析链路状态机：输入域名 → 浏览器缓存 → 操作系统缓存 → 客户端→递归 DNS（递归查询）→ 递归逐级追问 根 / 顶级域 / 权威 DNS（迭代查询）→ ANSWER 返回 → 写入缓存
- 递归查询 vs 迭代查询双徽标可视化区分：客户端只向递归服务器发一次请求，各级追问由递归服务器自己完成
- DNS Query / Response / Referral / ANSWER 四种报文卡片沿查询路径飞行（方向与配色区分），点击查看 Transaction ID、Flags（0x0100 / 0x8180）、QNAME、QTYPE、QCLASS、TTL 等字段
- 模拟 DNS 缓存：第二次解析同域名直接命中（⚡ Cache HIT），链路大幅缩短；TTL 3600s 倒计时支持 1× / 10× / 100× 时间加速，归零 Cache Expired 后恢复完整链路
- 域名输入校验 + 预置演示库（www.example.com → 93.184.216.34 等）+ 未收录域名确定性兜底生成教学 IP
- DNS Record Explorer：A / AAAA / CNAME / MX / NS 五种记录类型示例与解释
- 查询路径节点三态（✓ 已完成 / ● 查询中呼吸高亮 / ○ 未访问）+ 可点击跳转的解析时间轴 + 播放控制（速度 0.5×~4×）

**子网掩码计算器**
- 掩码 ⇄ CIDR 双向换算：任一侧输入另一侧实时联动，非法掩码（二进制位不连续，如 255.0.255.0）报错并给出「您可能想要」的最近似合法掩码一键建议
- 输入 IP + 掩码/前缀即时计算：网络地址、广播地址、总地址数、可用主机数与范围、通配符掩码（Wildcard）、地址类别（A/B/C/D/E）、RFC1918 私有地址与回环标记
- 边界特例精确处理：/31（RFC 3021 点对点，可用 2）、/32（单主机路由，可用 1）、/0（0.0.0.0 掩码，可用 2³²−2），均附 💡 说明卡
- 32 bit 二进制位条三色可视化（网络位/主机位）+ 分步 AND 运算过程逐步展示
- 计算层为纯函数（无符号 32 位位运算），配套 vitest 单元测试 68 个用例：正常输入、边界值（/31 /32 /0 /1 /30）、非法输入（位不连续掩码、越界前缀、非法 IP）、0~32 全前缀往返一致性

**网络单位换算**
- 三大换算类别：带宽/速率（bps/Kbps/Mbps/Gbps/Tbps ⇄ B/s/KB/s/MB/s/GB/s，固定 8 倍比特字节关系）、数据大小（B~TB 十进制 1000 进制 ⇄ KiB~TiB 二进制 1024 进制同场交叉换算）、下载时间估算（文件大小 + 带宽 → 人性化时长）
- 换算结果网格 + 换算关系链展示中间步骤（如 Mbps → b/s → B/s → MB/s）
- 教学卡直击易错点：「百兆宽带的理论下载峰值 12.5 MB/s」「1 MB ≠ 1 MiB（差约 4.9%）」「1TB 硬盘为何显示约 931 GiB」
- 严格输入校验：负数、非法字符、十六进制/科学计数法等超范围表示、数值溢出均有精确中文提示；全链路无 NaN/Infinity 渲染
- 计算层为纯函数（经基准精确整数比值换算，无浮点累积），配套 vitest 单元测试 84 个用例：常规精确值、边界与错误全场景、时长分级格式化、全单位对 NaN/Infinity 扫描

**路由表分析**
- 可编辑教学路由表：预设 6 条经典条目（默认路由 / 直连 / 静态 / OSPF），支持增删改、归一化提示与一键恢复默认
- 输入目的 IP 即时逐条判定：✓ 匹配·前缀 N / ✗ 不匹配（含 AND 结果与网络地址对比原因）/ 🏆 选中，实时徽标随输入变化
- 三级决策完整可视化：匹配筛选 → 最长前缀 → metric 决胜（同前缀同 metric 标「等价路由」教学提示）
- 胜出路由转发详情卡（直连交付 / 下一跳）+ 掩码 AND 比对逐步展示
- 边界场景精确覆盖：0.0.0.0/0 默认路由兜底一切地址、/32 主机路由必优先、删除默认路由后「目的网络不可达」教学提示
- 匹配层为纯函数（无符号 32 位位运算），配套 vitest 单元测试 43 个用例：常规查询、/32 与默认路由边界、metric 决胜与等价路由、非法输入、地址归一化

**路由匹配演示**
- 数据包卡片沿路由表逐条飞行比对，AND 运算式实时展示在条目行内——「数据包一跳一跳往下问，问到最后才知道走哪条路」
- 判定徽标累积高亮：✓ 命中·前缀 N / ✗ 未命中（灰化并给出比对值差异）/ 候选集 / 🏆 最长前缀胜出脉冲
- 11 步状态机：到达 → 逐条比对 ×6 → 决赛圈 → 最长前缀胜出 → 转发交付（直连/下一跳）→ 完成总结
- 播放控制与 TCP / DNS 演示同款：单步 / 自动播放 / 暂停 / 上一步 / 重置 / 速度 0.5×~4×，单一 stepIndex 状态源驱动
- 目的 IP 输入校验 + 预设 IP 快捷按钮，判定逻辑只读复用路由表分析的预设表与位运算实现
- 计算层为纯函数，配套 vitest 单元测试 38 个用例：步骤结构、4 个预设 IP 判定、逐步映射与一次性查询全量一致性、错误处理

**平台能力**
- 工具注册表驱动：新增工具只需「新建模块 + 一行注册」，侧边栏与路由自动接入
- 响应式布局（桌面三栏 / 平板折叠 / 移动端抽屉），`prefers-reduced-motion` 动效降级，正文对比度 ≥ 4.5:1

## 截图

> 待补充：`docs/screenshot-ip-subnet.png`（建议截取默认演示页：192.168.1.0/24 划分 4 个子网的完整视图）
> 待补充：`docs/screenshot-tcp-lab.png`（建议截取三次握手进行到第 2 步的视图：飞行中的 SYN+ACK 数据包 + 双端状态高亮）
> 待补充：`docs/screenshot-dns-lab.png`（建议截取迭代查询进行中的视图：Referral 响应包飞向递归 DNS + 路径节点三态高亮）
> 待补充：`docs/screenshot-mask-calc.png`（建议截取默认演示页：/24 双向换算 + 32 bit 位条 + 完整结果卡）

## 技术栈

- Vite 5 + React 18 + TypeScript（strict）
- 手写 CSS（CSS 变量 design tokens，不使用 UI 框架）
- 字体：IBM Plex Mono / IBM Plex Sans（Google Fonts，`display=swap`），中文回退 Noto Sans SC 系统字体
- 图标全部为内联 SVG，动画仅使用 CSS transition/keyframes + React state

## 快速开始

```bash
npm install       # 安装依赖（如网络慢可切换 npmmirror 镜像）
npm run dev       # 本地开发，默认 http://localhost:5173
npm run test      # 运行单元测试（vitest，子网掩码计算器计算层）
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
    ├── ip-subnet/
    │   ├── IPSubnetTool.tsx    # 工具容器：状态提升（参数 + selectedId + 联动滚动）
    │   ├── ip-subnet.css       # 工具专属样式
    │   ├── components/         # InputPanel / BinaryVisualizer / CalculationSteps
    │   │                       # SubnetTree / SubnetDetail / ResultTable / ErrorNotice
    │   └── utils/              # ip.ts / subnet.ts（纯函数算法层）/ motion.ts
    └── tcp-lab/
        ├── TCPLabTool.tsx      # 工具容器：stepIndex / playing / speed / mode 状态
        ├── steps.ts            # 核心：11 步 TCP 生命周期状态机（唯一数据源）
        ├── types.ts            # TcpStep / TcpPacket / 状态链等类型定义
        ├── tcp-lab.css         # 工具专属样式（全 tokens 变量引用）
        └── components/         # SequenceDiagram（数据包动画）/ StateTracker（双端状态链）
                                # StepExplanation / PacketInspector / Timeline
                                # Controls（播放控制 + 双模式）/ WhyCards（知识卡片）
    ├── dns-lab/
        ├── DnsLabTool.tsx      # 工具容器：stepIndex / playing / speed / mode / 缓存与 TTL 状态
        ├── steps.ts            # 核心：buildSteps 纯函数，按域名与缓存状态动态生成步骤
        ├── types.ts            # DnsRecord / DnsServer / DnsPacket / DnsStep 等类型定义
        ├── data.ts             # 模拟数据层：节点拓扑 / 预置解析库 / 记录类型解释 / 域名校验
        ├── dns-lab.css         # 工具专属样式（全 tokens 变量引用）
        └── components/         # QueryPath（查询路径动画）/ StepExplanation / PacketInspector
                                # Timeline / RecordExplorer / CachePanel / Controls
                                # WhyCards / ResultCard（最终解析结果）
    ├── route-match-demo/
        ├── RouteMatchDemoTool.tsx # 工具容器：stepIndex / playing / speed 单一状态源
        ├── types.ts               # DemoStep / RouteVisualState 类型定义
        ├── utils/demo.ts          # 核心：buildDemoSteps（11 步）/ computeRouteStates（徽标映射）
        ├── utils/demo.test.ts     # vitest 单元测试（38 用例：结构/判定/映射一致性/错误）
        ├── route-match-demo.css   # 工具专属样式（全 tokens 变量引用）
        └── components/            # DemoTable（数据包飞行 + 判定徽标）/ StepExplanation
                                   # WinnerCard（胜出详情）/ Controls（播放控制）
    ├── mask-calc/
        ├── MaskCalcTool.tsx    # 工具容器：输入即算（useMemo 纯函数驱动）
        ├── types.ts            # MaskInfo / SubnetInfo / 错误类型定义
        ├── utils/mask.ts       # 核心：掩码校验 / 双向换算 / 网段计算（无符号 32 位位运算）
        ├── utils/steps.ts      # 分步 AND 计算过程生成
        ├── utils/mask.test.ts  # vitest 单元测试（68 用例：正常/边界/非法/往返一致性）
        ├── mask-calc.css       # 工具专属样式（全 tokens 变量引用）
        └── components/         # InputPanel（双向联动输入）/ BinaryBar（32 bit 位条）
                                # ResultCard（网段信息卡 + 特例说明）/ CalculationSteps
    ├── unit-calc/
        ├── UnitCalcTool.tsx    # 工具容器：三类别切换，输入即算
        ├── types.ts            # UnitCategory / UnitDef / ParseResult 类型定义
        ├── utils/units.ts      # 核心：单位表 / 严格数值解析 / 基准换算 / 下载时间估算 / 格式化
        ├── utils/convert.test.ts # vitest 单元测试（84 用例：精确值/边界错误/格式化/NaN 扫描）
        ├── unit-calc.css       # 工具专属样式（全 tokens 变量引用）
        └── components/         # CategoryTabs / InputPanel / ResultGrid
                                # ConversionChain（换算关系链）/ TeachingCard
    └── route-analysis/
        ├── RouteAnalysisTool.tsx # 工具容器：路由表状态可编辑，查询输入即算
        ├── types.ts              # RouteEntry / MatchStep / QueryResult 类型定义
        ├── utils/route.ts        # 核心：条目解析归一化 / 三级匹配判定（无符号位运算）/ 分步数据
        ├── utils/route.test.ts   # vitest 单元测试（43 用例：常规/边界/非法/归一化）
        ├── route-analysis.css    # 工具专属样式（全 tokens 变量引用）
        └── components/           # QueryInput / RouteTable（实时判定徽标）
                                  # WinnerCard（转发详情/不可达）/ MatchSteps（AND 逐步比对）
```

## 核心设计

- **语义三色系统**：网络号 = 深青（teal）、子网号 = 琥珀（amber）、主机号 = 灰紫，贯穿二进制格子、步骤说明、树状图与详情面板。
- **借位动画**：前缀变化时，被借用的 bit 格子以 CSS transition 平滑换色并伴随位移脉冲；`prefers-reduced-motion` 下全部动效自动关闭。
- **双向联动**：结果表与树状图共享 `selectedId`，点击任一侧，另一侧高亮并滚动到可视区（使用 `scrollTop/scrollLeft` 计算，不使用 `scrollIntoView`）。
- **教学化错误**：无法划分时（主机位不足 / 超出教学上限等）返回结构化错误并渲染带关键数字的中文解释，而非裸 Error。
- **状态机驱动动画**（TCP / DNS 工具）：完整流程抽象为结构化步骤数组（纯函数生成），自动播放、单步、时间轴跳转共用同一 `stepIndex` 状态源，动画仅为渲染层 CSS——无 setTimeout 嵌套，未来可无痛扩展新场景（TCP 重传 / 丢包、DNS CNAME 链 / NXDOMAIN 等）。

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
- [x] TCP 连接演示：三次握手与四次挥手动画实验室（当前版本）
- [x] DNS 域名解析演示：递归查询与缓存命中全过程动画（当前版本）
- [x] 子网掩码计算：掩码与 CIDR 双向换算及网段信息速查（当前版本）
- [x] 网络单位换算：带宽、数据大小与下载时间换算（当前版本）
- [x] 路由表分析：最长前缀匹配过程可视化分析（当前版本）
- [x] 路由匹配演示：数据包逐条匹配过程动画（当前版本）
- [ ] 进制转换
- [ ] TCP 扩展场景：丢包模拟 / 重传 / 滑动窗口
- [ ] DNS 扩展场景：CNAME 链 / NXDOMAIN / DNS over HTTPS
- [ ] OSI / TCP-IP 模型可视化

## 贡献

欢迎通过 Issue / Pull Request 贡献新工具或改进。提交信息请遵循 Conventional Commits 规范（`feat:` / `fix:` / `docs:` / `chore:` 等英文标识 + 冒号 + 空格 + 描述），新功能请在独立分支上开发后通过 Pull Request 合入主分支。

## 开源协议

本项目基于 [MIT License](./LICENSE) 开源。
