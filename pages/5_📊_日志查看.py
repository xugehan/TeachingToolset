# -*- coding: utf-8 -*-
"""
日志查看页面（仅限本地访问）
查看系统运行日志
"""

import streamlit as st
import os
from logger_utils import get_log_info, LOG_DIR
from access_control import check_admin_access

st.set_page_config(
    page_title="日志查看",
    page_icon="📊",
    layout="wide"
)

st.title("📊 日志查看")
st.caption("🔒 管理员功能 - 仅限本地访问")
st.markdown("---")

# 检查访问权限（仅本地访问）
check_admin_access("日志查看页面")

# 获取日志文件信息
log_files = get_log_info()

if not log_files:
    st.info("📭 暂无日志文件")
else:
    st.success(f"📁 共找到 {len(log_files)} 个日志文件")

    # 显示日志文件列表
    st.subheader("📋 日志文件列表")

    for log_file in log_files:
        with st.expander(f"📄 {log_file['文件名']} - {log_file['大小(MB)']} MB - {log_file['修改时间']}"):
            col1, col2 = st.columns([3, 1])

            with col1:
                # 读取并显示日志内容
                try:
                    with open(log_file['文件路径'], 'r', encoding='utf-8') as f:
                        log_content = f.read()

                    # 显示最后100行
                    lines = log_content.split('\n')
                    if len(lines) > 100:
                        st.caption(f"显示最后100行（共{len(lines)}行）")
                        display_content = '\n'.join(lines[-100:])
                    else:
                        display_content = log_content

                    st.text_area(
                        "日志内容",
                        value=display_content,
                        height=400,
                        key=f"log_content_{log_file['文件名']}",
                        label_visibility="collapsed"
                    )
                except Exception as e:
                    st.error(f"读取日志文件失败: {str(e)}")

            with col2:
                st.metric("文件大小", f"{log_file['大小(MB)']} MB")
                st.metric("修改时间", log_file['修改时间'])

                # 下载按钮
                try:
                    with open(log_file['文件路径'], 'rb') as f:
                        log_data = f.read()

                    st.download_button(
                        label="⬇️ 下载日志",
                        data=log_data,
                        file_name=log_file['文件名'],
                        mime="text/plain",
                        width='stretch',
                        key=f"download_{log_file['文件名']}"
                    )
                except Exception as e:
                    st.error(f"下载失败: {str(e)}")

st.markdown("---")

# 日志说明
st.info("""
💡 **日志说明**：
- 日志文件按日期自动创建（格式：YYYYMMDD_类型.log）
- 单个日志文件最大5MB，超过后自动创建新文件
- 最多保留10个备份文件
- 日志包含：生成时间、文件名、各种参数等详细信息
- 两种日志类型：
  - `dictation`：默写纸生成器日志
  - `grades`：成绩小分条生成器日志
""")

