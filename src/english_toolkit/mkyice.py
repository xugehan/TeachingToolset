# -*- coding: utf-8 -*-
"""Create 门口易测 quizzes and fill objective answers."""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Any

HOST = "https://wv-mkyice.menco.cn"
API_ROOT = HOST + "/wvs/wvsv-1.2"
QUIZ_URL = "https://mkyice.cn/index.html#/teacher/quiz/{quiz_id}/bubblesheet"

_ERROR_HINTS = {
    "SESSION___LOGIN___PASSWORD_NOTCORRECT": "门口易测密码不对。",
    "SESSION___LOGIN___MOBILE_NOTFOUND": "门口易测找不到这个手机号。",
    "invalid teacherUserId": "门口易测登录没有带上会话，请再试一次。",
}


def choice_bits(answer: str, n_choices: int = 4) -> str:
    n_choices = max(2, min(11, n_choices))
    bits = ["0"] * n_choices
    letter = (answer or "").strip().upper()[:1]
    if letter and "A" <= letter <= "K":
        idx = ord(letter) - ord("A")
        if 0 <= idx < n_choices:
            bits[idx] = "1"
    return "".join(bits)


def bubble_items(mcqs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    items = []
    for item in mcqs:
        n_choices = len(item.get("options") or [])
        if item.get("kind") == "six" or n_choices >= 6:
            n_choices = 6
        elif n_choices == 3:
            n_choices = 3
        else:
            n_choices = 4
        items.append(
            {
                "itemOrdinal": int(item["no"]),
                "type": "single",
                "choices": choice_bits(str(item.get("answer") or ""), n_choices),
                "fullScore": 1,
            }
        )
    return items


def _unwrap(body: dict[str, Any]) -> dict[str, Any]:
    data = body.get("data")
    return data if isinstance(data, dict) else body


def _error_message(status: int, raw: str) -> str:
    body: Any
    try:
        body = json.loads(raw) if raw else {}
    except json.JSONDecodeError:
        body = {}
    errors = body.get("ERRORS") if isinstance(body, dict) else None
    if isinstance(errors, list):
        for item in errors:
            if isinstance(item, str) and item in _ERROR_HINTS:
                return _ERROR_HINTS[item]
            if isinstance(item, dict):
                code = str(item.get("ERROR_TYPE") or "")
                if code in _ERROR_HINTS:
                    return _ERROR_HINTS[code]
    snippet = (raw or "").strip()[:180]
    if snippet:
        return f"门口易测接口 {status}：{snippet}"
    return f"门口易测接口 {status}。"


class MkyiceError(RuntimeError):
    pass


class MkyiceClient:
    def __init__(self) -> None:
        self.opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
        self.mid = ""

    def _headers(self, *, json_body: bool) -> dict[str, str]:
        headers = {
            "Accept": "application/json",
            "Origin": "https://mkyice.cn",
            "Referer": "https://mkyice.cn/",
            "User-Agent": "Mozilla/5.0 EnglishToolkit",
            "MENCO-ASSESSMENT-MID": self.mid,
            "MENCO-ASSESSMENT-UAV": "",
        }
        if json_body:
            headers["Content-Type"] = "application/json"
        return headers

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        *,
        root: str = API_ROOT,
    ) -> dict[str, Any]:
        json_body = payload is not None
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            root + path,
            data=data,
            headers=self._headers(json_body=json_body),
            method=method,
        )
        try:
            with self.opener.open(req, timeout=30) as resp:
                raw = resp.read().decode("utf-8")
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise MkyiceError(_error_message(exc.code, detail)) from exc
        if not raw:
            return {}
        try:
            body = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise MkyiceError(f"门口易测返回不是 JSON：{raw[:200]}") from exc
        if isinstance(body, dict):
            return body
        return {"data": body}

    def ensure_mid(self) -> None:
        if self.mid:
            return
        body = self._request("POST", "/_meta/mId", {}, root=HOST)
        mid = str(body.get("mId") or _unwrap(body).get("mId") or "")
        if not mid:
            raise MkyiceError(f"门口易测未能分配会话：{body}")
        self.mid = mid

    def login(self, mobile: str, password: str) -> None:
        self.ensure_mid()
        self._request(
            "POST",
            "/api/session/login/password",
            {"mobile": mobile.strip(), "password": password},
        )
        sess = _unwrap(self._request("GET", "/api/session"))
        if str(sess.get("status") or "") != "loggedIn":
            raise MkyiceError("门口易测登录失败，请核对手机号和密码。")

    def create_quiz(self, name: str, description: str = "") -> str:
        body = self._request(
            "POST",
            "/api/teacher/quizzes",
            {"quizName": name, "quizDescription": description},
        )
        data = _unwrap(body)
        quiz_id = str(data.get("quizId") or data.get("id") or body.get("quizId") or "")
        if not quiz_id:
            raise MkyiceError(f"创建测验失败：{body}")
        return quiz_id

    def set_items(self, quiz_id: str, mcqs: list[dict[str, Any]]) -> None:
        self._request(
            "PUT",
            f"/api/teacher/quizzes/{quiz_id}/quizPaper/bubbleSheetStructure",
            {"bubbleSheetStructure": {"items": bubble_items(mcqs)}},
        )

    def create_answer_sheet(self, name: str, mcqs: list[dict[str, Any]]) -> dict[str, str]:
        if not mcqs:
            raise MkyiceError("没有选择题，无法生成答题卡。")
        quiz_id = self.create_quiz(name)
        self.set_items(quiz_id, mcqs)
        return {
            "quiz_id": quiz_id,
            "url": QUIZ_URL.format(quiz_id=quiz_id),
        }


def create_mkyice_sheet(mobile: str, password: str, name: str, mcqs: list[dict[str, Any]]) -> dict[str, str]:
    client = MkyiceClient()
    client.login(mobile, password)
    return client.create_answer_sheet(name, mcqs)
