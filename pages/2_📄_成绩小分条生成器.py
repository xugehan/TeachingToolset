# -*- coding: utf-8 -*-
"""
Streamlit GUI for Student Grades Generator
使用图形界面生成学生成绩小分条PDF
"""

import streamlit as st
import pandas as pd
import os
import tempfile
import glob  # Added for file searching
from PIL import Image  # Added for image processing
from io import BytesIO
from student_grades_generator import generate_pdf
from reportlab.lib.pagesizes import A4, landscape, portrait
from logger_utils import log_grades_generation
from access_control import get_client_ip

st.set_page_config(
    page_title="学生成绩小分条生成器",
    page_icon="📄",
    layout="wide"
)


def validate_filename(filename):
    """
    验证文件名的合法性

    Args:
        filename: 要验证的文件名字符串

    Returns:
        tuple: (is_valid, error_message, processed_filename)
               - is_valid: bool, 文件名是否合法
               - error_message: str, 错误信息（如果不合法）
               - processed_filename: str, 处理后的文件名（如果合法）
    """
    # 去除首尾空格
    filename = filename.strip()

    # Check if filename is empty
    if not filename:
        return False, "❌ 请指定输出文件名", None

    # Remove .pdf extension temporarily for validation
    filename_without_ext = filename
    if filename.lower().endswith('.pdf'):
        filename_without_ext = filename[:-4]

    # Check if filename is just a dot or empty after removing extension
    if not filename_without_ext or filename_without_ext == '.':
        return False, "❌ 文件名不能为空或只包含一个点", None

    # Check for illegal characters in filename
    # Windows: < > : " / \ | ? *
    # macOS/Linux: / (null character is also illegal but hard to type)
    illegal_chars = ['<', '>', ':', '"', '/', '\\', '|', '?', '*']
    found_illegal = [char for char in illegal_chars if char in filename_without_ext]
    if found_illegal:
        error_msg = f"❌ 文件名包含非法字符: {', '.join(found_illegal)}\n\n💡 文件名不能包含以下字符: < > : \" / \\ | ? *"
        return False, error_msg, None

    # Check if filename starts or ends with dot or space
    if filename_without_ext.startswith('.'):
        return False, "❌ 文件名不能以点(.)开头", None

    if filename_without_ext.endswith('.') or filename_without_ext.endswith(' '):
        return False, "❌ 文件名不能以点(.)或空格结尾", None

    # Check for Windows reserved names
    reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
                      'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
                      'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
    if filename_without_ext.upper() in reserved_names:
        return False, f"❌ '{filename_without_ext}' 是系统保留名称，不能用作文件名", None

    # Ensure filename ends with .pdf
    final_filename = filename
    if not final_filename.lower().endswith('.pdf'):
        final_filename += '.pdf'

    return True, None, final_filename


def get_student_class_stub(student_id, df):
    """
    Stub: 根据学号获取班级
    用于定位答题卡目录结构: <selected_dir>/<班级>/...
    """
    # 尝试查找班级列
    id_cols = [c for c in df.columns if str(c).strip() in ("学号", "学号/Code", "code", "Code")]

    if id_cols:
        id_col = id_cols[0]
        # 查找对应行
        student_row = df[df[id_col].astype(str) == str(student_id)]
        if not student_row.empty:
            class_id = int(str(student_id)[2:4])
            return f"高一{class_id}班"
    return ""


st.title("📄 学生成绩小分条生成器")
st.markdown("---")

