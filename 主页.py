# -*- coding: utf-8 -*-
"""
教学工具集 - 主页
多功能PDF生成工具
"""

import streamlit as st

st.set_page_config(
    page_title="教学工具集",
    page_icon="🎓",
    layout="wide",
)

st.title("🎓 教学工具集")
st.caption("多功能PDF生成工具 - 提升教学效率")
st.markdown("---")

# Welcome section
st.header("欢迎使用教学工具集！")

st.markdown("""
这是一个集成了多种教学辅助工具的应用，帮助老师快速生成各类教学材料。

### 📑 可用功能

请使用左侧导航栏选择需要的功能：
""")

# Feature cards
col0, col1 = st.columns(2)

with col0:
    st.subheader("📝 试卷生成器")
    st.markdown("""
    **功能**：生成上海高中英语试卷与答案 Word
    
    **适用场景**：
    - 期末 / 期中组卷
    - 粘贴题目后自动编号、预览
    - 试卷纸 / 答案纸切换导出
    
    **特点**：
    - 功能与独立试卷生成器完全相同
    - 本机草稿自动保存
    - 导出 Word，可再微调
    
    👉 点击左侧导航栏的 **"试卷生成器"** 开始使用
    """)

with col1:
    st.subheader("📝 重默生成器")
    st.markdown("""
    **功能**：生成表格形式的默写练习PDF
    
    **适用场景**：
    - 词汇默写练习
    - 短语听写测试
    - 单元复习材料
    
    **特点**：
    - 自动排版，整齐美观
    - 支持混合中英文
    - 一次生成多个练习区域
    - SimSun + Times-Roman 字体
    
    👉 点击左侧导航栏的 **"📝 默写纸生成器"** 开始使用
    """)

col2, col3 = st.columns(2)

with col2:
    st.subheader("📄 成绩小分条")
    st.markdown("""
    **功能**：生成学生成绩小分条PDF
    
    **适用场景**：
    - 期中/期末成绩通知
    - 单元测验成绩单
    - 家长会材料
    
    **特点**：
    - Excel模板导入
    - 自定义列选择
    - 实时预览效果
    - 灵活的布局设置
    - 可配置字体字号
    
    👉 点击左侧导航栏的 **"📄 成绩小分条"** 开始使用
    """)

with col3:
    st.subheader("🐛 问题报告")
    st.markdown("""
    **功能**：报告和追踪使用问题
    
    **适用场景**：
    - 报告程序bug
    - 提出功能建议
    - 反馈使用问题
    
    **特点**：
    - 远程用户可报告问题
    - 管理员可回复问题
    - 查看历史问题记录
    - 显示报告人IP和时间
    - 管理员可删除问题
    
    👉 点击左侧导航栏的 **"🐛 问题报告"** 开始使用
    """)

col4, _ = st.columns(2)

with col4:
    st.subheader("📊 日志查看")
    st.markdown("""
    **功能**：查看系统运行日志
    
    **适用场景**：
    - 追踪PDF生成记录
    - 查看使用历史
    - 审计和统计
    
    **特点**：
    - 自动记录所有操作
    - 详细的参数信息
    - 自动文件轮转（5MB）
    - 支持日志下载
    
    👉 点击左侧导航栏的 **"📊 日志查看"** 查看日志
    """)

st.markdown("---")

# Quick start guide
with st.expander("🚀 快速开始", expanded=False):
    st.markdown("""
    ### 使用步骤
    
    1. **选择功能**
       - 在左侧导航栏点击需要的功能页面
    
    2. **准备材料**
       - 试卷生成器：不需要 Excel，打开后按页内步骤选题型、粘贴题目即可组卷
       - 重默生成器：准备15个项目（10个单词 + 5个短语）
       - 成绩小分条：准备包含学生成绩的Excel文件
    
    3. **配置参数**
       - 根据页面提示输入或上传数据
       - 调整布局、字号等参数
    
    4. **生成PDF**
       - 点击生成按钮
       - 下载生成的PDF文件
    
    ### 💡 提示
    
    - 每个功能页面都有详细的使用说明
    - 成绩小分条功能提供实时预览
    - 可以下载Excel模板参考格式
    """)


# Footer
st.markdown("""
<div style="text-align: center; color: #666; padding: 20px;">
    <p>💡 如有问题或建议，请联系徐戈涵</p>
    <p style="font-size: 12px;">© 2025 教学工具集 · All Rights Reserved</p>
</div>
""", unsafe_allow_html=True)


