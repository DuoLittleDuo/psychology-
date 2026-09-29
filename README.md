# 同频 Same Wavelength

> AI 心理陪伴系统 · 多智能体（Multi-Agent）联邦架构

「同频」是一个面向穿戴设备的心理健康陪伴 Agent。它不等用户主动开口，而是先感知状态、再判断"该不该出现"，最后由安全规则决定是否介入——核心目标是**低打扰、可解释、不过度推断**。

---

## 快速开始

需要 **Node.js 18+**。

```bash
npm install      # 安装依赖
npm run dev      # 同时启动后端引擎 API(3001) 与前端面板(5173)
```

启动后浏览器打开 **http://localhost:5173**。

> `npm run dev` 会自动拉起两个进程：
> - **后端引擎** `server/engine-server.ts`（Express，端口 3001）
> - **前端面板** Vite（端口 5173，已将 `/api` 代理到 3001）

### 其他命令

| 命令 | 说明 |
|---|---|
| `npm run dev` | 前后端一起启动（推荐） |
| `npm run server` | 只启动后端引擎 API |
| `npm run build` | 生产构建（先 `tsc -b` 再 `vite build`） |
| `npm run preview` | 预览生产构建产物 |

---

## 目录结构

```
├── src/                    前端面板（React + TypeScript）
│   ├── pages/              各页面：开场页、系统总览、跨端流转、危机响应等
│   ├── components/         复用组件
│   ├── engine/             前端与后端引擎的通信桥（GodModeBridge）
│   └── lib/                工具与主题令牌
│
├── server/
│   ├── engine-server.ts    后端引擎 API（Express）
│   ├── start.js            前后端一键启动脚本
│   └── engine/             ★ 六大 Agent 联邦核心引擎（TypeScript）
│       ├── perception/     感知层：4 通道 + SnapshotBuilder
│       ├── memory/         记忆层：三层记忆 + 巩固 + 召回
│       ├── decision/       决策层：L1 九宫格 + L2 深度规划
│       ├── execution/      执行层：卡片类型 + 设备类型
│       ├── reflection/     反思层：质量评估 + 自动调优
│       ├── safety/         安全层：四级危机响应 + 护栏 + 隐私
│       ├── god_mode/       上帝模式：模拟数据 + 状态覆盖 + 基准测试
│       └── tests/          测试与演示脚本
│
├── scripts/
│   └── vendor-engine.mjs   把引擎源码同步到 server/engine/ 的工具
└── public/                 静态资源
```

> **关于 `server/engine/`**：六大 Agent 的核心引擎源码已内联在本仓库中，**无需任何外部路径即可运行**。

---

## 核心引擎 API

后端在 `http://localhost:3001` 暴露以下接口：

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 健康检查，返回引擎状态与快照数 |
| GET | `/api/dashboard` | 上帝模式完整面板数据 |
| GET | `/api/sim/snapshot/:index` | 获取指定时刻的状态快照 |
| POST | `/api/sim/init` | 初始化 / 重置模拟 |
| POST | `/api/decision/l1` | L1 九宫格决策 |
| POST | `/api/safety/scan` | 对话安全扫描 |

引擎初始化时会预生成 **24 个模拟快照**（对应「小林 3 天情绪持续下滑」场景），覆盖从正常到持续恶化的完整链路。

---

## 页面导航

前端使用 HashRouter：

| 路由 | 页面 |
|---|---|
| `#/` | 产品开场页 |
| `#/app` | 设备监测台（默认入口） |
| `#/app/system-overview` | 系统总览（五大能力分屏演示） |
| `#/app/system-overview?section=agent-guide` | Agent 运作说明 |
| `#/app/system-overview?section=architecture` | Agent 架构 |
| `#/app/system-overview?section=crisis` | 安全响应（四级危机升级链） |
| `#/app/cross-device` | 跨端流转演示 |

---

## 技术栈

| 层级 | 技术 |
|---|---|
| 前端 | React 19 · TypeScript · Vite 6 · Tailwind CSS 4 |
| 动效 | Framer Motion · GSAP |
| 后端 | Node.js · Express 5 · tsx（直接运行 TypeScript） |
| 引擎 | 纯 TypeScript，无外部运行时依赖 |

---

## 设计要点

- **先判断要不要出现，再决定怎么出现** —— L1 九宫格以「情绪 × 社交意愿」两轴决定是否介入与介入强度，避免把每次情绪波动都处理成打扰。
- **安全层独立常驻并可在危机时刻接管** —— Safety Agent 独立于其它 Agent 运行，命中危机关键词时激活四级危机响应协议并进入安全接管状态，接管状态会实时反映在运行总览中。
- **记忆只补充背景，不替代当下** —— 长期偏好用于克制打扰（如 21:00 后不推送），不用于推断用户当下状态。
- **端侧隐私优先** —— 健康背景、状态趋势与对话内容优先本地处理，系统只传递完成当前判断所需的摘要。
