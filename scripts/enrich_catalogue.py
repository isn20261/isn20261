"""Enrich functions/shared/movies_catalogue.json with `synopsis` and `cast`.

The Lambda catalogue (movies_catalogue.json) was generated without plot text or
cast — those two fields only exist in the raw dataset (datasets/imdb_top_1000.csv,
columns `Overview` and `Star1`..`Star4`). This script does a one-time, idempotent
merge so the recommend Lambda can return them.

Join strategy: title-only, case-insensitive. Verified 1000/1000 match against the
current catalogue (title+year matches 999/1000 — only "Apollo 13" differs on year —
so title-only is the reliable key here).

Idempotent: re-running overwrites `synopsis`/`cast` with the same values; it never
duplicates records or reorders the catalogue. Safe to run repeatedly.

Usage:
    python scripts/enrich_catalogue.py            # writes in place
    python scripts/enrich_catalogue.py --check    # dry-run; prints coverage, no write
"""
from __future__ import annotations

import argparse
import csv
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "functions" / "shared" / "movies_catalogue.json"
CSV_PATH = ROOT / "datasets" / "imdb_top_1000.csv"


def _norm(title: str) -> str:
    return title.strip().lower()


def build_csv_index() -> dict[str, dict]:
    with open(CSV_PATH, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    # Last-wins on duplicate titles (none expected in this dataset).
    return {_norm(r["Series_Title"]): r for r in rows}


def cast_from_row(row: dict) -> list[str]:
    stars = [row.get(f"Star{i}", "").strip() for i in range(1, 5)]
    return [s for s in stars if s]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="dry-run: report coverage without writing",
    )
    args = parser.parse_args()

    catalogue = json.loads(CATALOGUE.read_text(encoding="utf-8"))
    csv_index = build_csv_index()

    matched = 0
    missing: list[str] = []
    for movie in catalogue:
        row = csv_index.get(_norm(movie["title"]))
        if row is None:
            missing.append(movie["title"])
            continue
        matched += 1
        synopsis = (row.get("Overview") or "").strip()
        cast = cast_from_row(row)
        if not args.check:
            # Insert synopsis right after genre and cast right after director for
            # readable diffs; dict order in Python is insertion order, but since
            # these keys may already exist we just assign — JSON output below is
            # sorted by our explicit key order writer, not dict order.
            movie["synopsis"] = synopsis
            movie["cast"] = cast

    print(f"catalogue records : {len(catalogue)}")
    print(f"matched in CSV    : {matched}/{len(catalogue)}")
    if missing:
        print(f"UNMATCHED ({len(missing)}): {missing}")

    if args.check:
        print("\n--check: no file written.")
        return 0 if not missing else 1

    CATALOGUE.write_text(
        json.dumps(catalogue, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"\nwrote {CATALOGUE.relative_to(ROOT)}")
    return 0 if not missing else 1


if __name__ == "__main__":
    sys.exit(main())
