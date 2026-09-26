# -*- coding: utf-8 -*-
"""Shanghai high-school English exam section catalog and form payload."""

from __future__ import annotations

from typing import Any

DIRECTIONS = {
    "listening_a": (
        "Directions: In Section A, you will hear ten short conversations between two speakers. "
        "At the end of each conversation, a question will be asked about what was said. "
        "The conversations and the questions will be spoken only once. After you hear a conversation "
        "and the question about it, read the four possible answers on your paper and decide which one "
        "is the best answer to the question you have heard."
    ),
    "listening_b": (
        "Directions: In Section B, you will hear two short passages and one longer conversation, "
        "and you will be asked several questions on each of the passages and the conversation. "
        "The passages and the conversation will be read twice, but the questions will be spoken only once. "
        "When you hear a question, read the four possible answers on your paper and decide which one "
        "would be the best answer to the question you have heard."
    ),
    "grammar": (
        "Directions: After reading the passage below, fill in the blanks to make the passage coherent "
        "and grammatically correct. For the blanks with a given word, fill in each blank with the proper "
        "form of the given word; for the other blanks, use one word that best fits each blank."
    ),
    "vocabulary": (
        "Directions: Fill in each blank with a proper word chosen from the box. Each word can only be "
        "used once. Note that there is one word more than you need."
    ),
    "cloze": (
        "Directions: For each blank in the following passage there are four words or phrases marked "
        "A, B, C and D. Fill in each blank with the word or phrase that best fits the context."
    ),
    "reading": (
        "Directions: Read the following three passages. Each passage is followed by several questions "
        "or unfinished statements. For each of them there are four choices marked A, B, C and D. "
        "Choose the one that fits best according to the information given in the passage you have just read."
    ),
    "section_c": (
        "Directions: Read the following passage. Fill in each blank with a proper sentence given in the box. "
        "Each sentence can be used only once. Note that there are two more sentences than you need."
    ),
    "summary": (
        "Directions: Read the following passage. Summarize the main idea and the main point(s) of the "
        "passage in no more than 60 words. Use your own words as far as possible."
    ),
    "translation": (
        "Directions: Translate the following sentences into English, using the words given in the brackets."
    ),
    "writing": (
        "Directions: Write an English composition in 120-150 words according to the instructions given below in Chinese."
    ),
}

