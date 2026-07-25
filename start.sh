#!/bin/bash

# ==============================================================================
# MyDaily 开发服务器启动脚本
# 同时启动前后端开发服务器，包含完整的环境检测、依赖安装、端口冲突处理
# ==============================================================================

set -euo pipefail

# ── 颜色定义 ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── 常量 ─────────────────────────────────────────────────────────────────────
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173
HEALTH_CHECK_MAX_RETRIES=30
HEALTH_CHECK_INTERVAL=1

# ── 运行时状态 ───────────────────────────────────────────────────────────────
BACKEND_PID=""
FRONTEND_PID=""
SKIP_INSTALL=false
BACKEND_ONLY=false
FRONTEND_ONLY=false

# ── 辅助函数 ─────────────────────────────────────────────────────────────────

print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║          MyDaily Development Server          ║${NC}"
    echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
}

log_info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}      $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $*" >&2; }
log_step()    { echo -e "${MAGENTA}[STEP]${NC}    $*"; }

die() {
    log_error "$*"
    exit 1
}

show_help() {
    cat << EOF
Usage: ./start.sh [OPTIONS]

同时启动 MyDaily 前后端开发服务器。默认会检测环境、安装依赖、处理端口冲突。

Options:
  --skip-install    跳过依赖安装（适用于已安装依赖的场景）
  --backend-only    仅启动后端服务器
  --frontend-only   仅启动前端服务器
  -h, --help        显示此帮助信息

Examples:
  ./start.sh                     # 完整启动前后端
  ./start.sh --skip-install      # 跳过依赖安装直接启动
  ./start.sh --backend-only      # 仅启动后端
EOF
    exit 0
}

# ── 命令行参数解析 ────────────────────────────────────────────────────────────

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --skip-install)
                SKIP_INSTALL=true
                shift
                ;;
            --backend-only)
                BACKEND_ONLY=true
                shift
                ;;
            --frontend-only)
                FRONTEND_ONLY=true
                shift
                ;;
            -h|--help)
                show_help
                ;;
            *)
                log_error "未知参数: $1"
                echo "使用 ./start.sh --help 查看帮助"
                exit 1
                ;;
        esac
    done

    # 互斥检查
    if [[ "${BACKEND_ONLY}" == true && "${FRONTEND_ONLY}" == true ]]; then
        log_warn "--backend-only 和 --frontend-only 同时指定，等同于同时启动全部服务"
    fi
}

# ── 环境检测 ──────────────────────────────────────────────────────────────────

check_python() {
    log_step "检测 Python 环境..."
    if ! command -v python3 &>/dev/null; then
        die "未找到 python3，请先安装 Python 3.10+"
    fi

    local py_version
    py_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))' 2>/dev/null || echo "0.0")
    local major minor
    major=$(echo "$py_version" | cut -d. -f1)
    minor=$(echo "$py_version" | cut -d. -f2)

    if [[ "$major" -lt 3 ]] || { [[ "$major" -eq 3 && "$minor" -lt 10 ]]; }; then
        log_warn "Python 版本 ${py_version} 较低，建议使用 Python 3.10+"
    else
        log_success "Python ${py_version} ($(command -v python3))"
    fi
}

check_node() {
    log_step "检测 Node.js 环境..."
    if ! command -v node &>/dev/null; then
        die "未找到 node，请先安装 Node.js 16+"
    fi

    local node_version
    node_version=$(node -v 2>/dev/null | sed 's/v//')
    local major
    major=$(echo "$node_version" | cut -d. -f1)

    if [[ "$major" -lt 16 ]]; then
        log_warn "Node.js 版本 ${node_version} 较低，建议使用 Node.js 16+"
    else
        log_success "Node.js v${node_version} ($(command -v node))"
    fi
}

check_npm() {
    if ! command -v npm &>/dev/null; then
        if command -v node &>/dev/null; then
            log_warn "未找到 npm，但 Node.js 已安装。请确认 npm 在 PATH 中。"
        else
            die "未找到 npm，请先安装 Node.js 与 npm"
        fi
    else
        log_success "npm v$(npm -v) ($(command -v npm))"
    fi
}

