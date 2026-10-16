#!/bin/bash
# scripts/lib/deps.sh
# MyDaily 开发脚本：后端/前端依赖安装与启动。

# ── 依赖安装 ──────────────────────────────────────────────────────────────────

ensure_backend_deps() {
    local backend_dir="$1"
    local skip_install="$2"

    log_step "检查后端依赖..."
    pushd "${backend_dir}" >/dev/null

    local need_venv=false
    if [[ ! -d "venv" ]]; then
        log_info "创建 Python 虚拟环境..."
        python3 -m venv venv || die "创建 venv 失败"
        need_venv=true
    fi
    if [[ ! -f "venv/bin/python" ]]; then
        log_warn "venv 损坏，正在重建..."
        rm -rf venv
        python3 -m venv venv || die "重建 venv 失败"
        need_venv=true
    fi

    if ! ./venv/bin/python -m pip --version &>/dev/null 2>&1; then
        log_info "安装 pip..."
        ./venv/bin/python -m ensurepip --default-pip 2>/dev/null || {
            log_info "ensurepip 不可用，尝试通过 get-pip.py 安装..."
            curl -sS https://bootstrap.pypa.io/get-pip.py | ./venv/bin/python || die "安装 pip 失败"
        }
    fi

    if [[ "${skip_install}" == true ]]; then
        if ./venv/bin/python -c "import uvicorn, fastapi, sqlmodel" &>/dev/null 2>&1; then
            log_success "跳过依赖安装，关键包已存在"
        else
            log_warn "关键包缺失，即使 --skip-install 也会安装依赖"
            skip_install=false
        fi
    fi

    if [[ "${skip_install}" == false || "${need_venv}" == true ]]; then
        log_info "安装后端 Python 依赖..."
        ./venv/bin/python -m pip install --upgrade pip >/dev/null 2>&1 || true
        if ./venv/bin/python -m pip install -r requirements.txt; then
            log_success "后端依赖安装完成"
        else
            die "后端依赖安装失败"
        fi
    fi

    popd >/dev/null
}

ensure_frontend_deps() {
    local frontend_dir="$1"
    local skip_install="$2"

    log_step "检查前端依赖..."
    pushd "${frontend_dir}" >/dev/null

    if [[ ! -d "node_modules" ]]; then
        log_info "安装前端依赖..."
        if [[ -f "package-lock.json" ]]; then
            npm ci || die "npm ci 失败"
        else
            npm install || die "npm install 失败"
        fi
        log_success "前端依赖安装完成"
    elif [[ "${skip_install}" == false ]]; then
        if [[ "package.json" -nt "node_modules/.package-lock.json" ]] 2>/dev/null || \
           [[ ! -f "node_modules/.package-lock.json" ]]; then
            log_info "检测到 package.json 变更，更新依赖..."
            npm install || log_warn "npm install 失败，将尝试使用现有依赖"
        else
            log_success "跳过依赖安装，node_modules 已是最新"
        fi
    else
        log_success "跳过依赖安装"
    fi

    popd >/dev/null
}

# ── 服务启动 ──────────────────────────────────────────────────────────────────

start_backend() {
    local backend_dir="$1"
    local root_dir="$2"
    local port="$3"

    log_step "启动后端服务器..."
    pushd "${backend_dir}" >/dev/null

    export PYTHONUNBUFFERED=1
    if [[ -f "${root_dir}/.env" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "${root_dir}/.env"
        set +a
    fi

    ./venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port "${port}" &
    BACKEND_PID=$!

    popd >/dev/null

    sleep 1
    if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
        die "后端进程启动后立即退出，请检查日志排查原因"
    fi
    log_success "后端进程已启动 (PID: ${BACKEND_PID})"
}

start_frontend() {
    local frontend_dir="$1"
    local port="$2"

    log_step "启动前端服务器..."
    pushd "${frontend_dir}" >/dev/null

    npm run dev &
    FRONTEND_PID=$!

    popd >/dev/null

    sleep 1
    if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
        die "前端进程启动后立即退出，请检查日志排查原因"
    fi
    log_success "前端进程已启动 (PID: ${FRONTEND_PID})"
}

# ── 健康检查 ──────────────────────────────────────────────────────────────────

health_check_backend() {
    local port="$1"
    local max_retries="${2:-30}"

    log_step "等待后端服务就绪..."
    local retries=0
    while [[ $retries -lt $max_retries ]]; do
        if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
            die "后端进程已在健康检查期间退出，请检查上方日志"
        fi
        # /health 是无需认证的健康检查端点
        if curl -s --max-time 2 "http://127.0.0.1:${port}/health" &>/dev/null; then
            log_success "后端服务就绪 (http://localhost:${port})"
            return 0
        fi
        sleep 1
        retries=$((retries + 1))
        if [[ $((retries % 5)) -eq 0 ]]; then
            log_info "等待后端启动中... (${retries}s)"
        fi
    done
    die "后端服务在 ${max_retries}s 内未就绪，请检查后端日志"
}

health_check_frontend() {
    local port="$1"
    local max_retries="${2:-30}"

    log_step "等待前端服务就绪..."
    local retries=0
    while [[ $retries -lt $max_retries ]]; do
        if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
            die "前端进程已在健康检查期间退出，请检查上方日志"
        fi
        if curl -s --max-time 2 "http://127.0.0.1:${port}" &>/dev/null; then
            log_success "前端服务就绪 (http://localhost:${port})"
            return 0
        fi
        sleep 1
        retries=$((retries + 1))
        if [[ $((retries % 5)) -eq 0 ]]; then
            log_info "等待前端启动中... (${retries}s)"
        fi
    done
    die "前端服务在 ${max_retries}s 内未就绪，请检查前端日志"
}

# ── 进程监控与清理 ────────────────────────────────────────────────────────────

monitor_processes() {
    local interval="${1:-5}"
    while true; do
        sleep "${interval}"
        if [[ -n "${BACKEND_PID}" ]] && ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
            log_error "后端进程 (PID: ${BACKEND_PID}) 意外退出！"
            return 1
        fi
        if [[ -n "${FRONTEND_PID}" ]] && ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
            log_error "前端进程 (PID: ${FRONTEND_PID}) 意外退出！"
            return 1
        fi
    done
}

cleanup() {
    # 没有需要清理的子进程时静默退出（如 --help 后触发）
    if [[ -z "${BACKEND_PID:-}" && -z "${FRONTEND_PID:-}" ]]; then
        return 0
    fi

    echo ""
    log_info "正在关闭所有服务..."

    for pid_var in FRONTEND_PID BACKEND_PID; do
        local pid="${!pid_var}"
        [[ -z "${pid}" ]] && continue
        log_info "终止进程 (PID: ${pid})..."
        kill "${pid}" 2>/dev/null || true
        for _ in {1..5}; do
            kill -0 "${pid}" 2>/dev/null || break
            sleep 1
        done
        kill -9 "${pid}" 2>/dev/null || true
    done

    log_info "已清理所有服务，再见！"
}
