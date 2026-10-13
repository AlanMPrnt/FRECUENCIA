"""Genre vocabulary, normalization and the two-level family taxonomy."""

from __future__ import annotations

import math
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

GENRE_LIST_PATH = Path(__file__).with_name("musicbrainz_genres.txt")

GENRE_ALIASES = {
    "hip-hop": "hip hop",
    "hiphop": "hip hop",
    "latin hip-hop": "latin hip hop",
    "synthpop": "synth-pop",
    "rnb": "R&B",
    "r&b": "R&B",
    "rhythm and blues": "R&B",
    "contemporary r&b": "contemporary R&B",
    "alternative r&b": "alternative R&B",
    "neo psychedelic": "neo-psychedelia",
    "neo-psychedelic": "neo-psychedelia",
    "electronica": "electrónica",
    "electronic": "electrónica",
    "latin trap": "trap latino",
    "trap (latin)": "trap latino",
    "argentine trap": "trap argentino",
    "argentine rock": "rock argentino",
    "argentinian rock": "rock argentino",
    "rock en español": "rock en español",
    "rock en espanol": "rock en español",
}

# Ordered: the first family whose pattern matches wins, so specific scenes
# ("trap latino", "post-punk", "dubstep") are tested before broad words.
FAMILY_RULES: tuple[tuple[str, str], ...] = (
    ("Urbano latino", r"reggaeton|reggaetón|trap latino|trap argentino|latin trap|dembow|\brkt\b|urbano|latin urban|perreo|moombahton"),
    ("Cumbia y tropical", r"cumbia|cuarteto|guaracha|tropical|merengue|bachata|salsa|\bson\b|timba|vallenato|champeta|chicha"),
    ("Regional mexicano", r"corrido|\bbanda\b|norteñ|mariachi|ranchera|regional mexican|grupera|sierreñ"),
    ("Tango y folklore", r"tango|chacarera|zamba|folklore|chamamé|chamame|nueva canción|andean|milonga|candombe|criolla|carnavalito"),
    ("Música brasileña", r"samba|bossa nova|\bmpb\b|funk carioca|baile funk|brazilian|forró|sertanejo|axé|pagode|tropicália"),
    ("Metal", r"metal|grindcore|djent|deathcore"),
    ("Rock", r"post-punk|new wave|shoegaze|grunge|\brock\b|britpop|krautrock|math rock|stoner"),
    ("Punk y hardcore", r"punk|hardcore|\bemo\b|screamo|\boi\b"),
    ("Electrónica", r"electr|house|techno|trance|\bedm\b|dubstep|drum and bass|\bdnb\b|breakbeat|\bgarage\b|synthwave|\bidm\b|dance|hyperpop|hardstyle|jungle|downtempo|trip hop|chillwave|vaporwave|footwork|\bclub\b|ambient|electro"),
    ("Hip hop y rap", r"hip hop|\brap\b|\btrap\b|drill|grime|boom bap|phonk|freestyle"),
    ("R&B y soul", r"r&b|\bsoul\b|gospel|motown|quiet storm|new jack swing"),
    ("Funk y disco", r"\bfunk\b|disco|boogie"),
    ("Jazz y blues", r"jazz|blues|swing|bebop|bossa"),
    ("Clásica y bandas sonoras", r"classical|orchestral|opera|baroque|romantic|soundtrack|\bscore\b|chamber|minimalism|choral|piano"),
    ("Reggae y ska", r"reggae|\bska\b|\bdub\b|dancehall|rocksteady"),
    ("Folk y cantautor", r"folk|country|americana|bluegrass|singer-songwriter|cantautor|trova"),
    ("Indie y alternativo", r"\bindie\b|alternative|lo-fi|bedroom"),
    ("Pop", r"\bpop\b|synth-pop|balada|bolero|city pop|cantopop|mandopop"),
    ("Experimental", r"experimental|noise|avant-garde|industrial|drone"),
)
_COMPILED_RULES = tuple((name, re.compile(pattern)) for name, pattern in FAMILY_RULES)

# Broad descriptors describe a market or language more than a sound.
NON_FAMILY_GENRES = {"latin", "world", "international", "spanish", "argentine"}


@lru_cache(maxsize=1)
def known_genres() -> frozenset[str]:
    try:
        lines = GENRE_LIST_PATH.read_text(encoding="utf-8").splitlines()
    except OSError:
        return frozenset()
    return frozenset(line.strip().casefold() for line in lines if line.strip())


def canonical_genre(value: str) -> str | None:
    genre = re.sub(r"\s+", " ", str(value or "").strip().casefold())
    if not genre or len(genre) > 60:
        return None
    return GENRE_ALIASES.get(genre, genre)


def is_known_genre(value: str) -> bool:
    genre = str(value or "").strip().casefold()
    # Curated aliases cover local scenes the global list lacks ("argentine trap").
    return (
        genre in known_genres()
        or genre in GENRE_ALIASES
        or any(target.casefold() == genre for target in GENRE_ALIASES.values())
    )


def genres_from_tags(tags: Iterable[dict[str, Any]], *, limit: int = 5) -> list[str]:
    """Keep community tags that are genres and have meaningful votes.

    A tag needs at least a third of the top tag's votes, which drops one-off
    votes such as "pop rock" for a trap artist while keeping real secondary genres.
    """
    voted: dict[str, int] = {}
    for tag in tags:
        count = int(tag.get("count") or 0)
        name = str(tag.get("name") or "")
        genre = canonical_genre(name)
        if count < 1 or not genre or not (is_known_genre(name) or is_known_genre(genre)):
            continue
        voted[genre] = max(voted.get(genre, 0), count)
    if not voted:
        return []
    threshold = max(1, math.ceil(max(voted.values()) / 3))
    ordered = sorted(voted.items(), key=lambda item: (-item[1], item[0]))
    return [genre for genre, count in ordered if count >= threshold][:limit]


@lru_cache(maxsize=4096)
def genre_family(genre: str) -> str | None:
    value = str(genre or "").casefold()
    if not value or value in NON_FAMILY_GENRES:
        return None
    for name, pattern in _COMPILED_RULES:
        if pattern.search(value):
            return name
    return None


def artist_families(genres: Iterable[str]) -> list[str]:
    families: list[str] = []
    for genre in genres:
        family = genre_family(genre)
        if family and family not in families:
            families.append(family)
    return families