# Sidebar for file uploads
with st.sidebar:
    st.header("📥 下载模板")

    # Template download
    template_file = "template.xlsx"
    if os.path.exists(template_file):
        with open(template_file, "rb") as template:
            template_data = template.read()

        st.download_button(
            label="⬇️ 下载Excel模板",
            data=template_data,
            file_name="学生成绩模板.xlsx",
            mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            help="下载此模板，按照模板格式填写学生成绩数据",
            width='stretch'
        )
        st.info("📋 **模板使用说明**：  \n"
               "• 必须保持：**姓名**、**学号** 两列  \n"
               "• 可以修改：其他项目列可自由添加、删除或重命名  \n"
               "• 模板包含3行示例数据供参考")
    else:
        st.warning("⚠️ 模板文件不存在")

    st.markdown("---")
    st.header("📁 上传文件")

    uploaded_excel = st.file_uploader(
        "上传Excel文件",
        type=["xlsx", "xls"],
        key="excel_file",
        help="包含学生成绩数据的Excel文件"
    )

    uploaded_font = st.file_uploader(
        "上传字体文件（可选，高级功能）",
        type=["ttf", "ttc"],
        key="font_file",
        help="支持中文的字体文件，如宋体、黑体等"
    )

    # --- Added: Answer Sheet Directory Input ---
    st.markdown("---")
    st.header("🖼️ 答题卡设置")
    image_dir = st.text_input(
        "答题卡图片根目录",
        help="存放学生答题卡图片的本地文件夹路径。\n结构: <目录>/<班级>/<学号>(姓名)/...-01.png"
    )
    # -------------------------------------------

    st.markdown("---")
    st.markdown("### 💡 使用说明")
    st.markdown("""
    1. **下载模板**（首次使用）
       - 点击"下载Excel模板"按钮
       - 按照模板格式填写学生数据
    2. **上传文件**
       - 上传填好的Excel文件
       - （可选）上传中文字体文件
    3. **选择列**
       - 勾选需要显示的成绩项目
    4. **调整参数**
       - 设置标题、布局、字号等
    5. **生成PDF**
       - 点击"生成PDF"按钮
       - 下载生成的PDF文件
    """)

# Main content area
if uploaded_excel is None:
    st.info("👈 请先在左侧上传Excel文件")
    st.stop()

# Preview Excel data
st.header("📊 数据预览")
try:
    # Detect file extension and use appropriate engine
    file_ext = os.path.splitext(uploaded_excel.name)[1].lower()
    if file_ext == '.xls':
        df = pd.read_excel(uploaded_excel, engine="xlrd")
    elif file_ext == '.xlsx':
        df = pd.read_excel(uploaded_excel, engine="openpyxl")
    else:
        # Try openpyxl as default
        df = pd.read_excel(uploaded_excel, engine="openpyxl")

    st.dataframe(df.head(10), width='stretch')
    st.caption(f"共 {len(df)} 条记录，文件格式: {file_ext}")
except Exception as e:
    st.error(f"读取Excel文件失败: {str(e)}")
    st.stop()

st.markdown("---")

# Column selection
st.header("📝 选择要显示的列")
st.caption("勾选需要在PDF中显示的成绩项目（姓名、学号会自动显示）")

# Find name, code, and class columns
code_col_candidates = [c for c in df.columns if str(c).strip() in ("学号", "学号/Code", "code", "Code")]
code_col = code_col_candidates[0] if code_col_candidates else None

name_col_candidates = [c for c in df.columns if str(c).strip() in ("姓名", "姓名/Name", "name", "Name")]
name_col = name_col_candidates[0] if name_col_candidates else None

class_col_candidates = [c for c in df.columns if str(c).strip() in ("班级", "班级/Class", "class", "Class")]
class_col = class_col_candidates[0] if class_col_candidates else None

# Get all columns except name, code, and class
detail_cols_all = [cn for cn in df.columns if (not isinstance(cn, str)) or (((name_col is None) or cn != name_col) and (code_col is None or cn != code_col) and (class_col is None or cn != class_col))]

