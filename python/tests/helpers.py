import json
from pathlib import Path

# tests/helpers.py → parents[0]=tests, [1]=python, [2]=repo root
REPO_ROOT = Path(__file__).resolve().parents[2]


def load_fixture(*parts: str) -> dict:
    path = REPO_ROOT / "shared" / "fixtures" / Path(*parts)
    return json.loads(path.read_text(encoding="utf-8"))
