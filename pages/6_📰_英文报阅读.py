# -*- coding: utf-8 -*-
"""上海学生英文报：上传 PDF，勾选阅读和配套题，导出 Word / 答案 / 门口易测答题纸。"""

from __future__ import annotations

import hashlib
import tempfile
from pathlib import Path

import streamlit as st

from english_toolkit.mkyice import MkyiceError, create_mkyice_sheet
from english_toolkit.ssp import collect_mcqs, describe_exercises, extract_issue, export_reading_docx
from english_toolkit.ssp_answers import apply_answer_key, compact_mcq_answers, export_reading_answers_docx, parse_answer_pdf

# bump when parser/export changes so the same PDF 会重新识别
SSP_CACHE_VER = "layout-six-v11"

st.set_page_config(page_title="英文报阅读排版", page_icon="📰", layout="wide")
st.title("📰 英文报阅读排版")
st.caption(
    "上传《上海学生英文报》PDF → 勾选篇目 → 导出试卷 Word、答案 Word，并生成门口易测答题纸。"
    "选择题和六选四按勾选顺序连续编号；填空、词形保持原题号。"
)
st.markdown("---")

uploaded = st.file_uploader("报纸 PDF", type=["pdf"])
if not uploaded:
    st.info("把每周的 SSP 高中进阶版 PDF 拖进来。识别完成后在下方勾选要印的阅读，顺序就是 Passage 1、2、3。")
    st.stop()

file_hash = SSP_CACHE_VER + hashlib.sha256(uploaded.getvalue()).hexdigest()
if st.session_state.get("ssp_hash") != file_hash:
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(uploaded.getvalue())
        pdf_path = tmp.name
    with st.spinner("正在识别版面、文章和配套题…"):
        try:
            issue = extract_issue(pdf_path)
        except Exception as exc:
            st.error(f"识别失败：{exc}")
            st.stop()
    st.session_state.ssp_hash = file_hash
    st.session_state.ssp_issue = issue
    st.session_state.pop("ssp_docx", None)
    st.session_state.pop("ssp_ans_docx", None)

issue = st.session_state.ssp_issue
articles = [a for a in (issue.get("articles") or []) if a.get("kind") != "debate" or a.get("passage")]
readings = [a for a in articles if a.get("kind") not in {"debate", "extra"}]
extras = [a for a in articles if a.get("kind") == "extra"]
debates = [a for a in articles if a.get("kind") == "debate"]

col_a, col_b, col_c, col_d = st.columns(4)
col_a.metric("期号", f"第{issue.get('issue') or '?'}期")
col_b.metric("日期", issue.get("date") or "—")
col_c.metric("阅读", str(len(readings)))
col_d.metric("专项 / 配套", str(len(extras) + sum(1 for a in readings if a.get("exercises"))))

st.markdown("### 导出选项")
opt1, opt2, opt3 = st.columns(3)
with opt1:
    include_questions = st.checkbox("附带配套题目", value=True, help="B 版阅读选择、六选四、思维导图、猜词等")
with opt2:
    include_vocab = st.checkbox("附带词汇 / 词形题", value=True, help="翻译短语、词形填空、词性转换")
with opt3:
    include_bank = st.checkbox("附带 Word Bank", value=False)

answer_file = st.file_uploader("参考答案 PDF（可选，用于答案 Word 和门口易测填涂）", type=["pdf"])
if answer_file:
    ans_hash = hashlib.sha256(answer_file.getvalue()).hexdigest()
    if st.session_state.get("ssp_ans_hash") != ans_hash:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
            tmp.write(answer_file.getvalue())
            st.session_state.ssp_ans_path = tmp.name
            st.session_state.ssp_ans_hash = ans_hash

st.markdown("### 勾选篇目")
st.caption("点选顺序就是 Passage 编号。B 版专项（完形 / 语法填空 / 选词填空）会单独列出来，勾上就会编进 Word。")


def _label(article: dict) -> str:
    bits = [article.get("title") or article["id"]]
    if article.get("page"):
        bits.append(article["page"])
    if article.get("genre"):
        bits.append(article["genre"])
    if article.get("words"):
        bits.append(f"{article['words']}词")
    if article.get("level"):
        bits.append(f"{article['level']}级")
    bits.append(describe_exercises(article))
    return " · ".join(bits)


grouped = [("阅读", readings)]
if extras:
    grouped.append(("专项练习", extras))
if debates:
    grouped.append(("辩论", debates))

selected_ids: list[str] = []
for heading, group in grouped:
    if not group:
        continue
    st.markdown(f"**{heading}**")
    labels = [_label(article) for article in group]
    chosen = st.multiselect(
        f"要排版的{heading}（顺序即 Passage 1、2、3）",
        labels,
        key=f"ssp_select_{heading}",
    )
    for label in chosen:
        selected_ids.append(group[labels.index(label)]["id"])

