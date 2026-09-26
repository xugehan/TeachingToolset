"""Locate a Chinese TrueType/TTC font that ReportLab can register."""

from __future__ import annotations

import os
from functools import lru_cache

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

CANDIDATE_FONTS = (
    "/System/Library/Fonts/Supplemental/Songti.ttc",
    "/System/Library/Fonts/STHeiti Light.ttc",
    "/System/Library/Fonts/Supplemental/Songti SC.ttc",
    "/Library/Fonts/Arial Unicode.ttf",
    os.path.expanduser("~/Library/Fonts/simsun.ttc"),
    os.path.expanduser("~/code/english_related_generator/simsun.ttc"),
)

EN_FONT = "Times-Roman"
EN_FONT_BOLD = "Times-Bold"


def _try_register(path: str, name: str) -> str | None:
    if not os.path.isfile(path):
        return None
    if path.lower().endswith(".ttc"):
        for index in range(8):
            try:
                pdfmetrics.registerFont(TTFont(name, path, subfontIndex=index))
                return name
            except Exception:
                continue
        return None
    try:
        pdfmetrics.registerFont(TTFont(name, path))
        return name
    except Exception:
        return None


@lru_cache(maxsize=8)
def register_zh_font(font_path: str | None = None, font_name: str = "ZhFont") -> str:
    """Register a Chinese font. Falls back to Helvetica if none work."""
    paths = []
    if font_path:
        paths.append(font_path)
    paths.extend(CANDIDATE_FONTS)
    for path in paths:
        registered = _try_register(path, font_name)
        if registered:
            return registered
    return "Helvetica"


def resolve_font_path(font_path: str | None = None) -> str | None:
    if font_path and os.path.isfile(font_path):
        return font_path
    for path in CANDIDATE_FONTS:
        if os.path.isfile(path):
            return path
    return None
