# Cosmic Echo - Cloudflare 部署指南

## 改造完成内容

### ✅ 已移除的依赖
- `@eazo/sdk` — 完全移除
- `postgres` — 不再需要（demo 模式使用内存存储）

### ✅ 已替换的功能
| 原功能 | 替换方案 |
|--------|----------|
| `@eazo/sdk` 认证 | Demo 模式常开，无需认证 |
| `@eazo/sdk` AI 调用 | 通用 OpenAI 兼容接口 (`src/lib/ai.ts`) |
| `@eazo/sdk` 通知 | 暂不可用（返回 501） |
| Eazo SDK 特定功能 | 已全部移除 |

### ✅ 构建状态
- `next build` ✅ 构建成功（22 个路由全部编译通过）

---

## Cloudflare 部署方案

### ⚠️ 重要说明：Windows 兼容性问题

OpenNext（`@opennextjs/cloudflare`）官方明确警告：
> "OpenNext is not fully compatible with Windows."
> 推荐使用 **WSL** (Windows Subsystem for Linux)

在 Windows 上直接运行 `opennextjs-cloudflare build` 会遇到路径编码问题。

### 方案 A：使用 WSL 构建（推荐）

1. 安装 WSL（如果尚未安装）：
   ```powershell
   wsl --install
   ```

2. 在 WSL 中进入项目目录（路径映射到 `/mnt/c/Users/...`）：
   ```bash
   cd /mnt/c/Users/Admin/Desktop/学习营第二期/cosmic-echo-demo
   npm install
   npx opennextjs-cloudflare build
   ```

3. 构建成功后部署：
   ```bash
   npx opennextjs-cloudflare deploy
   ```

### 方案 B：使用 GitHub Actions CI/CD（推荐用于生产）

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npx opennextjs-cloudflare build
      - run: npx opennextjs-cloudflare deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

### 方案 C：部署到任意 Node.js 主机（最简单）

由于 `DEMO_MODE=true`，应用可以在任何支持 Node.js 的主机上运行：

```bash
npm install
npm run build
npm start
```

支持的主机：
- Vercel（原生支持 Next.js 16，推荐）
- Railwy
- Render
- 任意 VPS（需自行配置 Node.js）

---

## 环境变量配置

在 Cloudflare Workers 设置中添加：

```
NEXT_PUBLIC_DEMO_MODE=true
NEXT_PUBLIC_APP_TITLE=Cosmic Echo
NEXT_PUBLIC_APP_DESCRIPTION=A gentle journaling companion with tarot insights
```

可选（启用 AI 功能）：
```
AI_API_KEY=sk-...        # OpenAI 或兼容接口密钥
AI_BASE_URL=https://api.openai.com/v1   # 可选，支持 OpenRouter/DeepSeek 等
AI_MODEL=gpt-4o              # 可选
```

---

## 文件变更清单

| 文件 | 变更 |
|------|------|
| `package.json` | 移除 `@eazo/sdk`，添加 `@opennextjs/cloudflare` |
| `next.config.ts` | 移除 `transpilePackages` |
| `wrangler.jsonc` | ✨ 新增，Cloudflare Workers 配置 |
| `open-next.config.ts` | ✨ 新增，OpenNext 配置 |
| `src/lib/ai.ts` | ✨ 新增，通用 AI 调用工具 |
| `src/lib/auth/index.ts` | 简化，移除 `@eazo/sdk/server` |
| `src/lib/api/request.ts` | 移除 `@eazo/sdk` 动态导入 |
| `src/components/user-profile/*.tsx` | 移除 `@eazo/sdk` 引用 |
| `src/components/i18n/locale-sync-effect.tsx` | 使用 `navigator.language` |
| `src/app/api/journal/*/route.ts` | 使用 `callAI()` 替代 `ai.chat()` |
| `src/app/api/notifications/*/route.ts` | 返回 501（暂不可用） |