if not selected_ids:
    st.warning("先勾选至少一篇阅读。")
    st.stop()

lookup = {a["id"]: a for a in articles}
st.markdown("### 将输出")
for i, art_id in enumerate(selected_ids, start=1):
    article = lookup[art_id]
    st.write(f"**Passage {i}**  {article.get('title')}  ·  {describe_exercises(article)}")
    preview = (article.get("passage") or "").replace("\n", " ")
    if preview:
        with st.expander(f"预览 Passage {i}", expanded=False):
            st.write(preview[:800] + ("…" if len(preview) > 800 else ""))

mcqs = collect_mcqs(
    issue,
    selected_ids,
    include_vocab_exercises=include_vocab,
    include_questions=include_questions,
)
if st.session_state.get("ssp_ans_path"):
    try:
        parsed = parse_answer_pdf(st.session_state.ssp_ans_path)
        apply_answer_key(mcqs, parsed)
    except Exception as exc:
        st.warning(f"参考答案未能完整识别：{exc}")

keys = compact_mcq_answers(mcqs)
filled = sum(1 for item in mcqs if item.get("answer"))
st.info(f"选择题 {len(mcqs)} 道（答题卡连续编号）。已对上答案 {filled} 道。" + (f"  {keys}" if filled else ""))

issue_no = issue.get("issue") or ""
paper_name = f"高二英语阅读_SSP{issue_no}.docx"
ans_name = f"高二英语阅读_SSP{issue_no}_答案.docx"
quiz_name = st.text_input("门口易测测验名称", value=f"ssp{issue_no} 阅读+完形{len(mcqs)}")

c1, c2 = st.columns(2)
with c1:
    make_paper = st.button("生成试卷 Word", type="primary")
with c2:
    make_answers = st.button("生成答案 Word")

if make_paper:
    dest = Path(tempfile.gettempdir()) / paper_name
    export_reading_docx(
        issue,
        selected_ids,
        dest,
        include_word_bank=include_bank,
        include_vocab_exercises=include_vocab,
        include_questions=include_questions,
    )
    st.session_state.ssp_docx = dest.read_bytes()
    st.session_state.ssp_docx_name = paper_name
    st.success("试卷已生成。")

if make_answers:
    dest = Path(tempfile.gettempdir()) / ans_name
    export_reading_answers_docx(
        issue,
        selected_ids,
        dest,
        answer_pdf=st.session_state.get("ssp_ans_path"),
        include_vocab_exercises=include_vocab,
        include_questions=include_questions,
    )
    st.session_state.ssp_ans_docx = dest.read_bytes()
    st.session_state.ssp_ans_docx_name = ans_name
    st.success("答案已生成。")

if st.session_state.get("ssp_docx"):
    st.download_button(
        "下载试卷 Word",
        data=st.session_state.ssp_docx,
        file_name=st.session_state.get("ssp_docx_name") or paper_name,
        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
if st.session_state.get("ssp_ans_docx"):
    st.download_button(
        "下载答案 Word",
        data=st.session_state.ssp_ans_docx,
        file_name=st.session_state.get("ssp_ans_docx_name") or ans_name,
        mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )

st.markdown("### 门口易测答题纸")
st.caption("只在本次浏览器会话里登录，不会把密码写入文件。会按当前选择题（含猜词三选一、六选四六选项、完形）建卡并填上标准答案。")
m1, m2 = st.columns(2)
with m1:
    mobile = st.text_input("门口易测手机号", value=st.session_state.get("mkyice_mobile") or "")
with m2:
    password = st.text_input("门口易测密码", type="password")
if mobile:
    st.session_state.mkyice_mobile = mobile
make_sheet = st.button("生成门口易测答题纸")

if make_sheet:
    if not mcqs:
        st.error("当前勾选里没有选择题。")
    elif not mobile or not password:
        st.error("先填门口易测手机号和密码。")
    else:
        with st.spinner("正在创建门口易测测验并填入答案…"):
            try:
                created = create_mkyice_sheet(mobile, password, quiz_name.strip() or f"ssp{issue_no}", mcqs)
            except MkyiceError as exc:
                st.error(str(exc))
            except Exception as exc:
                st.error(f"门口易测创建失败：{exc}")
            else:
                st.session_state.ssp_mkyice_url = created["url"]
                st.success("答题纸已建好，标准答案已填上，可以直接扫卡。")

if st.session_state.get("ssp_mkyice_url"):
    st.markdown(f"[打开门口易测答题卡]({st.session_state.ssp_mkyice_url})")
