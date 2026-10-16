#!/bin/bash
# scripts/lib/env.sh
# MyDaily 开发脚本：.env 文件检查与缺失项自动生成。

# 生成随机十六进制字符串
_gen_random() {
    local len="${1:-32}"
    python3 -c "import secrets; print(secrets.token_hex(${len}))" 2>/dev/null \
        || printf "%s" "$(date +%s)-$$-$(od -An -N8 -tx1 /dev/urandom | tr -d ' ')"
}

# 用 macOS/Linux 兼容的方式替换 .env 中的变量赋值
_set_env_var() {
    local file="$1"
    local key="$2"
    local value="$3"
    if [[ "$(uname)" == "Darwin" ]]; then
        sed -i '' "s|^${key}=.*|${key}=${value}|" "${file}"
    else
        sed -i "s|^${key}=.*|${key}=${value}|" "${file}"
    fi
}

# 检查并初始化 .env 文件，自动生成缺失的 MYDAILY_PASSWORD 与 MYDAILY_SECRET_KEY
check_env_file() {
    local root_dir="$1"
    local env_file="${root_dir}/.env"

    log_step "检测 .env 配置文件..."
    if [[ ! -f "${env_file}" ]]; then
        log_warn ".env 文件不存在，正在从 .env.example 复制..."
        if [[ -f "${root_dir}/.env.example" ]]; then
            cp "${root_dir}/.env.example" "${env_file}"
            log_success "已创建 .env 文件"
        else
            die ".env.example 文件不存在，无法自动创建 .env 文件"
        fi
    else
        log_success ".env 文件已存在"
    fi

    # 若 MYDAILY_PASSWORD 为空，自动生成随机密码
    local pwd_value
    pwd_value=$(grep -E '^MYDAILY_PASSWORD=' "${env_file}" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' || true)
    if [[ -z "${pwd_value}" ]]; then
        local random_pwd
        random_pwd=$(_gen_random 6)
        _set_env_var "${env_file}" "MYDAILY_PASSWORD" "${random_pwd}"
        log_info "已自动生成 MYDAILY_PASSWORD=${random_pwd}"
    fi

    # 若 MYDAILY_SECRET_KEY 为空或仍是默认值，自动生成随机密钥
    local secret_value
    secret_value=$(grep -E '^MYDAILY_SECRET_KEY=' "${env_file}" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' || true)
    if [[ -z "${secret_value}" || "${secret_value}" == "mydaily-default-secret-key" ]]; then
        local random_secret
        random_secret=$(_gen_random 32)
        _set_env_var "${env_file}" "MYDAILY_SECRET_KEY" "${random_secret}"
        log_info "已自动生成 MYDAILY_SECRET_KEY（隐藏显示）"
    fi

    # 最终确认关键变量已设置
    local missing_vars=()
    pwd_value=$(grep -E '^MYDAILY_PASSWORD=' "${env_file}" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' || true)
    secret_value=$(grep -E '^MYDAILY_SECRET_KEY=' "${env_file}" 2>/dev/null | cut -d= -f2- | tr -d '[:space:]' || true)
    [[ -z "${pwd_value}" ]]   && missing_vars+=("MYDAILY_PASSWORD")
    [[ -z "${secret_value}" ]] && missing_vars+=("MYDAILY_SECRET_KEY")
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        log_warn "以下环境变量未设置: ${missing_vars[*]}"
    else
        log_success "关键环境变量已配置"
    fi
}
