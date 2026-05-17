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

# 暴露端口
EXPOSE 8000

# 启动后端服务（静态文件由 FastAPI 提供）
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