# Create checkboxes for each column
if detail_cols_all:
    # Display in multiple columns for better layout
    num_checkbox_cols = min(4, len(detail_cols_all))
    checkbox_cols = st.columns(num_checkbox_cols)

    selected_columns = {}
    for idx, col_name in enumerate(detail_cols_all):
        col_idx = idx % num_checkbox_cols
        with checkbox_cols[col_idx]:
            selected_columns[col_name] = st.checkbox(
                str(col_name),
                value=True,
                key=f"col_select_{idx}"
            )

    # Filter selected columns
    detail_cols = [col for col in detail_cols_all if selected_columns.get(col, True)]

    st.caption(f"已选择 {len(detail_cols)} / {len(detail_cols_all)} 个项目")

    if len(detail_cols) == 0:
        st.warning("⚠️ 请至少选择一个项目")
else:
    detail_cols = []
    st.info("除了姓名、学号、班级外，没有其他可选列")

st.markdown("---")

# --- Added: Image Cropper Logic ---
crop_rect = None
if image_dir:
    st.header("✂️ 答题卡截取设置")
    if not os.path.isdir(image_dir):
        st.error(f"❌ 目录不存在: {image_dir}")
    else:
        # 尝试获取第一个学生的信息用于预览
        if code_col:
            first_student = df.iloc[0]
            s_id = str(first_student[code_col])
            s_name = str(first_student[name_col]) if name_col else ""
            s_class = get_student_class_stub(s_id, df)

            # 寻找图片: <selected_dir>/<班级>/<学号>（<姓名>)/<学号>_<学科名>-<序号>.png
            # 1. 进入班级目录
            class_dir = os.path.join(image_dir, s_class)

            # 2. 寻找学生文件夹，匹配 学号* (处理可能的括号格式差异)
            student_dir_pattern = os.path.join(class_dir, f"{s_id}*")
            found_dirs = glob.glob(student_dir_pattern)

            if found_dirs:
                student_dir = found_dirs[0]
                # 3. 寻找序号为01的图片 (匹配结尾为01.png)
                img_pattern = os.path.join(student_dir, "*01.png")
                found_imgs = glob.glob(img_pattern)

                if found_imgs:
                    preview_img_path = found_imgs[0]
                    st.info(f"正在使用学生 {s_name} ({s_id}) 的答题卡进行定位: {os.path.basename(preview_img_path)}")

                    try:
                        from streamlit_cropper import st_cropper
                        img = Image.open(preview_img_path)

                        st.markdown("👉 **请在下方图片上用鼠标框选需要截取的区域**")
                        # 获取裁剪框坐标
                        box = st_cropper(img, realtime_update=True, box_color='red', aspect_ratio=None, return_type='box')
                        crop_rect = box # {'left': x, 'top': y, 'width': w, 'height': h}

                        st.caption(f"裁剪区域: {crop_rect}")
                    except ImportError:
                        st.error("⚠️ 请安装 `streamlit-cropper` 以使用此功能: `pip install streamlit-cropper`")
                else:
                    st.warning(f"在 {student_dir} 中未找到序号为01的图片")
            else:
                st.warning(f"未找到学生 {s_id} 的文件夹 (预期路径: {student_dir_pattern})")
        else:
            st.warning("无法识别学号列，无法定位答题卡")

st.markdown("---")
# ----------------------------------

# Configuration columns
col1, col2 = st.columns([1, 1])