check_env_file() {
    log_step "检测 .env 配置文件..."
    if [[ ! -f "${ROOT_DIR}/.env" ]]; then
        log_warn ".env 文件不存在，正在从 .env.example 复制..."
        if [[ -f "${ROOT_DIR}/.env.example" ]]; then
            cp "${ROOT_DIR}/.env.example" "${ROOT_DIR}/.env"
            log_success "已创建 .env 文件，请根据需要修改密码配置"

            # 如果 MYDAILY_PASSWORD 是空的，自动生成一个随机密码
            if grep -q '^MYDAILY_PASSWORD=$' "${ROOT_DIR}/.env" 2>/dev/null; then
                local random_pwd
                random_pwd=$(python3 -c "import secrets; print(secrets.token_hex(6))" 2>/dev/null || echo "auto-$(date +%s)")
                # macOS sed 兼容
                if [[ "$(uname)" == "Darwin" ]]; then
                    sed -i '' "s/^MYDAILY_PASSWORD=$/MYDAILY_PASSWORD=${random_pwd}/" "${ROOT_DIR}/.env"
                else
                    sed -i "s/^MYDAILY_PASSWORD=$/MYDAILY_PASSWORD=${random_pwd}/" "${ROOT_DIR}/.env"
                fi
                log_info "已自动生成 MYDAILY_PASSWORD=${random_pwd}"
            fi
        else
            die ".env.example 文件不存在，无法自动创建 .env 文件"
        fi
    else
        log_success ".env 文件已存在"
    fi

    # 检查关键环境变量是否已设置（直接从 .env 提取，避免 source 子 shell 变量丢失）
    local missing_vars=()
    local pwd_value secret_value
    pwd_value=$(grep -E '^MYDAILY_PASSWORD=' "${ROOT_DIR}/.env" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' || true)
    secret_value=$(grep -E '^MYDAILY_SECRET_KEY=' "${ROOT_DIR}/.env" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' || true)

    if [[ -z "${pwd_value}" ]]; then
        missing_vars+=("MYDAILY_PASSWORD")
    fi
    if [[ -z "${secret_value}" ]]; then
        missing_vars+=("MYDAILY_SECRET_KEY")
    fi

    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warn "以下环境变量未设置: ${missing_vars[*]}"
        log_warn "请在 ${ROOT_DIR}/.env 中配置这些变量"
    else
        log_success "关键环境变量已配置"
    fi
}

check_directories() {
    log_step "检测项目目录结构..."

    if [[ ! -d "${BACKEND_DIR}" ]]; then
        die "后端目录 ${BACKEND_DIR} 不存在"
    fi
    if [[ ! -d "${FRONTEND_DIR}" ]]; then
        die "前端目录 ${FRONTEND_DIR} 不存在"
    fi

    if [[ ! -f "${BACKEND_DIR}/main.py" ]]; then
        die "未找到后端入口文件 ${BACKEND_DIR}/main.py"
    fi
    if [[ ! -f "${FRONTEND_DIR}/package.json" ]]; then
        die "未找到前端配置文件 ${FRONTEND_DIR}/package.json"
    fi

    log_success "项目目录结构完整"
}

# ── 端口检测与清理 ────────────────────────────────────────────────────────────

check_port() {
    local port=$1
    if lsof -i "TCP:${port}" -sTCP:LISTEN -t &>/dev/null 2>&1; then
        return 0  # 端口被占用
    fi
    return 1  # 端口空闲
}

get_port_processes() {
    # 返回所有占用端口的 PID（空格分隔），便于后续统一处理
    local port=$1
    lsof -i "TCP:${port}" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ' | sed 's/ $//'
}

get_process_name() {
    # 取第一个 PID 查进程名，并提取 basename，避免多 PID 或完整路径导致匹配失败
    local pid=$1
    local first_pid
    first_pid=$(echo "$pid" | awk '{print $1}')
    ps -p "${first_pid}" -o comm= 2>/dev/null | awk -F/ '{print $NF}' | tr -d ' ' || echo "unknown"
}

kill_port_if_needed() {
    local port=$1
    local service_name=$2
    local pids
    local first_pid
    local proc_name

    if ! check_port "$port"; then
        log_success "端口 ${port} 空闲可用"
        return 0
    fi

    pids=$(get_port_processes "$port")
    first_pid=$(echo "$pids" | awk '{print $1}')
    proc_name=$(get_process_name "$first_pid")

    log_warn "端口 ${port} 已被占用 (PID: ${pids}, 进程: ${proc_name})"

    # 检测是否是之前运行的本项目服务（uvicorn/python/node/vite）
    if echo "${proc_name}" | grep -qE "^(uvicorn|python|Python|node|vite)$"; then
        log_warn "检测到可能是之前的开发服务器进程，正在尝试终止..."
        # 向所有占用该端口的 PID 发送 SIGTERM
        for pid in $pids; do
            kill "$pid" 2>/dev/null || true
        done
        sleep 1

        # 如果还没死，强制终止
        if check_port "$port"; then
            log_warn "进程未响应，强制终止..."
            for pid in $pids; do
                kill -9 "$pid" 2>/dev/null || true
            done
            sleep 1
        fi

        if check_port "$port"; then
            die "无法释放端口 ${port}，请手动终止占用进程后重试"
        else
            log_success "端口 ${port} 已释放"
        fi
    else
        die "端口 ${port} 被其他进程 (${proc_name}) 占用，请手动处理后重试"
    fi
}

# ── 依赖安装 ──────────────────────────────────────────────────────────────────

ensure_backend_deps() {
    log_step "检查后端依赖..."

    pushd "${BACKEND_DIR}" >/dev/null

    # 检查 venv 是否存在且可用
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

    # 安装 pip（如果需要）
    if ! ./venv/bin/python -m pip --version &>/dev/null 2>&1; then
        log_info "安装 pip..."
        ./venv/bin/python -m ensurepip --default-pip 2>/dev/null || {
            log_info "ensurepip 不可用，尝试通过 get-pip.py 安装..."
            curl -sS https://bootstrap.pypa.io/get-pip.py | ./venv/bin/python || \
            die "安装 pip 失败"
        }
    fi

    # 检查是否需要安装依赖
    if [[ "${SKIP_INSTALL}" == true ]]; then
        # 快速检查关键包是否存在
        if ./venv/bin/python -c "import uvicorn, fastapi, sqlmodel" &>/dev/null 2>&1; then
            log_success "跳过依赖安装，关键包已存在"
        else
            log_warn "关键包缺失，即使 --skip-install 也会安装依赖"
            SKIP_INSTALL=false
        fi
    fi

    if [[ "${SKIP_INSTALL}" == false || "${need_venv}" == true ]]; then
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
    log_step "检查前端依赖..."

    pushd "${FRONTEND_DIR}" >/dev/null

    if [[ ! -d "node_modules" ]]; then
        log_info "安装前端依赖..."
        if [[ -f "package-lock.json" ]]; then
            npm ci || die "npm ci 失败"
        else
            npm install || die "npm install 失败"
        fi
        log_success "前端依赖安装完成"
    elif [[ "${SKIP_INSTALL}" == false ]]; then
        # 检查是否有 package.json 变更需要更新
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
    log_step "启动后端服务器..."

    pushd "${BACKEND_DIR}" >/dev/null

    # 设置 Python 环境变量
    export PYTHONUNBUFFERED=1

    # 加载 .env 中的变量到当前环境（直接 source 文件，避免进程替换导致变量丢失）
    if [[ -f "${ROOT_DIR}/.env" ]]; then
        set -a
        # shellcheck disable=SC1090
        source "${ROOT_DIR}/.env"
        set +a
    fi

    ./venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port "${BACKEND_PORT}" &
    BACKEND_PID=$!

    popd >/dev/null

    # 短暂等待后检查进程是否存活
    sleep 1
    if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
        die "后端进程启动后立即退出，请检查日志排查原因"
    fi

    log_success "后端进程已启动 (PID: ${BACKEND_PID})"
}

start_frontend() {
    log_step "启动前端服务器..."

    pushd "${FRONTEND_DIR}" >/dev/null

    npm run dev &
    FRONTEND_PID=$!

    popd >/dev/null

    # 短暂等待后检查进程是否存活
    sleep 1
    if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
        die "前端进程启动后立即退出，请检查日志排查原因"
    fi

    log_success "前端进程已启动 (PID: ${FRONTEND_PID})"
}

# ── 健康检查 ──────────────────────────────────────────────────────────────────

health_check_backend() {
    log_step "等待后端服务就绪..."

    local retries=0
    while [[ $retries -lt $HEALTH_CHECK_MAX_RETRIES ]]; do
        if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
            die "后端进程已在健康检查期间退出，请检查上方日志"
        fi

        # /auth/status 是无需认证的端点
        if curl -s --max-time 2 "http://127.0.0.1:${BACKEND_PORT}/auth/status" &>/dev/null; then
            log_success "后端服务就绪 (http://localhost:${BACKEND_PORT})"
            return 0
        fi

        sleep "${HEALTH_CHECK_INTERVAL}"
        retries=$((retries + 1))
        if [[ $((retries % 5)) -eq 0 ]]; then
            log_info "等待后端启动中... (${retries}s)"
        fi
    done

    die "后端服务在 ${HEALTH_CHECK_MAX_RETRIES}s 内未就绪，请检查后端日志"
}

health_check_frontend() {
    log_step "等待前端服务就绪..."

    local retries=0
    while [[ $retries -lt $HEALTH_CHECK_MAX_RETRIES ]]; do
        if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
            die "前端进程已在健康检查期间退出，请检查上方日志"
        fi

        if curl -s --max-time 2 "http://127.0.0.1:${FRONTEND_PORT}" &>/dev/null; then
            log_success "前端服务就绪 (http://localhost:${FRONTEND_PORT})"
            return 0
        fi

        sleep "${HEALTH_CHECK_INTERVAL}"
        retries=$((retries + 1))
        if [[ $((retries % 5)) -eq 0 ]]; then
            log_info "等待前端启动中... (${retries}s)"
        fi
    done

    die "前端服务在 ${HEALTH_CHECK_MAX_RETRIES}s 内未就绪，请检查前端日志"
}

# ── 进程监控 ──────────────────────────────────────────────────────────────────

monitor_processes() {
    local monitor_interval=5
    while true; do
        sleep "${monitor_interval}"

        if [[ -n "${BACKEND_PID}" ]]; then
            if ! kill -0 "${BACKEND_PID}" 2>/dev/null; then
                log_error "后端进程 (PID: ${BACKEND_PID}) 意外退出！"
                return 1
            fi
        fi

        if [[ -n "${FRONTEND_PID}" ]]; then
            if ! kill -0 "${FRONTEND_PID}" 2>/dev/null; then
                log_error "前端进程 (PID: ${FRONTEND_PID}) 意外退出！"
                return 1
            fi
        fi
    done
}

# ── 清理函数 ──────────────────────────────────────────────────────────────────

cleanup() {
    echo ""
    log_info "正在关闭所有服务..."

    if [[ -n "${FRONTEND_PID}" ]]; then
        log_info "终止前端进程 (PID: ${FRONTEND_PID})..."
        kill "${FRONTEND_PID}" 2>/dev/null || true
        # 等待最多 5 秒让进程优雅退出
        for _ in {1..5}; do
            kill -0 "${FRONTEND_PID}" 2>/dev/null || break
            sleep 1
        done
        kill -9 "${FRONTEND_PID}" 2>/dev/null || true
        log_success "前端进程已终止"
    fi

    if [[ -n "${BACKEND_PID}" ]]; then
        log_info "终止后端进程 (PID: ${BACKEND_PID})..."
        kill "${BACKEND_PID}" 2>/dev/null || true
        for _ in {1..5}; do
            kill -0 "${BACKEND_PID}" 2>/dev/null || break
            sleep 1
        done
        kill -9 "${BACKEND_PID}" 2>/dev/null || true
        log_success "后端进程已终止"
    fi

    log_info "已清理所有服务，再见！"
}

# ── 主流程 ────────────────────────────────────────────────────────────────────

main() {
    parse_args "$@"

    print_banner

    # 1. 环境检测
    log_step "===== 环境检测 ====="
    check_python
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        check_node
        check_npm
    fi
    check_env_file
    check_directories
    echo ""

    # 2. 端口检测
    log_step "===== 端口检测 ====="
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        kill_port_if_needed "${BACKEND_PORT}" "Backend"
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        kill_port_if_needed "${FRONTEND_PORT}" "Frontend"
    fi
    echo ""

    # 3. 依赖安装
    log_step "===== 依赖安装 ====="
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        ensure_backend_deps
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        ensure_frontend_deps
    fi
    echo ""

    # 4. 启动服务
    log_step "===== 启动服务 ====="
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        start_backend
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        start_frontend
    fi
    echo ""

    # 5. 健康检查
    log_step "===== 健康检查 ====="
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        health_check_backend
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        health_check_frontend
    fi
    echo ""

    # 6. 启动信息
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║          所有服务已启动成功！               ║${NC}"
    echo -e "${GREEN}${BOLD}╠══════════════════════════════════════════════╣${NC}"
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        echo -e "${GREEN}${BOLD}║${NC}  后端:    ${CYAN}http://localhost:${BACKEND_PORT}${NC}$(printf '%*s' $((30 - ${#BACKEND_PORT})) '')${GREEN}${BOLD}║${NC}"
        echo -e "${GREEN}${BOLD}║${NC}  API文档: ${CYAN}http://localhost:${BACKEND_PORT}/docs${NC}$(printf '%*s' $((25 - ${#BACKEND_PORT})) '')${GREEN}${BOLD}║${NC}"
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        echo -e "${GREEN}${BOLD}║${NC}  前端:    ${CYAN}http://localhost:${FRONTEND_PORT}${NC}$(printf '%*s' $((30 - ${#FRONTEND_PORT})) '')${GREEN}${BOLD}║${NC}"
    fi
    echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "  ${YELLOW}按 Ctrl+C 停止所有服务${NC}"
    echo ""

    # 7. 等待 & 监控
    monitor_processes
}

# ── 信号处理 ──────────────────────────────────────────────────────────────────

trap cleanup EXIT INT TERM

# ── 入口 ──────────────────────────────────────────────────────────────────────

main "$@"
