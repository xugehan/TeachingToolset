# -*- coding: utf-8 -*-
"""Generate student grade-strip PDF cards from an Excel sheet."""

from __future__ import annotations

import os
from io import BytesIO
from typing import BinaryIO, Sequence

import pandas as pd
from reportlab.lib.pagesizes import A4, landscape, portrait
from reportlab.pdfgen import canvas

from english_toolkit.fonts import register_zh_font, resolve_font_path

NAME_KEYS = ("姓名", "姓名/Name", "name", "Name")
CODE_KEYS = ("学号", "学号/Code", "code", "Code")
CLASS_KEYS = ("班级", "班级/Class", "class", "Class")


def format_value(value) -> str:
    if pd.isna(value):
        return "-"
    if isinstance(value, float):
        if abs(value - int(value)) < 1e-9:
            return str(int(value))
        return f"{value:.2f}".rstrip("0").rstrip(".")
    return str(value)


def _pick_column(columns: Sequence, keys: tuple[str, ...], fallback_index: int) -> object:
    for col in columns:
        if str(col).strip() in keys:
            return col
    return columns[fallback_index] if fallback_index < len(columns) else columns[0]


def split_columns_evenly(
    keys: list[str],
    values: list[str],
    max_items_each_col: int,
) -> tuple[list[tuple[str, str]], list[tuple[str, str]], list[tuple[str, str]]]:
    pairs = list(zip(keys, values))
    left = pairs[:max_items_each_col]
    middle = pairs[max_items_each_col : 2 * max_items_each_col]
    right = pairs[2 * max_items_each_col :]
    return left, middle, right


def draw_card(
    c: canvas.Canvas,
    x: float,
    y: float,
    w: float,
    h: float,
    name: str,
    code: str,
    kv_left: list[tuple[str, str]],
    kv_middle: list[tuple[str, str]],
    kv_right: list[tuple[str, str]],
    font: str,
    card_title: str = "",
    title_font_size: int = 10,
    card_title_font_size: int = 8,
    body_font_size: int = 8,
    corner_radius: int = 10,
) -> None:
    c.saveState()
    c.setLineWidth(1)
    c.setStrokeColorRGB(0.25, 0.35, 0.55)
    c.setFillColorRGB(0.97, 0.98, 1.0)
    c.roundRect(x, y, w, h, corner_radius, stroke=1, fill=1)

    inner_margin = 10
    title_y = y + h - inner_margin - title_font_size

    c.setFont(font, title_font_size)
    c.setFillColorRGB(0.12, 0.18, 0.35)
    c.drawString(x + inner_margin, title_y, f"{name} {code}")

    if card_title:
        c.setFont(font, card_title_font_size)
        title_width = c.stringWidth(card_title, font, card_title_font_size)
        c.drawString(x + w - inner_margin - title_width, title_y, card_title)

    c.setStrokeColorRGB(0.75, 0.8, 0.95)
    c.line(x + inner_margin, title_y - 4, x + w - inner_margin, title_y - 4)

    c.setFont(font, body_font_size)
    c.setFillColorRGB(0.1, 0.1, 0.1)

    body_top = title_y - 20
    line_height = body_font_size + 4
    col_gap = 8
    col_w = (w - inner_margin * 2 - col_gap * 2) / 3

    cur_y = body_top
    for key, val in kv_left:
        c.drawString(x + inner_margin, cur_y, f"{key}: {val}")
        cur_y -= line_height

    cur_y = body_top
    mid_x = x + inner_margin + col_w + col_gap
    for key, val in kv_middle:
        c.drawString(mid_x, cur_y, f"{key}: {val}")
        cur_y -= line_height

    cur_y = body_top
    right_x = mid_x + col_w + col_gap
    for key, val in kv_right:
        c.drawString(right_x, cur_y, f"{key}: {val}")
        cur_y -= line_height

    c.restoreState()