with col1:
    st.header("⚙️ 基本设置")

    title = st.text_input(
        "文档标题",
        value="学生成绩小分条",
        help="显示在每页顶部的标题"
    )

    card_title = st.text_input(
        "卡片标题",
        value="",
        help="显示在每个卡片右上角的标题"
    )

    output_filename = st.text_input(
        "输出文件名",
        value="",
        help="生成的PDF文件名（需要包含.pdf后缀）"
    )

    orientation = st.radio(
        "页面方向",
        options=["横向", "纵向"],
        index=1,
        horizontal=True
    )

    st.subheader("📐 布局设置")

    cols = st.slider(
        "每行卡片数",
        min_value=1,
        max_value=4,
        value=2,
        help="每行显示几个卡片"
    )

    rows = st.slider(
        "每页行数",
        min_value=1,
        max_value=10,
        value=6,
        help="每页显示几行卡片"
    )

    card_h = st.slider(
        "卡片高度（点）",
        min_value=80.0,
        max_value=500.0,
        value=110.0,
        step=10.0,
        help="每个卡片的高度，单位：点（point）"
    )

    margin = st.slider(
        "页面边距（点）",
        min_value=18.0,
        max_value=72.0,
        value=36.0,
        step=6.0,
        help="页面四周的边距"
    )

    gutter = st.slider(
        "卡片间距（点）",
        min_value=4.0,
        max_value=32.0,
        value=16.0,
        step=2.0,
        help="卡片之间的间隔"
    )

    st.markdown("---")
    st.subheader("🔤 字体设置")

    title_font_size = st.slider(
        "人名/学号字号",
        min_value=6,
        max_value=20,
        value=10,
        help="卡片左上角学生姓名和学号的字体大小"
    )

    card_title_font_size = st.slider(
        "卡片标题字号",
        min_value=6,
        max_value=18,
        value=8,
        help="卡片右上角标题的字体大小"
    )

    body_font_size = st.slider(
        "正文字号",
        min_value=6,
        max_value=16,
        value=8,
        help="卡片正文内容的字体大小"
    )

