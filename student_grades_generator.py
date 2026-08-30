# -*- coding: utf-8 -*-
"""
Make student header strips (cards) PDF from an Excel sheet.
- The first row of the Excel is treated as the header.
- Each student's row becomes one "card" with key:value items from the header.
- Cards are arranged in a neat grid per page.

Dependencies:
    pip install pandas reportlab openpyxl

Example:
    python make_strips.py --excel input.xlsx --pdf output.pdf --font /path/to/SimHei.ttf --cols 2 --rows 4
"""

import argparse
import os
import glob
from typing import List, Tuple, Optional, Dict, Callable

import pandas as pd
from reportlab.lib.pagesizes import A4, landscape, portrait
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from PIL import Image


def try_register_font(font_path: str, font_name: str = "CNFont") -> str:
    """
    Try to register a TrueType font for Chinese text.
    If the file is missing or invalid, fall back to Helvetica (ASCII only).
    """
    if font_path and os.path.isfile(font_path):
        try:
            pdfmetrics.registerFont(TTFont(font_name, font_path))
            return font_name
        except Exception as e:
            print(f"[Warn] Failed to register font '{font_path}': {e}")
    print("[Info] Using fallback 'Helvetica' (may not render Chinese).")
    return "Helvetica"


def format_value(v):
    """
    Pretty-print cell values:
    - Convert floats like 4.0 -> 4
    - Keep strings as-is
    - Replace NaN with '-'
    """
    if pd.isna(v):
        return "-"
    if isinstance(v, float):
        if abs(v - int(v)) < 1e-9:
            return str(int(v))
        return f"{v:.2f}".rstrip("0").rstrip(".")
    return str(v)


def split_columns_evenly(keys: List[str], values: List[str], max_items_each_col: int) -> Tuple[List[Tuple[str,str]], List[Tuple[str,str]], List[Tuple[str,str]]]:
    """
    Split key/value pairs into two columns to keep cards compact.
    """
    pairs = list(zip(keys, values))
    left = pairs[:max_items_each_col]
    middle = pairs[max_items_each_col: 2 * max_items_each_col]
    right = pairs[2 * max_items_each_col:]
    return left, middle, right


def draw_card(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    name: str,
    class_: str,
    code: str,
    kv_left: List[Tuple[str, str]],
    kv_middle: List[Tuple[str, str]],
    kv_right: List[Tuple[str, str]],
    font: str,
    card_title: str = "",
    title_font_size: int = 14,
    card_title_font_size: int = 12,
    body_font_size: int = 10,
    corner_radius: int = 10,
):
    """
    Draw a single rounded-rectangle card with a title and two-column key:value body.
    (0,0) is the bottom-left of the page. Card's anchor point is bottom-left at (x, y).
    """
    # Card background
    c.saveState()
    c.setLineWidth(1)
    c.setStrokeColorRGB(0.25, 0.35, 0.55)
    c.setFillColorRGB(0.97, 0.98, 1.0)
    # Rounded rectangle path
    c.roundRect(x, y, w, h, corner_radius, stroke=1, fill=1)

    inner_margin = 10
    title_y = y + h - inner_margin - title_font_size

    # Title (student name, clsss and code) - left side
    c.setFont(font, title_font_size)
    c.setFillColorRGB(0.12, 0.18, 0.35)
    c.drawString(x + inner_margin, title_y, f"{name} {code}")

    # Card title - right side, smaller font
    if card_title:
        c.setFont(font, card_title_font_size)
        c.setFillColorRGB(0.12, 0.18, 0.35)
        title_width = c.stringWidth(card_title, font, card_title_font_size)
        c.drawString(x + w - inner_margin - title_width, title_y, card_title)

    # Divider line under title
    c.setStrokeColorRGB(0.75, 0.8, 0.95)
    c.line(x + inner_margin, title_y - 4, x + w - inner_margin, title_y - 4)

    # Body text
    c.setFont(font, body_font_size)
    c.setFillColorRGB(0.1, 0.1, 0.1)

    # Two columns area
    body_top = title_y - 20
    line_height = body_font_size + 4
    col_gap = 8
    col_w = (w - inner_margin * 2 - col_gap * 2) / 3

    # Left column
    cur_y = body_top
    for k, v in kv_left:
        text = f"{k}: {v}"
        c.drawString(x + inner_margin, cur_y, text)
        cur_y -= line_height


    # Middle column
    cur_y = body_top
    right_x = x + inner_margin + col_w + col_gap
    for k, v in kv_middle:
        text = f"{k}: {v}"
        c.drawString(right_x, cur_y, text)
        cur_y -= line_height

    # Right column
    cur_y = body_top
    right_x = right_x + col_w + col_gap
    for k, v in kv_right:
        text = f"{k}: {v}"
        c.drawString(right_x, cur_y, text)
        cur_y -= line_height

    c.restoreState()

