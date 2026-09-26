from pathlib import Path

from english_toolkit.cli import main

ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples"


def main_write() -> None:
    EXAMPLES.mkdir(exist_ok=True)
    main(["template", "dictation", "-o", str(EXAMPLES / "dictation.txt")])
    main(["template", "grades", "-o", str(EXAMPLES / "grades.xlsx")])
    main(["template", "exam", "-o", str(EXAMPLES / "exam.json")])


if __name__ == "__main__":
    main_write()
