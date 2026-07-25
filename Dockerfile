FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM python:3.11-slim

WORKDIR /app

# 安装 Python 依赖
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制后端代码
COPY backend/ .

# 从前端构建阶段复制构建产物
COPY --from=frontend-builder /app/frontend/dist /app/static

# 创建非 root 用户并赋权（容器内最小权限原则）
RUN groupadd --system app && useradd --system --ingroup app --no-create-home app \
    && chown -R app:app /app

USER app

# 暴露端口
EXPOSE 8000

# 健康检查：访问 /health 端点（无需认证）
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=5).status == 200 else 1)"

# 启动后端服务（静态文件由 FastAPI 提供）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
