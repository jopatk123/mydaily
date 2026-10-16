#!/bin/bash
# scripts/lib/common.sh
# MyDaily 开发脚本通用工具：日志、参数解析、环境检测。

# ── 颜色定义 ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

log_info()    { echo -e "${BLUE}[INFO]${NC}    $*"; }
log_success() { echo -e "${GREEN}[OK]${NC}      $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC}    $*"; }
log_error()   { echo -e "${RED}[ERROR]${NC}   $*" >&2; }
log_step()    { echo -e "${MAGENTA}[STEP]${NC}    $*"; }

die() {
    log_error "$*"
    exit 1
}

print_banner() {
    echo ""
    echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}${BOLD}║          MyDaily Development Server          ║${NC}"
    echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
    echo ""
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
# 用法：parse_args "$@" 然后通过变量 SKIP_INSTALL / BACKEND_ONLY / FRONTEND_ONLY 读取
parse_args() {
    SKIP_INSTALL=false
    BACKEND_ONLY=false
    FRONTEND_ONLY=false
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

check_directories() {
    local root_dir="$1"
    local backend_dir="${root_dir}/backend"
    local frontend_dir="${root_dir}/frontend"

    log_step "检测项目目录结构..."
    [[ -d "${backend_dir}" ]]  || die "后端目录 ${backend_dir} 不存在"
    [[ -d "${frontend_dir}" ]] || die "前端目录 ${frontend_dir} 不存在"
    [[ -f "${backend_dir}/main.py" ]]  || die "未找到后端入口文件 ${backend_dir}/main.py"
    [[ -f "${frontend_dir}/package.json" ]] || die "未找到前端配置文件 ${frontend_dir}/package.json"
    log_success "项目目录结构完整"
}