def get_answer_sheet_image(
    image_dir: str,
    student_id: str,
    student_class: str,
    crop_rect: Optional[Dict[str, int]] = None
) -> Optional[Image.Image]:
    """
    Retrieve and crop the answer sheet image for a student.
    Path format: <image_dir>/<class>/<student_id>*/...-01.png
    """
    if not image_dir or not student_id or not student_class:
        return None

    # 1. Construct class directory path
    class_dir = os.path.join(image_dir, str(student_class))
    if not os.path.isdir(class_dir):
        return None

    # 2. Find student directory (matching student_id*)
    student_dir_pattern = os.path.join(class_dir, f"{student_id}*")
    found_dirs = glob.glob(student_dir_pattern)
    if not found_dirs:
        return None

    student_dir = found_dirs[0]

    # 3. Find image ending with 01.png
    img_pattern = os.path.join(student_dir, "*01.png")
    found_imgs = glob.glob(img_pattern)
    if not found_imgs:
        return None

    img_path = found_imgs[0]

    try:
        img = Image.open(img_path)
        if crop_rect:
            # crop_rect format: {'left': x, 'top': y, 'width': w, 'height': h}
            left = crop_rect['left']
            top = crop_rect['top']
            right = left + crop_rect['width']
            bottom = top + crop_rect['height']
            img = img.crop((left, top, right, bottom))
        return img
    except Exception as e:
        print(f"[Warn] Failed to process image for student {student_id}: {e}")
        return None


def draw_card_with_image(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    name: str,
    class_: str,
    code: str,
    kv_left: List[Tuple[str, str]],
    kv_middle: List[Tuple[str, str]],
    kv_right: List[Tuple[str, str]],
    font: str,
    card_title: str = "",
    title_font_size: int = 14,
    card_title_font_size: int = 12,
    body_font_size: int = 10,
    corner_radius: int = 10,
    answer_sheet_img: Optional[Image.Image] = None
):
    """
    Draw a single rounded-rectangle card with a title, two-column key:value body,
    and optionally an answer sheet image at the bottom.
    """
    # Card background
    c.saveState()
    c.setLineWidth(1)
    c.setStrokeColorRGB(0.25, 0.35, 0.55)
    c.setFillColorRGB(0.97, 0.98, 1.0)
    # Rounded rectangle path
    c.roundRect(x, y, w, h, corner_radius, stroke=1, fill=1)

    inner_margin = 10
    title_y = y + h - inner_margin - title_font_size

    # Title (student name, clsss and code) - left side
    c.setFont(font, title_font_size)
    c.setFillColorRGB(0.12, 0.18, 0.35)
    c.drawString(x + inner_margin, title_y, f"{name} {code}")

    # Card title - right side, smaller font
    if card_title:
        c.setFont(font, card_title_font_size)
        c.setFillColorRGB(0.12, 0.18, 0.35)
        title_width = c.stringWidth(card_title, font, card_title_font_size)
        c.drawString(x + w - inner_margin - title_width, title_y, card_title)

    # Divider line under title
    c.setStrokeColorRGB(0.75, 0.8, 0.95)
    c.line(x + inner_margin, title_y - 4, x + w - inner_margin, title_y - 4)

    # Body text
    c.setFont(font, body_font_size)
    c.setFillColorRGB(0.1, 0.1, 0.1)

    # Determine available height for text
    body_top = title_y - 20

    # If image exists, reserve space at bottom
    img_height = 0
    if answer_sheet_img:
        # Calculate image dimensions to fit width
        img_w, img_h = answer_sheet_img.size
        avail_w = w - 2 * inner_margin
        scale = avail_w / img_w
        img_height = img_h * scale

        # Draw image at bottom
        img_y = y + inner_margin
        c.drawImage(ImageReader(answer_sheet_img), x + inner_margin, img_y, width=avail_w, height=img_height)

        # Adjust body area
        # Add some padding above image
        img_height += 10

    # Two columns area
    line_height = body_font_size + 4
    col_gap = 8
    col_w = (w - inner_margin * 2 - col_gap * 2) / 3

    # Left column
    cur_y = body_top
    min_y = y + inner_margin + img_height # Stop before image

    for k, v in kv_left:
        if cur_y < min_y: break
        text = f"{k}: {v}"
        c.drawString(x + inner_margin, cur_y, text)
        cur_y -= line_height

    # Middle column
    cur_y = body_top
    right_x = x + inner_margin + col_w + col_gap
    for k, v in kv_middle:
        if cur_y < min_y: break
        text = f"{k}: {v}"
        c.drawString(right_x, cur_y, text)
        cur_y -= line_height

    # Right column
    cur_y = body_top
    right_x = right_x + col_w + col_gap
    for k, v in kv_right:
        if cur_y < min_y: break
        text = f"{k}: {v}"
        c.drawString(right_x, cur_y, text)
        cur_y -= line_height

    c.restoreState()



