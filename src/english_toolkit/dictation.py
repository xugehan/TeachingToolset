# -*- coding: utf-8 -*-
"""Compact A4 默写纸 PDF generator (Chinese + Times-Roman)."""

from __future__ import annotations

import re

from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfgen import canvas
from reportlab.platypus import Frame, Paragraph

from english_toolkit.fonts import EN_FONT, EN_FONT_BOLD, register_zh_font

ASCII = set(range(32, 127))


def split_runs(s: str) -> list[str]:
    return re.findall(r"[ -~]+|[^\x20-\x7E]+", s)


def wrap_mixed(s: str, en_font: str = EN_FONT, zh_font: str = "ZhFont") -> str:
    parts = []
    for tok in split_runs(s):
        if tok and all(ord(ch) in ASCII for ch in tok):
            parts.append(f"<font name='{en_font}'>{tok}</font>")
        else:
            parts.append(f"<font name='{zh_font}'>{tok}</font>")
    return "".join(parts)


def string_width_mixed(
    s: str,
    en_font: str,
    zh_font: str,
    size: float,
) -> float:
    width = 0.0
    for tok in split_runs(s):
        font = en_font if (tok and all(ord(ch) in ASCII for ch in tok)) else zh_font
        width += pdfmetrics.stringWidth(tok, font, size)
    return width


def build_header_one_line(
    date_str: str,
    scope: str,
    max_width: float,
    font_size: float,
    zh_font: str,
) -> str:
    name_us = "________"
    class_us = "___"
    min_name = "__"
    min_class = "_"

    def assemble(nu: str, cu: str, tight: bool = False) -> str:
        if tight:
            return f"{date_str} {scope} Name{nu}Class{cu}"
        return f"{date_str} {scope} Name{nu} Class{cu}"

    nu, cu = name_us, class_us
    header = assemble(nu, cu)
    safety = 1.0 * mm
    while string_width_mixed(header, EN_FONT_BOLD, zh_font, font_size) > (max_width - safety):
        if len(nu) > len(min_name):
            nu = nu[:-1]
        elif len(cu) > len(min_class):
            cu = cu[:-1]
        else:
            return assemble(nu, cu, tight=True)
        header = assemble(nu, cu)
    return header


def load_items(text: str) -> list[str]:
    items = []
    for line in text.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        items.append(stripped)
    return items


def make_dictation_pdf(
    date_str: str,
    scope: str,
    items: list[str],
    output_path: str,
    cols: int = 2,
    rows: int = 4,
    font_size: float = 11,
    padding: float = 3,
    font_path: str | None = None,
) -> str:
    if not items:
        raise ValueError("至少需要 1 条默写内容。")
    if cols < 1 or rows < 1:
        raise ValueError("列数和行数必须大于 0。")

    zh_font = register_zh_font(font_path)
    page_w, page_h = A4
    margin = 8 * mm
    pad = padding * mm
    cell_w = (page_w - 2 * margin) / cols
    cell_h = (page_h - 2 * margin) / rows
    leading = font_size * 1.23

    header_style = ParagraphStyle(
        "hdr",
        fontName=zh_font,
        fontSize=font_size,
        leading=leading,
        spaceAfter=2,
        alignment=TA_LEFT,
    )
    body_style = ParagraphStyle(
        "body",
        fontName=zh_font,
        fontSize=font_size,
        leading=leading,
        spaceAfter=1,
        alignment=TA_LEFT,
    )

    inner_w = cell_w - 2 * pad
    header_plain = build_header_one_line(date_str, scope, inner_w, font_size, zh_font)
    header_rich = "<b>" + wrap_mixed(header_plain, en_font=EN_FONT_BOLD, zh_font=zh_font) + "</b>"
    flows = [Paragraph(header_rich, header_style)]
    for i, item in enumerate(items, 1):
        flows.append(Paragraph(wrap_mixed(f"{i}. {item}", zh_font=zh_font), body_style))

    c = canvas.Canvas(output_path, pagesize=A4)
    for r in range(rows):
        for col in range(cols):
            x = margin + col * cell_w
            y = page_h - margin - (r + 1) * cell_h
            c.rect(x, y, cell_w, cell_h, stroke=1, fill=0)
            Frame(x + pad, y + pad, inner_w, cell_h - 2 * pad, showBoundary=0).addFromList(list(flows), c)
    c.showPage()
    c.save()
    return output_path
