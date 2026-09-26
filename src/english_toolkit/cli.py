# -*- coding: utf-8 -*-
"""Command-line entry for the English teaching toolkit."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from english_toolkit.dictation import load_items, make_dictation_pdf
from english_toolkit.exam import EXAMPLE_EXAM, export_exam_docx, load_exam
from english_toolkit.grades import generate_grades_pdf, read_grades_excel

EXAMPLE_DICTATION = """# 每行一条，# 开头为注释
n. 鹰
n. 耳朵
v. 赢得；挣得；搏得
n. 地震
adj. 东方的；东部的
n. 生态学
n. 经济
n. 边缘；刀刃；优势
n. 编辑；审校者；剪辑师
adj. 高效的
放心好了，别着急
赢得好名声
在地球上
紧张，不安
起作用，生效
"""


def _read_text(path: str) -> str:
    if path == "-":
        return sys.stdin.read()
    return Path(path).read_text(encoding="utf-8")


def cmd_dictation(args: argparse.Namespace) -> int:
    items = load_items(_read_text(args.items))
    if not items:
        raise SystemExit("默写内容为空：请提供非空文本（每行一条）。")
    make_dictation_pdf(
        date_str=args.date,
        scope=args.scope,
        items=items,
        output_path=args.output,
        cols=args.cols,
        rows=args.rows,
        font_size=args.font_size,
        padding=args.padding,
        font_path=args.font,
    )
    print(f"已生成默写纸：{args.output}")
    return 0


def cmd_grades(args: argparse.Namespace) -> int:
    df = read_grades_excel(args.excel)
    detail_cols = args.columns.split(",") if args.columns else None
    if detail_cols:
        detail_cols = [col.strip() for col in detail_cols if col.strip()]
    generate_grades_pdf(
        df=df,
        output_path=args.output,
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
        detail_cols=detail_cols,
    )
    print(f"已生成成绩小分条：{args.output}")
    return 0


def cmd_exam(args: argparse.Namespace) -> int:
    data = load_exam(args.input)
    export_exam_docx(data, args.output, answers=False)
    print(f"已生成试卷：{args.output}")
    if args.answers:
        answers_path = args.answers_output or str(Path(args.output).with_name(Path(args.output).stem + "-答案.docx"))
        export_exam_docx(data, answers_path, answers=True)
        print(f"已生成答案：{answers_path}")
    return 0


def cmd_web(args: argparse.Namespace) -> int:
    import os
    import subprocess

    root = Path(__file__).resolve().parents[2]
    app = root / "app.py"
    env = os.environ.copy()
    env["PYTHONPATH"] = str(root / "src") + os.pathsep + env.get("PYTHONPATH", "")
    return subprocess.call(
        [
            sys.executable,
            "-m",
            "streamlit",
            "run",
            str(app),
            "--server.address",
            "0.0.0.0",
            "--server.port",
            str(args.port),
        ],
        cwd=str(root),
        env=env,
    )


def cmd_template(args: argparse.Namespace) -> int:
    dest = Path(args.output)
    dest.parent.mkdir(parents=True, exist_ok=True)
    kind = args.kind
    if kind == "dictation":
        dest.write_text(EXAMPLE_DICTATION, encoding="utf-8")
    elif kind == "exam":
        dest.write_text(json.dumps(EXAMPLE_EXAM, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    elif kind == "grades":
        from english_toolkit.grades import grades_template_bytes

        dest.write_bytes(grades_template_bytes())
    else:
        raise SystemExit(f"未知模板类型：{kind}")
    print(f"已写入示例：{dest}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="english-toolkit",
        description="上海高中英语教学工具集：默写纸 PDF、成绩小分条 PDF、试卷 Word。",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    p_dict = sub.add_parser("dictation", help="生成表格默写纸 PDF")
    p_dict.add_argument("-i", "--items", required=True, help="默写条目文本，每行一条；用 - 表示从标准输入读取")
    p_dict.add_argument("--date", required=True, help="页眉日期，例如 0831 或 2026-08-31")
    p_dict.add_argument("--scope", required=True, help="页眉范围/标题，例如 eager-effort")
    p_dict.add_argument("-o", "--output", default="dictation.pdf", help="输出 PDF 路径")
    p_dict.add_argument("--cols", type=int, default=2, help="列数，默认 2")
    p_dict.add_argument("--rows", type=int, default=4, help="行数，默认 4")
    p_dict.add_argument("--font-size", type=float, default=11, help="字号，默认 11")
    p_dict.add_argument("--padding", type=float, default=3, help="单元格内边距（毫米），默认 3")
    p_dict.add_argument("--font", help="中文字体文件路径（可选）")
    p_dict.set_defaults(func=cmd_dictation)

    p_grades = sub.add_parser("grades", help="从 Excel 生成成绩小分条 PDF")
    p_grades.add_argument("-e", "--excel", required=True, help="成绩 Excel（需含姓名、学号、班级列）")
    p_grades.add_argument("-o", "--output", default="grades.pdf", help="输出 PDF 路径")
    p_grades.add_argument("--title", default="学生成绩小分条", help="文档标题")
    p_grades.add_argument("--card-title", default="期中英语", help="每张卡片右上角标题")
    p_grades.add_argument("--cols", type=int, default=2, help="每行列数，默认 2")
    p_grades.add_argument("--rows", type=int, default=4, help="每页行数，默认 4")
    p_grades.add_argument("--portrait", action="store_true", help="纵向 A4（默认横向）")
    p_grades.add_argument("--card-h", type=float, default=140, help="卡片高度（点）")
    p_grades.add_argument("--margin", type=float, default=36, help="页边距（点）")
    p_grades.add_argument("--gutter", type=float, default=16, help="卡片间距（点）")
    p_grades.add_argument("--title-font-size", type=int, default=10)
    p_grades.add_argument("--card-title-font-size", type=int, default=8)
    p_grades.add_argument("--body-font-size", type=int, default=8)
    p_grades.add_argument("--columns", help="要显示的成绩列，逗号分隔；默认除姓名/学号/班级外全部")
    p_grades.add_argument("--font", help="中文字体文件路径（可选）")
    p_grades.set_defaults(func=cmd_grades)

    p_exam = sub.add_parser("exam", help="从 JSON 导出上海高中英语试卷 Word")
    p_exam.add_argument("-i", "--input", required=True, help="试卷 JSON 路径")
    p_exam.add_argument("-o", "--output", default="exam.docx", help="输出 Word 路径")
    p_exam.add_argument("--answers", action="store_true", help="同时导出答案（含听力原文）")
    p_exam.add_argument("--answers-output", help="答案 Word 路径，默认在试卷文件名后加 -答案")
    p_exam.set_defaults(func=cmd_exam)

    p_tpl = sub.add_parser("template", help="写出示例输入文件")
    p_tpl.add_argument("kind", choices=["dictation", "grades", "exam"], help="模板类型")
    p_tpl.add_argument("-o", "--output", required=True, help="写出路径")
    p_tpl.set_defaults(func=cmd_template)

    p_web = sub.add_parser("web", help="启动网页，供本机和校园网同事使用")
    p_web.add_argument("--port", type=int, default=8501)
    p_web.set_defaults(func=cmd_web)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
