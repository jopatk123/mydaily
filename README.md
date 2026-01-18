# MyDaily - 个人日记应用

一款简洁美观的个人日记应用，基于 FastAPI、React 和 Docker 构建。

## ⚡ 快速启动

**一键启动（推荐）：**
```bash
./quickstart.sh
```
脚本会自动检测您的环境并选择最佳启动方式。

**或手动选择：**

```bash
# 使用 Docker（推荐）
docker-compose up --build

# 或本地开发
./scripts/setup.sh      # 首次运行，安装依赖
make dev-local          # 启动开发服务器
```

访问 http://localhost:5555 即可使用应用。

> 💡 **提示：** 查看 [快速参考](QUICKREF.md) 获取所有命令的快速指南。

---

## 功能特性

- 撰写并保存每日思绪

- 查看过往日记条目

- 支持编辑已有日记

- 一键导出全部日记（JSON 格式）

- 启动时密码保护，30 天本地有效期

- 简洁、无干扰的界面

- 支持 Docker 容器化部署，部署简单便捷

技术栈

- 后端：Python、FastAPI、SQLModel（基于 SQLite）

- 前端：React、Vite、Tailwind CSS

- 部署：Docker Compose

- 持续集成/持续部署：GitHub Actions

## 快速开始

### 前置条件

- **Docker 及 Docker Compose**（推荐用于快速体验）
- **Node.js 18+**（本地开发必需）
- **Python 3.11+**（本地开发必需）

### 方式一：使用 Docker（推荐）

最简单的启动方式，无需配置环境：

```bash
# 构建并启动所有服务
docker-compose up --build

# 或使用 Makefile
make dev
```

### 方式二：本地开发

#### 1. 安装依赖

```bash
# 使用一键安装脚本
./scripts/setup.sh

# 或使用 Makefile
make install

# 或手动安装
cd backend && pip install -r requirements.txt
cd frontend && npm install
```

#### 2. 启动开发服务器

**同时启动前后端：**
```bash
make dev-local
# 或直接运行脚本
./scripts/dev-local.sh
```

**仅启动后端：**
```bash
make dev-backend
# 或
./scripts/dev-backend.sh
# 或手动启动
cd backend && uvicorn main:app --reload
```

**仅启动前端：**
```bash
make dev-frontend
# 或
./scripts/dev-frontend.sh
# 或手动启动
cd frontend && npm run dev
```

### 访问应用

- **应用界面（前端+后端）：** http://localhost:5555
- **API 文档：** http://localhost:5555/docs

## 配置

项目提供了 `.env.example` 文件作为环境变量模板。如需自定义配置：

```bash
cp .env.example .env
# 编辑 .env 文件进行配置
```

主要配置项：
- `APP_PORT`: 应用服务器端口（默认 5555）
- `DATABASE_URL`: 数据库连接字符串
- `VITE_APP_PASSWORD`: 前端登录密码（默认 `asd123123123`）

## 开发指南

### 常用命令

```bash
# 查看所有可用命令
make help

# 安装依赖
make install

# 启动开发服务器（Docker）
make dev

# 启动本地开发服务器（不使用 Docker）
make dev-local

# 单独启动后端
make dev-backend

# 单独启动前端
make dev-frontend

# 运行所有测试
make test

# 运行代码检查
make lint

# 格式化代码
make format

# 构建生产版本
make build

# 清理构建文件
make clean

# Docker 相关命令
make docker-up      # 后台启动 Docker 容器
make docker-down    # 停止 Docker 容器
make docker-logs    # 查看容器日志
```

## 项目结构

```
mydaily/
├── .github/
│   └── workflows/        # CI/CD 配置
├── backend/              # FastAPI 后端
│   ├── main.py           # API 端点
│   ├── models.py         # 数据模型
│   ├── database.py       # 数据库配置
│   ├── test_main.py      # 测试文件
│   └── requirements.txt  # Python 依赖
├── frontend/             # React 前端
│   ├── src/
│   │   ├── App.jsx       # 主应用组件
│   │   ├── main.jsx      # 入口文件
│   │   ├── components/   # 可复用组件
│   │   ├── pages/        # 页面组件
│   │   └── test/         # 测试文件
│   ├── package.json      # Node.js 依赖
│   └── vite.config.js    # Vite 配置
├── scripts/              # 开发脚本
│   ├── setup.sh          # 项目初始化
│   ├── dev-local.sh      # 本地开发（前后端）
│   ├── dev-backend.sh    # 仅启动后端
│   └── dev-frontend.sh   # 仅启动前端
├── docker-compose.yml    # Docker Compose 配置
├── Makefile              # 开发命令快捷方式
└── README.md             # 项目文档
```ker 启动
   ```

3. **编写代码并测试：**
   ```bash
   make test           # 运行测试
   make lint           # 检查代码规范
   ```

4. **提交前：**
   ```bash
   make format         # 格式化代码
   make test           # 确保测试通过
   ```

测试

# 运行所有测试
make test

# 后端测试（含覆盖率统计）
cd backend && pytest -v --cov=.

# 前端测试
cd frontend && npm run test

提交前检查钩子

安装提交前检查钩子以保证代码质量：

pip install pre-commit
pre-commit install

项目结构

mydaily/
├── .github/workflows/    # 持续集成/持续部署流水线配置
├── backend/              # FastAPI 后端代码
│   ├── main.py           # API 接口端点定义
│   ├── models.py         # 数据库模型
│   ├── database.py       # 数据库配置
│   └── test_main.py      # API 测试代码
├── frontend/             # React 前端代码
│   ├── src/
│   │   ├── App.jsx       # 主组件
│   │   └── test/         # 前端测试代码
│   └── package.json
├── Dockerfile            # 单体部署 Docker 配置
├── docker-compose.yml    # Docker Compose 配置文件
├── Makefile              # 自动化命令配置文件
└── README.md             # 项目说明文档

## 相关文档

- 📖 [开发者指南](DEVELOPMENT.md) - 详细的开发说明和最佳实践
- ⚡ [快速参考](QUICKREF.md) - 常用命令速查表
- 📝 [更新日志](CHANGELOG.md) - 项目变更记录

## 许可证

MIT 许可证
