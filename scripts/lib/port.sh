#!/bin/bash
# scripts/lib/port.sh
# MyDaily 开发脚本：端口占用检测与释放。

check_port() {
    local port=$1
    if lsof -i "TCP:${port}" -sTCP:LISTEN -t &>/dev/null 2>&1; then
        return 0  # 端口被占用
    fi
    return 1  # 端口空闲
}

get_port_processes() {
    local port=$1
    lsof -i "TCP:${port}" -sTCP:LISTEN -t 2>/dev/null | tr '\n' ' ' | sed 's/ $//'
}

get_process_name() {
    local pid=$1
    local first_pid
    first_pid=$(echo "$pid" | awk '{print $1}')
    ps -p "${first_pid}" -o comm= 2>/dev/null | awk -F/ '{print $NF}' | tr -d ' ' || echo "unknown"
}

# 释放被本项目旧进程占用的端口；非本项目进程则直接报错退出
kill_port_if_needed() {
    local port=$1
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

    if echo "${proc_name}" | grep -qE "^(uvicorn|python|Python|node|vite)$"; then
        log_warn "检测到可能是之前的开发服务器进程，正在尝试终止..."
        for pid in $pids; do
            kill "$pid" 2>/dev/null || true
        done
        sleep 1

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