with col2:
    st.header("📋 PDF预览")
    st.caption("参数变化时自动更新预览")

    # Generate preview automatically using generate_pdf function
    with st.spinner("正在生成预览..."):
        try:
            # Prepare font path
            font_path = ""
            if uploaded_font is not None:
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_font.name)[1]) as tmp_font:
                    tmp_font.write(uploaded_font.getvalue())
                    font_path = tmp_font.name
            if font_path == "":
                font_path = "./simsun.ttc"

            # Create temporary PDF for preview
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
                tmp_pdf_path = tmp_pdf.name

            # Calculate cards per page for display
            page_w, page_h = A4
            if orientation == "纵向":
                page_w, page_h = portrait(A4)
            else:
                page_w, page_h = landscape(A4)
            usable_w = page_w - 2 * margin
            usable_h = page_h - 2 * margin
            card_w = (usable_w - (cols - 1) * gutter) / cols
            max_rows_fit = max(1, int((usable_h + gutter) // (card_h + gutter)))
            actual_rows = min(rows, max_rows_fit)
            cards_per_page = cols * actual_rows

            # Use generate_pdf function for preview
            generate_pdf(
                df=df,
                output_path=tmp_pdf_path,
                font_path=font_path,
                title=title,
                card_title=card_title,
                cols=cols,
                rows=rows,
                portrait_mode=(orientation == "纵向"),
                card_h=card_h,
                margin=margin,
                gutter=gutter,
                title_font_size=title_font_size,
                card_title_font_size=card_title_font_size,
                body_font_size=body_font_size,
                detail_cols=detail_cols,
                preview_only=True,
                max_preview_cards=cards_per_page,
                image_dir=image_dir if crop_rect else None,
                crop_rect=crop_rect,
                id_to_class_func=get_student_class_stub
            )

            # Convert PDF to image using PyMuPDF (fitz)
            try:
                import fitz  # PyMuPDF
                from PIL import Image

                # Open PDF with PyMuPDF
                pdf_doc = fitz.open(tmp_pdf_path)
                page = pdf_doc[0]  # Get first page

                # Render page to image (2.0 = 144 DPI)
                mat = fitz.Matrix(2.0, 2.0)
                pix = page.get_pixmap(matrix=mat)

                # Convert to PIL Image
                img_data = pix.tobytes("png")
                img = Image.open(BytesIO(img_data))

                # Display the preview image
                st.image(img, caption=f"预览：{cols}列 × {actual_rows}行布局", width='stretch')
                st.caption(f"💡 实际生成时将包含 {len(df)} 条记录")

                # Close PDF
                pdf_doc.close()

            except ImportError:
                st.warning("⚠️ 预览功能需要安装 PyMuPDF 库  \n运行: `pip install PyMuPDF`")
                st.info(f"📊 布局信息：  \n- 页面方向：{orientation}  \n- 每页卡片：{cols}列 × {actual_rows}行 = {cards_per_page}张  \n- 卡片尺寸：{card_w:.1f} × {card_h:.1f} 点")
            except Exception as preview_error:
                st.error(f"预览转换失败: {str(preview_error)}")
                st.info(f"📊 布局信息：  \n- 页面方向：{orientation}  \n- 每页卡片：{cols}列 × {actual_rows}行 = {cards_per_page}张  \n- 卡片尺寸：{card_w:.1f} × {card_h:.1f} 点")

            # Cleanup
            if os.path.exists(tmp_pdf_path):
                os.unlink(tmp_pdf_path)
            if uploaded_font is not None and font_path and os.path.exists(font_path):
                os.unlink(font_path)

        except Exception as e:
            st.error(f"生成预览失败: {str(e)}")
            st.info(f"📊 布局信息：\n- 页面方向：{orientation}\n- 布局：{cols}列 × {rows}行\n- 卡片高度：{card_h}点")

st.markdown("---")

# Generate PDF button
if st.button("🎨 生成PDF", type="primary", width='stretch'):
    # Validate filename before processing
    is_valid, error_msg, final_filename = validate_filename(output_filename)

    if not is_valid:
        st.error(error_msg)
        st.stop()

    with st.spinner("正在生成PDF，请稍候..."):
        try:
            # Check if user selected any columns
            if len(detail_cols) == 0:
                st.error("❌ 请至少选择一个项目")
                st.stop()

            # Prepare font path
            font_path = ""
            if uploaded_font is not None:
                with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_font.name)[1]) as tmp_font:
                    tmp_font.write(uploaded_font.getvalue())
                    font_path = tmp_font.name
            if font_path == "":
                font_path = "./simsun.ttc"

            # Create output PDF in temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp_pdf:
                output_pdf = tmp_pdf.name

            # Use generate_pdf function
            generate_pdf(
                df=df,
                output_path=output_pdf,
                font_path=font_path,
                title=title,
                card_title=card_title,
                cols=cols,
                rows=rows,
                portrait_mode=(orientation == "纵向"),
                card_h=card_h,
                margin=margin,
                gutter=gutter,
                title_font_size=title_font_size,
                card_title_font_size=card_title_font_size,
                body_font_size=body_font_size,
                detail_cols=detail_cols,
                preview_only=False,
                max_preview_cards=None,
                # --- Added Parameters ---
                image_dir=image_dir if crop_rect else None,
                crop_rect=crop_rect,
                id_to_class_func=get_student_class_stub
                # ------------------------
            )

            # Read PDF and offer download
            with open(output_pdf, "rb") as pdf_file:
                pdf_data = pdf_file.read()

            # 记录日志
            log_grades_generation(
                excel_filename=uploaded_excel.name,
                title=title,
                card_title=card_title,
                orientation=orientation,
                cols=cols,
                rows=rows,
                card_h=card_h,
                margin=margin,
                gutter=gutter,
                title_font_size=title_font_size,
                card_title_font_size=card_title_font_size,
                body_font_size=body_font_size,
                detail_cols=detail_cols,
                total_records=len(df),
                has_custom_font=(uploaded_font is not None),
                client_ip=get_client_ip()
            )

            st.success("✅ PDF生成成功！")

            st.download_button(
                label="⬇️ 下载PDF文件",
                data=pdf_data,
                file_name=final_filename,
                mime="application/pdf",
                width='stretch',
            )

            # Cleanup temp files
            if uploaded_font is not None and font_path and os.path.exists(font_path):
                os.unlink(font_path)
            if os.path.exists(output_pdf):
                os.unlink(output_pdf)

        except Exception as e:
            st.error(f"生成PDF时出错: {str(e)}")
            import traceback
            st.code(traceback.format_exc())

