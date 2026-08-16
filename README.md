# PromptLint — Vibe Coding 提示词规范检测工具

PromptLint 是一个面向开发团队的 Vibe Coding 提示词质量检查工具。开发者可以粘贴准备交给 AI 编程助手的提示词，网站会检查提示词是否完整、是否存在模糊表达，并生成结构更清晰、可执行、可验收的优化版本。

## 在线访问

- Cloudflare Workers：<https://promptlint-vibe-checker-cn.dophucloan878.workers.dev>
- Vercel：<https://promptlint-vibe-checker-a7qz.vercel.app>

> `workers.dev` 和 `vercel.app` 在部分网络环境下可能受到限制。团队正式使用时，建议绑定自己的域名。

## 项目用途

PromptLint 用于在 AI 开始写代码之前检查开发提示词，减少因为需求不清楚而产生的返工。工具主要检查以下五个方面：

| 检查项 | 说明 |
| --- | --- |
| 目标 | 是否明确说明要实现或修改什么 |
| 约束 | 是否说明技术栈、依赖、代码风格和改动范围 |
| 输入 | 是否提供数据结构、参数、上下文或问题现象 |
| 输出 | 是否明确需要完整代码、局部 Diff、说明文档或执行步骤 |
| 验收标准 | 是否提供可观察、可复现、可测试的完成条件 |

检测完成后，工具会提供：

- 0–100 分的提示词规范评分；
- 缺失信息和模糊表达定位；
- 每个问题对应的修改建议；
- 按照“目标、约束、输入、输出、验收标准”整理的优化提示词；
- 一键复制优化结果。

检测逻辑在浏览器本地运行，不需要配置 AI API Key，也不会主动把输入的提示词发送到第三方模型服务。

规则参考：[菜鸟教程 — Vibe Coding 提示词编写规范](https://www.runoob.com/vibe-coding/vibe-coding-prompt.html)

## 技术栈

- React 19
- Next.js 16 App Router
- TypeScript
- Vinext / Vite
- Cloudflare Workers
- Vercel

## 本地部署

### 1. 安装环境

请先安装：

- [Git](https://git-scm.com/downloads)
- [Node.js](https://nodejs.org/) `22.13.0` 或更高版本

确认安装成功：

```bash
git --version
node --version
npm --version
```

### 2. 克隆项目

```bash
git clone https://github.com/dophucloan878-design/promptlint-vibe-checker.git
cd promptlint-vibe-checker
```

### 3. 安装依赖

推荐使用锁定版本安装：

```bash
npm ci
```

### 4. 启动开发环境

```bash
npm run dev
```

浏览器打开：<http://localhost:3000>

修改 `app/` 目录中的代码后，开发页面会自动刷新。

### 5. 本地生产构建

```bash
npm run build
npm run start
```

## 部署到 Cloudflare Workers

项目已经包含 `wrangler.jsonc` 和 Cloudflare Workers 构建配置。部署到自己的 Cloudflare 账户前，请把 `wrangler.jsonc` 中的 `account_id` 和 Worker 名称改成自己的配置。

首次部署需要登录 Cloudflare：

```bash
npx wrangler login
```

登录完成后部署：

```bash
npm run deploy:cloudflare
```

部署成功后，终端会返回一个可公开访问的 `workers.dev` 地址。

## 部署到 Vercel

1. 登录 [Vercel](https://vercel.com/)；
2. 选择 **Add New → Project**；
3. 导入 GitHub 仓库 `dophucloan878-design/promptlint-vibe-checker`；
4. 保持项目中的 `vercel.json` 配置并点击 **Deploy**；
5. 部署完成后可以继续绑定自己的域名。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm run build` | 生成生产构建 |
| `npm run start` | 启动本地生产服务器 |
| `npm run lint` | 检查代码规范 |
| `npm run deploy:cloudflare` | 部署到 Cloudflare Workers |

## 项目目录

```text
app/                 页面、布局和样式
public/              图标等静态资源
worker/              Cloudflare Worker 入口
tests/               项目测试
vite.config.ts       Vinext 与 Cloudflare 构建配置
wrangler.jsonc       Cloudflare Workers 部署配置
vercel.json          Vercel 部署配置
```

## GitHub Pages 说明

本项目是 Next.js/Vinext 应用，不能直接把源代码发布到 GitHub Pages。GitHub 用于保存和协作开发代码；网站运行请使用本地 Node.js、Cloudflare Workers、Vercel，或者其他支持 Next.js 的托管平台。
