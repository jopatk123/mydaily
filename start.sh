#!/bin/bash

# ==============================================================================
# MyDaily 开发服务器启动脚本（主入口）
# 同时启动前后端开发服务器，包含完整的环境检测、依赖安装、端口冲突处理。
# 辅助函数拆分在 scripts/lib/*.sh。
# ==============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIB_DIR="${ROOT_DIR}/scripts/lib"

# shellcheck source=scripts/lib/common.sh
source "${LIB_DIR}/common.sh"
# shellcheck source=scripts/lib/env.sh
source "${LIB_DIR}/env.sh"
# shellcheck source=scripts/lib/port.sh
source "${LIB_DIR}/port.sh"
# shellcheck source=scripts/lib/deps.sh
source "${LIB_DIR}/deps.sh"

BACKEND_DIR="${ROOT_DIR}/backend"
FRONTEND_DIR="${ROOT_DIR}/frontend"
BACKEND_PORT=8000
FRONTEND_PORT=5173
HEALTH_CHECK_MAX_RETRIES=30

BACKEND_PID=""
FRONTEND_PID=""

trap cleanup EXIT INT TERM

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
    check_env_file "${ROOT_DIR}"
    check_directories "${ROOT_DIR}"
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
        ensure_backend_deps "${BACKEND_DIR}" "${SKIP_INSTALL}"
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        ensure_frontend_deps "${FRONTEND_DIR}" "${SKIP_INSTALL}"
    fi
    echo ""

    # 4. 启动服务
    log_step "===== 启动服务 ====="
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        start_backend "${BACKEND_DIR}" "${ROOT_DIR}" "${BACKEND_PORT}"
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        start_frontend "${FRONTEND_DIR}" "${FRONTEND_PORT}"
    fi
    echo ""

    # 5. 健康检查
    log_step "===== 健康检查 ====="
    if [[ "${FRONTEND_ONLY}" != true ]]; then
        health_check_backend "${BACKEND_PORT}" "${HEALTH_CHECK_MAX_RETRIES}"
    fi
    if [[ "${BACKEND_ONLY}" != true ]]; then
        health_check_frontend "${FRONTEND_PORT}" "${HEALTH_CHECK_MAX_RETRIES}"
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
    monitor_processes 5
}

main "$@"