EXAM_TYPES: list[dict[str, Any]] = [
    {
        "id": "listening_a",
        "title": "Listening A",
        "subtitle": "短对话",
        "major_group": "listening",
        "major_title": "Listening Comprehension",
        "section_label": "Section A",
        "type": "listening",
        "instruction": DIRECTIONS["listening_a"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "listening_b",
        "title": "Listening B",
        "subtitle": "短文 / 长对话",
        "major_group": "listening",
        "major_title": "Listening Comprehension",
        "section_label": "Section B",
        "type": "listening",
        "instruction": DIRECTIONS["listening_b"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "grammar",
        "title": "Grammar",
        "subtitle": "语法填空",
        "major_group": "grammar_vocab",
        "major_title": "Grammar and Vocabulary",
        "section_label": "Section A",
        "type": "grammar",
        "instruction": DIRECTIONS["grammar"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "vocabulary",
        "title": "Vocabulary",
        "subtitle": "十一选十",
        "major_group": "grammar_vocab",
        "major_title": "Grammar and Vocabulary",
        "section_label": "Section B",
        "type": "vocabulary",
        "instruction": DIRECTIONS["vocabulary"],
        "default_on": True,
        "has_word_bank": True,
    },
    {
        "id": "cloze",
        "title": "Cloze",
        "subtitle": "完形填空",
        "major_group": "reading",
        "major_title": "Reading Comprehension",
        "section_label": "Section A",
        "type": "cloze",
        "instruction": DIRECTIONS["cloze"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "reading_a",
        "title": "Reading A",
        "subtitle": "阅读理解 A",
        "major_group": "reading",
        "major_title": "Reading Comprehension",
        "section_label": "Section B",
        "reading_part_label": "(A)",
        "type": "reading",
        "instruction": DIRECTIONS["reading"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "reading_b",
        "title": "Reading B",
        "subtitle": "阅读理解 B",
        "major_group": "reading",
        "major_title": "Reading Comprehension",
        "section_label": "Section B",
        "reading_part_label": "(B)",
        "type": "reading",
        "instruction": None,
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "reading_c",
        "title": "Reading C",
        "subtitle": "阅读理解 C",
        "major_group": "reading",
        "major_title": "Reading Comprehension",
        "section_label": "Section B",
        "reading_part_label": "(C)",
        "type": "reading",
        "instruction": None,
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "section_c",
        "title": "Section C",
        "subtitle": "六选四",
        "major_group": "reading",
        "major_title": "Reading Comprehension",
        "section_label": "Section C",
        "type": "section_c",
        "instruction": DIRECTIONS["section_c"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "summary",
        "title": "Summary Writing",
        "subtitle": "语篇概要",
        "major_group": "summary",
        "major_title": "Summary Writing",
        "section_label": "",
        "type": "summary",
        "instruction": DIRECTIONS["summary"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "translation",
        "title": "Translation",
        "subtitle": "翻译",
        "major_group": "translation",
        "major_title": "Translation",
        "section_label": "",
        "type": "translation",
        "instruction": DIRECTIONS["translation"],
        "default_on": True,
        "has_word_bank": False,
    },
    {
        "id": "writing",
        "title": "Guided Writing",
        "subtitle": "大作文",
        "major_group": "writing",
        "major_title": "Guided Writing",
        "section_label": "",
        "type": "writing",
        "instruction": DIRECTIONS["writing"],
        "default_on": True,
        "has_word_bank": False,
    },
]

ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]


def parse_word_bank(text: str) -> list[str]:
    raw = (text or "").replace("，", ",").replace("、", ",")
    parts = []
    for chunk in raw.replace("\n", ",").split(","):
        word = chunk.strip()
        if word:
            parts.append(word)
    if len(parts) <= 1:
        parts = [w for w in (text or "").split() if w.strip()]
    return parts


def build_exam_payload(
    *,
    title: str,
    total_score: int | float,
    duration: str,
    year_month: str,
    selected_ids: list[str],
    contents: dict[str, str],
    instructions: dict[str, str],
    word_banks: dict[str, str] | None = None,
    answers: dict[str, str] | None = None,
    listening_scripts: str = "",
) -> dict[str, Any]:
    by_id = {item["id"]: item for item in EXAM_TYPES}
    chosen = [by_id[i] for i in selected_ids if i in by_id]
    if not chosen:
        raise ValueError("请至少勾选一个题型。")

    sections: list[dict[str, Any]] = []
    answer_blocks: list[dict[str, Any]] = []
    last_group = None
    roman_index = -1
    word_banks = word_banks or {}
    answers = answers or {}

    for item in chosen:
        if item["major_group"] != last_group:
            roman_index += 1
            last_group = item["major_group"]
        roman = ROMAN[roman_index]
        section: dict[str, Any] = {
            "major": roman,
            "major_title": item["major_title"],
            "section_label": item.get("section_label") or None,
            "type": item["type"],
            "instruction": instructions.get(item["id"], item.get("instruction") or ""),
            "content": contents.get(item["id"], ""),
        }
        if item.get("reading_part_label"):
            section["reading_part_label"] = item["reading_part_label"]
        bank = parse_word_bank(word_banks.get(item["id"], ""))
        if bank:
            section["word_bank"] = bank
        sections.append(section)

        answer_text = (answers.get(item["id"]) or "").strip()
        heading_parts = [f"{roman}. {item['major_title']}"]
        if item.get("section_label"):
            heading_parts.append(item["section_label"])
        if item.get("reading_part_label"):
            heading_parts.append(item["reading_part_label"])
        answer_blocks.append({"title": " ".join(heading_parts), "text": answer_text})

    payload: dict[str, Any] = {
        "exam": {
            "title": title.strip() or "试卷",
            "total_score": total_score,
            "duration": duration.strip(),
            "year_month": year_month.strip(),
        },
        "style": {
            "font_en": "Times New Roman",
            "font_zh": "宋体",
            "size_pt": 10.5,
            "line_spacing": 1.2,
        },
        "sections": sections,
        "answers": answer_blocks,
    }
    script = listening_scripts.strip()
    if script:
        payload["listening_scripts"] = [{"label": "听力原文", "text": script}]
    return payload
