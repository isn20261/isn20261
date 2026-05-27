"""Mock movie catalogue shared across Lambdas via the `shared` layer.

Single source of truth for the catalogue and the `movieId` → entry lookup.
Replace MOCK_CATALOGUE with a real OMDB-backed lookup in production; see
docs/inconsistencias.md.

Consumers:
  - recommend Lambda: full catalogue for preference filtering
  - watch_later Lambda: resolve_movie() to enrich a saved entry with title
"""

MOCK_CATALOGUE = [
    {
        "movieId": "tt0133093",
        "title":   "The Matrix",
        "genre":   "action",
        "streaming-services": [
            {"name": "Netflix",
             "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
             "url":   "https://www.netflix.com/title/20557937"},
        ],
    },
    {
        "movieId": "tt0816692",
        "title":   "Interstellar",
        "genre":   "sci-fi",
        "streaming-services": [
            {"name": "Amazon Prime",
             "image": "https://www.amazon.com/favicon.ico",
             "url":   "https://www.amazon.com/dp/B00TU9UFTS"},
        ],
    },
    {
        "movieId": "tt1375666",
        "title":   "Inception",
        "genre":   "sci-fi",
        "streaming-services": [
            {"name": "Netflix",
             "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
             "url":   "https://www.netflix.com/title/70131314"},
        ],
    },
    {
        "movieId": "tt0468569",
        "title":   "The Dark Knight",
        "genre":   "action",
        "streaming-services": [
            {"name": "HBO Max",
             "image": "https://www.max.com/favicon.ico",
             "url":   "https://www.max.com/movies/dark-knight/07938dc1-3e25-4b2e-b01e-f23b7eed5977"},
        ],
    },
    {
        "movieId": "tt0110912",
        "title":   "Pulp Fiction",
        "genre":   "crime",
        "streaming-services": [
            {"name": "Amazon Prime",
             "image": "https://www.amazon.com/favicon.ico",
             "url":   "https://www.amazon.com/dp/B001CWSITY"},
        ],
    },
    {
        "movieId": "tt0245429",
        "title":   "Spirited Away",
        "genre":   "animation",
        "streaming-services": [
            {"name": "Netflix",
             "image": "https://assets.nflxext.com/us/ffe/siteui/common/icons/nficon2016.ico",
             "url":   "https://www.netflix.com/title/60023642"},
        ],
    },
]

def resolve_movie(movie_id: str) -> dict | None:
    """Return a catalogue entry by movieId, or None if not found."""
    return next((m for m in MOCK_CATALOGUE if m["movieId"] == movie_id), None)
