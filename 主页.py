# -*- coding: utf-8 -*-
"""
教学工具集 - 主页
"""

import streamlit as st

st.set_page_config(
    page_title="教学工具集",
    page_icon="🎓",
    layout="wide",
)

st.title("🎓 教学工具集")
st.caption("多功能教学材料生成工具 - 提升教学效率")
st.markdown("---")

st.header("欢迎使用教学工具集！")
st.markdown("""
这是一个集成了多种教学辅助工具的应用，帮助老师快速生成各类教学材料。

### 📑 可用功能

请使用**左侧导航栏**选择需要的功能：
""")

col1, col2, col3 = st.columns(3)

with col1:
    st.subheader("📝 重默生成器")
    st.markdown("""
    **功能**：生成表格形式的默写练习PDF

    **适用场景**：
    - 词汇默写练习
    - 短语听写测试
    - 单元复习材料

    👉 左侧 **"📝 默写纸生成器"**
    """)

with col2:
    st.subheader("📄 成绩小分条")
    st.markdown("""
    **功能**：生成学生成绩小分条PDF

    **适用场景**：
    - 期中/期末成绩通知
    - 单元测验成绩单
    - 家长会材料

    👉 左侧 **"📄 成绩小分条"**
    """)

with col3:
    st.subheader("📑 试卷生成器")
    st.markdown("""
    **功能**：上海高中英语组卷，导出 Word

    **适用场景**：
    - 期中/期末出卷
    - 选题型、粘题目、预览成卷
    - 导出试卷与答案 Word

    👉 左侧 **"📑 试卷生成器"**
    """)

col4, col5, col6 = st.columns(3)

with col4:
    st.subheader("📰 英文报阅读")
    st.markdown("""
    **功能**：从《上海学生英文报》PDF 勾选阅读和配套题并排版

    **适用场景**：
    - 每周从 SSP 抽阅读给学生印，并可出答案和门口易测答题纸
    - Passage 1 / 2 / 3 编号，带 B 版题目和完形等专项
    - 导出 Word（五号、Times + 宋体）

    👉 左侧 **"📰 英文报阅读排版"**
    """)

with col5:
    st.subheader("🐛 问题报告")
    st.markdown("""
    **功能**：报告和追踪使用问题

    👉 左侧 **"🐛 问题报告"**
    """)

with col6:
    st.subheader("📊 日志查看")
    st.markdown("""
    **功能**：查看系统运行日志（管理员）

    👉 左侧 **"📊 日志查看"**
    """)

st.markdown("---")

with st.expander("🚀 快速开始", expanded=False):
    st.markdown("""
    1. 在左侧导航栏点击需要的功能
    2. 默写纸：准备单词/短语，每行一条
    3. 成绩小分条：下载 Excel 模板并上传
    4. 试卷生成器：勾选题型 → 进入组卷 → 导出 Word
    5. 英文报阅读：上传 SSP PDF → 勾选篇目 → 导出试卷 Word / 答案 Word，并可生成门口易测答题纸
    """)

st.markdown("""
<div style="text-align: center; color: #666; padding: 20px;">
    <p>💡 如有问题或建议，请联系徐戈涵</p>
    <p style="font-size: 12px;">© 2025 教学工具集 · All Rights Reserved</p>
</div>
""", unsafe_allow_html=True)