def generate_pdf(
    df: pd.DataFrame,
    output_path: str,
    font_path: str = "./simsun.ttc",
    title: str = "学生成绩小分条",
    card_title: str = "期中英语",
    cols: int = 2,
    rows: int = 4,
    portrait_mode: bool = False,
    card_h: float = 140,
    margin: float = 36,
    gutter: float = 16,
    title_font_size: int = 10,
    card_title_font_size: int = 8,
    body_font_size: int = 8,
    detail_cols: list = None,
    preview_only: bool = False,
    max_preview_cards: int = None,
    image_dir: str = None,
    crop_rect: Dict[str, int] = None,
    id_to_class_func: Callable = None
):
    """
    Generate PDF from DataFrame.

    Args:
        df: DataFrame containing student data
        output_path: Output PDF file path
        font_path: Path to TTF/TTC font file
        title: Document title
        card_title: Title shown on each card
        cols: Number of cards per row
        rows: Number of rows per page
        portrait_mode: Use portrait orientation
        card_h: Card height in points
        margin: Page margin in points
        gutter: Space between cards in points
        title_font_size: Font size for name/code
        card_title_font_size: Font size for card title
        body_font_size: Font size for body text
        detail_cols: List of columns to display (if None, auto-detect)
        preview_only: If True, only render first page with suffix
        max_preview_cards: Maximum cards to render for preview
        image_dir: Root directory for answer sheet images
        crop_rect: Dictionary with crop coordinates {'left', 'top', 'width', 'height'}
        id_to_class_func: Function to map student ID to class name
    """
    # Page setup
    page_w, page_h = A4
    if portrait_mode:
        page_w, page_h = portrait(A4)
    else:
        page_w, page_h = landscape(A4)

    # Register font
    font_name = try_register_font(font_path)

    # Find name, code, and class columns
    code_col_candidates = [c for c in df.columns if str(c).strip() in ("学号", "学号/Code", "code", "Code")]
    code_col = code_col_candidates[0] if code_col_candidates else df.columns[0]

    name_col_candidates = [c for c in df.columns if str(c).strip() in ("姓名", "姓名/Name", "name", "Name")]
    name_col = name_col_candidates[0] if name_col_candidates else df.columns[1]

    class_col_candidates = [c for c in df.columns if str(c).strip() in ("班级", "班级/Class", "class", "Class")]
    class_col = class_col_candidates[0] if class_col_candidates else df.columns[2]

    # Auto-detect detail columns if not provided
    if detail_cols is None:
        detail_cols = [cn for cn in df.columns if (not isinstance(cn, str)) or (cn != name_col and cn != code_col and cn != class_col)]

    # Canvas
    c = canvas.Canvas(output_path, pagesize=(page_w, page_h))
    c.setTitle(title)

    # Calculate card dimensions
    usable_w = page_w - 2 * margin
    usable_h = page_h - 2 * margin
    card_w = (usable_w - (cols - 1) * gutter) / cols

    max_rows_fit = max(1, int((usable_h + gutter) // (card_h + gutter)))
    actual_rows = min(rows, max_rows_fit)
    cards_per_page = cols * actual_rows

    # Page header function
    def draw_header(page_idx: int):
        c.saveState()
        c.setFont(font_name, 12)
        c.setFillColorRGB(0.15, 0.15, 0.15)
        header_y = page_h - margin + 10
        suffix = " (预览)" if preview_only else ""
        c.drawString(margin, header_y, f"{title}  —  Page {page_idx}{suffix}")
        c.restoreState()

    page_idx = 1
    draw_header(page_idx)

    # Estimate lines per column
    line_height = body_font_size + 4
    approx_lines_body = int((card_h - 36) // line_height)
    max_each_col = max(1, approx_lines_body)

    # Determine how many cards to render
    total_cards = len(df)
    if preview_only and max_preview_cards:
        total_cards = min(total_cards, max_preview_cards)

    card_count_on_page = 0

    for idx in range(total_cards):
        row = df.iloc[idx]
        name = format_value(row[name_col])
        code = format_value(row[code_col])
        class_ = format_value(row[class_col]) if class_col in df.columns else ""

        # Get answer sheet image if configured
        answer_sheet_img = None
        img_height_pts = 0
        if image_dir and crop_rect:
            # Determine class for image lookup
            lookup_class = class_
            if id_to_class_func:
                lookup_class = id_to_class_func(code, df)

            answer_sheet_img = get_answer_sheet_image(
                image_dir=image_dir,
                student_id=str(code),
                student_class=str(lookup_class),
                crop_rect=crop_rect
            )

            if answer_sheet_img:
                # Calculate expected image height in points to adjust text layout
                # Logic mirrors draw_card_with_image
                inner_margin = 10
                img_w, img_h = answer_sheet_img.size
                avail_w = card_w - 2 * inner_margin
                scale = avail_w / img_w
                img_height_pts = img_h * scale + 10 # +10 for padding

        # Adjust max items per column based on image height
        available_h = card_h - 36 - img_height_pts
        current_max_each_col = max(1, int(available_h // line_height))

        values = [format_value(row[col]) for col in detail_cols]
        left, middle, right = split_columns_evenly(detail_cols, values, current_max_each_col)

        pos_in_page = card_count_on_page % cards_per_page
        r = pos_in_page // cols
        c_in_row = pos_in_page % cols

        x = margin + c_in_row * (card_w + gutter)
        top_area = page_h - margin - card_h
        y = top_area - r * (card_h + gutter)

        draw_card_with_image(
            c,
            x,
            y,
            card_w,
            card_h,
            name=name,
            class_=class_,
            code=code,
            kv_left=left,
            kv_middle=middle,
            kv_right=right,
            font=font_name,
            card_title=card_title,
            title_font_size=title_font_size,
            card_title_font_size=card_title_font_size,
            body_font_size=body_font_size,
            corner_radius=10,
            answer_sheet_img=answer_sheet_img
        )

        card_count_on_page += 1

        # Page break (only if not preview or not last card)
        if not preview_only and (card_count_on_page % cards_per_page) == 0 and idx != total_cards - 1:
            c.showPage()
            page_idx += 1
            draw_header(page_idx)

    c.save()


def main():
    parser = argparse.ArgumentParser(description="Generate student strips (cards) PDF from Excel.")
    parser.add_argument("--excel", required=True, help="Path to input .xlsx file (first sheet used).")
    parser.add_argument("--pdf", required=True, help="Output PDF path.")
    parser.add_argument("--font", default="./simsun.ttc", help="Path to a TTF font that supports Chinese (e.g., SimHei/SourceHanSans).")
    parser.add_argument("--title", default="学生成绩小分条", help="Optional document title to place on the first page header.")
    parser.add_argument("--card_title", default="期中英语", help="Card title displayed in top-right corner of each card.")
    parser.add_argument("--cols", type=int, default=2, help="Number of cards per row.")
    parser.add_argument("--rows", type=int, default=4, help="Number of card rows per page.")
    parser.add_argument("--portrait", action="store_true", help="Use portrait A4 (default is landscape).")
    parser.add_argument("--card_h", type=float, default=140, help="Card height in points.")
    parser.add_argument("--margin", type=float, default=36, help="Page margin in points (1/2 inch ≈ 36).")
    parser.add_argument("--gutter", type=float, default=16, help="Horizontal/vertical space between cards in points.")
    parser.add_argument("--title_font_size", type=int, default=10, help="Font size for student name/code in card title.")
    parser.add_argument("--card_title_font_size", type=int, default=8, help="Font size for card title (top-right corner).")
    parser.add_argument("--body_font_size", type=int, default=8, help="Font size for card body text.")
    args = parser.parse_args()


    # Read Excel - automatically detect engine based on file extension
    file_ext = os.path.splitext(args.excel)[1].lower()
    if file_ext == '.xls':
        df = pd.read_excel(args.excel, engine="xlrd")
    elif file_ext == '.xlsx':
        df = pd.read_excel(args.excel, engine="openpyxl")
    else:
        # Try openpyxl as default
        df = pd.read_excel(args.excel, engine="openpyxl")

    if df.empty:
        raise ValueError("The Excel sheet is empty.")

    # Use generate_pdf function
    generate_pdf(
        df=df,
        output_path=args.pdf,
        font_path=args.font,
        title=args.title,
        card_title=args.card_title,
        cols=args.cols,
        rows=args.rows,
        portrait_mode=args.portrait,
        card_h=args.card_h,
        margin=args.margin,
        gutter=args.gutter,
        title_font_size=args.title_font_size,
        card_title_font_size=args.card_title_font_size,
        body_font_size=args.body_font_size,
        detail_cols=None,  # Auto-detect
        preview_only=False,
        max_preview_cards=None
    )

    print(f"[Done] Generated {args.pdf}")


if __name__ == "__main__":
    main()
