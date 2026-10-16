#!/usr/bin/env bash
# 与 .github/workflows/ci.yml 对齐的本地检查。
# GitHub Actions 在安装依赖后按参数调用：backend | frontend | pre-commit
# 本地直接运行（无参数）会顺序执行这三项。

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "${SKIP_LOCAL_CI:-}" == "1" ]]; then
  echo "SKIP_LOCAL_CI=1，已跳过本地 CI"
  exit 0
fi

TARGET="${1:-all}"
PY=""
PRE_COMMIT=""

step() {
  echo ""
  echo "==> $*"
}

ensure_python() {
  if [[ -n "$PY" ]]; then
    return
  fi

  if [[ "${CI:-}" == "true" ]]; then
    if command -v python3 >/dev/null 2>&1; then
      PY="$(command -v python3)"
    else
      PY="$(command -v python)"
    fi
    PRE_COMMIT="$(command -v pre-commit || true)"
    return
  fi

  local base_py=""
  if command -v python3.11 >/dev/null 2>&1; then
    base_py="$(command -v python3.11)"
  else
    echo "未找到 Python 3.11（GitHub Actions 使用 3.11），改用 $(python3 --version 2>&1)。"
    base_py="$(command -v python3)"
  fi

  local venv="$ROOT/.cache/ci-venv"
  local stamp="$venv/.requirements-stamp"
  local hash
  hash="$(cksum "$ROOT/backend/requirements.txt" | awk '{print $1}')"

  if [[ ! -x "$venv/bin/python" || "$(cat "$stamp" 2>/dev/null || true)" != "$hash" ]]; then
    step "准备本地 CI 环境（$("$base_py" --version 2>&1)）"
    rm -rf "$venv"
    "$base_py" -m venv "$venv"
    "$venv/bin/python" -m pip install --upgrade pip
    "$venv/bin/python" -m pip install -r "$ROOT/backend/requirements.txt"
    "$venv/bin/python" -m pip install pytest-cov black isort flake8 pre-commit
    printf '%s\n' "$hash" >"$stamp"
  fi

  PY="$venv/bin/python"
  PRE_COMMIT="$venv/bin/pre-commit"
}

ensure_node() {
  if [[ "${CI:-}" == "true" ]]; then
    return
  fi
  if ! command -v node >/dev/null 2>&1; then
    echo "未找到 Node.js。GitHub Actions 使用 Node 22。"
    exit 1
  fi
  local node_major
  node_major="$(node -p 'process.versions.node.split(".")[0]')"
  if [[ "$node_major" != "22" ]]; then
    echo "当前 Node $(node -v)，GitHub Actions 使用 Node 22。"
  fi
}

run_backend() {
  ensure_python
  step "backend: black / isort / flake8"
  (
    cd "$ROOT/backend"
    "$PY" -m black --check .
    "$PY" -m isort --check-only --profile black .
    "$PY" -m flake8 --max-line-length=120 --ignore=E501,W503 .
  )

  step "backend: pytest"
  (
    cd "$ROOT/backend"
    "$PY" -m pytest --cov=. --cov-report=xml --cov-report=term-missing
  )
}

run_frontend() {
  ensure_node
  if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
    step "frontend: npm ci"
    (cd "$ROOT/frontend" && npm ci)
  fi

  step "frontend: lint"
  (cd "$ROOT/frontend" && npm run lint)

  step "frontend: format:check"
  (cd "$ROOT/frontend" && npm run format:check)

  step "frontend: test"
  (cd "$ROOT/frontend" && npm run test)

  step "frontend: build"
  (cd "$ROOT/frontend" && npm run build)
}

run_precommit() {
  ensure_python
  step "pre-commit"
  if [[ -z "$PRE_COMMIT" || ! -x "$PRE_COMMIT" ]]; then
    if command -v pre-commit >/dev/null 2>&1; then
      PRE_COMMIT="$(command -v pre-commit)"
    else
      echo "未找到 pre-commit。请先运行 make ci，或在 CI 中执行 pip install pre-commit。"
      exit 1
    fi
  fi
  "$PRE_COMMIT" run --all-files
}

on_error() {
  echo ""
  echo "本地 CI 未通过。修复后重新运行 make ci。"
  echo "紧急绕过：SKIP_LOCAL_CI=1 git push"
}

case "$TARGET" in
  backend | frontend | pre-commit | all) ;;
  *)
    echo "未知目标: ${TARGET} (backend, frontend, pre-commit, all)"
    exit 2
    ;;
esac

if [[ "${CI:-}" != "true" ]]; then
  trap on_error ERR
fi

case "$TARGET" in
  backend) run_backend ;;
  frontend) run_frontend ;;
  pre-commit) run_precommit ;;
  all)
    run_backend
    run_frontend
    run_precommit
    ;;
esac

trap - ERR
echo ""
echo "本地 CI 通过: ${TARGET}"
if [[ "${CI:-}" != "true" ]]; then
  echo "镜像构建在以上检查通过后由 GitHub Actions 的 docker-build 执行。"
fi
