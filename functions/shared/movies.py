"""Movie catalogue loaded from the bundled JSON file.

movies_catalogue.json is included in the shared Lambda Layer so all
functions can access it without any network I/O. The list is cached at
module level so repeated calls within the same container are free.

Consumers:
  - recommend Lambda: get_all_movies() for preference filtering
  - watch_later Lambda: resolve_movie() to look up a title by movieId
"""
import json
import pathlib

_catalogue: list | None = None


def _load() -> list:
    global _catalogue
    if _catalogue is None:
        path = pathlib.Path(__file__).parent / "movies_catalogue.json"
        with open(path, encoding="utf-8") as f:
            _catalogue = json.load(f)
    return _catalogue


def get_all_movies() -> list:
    return _load()


def resolve_movie(movie_id: str) -> dict | None:
    return next((m for m in _load() if m["movieId"] == movie_id), None)
