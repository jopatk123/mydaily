# MyDaily 快速参考

## 🚀 快速启动

```bash
./quickstart.sh          # 智能启动（推荐）
```

## 📦 开发模式

### Docker 模式
```bash
make dev                 # 启动所有服务
make docker-up           # 后台启动
make docker-down         # 停止服务
make docker-logs         # 查看日志
```

### 本地模式
```bash
make dev-local           # 同时启动前后端
make dev-backend         # 仅后端
make dev-frontend        # 仅前端
```

## 🔧 开发工具

```bash
make install             # 安装依赖
make test                # 运行测试
make lint                # 代码检查
make format              # 格式化代码
make build               # 构建生产版
make clean               # 清理文件
```

## 🌐 访问地址

- 应用（前端+后端）: http://localhost:5555
- API 文档: http://localhost:5555/docs

## 📝 脚本说明

| 脚本 | 用途 |
|------|------|
| `quickstart.sh` | 智能快速启动 |
| `scripts/setup.sh` | 安装所有依赖 |
| `scripts/dev-local.sh` | 本地开发（前后端） |
| `scripts/dev-backend.sh` | 仅启动后端 |
| `scripts/dev-frontend.sh` | 仅启动前端 |

## 💡 工作流程

1. **首次设置**
   ```bash
   ./scripts/setup.sh
   ```

2. **开发**
   ```bash
   make dev-local
   # 编写代码...
   ```

3. **测试**
   ```bash
   make test
   make lint
   ```

4. **提交**
   ```bash
   make format
   make test
   git commit -m "feat: 你的改动"
   ```

## 🐛 常见问题

**端口被占用？**
- 应用默认端口 5555
- 修改 docker-compose.yml 配置文件或杀掉占用进程

**依赖安装失败？**
```bash
make clean
make install
```

**Docker 问题？**
```bash
make docker-down
make docker-up
```

**登录密码是什么？**
- 默认密码：`asd123123123`
- 可通过 `.env` 设置 `VITE_APP_PASSWORD` 覆盖

## 📚 更多文档

- [README.md](README.md) - 项目概览
- [DEVELOPMENT.md](DEVELOPMENT.md) - 详细开发指南
- [CHANGELOG.md](CHANGELOG.md) - 更新日志

## 🎯 测试命令

```bash
# 所有测试
make test

# 后端测试
cd backend && pytest -v --cov=.

# 前端测试
cd frontend && npm run test

# 监听模式
cd frontend && npm run test:watch
```

## 🎨 代码规范

```bash
# 检查
make lint

# 自动修复
make format
```

## 🏗️ 项目结构

```
mydaily/
├── backend/          # Python/FastAPI
├── frontend/         # React/Vite
├── scripts/          # 开发脚本
├── Makefile          # Make 命令
├── quickstart.sh     # 快速启动
└── docker-compose.yml
```

---

**提示：** 运行 `make help` 查看所有可用命令