def grades_template_bytes() -> bytes:
    from openpyxl import Workbook

    wb = Workbook()
    ws = wb.active
    ws.append(["姓名", "学号", "班级", "听写", "默写", "作业", "总分"])
    ws.append(["张三", "001", "高一8班", 95, 90, 88, 273])
    ws.append(["李四", "002", "高一8班", 88, 92, 90, 270])
    ws.append(["王五", "003", "高一10班", 91, 87, 93, 271])
    buf = BytesIO()
    wb.save(buf)
    return buf.getvalue()


def read_grades_excel(excel_path: str | BinaryIO) -> pd.DataFrame:
    if hasattr(excel_path, "read"):
        df = pd.read_excel(excel_path, engine="openpyxl")
    else:
        ext = os.path.splitext(str(excel_path))[1].lower()
        engine = "xlrd" if ext == ".xls" else "openpyxl"
        df = pd.read_excel(excel_path, engine=engine)
    if df.empty:
        raise ValueError("Excel 表是空的。")
    return df


def generate_grades_pdf(
    df: pd.DataFrame,
    output_path: str,
    font_path: str | None = None,
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
    detail_cols: list[str] | None = None,
) -> str:
    page_w, page_h = portrait(A4) if portrait_mode else landscape(A4)
    font_name = register_zh_font(resolve_font_path(font_path))

    name_col = _pick_column(df.columns, NAME_KEYS, 0)
    code_col = _pick_column(df.columns, CODE_KEYS, 1 if len(df.columns) > 1 else 0)
    class_col = _pick_column(df.columns, CLASS_KEYS, 2 if len(df.columns) > 2 else 0)

    if detail_cols is None:
        skip = {name_col, code_col, class_col}
        detail_cols = [col for col in df.columns if col not in skip]
    else:
        missing = [col for col in detail_cols if col not in df.columns]
        if missing:
            raise ValueError(f"找不到这些列：{', '.join(missing)}")

    c = canvas.Canvas(output_path, pagesize=(page_w, page_h))
    c.setTitle(title)

    usable_w = page_w - 2 * margin
    usable_h = page_h - 2 * margin
    card_w = (usable_w - (cols - 1) * gutter) / cols
    max_rows_fit = max(1, int((usable_h + gutter) // (card_h + gutter)))
    actual_rows = min(rows, max_rows_fit)
    cards_per_page = cols * actual_rows

    def draw_header(page_idx: int) -> None:
        c.saveState()
        c.setFont(font_name, 12)
        c.setFillColorRGB(0.15, 0.15, 0.15)
        c.drawString(margin, page_h - margin + 10, f"{title}  —  Page {page_idx}")
        c.restoreState()

    page_idx = 1
    draw_header(page_idx)

    line_height = body_font_size + 4
    max_each_col = max(1, int((card_h - 36) // line_height))
    card_count_on_page = 0
    total = len(df)

    for idx in range(total):
        row = df.iloc[idx]
        name = format_value(row[name_col])
        code = format_value(row[code_col])
        values = [format_value(row[col]) for col in detail_cols]
        left, middle, right = split_columns_evenly(
            [str(col) for col in detail_cols], values, max_each_col
        )

        pos = card_count_on_page % cards_per_page
        r = pos // cols
        col = pos % cols
        x = margin + col * (card_w + gutter)
        y = page_h - margin - card_h - r * (card_h + gutter)

        draw_card(
            c,
            x,
            y,
            card_w,
            card_h,
            name=name,
            code=code,
            kv_left=left,
            kv_middle=middle,
            kv_right=right,
            font=font_name,
            card_title=card_title,
            title_font_size=title_font_size,
            card_title_font_size=card_title_font_size,
            body_font_size=body_font_size,
        )
        card_count_on_page += 1
        if card_count_on_page % cards_per_page == 0 and idx != total - 1:
            c.showPage()
            page_idx += 1
            draw_header(page_idx)

    c.save()
    return output_path
