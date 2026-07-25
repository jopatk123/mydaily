# MyDaily - 个人日记应用

一款简洁美观的个人日记应用，基于 FastAPI、React 和 Docker 构建。

## ⚡ 快速启动

```bash
# 使用 Docker（推荐，无需配置本地环境）
docker-compose up --build
```

访问 http://localhost:5555 即可使用应用。

---

## 功能特性

- 撰写并保存每日思绪
- 查看过往日记条目，按日期筛选
- 支持编辑、删除、置顶日记
- 一键导出全部日记（JSON 格式）
- 启动时密码保护，30 天本地有效期
- 待办事项面板（支持增删改查）
- 简洁、无干扰的界面
- 支持 Docker 容器化部署

### 技术栈

- 后端：Python 3.11+、FastAPI、SQLModel（SQLite）
- 前端：React 18、Vite、Tailwind CSS
- 部署：Docker Compose
- CI/CD：GitHub Actions

---

## 快速开始

### 前置条件

- **Docker 及 Docker Compose**（推荐用于快速体验）
- **Node.js 18+**（本地开发必需）
- **Python 3.11+**（本地开发必需）

### 方式一：使用 Docker（推荐）

```bash
# 构建并启动
docker-compose up --build

# 后台启动
make docker-up
```

### 方式二：本地开发

```bash
# 1. 安装依赖（会自动创建 backend/venv）
make install

# 2. 同时启动前后端开发服务器
make dev-local
```

---

## 配置

复制 `.env.example` 为 `.env` 并修改对应值：

```bash
cp .env.example .env
```

| 变量 | 说明 | 默认值 |
|---|---|---|
| `MYDAILY_PASSWORD` | 登录密码 | 空（本地 `./start.sh` 首次运行自动生成） |
| `MYDAILY_SECRET_KEY` | Token 签名密钥 | 空（本地 `./start.sh` 首次运行自动生成） |
| `MYDAILY_TOKEN_TTL_SECONDS` | Token 有效期（秒） | `2592000`（30 天） |
| `MYDAILY_AUTH_DISABLED` | 显式禁用认证（仅密码为空时生效） | `false` |
| `MYDAILY_CORS_ORIGINS` | 允许的 CORS 源（逗号分隔） | `http://localhost:5173,http://localhost:3000,http://localhost:8000` |
| `MYDAILY_DATA_DIR` | SQLite 数据目录 | Docker 内 `/app/data`；本地 `./data` |

> ⚠️ **安全提示：**
> - 默认密码与默认 SECRET_KEY 仅用于本地快速启动，生产部署必须通过环境变量覆盖。
> - 若 `MYDAILY_PASSWORD` 留空，后端会拒绝启动，除非显式设置 `MYDAILY_AUTH_DISABLED=true`。
> - Token 现在携带过期时间戳，过期后前端会自动登出并要求重新登录。

---

## 开发指南

### 常用命令

```bash
make help           # 查看所有可用命令

make install        # 安装所有依赖（创建 Python venv）
make dev            # 使用 Docker 启动开发环境
make dev-local      # 本地启动前后端（不使用 Docker）
make dev-backend    # 仅启动后端
make dev-frontend   # 仅启动前端

make test           # 运行所有测试
make lint           # 运行代码检查
make format         # 格式化后端代码
make build          # 构建前端生产版本
make clean          # 清理构建文件

make docker-up      # 后台启动 Docker 容器
make docker-down    # 停止 Docker 容器
make docker-logs    # 查看容器日志
```

### 测试

```bash
# 运行所有测试
make test

# 后端测试（含覆盖率统计）
cd backend && ./venv/bin/pytest -v --cov=.

# 前端测试
cd frontend && npm run test
```

---

## 项目结构

```
mydaily/
├── .github/
│   └── workflows/        # CI/CD 配置
├── backend/              # FastAPI 后端
│   ├── main.py           # API 端点
│   ├── auth.py           # 认证逻辑
│   ├── models.py         # 数据模型
│   ├── database.py       # 数据库配置
│   ├── conftest.py       # 测试 fixtures
│   ├── test_main.py      # API 测试
│   └── requirements.txt  # Python 依赖
├── frontend/             # React 前端
│   ├── src/
│   │   ├── App.jsx       # 主应用组件
│   │   ├── api.js        # API 客户端
│   │   ├── components/   # 可复用组件
│   │   └── test/         # 测试文件
│   ├── package.json      # Node.js 依赖
│   └── vite.config.js    # Vite 配置
├── scripts/              # 开发脚本
├── data/                 # 本地数据库（.gitignore'd）
├── Dockerfile            # 多阶段构建
├── docker-compose.yml    # Docker Compose 配置
├── Makefile              # 开发命令
├── .env.example          # 环境变量模板
└── README.md
```

## 许可证

MIT 许可证
