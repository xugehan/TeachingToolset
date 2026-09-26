# -*- coding: utf-8 -*-
"""把原来的上海高中英语试卷生成器嵌进教学工具集，作为其中一个工具。"""

import streamlit as st
import streamlit.components.v1 as components

st.set_page_config(
    page_title="试卷生成器",
    page_icon="📑",
    layout="wide",
    initial_sidebar_state="expanded",
)

EXAM_PORT = 4173


def exam_url() -> str:
    try:
        host = st.context.headers.get("Host", "127.0.0.1:8501")
    except Exception:
        host = "127.0.0.1:8501"
    hostname = (host.split(":")[0] or "127.0.0.1").strip("[]")
    if not hostname or hostname == "0.0.0.0":
        hostname = "127.0.0.1"
    return f"http://{hostname}:{EXAM_PORT}/"


url = exam_url()

st.markdown(
    """
    <style>
      [data-testid="stHeader"],
      [data-testid="stToolbar"],
      [data-testid="stDecoration"],
      [data-testid="stStatusWidget"] { display: none !important; height: 0 !important; }
      #MainMenu, footer { visibility: hidden; }
      [data-testid="stAppViewContainer"] { overflow: hidden; }
      [data-testid="stMain"] {
        overflow: hidden !important;
        padding: 0 !important;
      }
      .block-container {
        padding: 0 !important;
        margin: 0 !important;
        max-width: 100% !important;
      }
      [data-testid="stVerticalBlock"] { gap: 0 !important; }
      iframe[title="st.iframe"] {
        display: block;
        width: 100% !important;
        border: 0 !important;
      }
    </style>
    """,
    unsafe_allow_html=True,
)

components.html(
    f"""
    <style>
      html, body {{
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #f4f6f9;
      }}
    </style>
    <iframe
      id="exam-paper"
      title="上海高中英语试卷生成器"
      src="{url}"
      scrolling="yes"
      style="position:absolute;inset:0;width:100%;height:100%;border:0;"
    ></iframe>
    <script>
      (function () {{
        function mainEl() {{
          try {{
            return window.parent.document.querySelector('[data-testid="stMain"]')
              || window.parent.document.querySelector('section.main');
          }} catch (e) {{
            return null;
          }}
        }}
        function pinTop() {{
          try {{
            window.parent.scrollTo(0, 0);
            const main = mainEl();
            if (main) main.scrollTop = 0;
          }} catch (e) {{}}
        }}
        function fit() {{
          const main = mainEl();
          const h = main
            ? Math.max(Math.floor(main.getBoundingClientRect().height), 640)
            : Math.max(window.parent.innerHeight || 800, 640);
          const self = window.frameElement;
          if (self) {{
            self.style.width = "100%";
            self.style.height = h + "px";
            self.style.minHeight = h + "px";
            self.style.border = "none";
            self.style.display = "block";
          }}
          pinTop();
        }}
        fit();
        window.addEventListener("resize", fit);
        try {{ window.parent.addEventListener("resize", fit); }} catch (e) {{}}
        document.getElementById("exam-paper").addEventListener("load", pinTop);
        setTimeout(fit, 50);
        setTimeout(fit, 300);
        setTimeout(pinTop, 450);
      }})();
    </script>
    """,
    height=800,
    scrolling=False,
)
