# -*- coding: utf-8 -*-
"""
试卷生成器页面
嵌入原 Node 试卷生成器，功能保持不变。
"""

import os
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request

import streamlit as st
import streamlit.components.v1 as components

EXAM_HOST = "127.0.0.1"
EXAM_PORT = 4173
EXAM_URL = f"http://{EXAM_HOST}:{EXAM_PORT}"
HEALTH_URL = f"{EXAM_URL}/api/health"
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXAM_DIR = os.path.join(ROOT_DIR, "exam_paper_generator")
SERVER_JS = os.path.join(EXAM_DIR, "server.js")

st.set_page_config(
    page_title="试卷生成器",
    page_icon="📑",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown(
    """
    <style>
      [data-testid="stHeader"] { display: none; }
      .block-container {
        padding-top: 0.35rem !important;
        padding-bottom: 0 !important;
        padding-left: 0.4rem !important;
        padding-right: 0.4rem !important;
        max-width: 100% !important;
      }
      .stApp, section.main, section.main > div {
        overflow: hidden !important;
      }
      [data-testid="stIFrame"],
      iframe {
        width: 100% !important;
        height: calc(100vh - 3.6rem) !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)


def exam_is_up():
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=1.5) as response:
            return response.status == 200
    except (urllib.error.URLError, TimeoutError, ConnectionError, socket.timeout, OSError):
        return False


def port_in_use(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.4)
        return sock.connect_ex((EXAM_HOST, port)) == 0


def start_exam_server():
    node = shutil.which("node")
    if not node:
        return "未找到 Node.js。请先安装 Node.js，再打开本页。"
    if not os.path.isfile(SERVER_JS):
        return f"找不到试卷生成器文件：{SERVER_JS}"
    try:
        subprocess.Popen(
            [node, SERVER_JS],
            cwd=EXAM_DIR,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
    except OSError as error:
        return f"无法启动试卷生成器：{error}"
    return None


def wait_until_ready(seconds=12):
    deadline = time.time() + seconds
    while time.time() < deadline:
        if exam_is_up():
            return True
        time.sleep(0.4)
    return False


if not exam_is_up():
    if port_in_use(EXAM_PORT):
        st.error(f"端口 {EXAM_PORT} 已被占用，但试卷服务尚未就绪。请关闭占用该端口的程序后刷新本页。")
        st.stop()
    with st.spinner("正在启动试卷生成器…"):
        start_error = start_exam_server()
        if start_error:
            st.error(start_error)
            st.stop()
        if not wait_until_ready():
            st.error("试卷生成器启动超时。请确认已安装 Node.js，并在 exam_paper_generator 目录执行过 npm install。")
            st.stop()

components.iframe(EXAM_URL, height=2400, scrolling=True)
