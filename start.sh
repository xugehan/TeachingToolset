#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate
python -c "import streamlit, english_toolkit" 2>/dev/null || pip install -e .

NODE=""
for candidate in \
  "$(command -v node 2>/dev/null || true)" \
  /opt/homebrew/bin/node \
  /usr/local/bin/node \
  "/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node"
do
  if [[ -n "$candidate" && -x "$candidate" ]]; then
    NODE="$candidate"
    break
  fi
done
if [[ -z "$NODE" ]]; then
  echo "找不到 Node.js，无法启动原来的试卷生成器。"
  exit 1
fi

if [[ ! -d exam-paper/node_modules/docx ]]; then
  echo "试卷生成器依赖还没装。请在 exam-paper 目录执行 npm install。"
  exit 1
fi

# 重新拉起时先释放上次残留的端口
for port in 8501 4173; do
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    kill $pids 2>/dev/null || true
  fi
done
sleep 0.4

"$NODE" exam-paper/server.js &
EXAM_PID=$!
cleanup() {
  kill "$EXAM_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 0.4
IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
echo "本机工具集： http://127.0.0.1:8501"
if [[ -n "$IP" ]]; then
  echo "同事工具集： http://${IP}:8501"
fi
echo "网页开着时，这台电脑不会因为闲置而休眠。"
echo "用完后在这个窗口按 Ctrl+C 停止。"
if command -v caffeinate >/dev/null 2>&1; then
  caffeinate -i -s streamlit run 主页.py --server.address 0.0.0.0 --server.port 8501
else
  streamlit run 主页.py --server.address 0.0.0.0 --server.port 8501
fi
