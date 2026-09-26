# -*- coding: utf-8 -*-
"""
问题报告页面
用户可以报告问题，管理员可以回复和删除
"""

import streamlit as st
import pandas as pd
import os
from datetime import datetime
from access_control import is_local_access, get_client_ip

# 问题报告CSV文件路径
ISSUES_FILE = "issues_report.csv"

st.set_page_config(
    page_title="问题报告",
    page_icon="🐛",
    layout="wide"
)

st.title("🐛 问题报告")
st.caption("反馈使用中遇到的问题")
st.markdown("---")


def load_issues():
    """加载问题报告数据"""
    if os.path.exists(ISSUES_FILE):
        try:
            df = pd.read_csv(ISSUES_FILE, encoding='utf-8', dtype={
                'id': 'int64',
                'ip': 'str',
                'timestamp': 'str',
                'content': 'str',
                'replies': 'str',
                'reply_timestamps': 'str'
            })
            # 确保必要的列存在
            required_columns = ['id', 'ip', 'timestamp', 'content', 'replies', 'reply_timestamps']
            for col in required_columns:
                if col not in df.columns:
                    df[col] = ''
            return df
        except Exception as e:
            st.error(f"加载问题报告失败：{e}")
            return pd.DataFrame(columns=['id', 'ip', 'timestamp', 'content', 'replies', 'reply_timestamps'])
    else:
        return pd.DataFrame(columns=['id', 'ip', 'timestamp', 'content', 'replies', 'reply_timestamps'])


def save_issues(df):
    """保存问题报告数据"""
    try:
        df.to_csv(ISSUES_FILE, index=False, encoding='utf-8')
        return True
    except Exception as e:
        st.error(f"保存问题报告失败：{e}")
        return False


def add_issue(content, ip):
    """添加新问题"""
    df = load_issues()

    # 生成新ID
    if len(df) == 0:
        new_id = 1
    else:
        new_id = df['id'].max() + 1

    # 创建新记录
    new_issue = pd.DataFrame([{
        'id': new_id,
        'ip': ip,
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'content': content,
        'replies': '',
        'reply_timestamps': ''
    }])

    df = pd.concat([df, new_issue], ignore_index=True)
    return save_issues(df)


def add_reply(issue_id, reply_content):
    """添加回复（仅限管理员）"""
    df = load_issues()
    idx = df[df['id'] == issue_id].index

    if len(idx) == 0:
        return False

    idx = idx[0]
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    # 获取现有回复
    existing_replies = df.at[idx, 'replies']
    existing_timestamps = df.at[idx, 'reply_timestamps']

    # 添加新回复
    if pd.isna(existing_replies) or existing_replies == '':
        df.at[idx, 'replies'] = reply_content
        df.at[idx, 'reply_timestamps'] = current_time
    else:
        df.at[idx, 'replies'] = existing_replies + '||' + reply_content
        df.at[idx, 'reply_timestamps'] = existing_timestamps + '||' + current_time

    return save_issues(df)


def delete_issue(issue_id):
    """删除问题（仅限管理员）"""
    df = load_issues()
    df = df[df['id'] != issue_id]
    return save_issues(df)


# 检查访问权限
is_admin = is_local_access()
client_ip = get_client_ip()

if is_admin:
    st.success("🔓 管理员模式 - 您可以回复和删除问题")
else:
    st.info("👤 访客模式 - 您可以查看和报告问题")

# 问题报告表单
st.subheader("📝 报告新问题")

with st.form("new_issue_form", clear_on_submit=True):
    issue_content = st.text_area(
        "问题描述",
        placeholder="请详细描述您遇到的问题...",
        height=100,
        help="请尽可能详细地描述问题，以便我们更好地帮助您"
    )

    col1, col2 = st.columns([1, 5])
    with col1:
        submit_button = st.form_submit_button("🚀 提交问题", width='stretch')

    if submit_button:
        if issue_content.strip():
            if add_issue(issue_content.strip(), client_ip):
                st.success("✅ 问题报告提交成功！")
                st.rerun()
            else:
                st.error("❌ 提交失败，请重试")
        else:
            st.warning("⚠️ 请输入问题描述")

st.markdown("---")

# 显示所有问题
st.subheader("📋 问题列表")

issues_df = load_issues()

if len(issues_df) == 0:
    st.info("📭 暂无问题报告")
else:
    # 按ID降序排列（最新的在前）
    issues_df = issues_df.sort_values('id', ascending=False)

    st.caption(f"共 {len(issues_df)} 个问题报告")
    display_id = len(issues_df)

    for idx, row in issues_df.iterrows():
        issue_id = display_id
        display_id -= 1
        issue_ip = row['ip']
        issue_time = row['timestamp']
        issue_content = row['content']
        replies = row['replies'] if pd.notna(row['replies']) and row['replies'] else ''
        reply_times = row['reply_timestamps'] if pd.notna(row['reply_timestamps']) and row['reply_timestamps'] else ''

        with st.container():
            # 问题头部
            col1, col2 = st.columns([5, 1])

            with col1:
                st.markdown(f"### 🆔 问题 #{issue_id}")
                st.caption(f"📍 IP: `{issue_ip}` | ⏰ 时间: {issue_time}")

            with col2:
                if is_admin:
                    if st.button("🗑️ 删除", key=f"delete_{issue_id}", width='stretch'):
                        if delete_issue(issue_id):
                            st.success("删除成功")
                            st.rerun()
                        else:
                            st.error("删除失败")

            # 问题内容
            st.markdown(f"**问题内容：**")
            st.info(issue_content)

            # 显示回复
            if replies:
                reply_list = replies.split('||')
                reply_time_list = reply_times.split('||')

                st.markdown("**💬 管理员回复：**")
                for i, (reply, reply_time) in enumerate(zip(reply_list, reply_time_list)):
                    st.success(f"🔹 {reply}\n\n*回复时间: {reply_time}*")

            # 管理员回复表单
            if is_admin:
                with st.expander("➕ 添加回复"):
                    with st.form(f"reply_form_{issue_id}"):
                        reply_content = st.text_area(
                            "回复内容",
                            placeholder="输入您的回复...",
                            height=80,
                            key=f"reply_input_{issue_id}"
                        )

                        reply_submit = st.form_submit_button("📤 发送回复")

                        if reply_submit:
                            if reply_content.strip():
                                if add_reply(issue_id, reply_content.strip()):
                                    st.success("回复成功！")
                                    st.rerun()
                                else:
                                    st.error("回复失败")
                            else:
                                st.warning("请输入回复内容")

            st.markdown("---")

# 页脚
st.markdown("""
<div style="text-align: center; color: #666; padding: 20px; margin-top: 40px;">
    <p>💡 您的反馈对我们很重要，我们会尽快查看并回复</p>
</div>
""", unsafe_allow_html=True)

