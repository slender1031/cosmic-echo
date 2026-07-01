#!/usr/bin/env python3
"""
Download all 78 RWS tarot card images from jsDelivr CDN to public/tarot/
After running, update getTarotCardImageUrl() to return local paths.
"""

import os
import sys
import urllib.request
import urllib.error

CDN_BASE = "https://cdn.jsdelivr.net/npm/tarot-card-img@0.1.0"

# Card IDs in order (must match tarot-data.ts)
MAJOR_ARCANA_IDS = [
    "fool", "magician", "high-priestess", "empress", "emperor",
    "hierophant", "lovers", "chariot", "strength", "hermit",
    "wheel", "justice", "hanged-man", "death", "temperance",
    "devil", "tower", "star", "moon", "sun", "judgement", "world",
]

SUIT_RANKS = {
    "cups":    ["ace","two","three","four","five","six","seven","eight","nine","ten","page","knight","queen","king"],
    "pentacles": ["ace","two","three","four","five","six","seven","eight","nine","ten","page","knight","queen","king"],
    "swords":  ["ace","two","three","four","five","six","seven","eight","nine","ten","page","knight","queen","king"],
    "wands":   ["ace","two","three","four","five","six","seven","eight","nine","ten","page","knight","queen","king"],
}

SUIT_FILE_SUFFIX = {"cups": "c", "pentacles": "p", "swords": "s", "wands": "w"}
RANK_FILE_PREFIX = {"ace":"1","two":"2","three":"3","four":"4","five":"5",
                    "six":"6","seven":"7","eight":"8","nine":"9","ten":"10",
                    "page":"p","knight":"n","queen":"q","king":"k"}

def build_url(card_id: str, idx: int) -> str:
    """Build CDN URL for a card ID."""
    # Major Arcana
    if card_id in MAJOR_ARCANA_IDS:
        index = MAJOR_ARCANA_IDS.index(card_id)
        return f"{CDN_BASE}/major/{index}m.jpg"

    # Minor Arcana
    parts = card_id.split("-")
    if len(parts) == 2:
        rank, suit = parts
        suffix = SUIT_FILE_SUFFIX.get(suit)
        prefix = RANK_FILE_PREFIX.get(rank)
        if suffix and prefix:
            return f"{CDN_BASE}/{suit}/{prefix}{suffix}.jpg"

    return ""

def download_image(url: str, dest: str) -> bool:
    """Download a single image, return True on success."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            if resp.status != 200:
                print(f"    ✗ HTTP {resp.status}")
                return False
            with open(dest, "wb") as f:
                f.write(resp.read())
            return True
    except urllib.error.HTTPError as e:
        print(f"    ✗ HTTP Error {e.code}: {e.reason}")
        return False
    except Exception as e:
        print(f"    ✗ {e}")
        return False

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    out_dir = os.path.join(project_root, "public", "tarot")
    os.makedirs(out_dir, exist_ok=True)

    # Build ordered list of all 78 card IDs
    all_cards = []

    # Major Arcana
    for cid in MAJOR_ARCANA_IDS:
        all_cards.append(cid)

    # Minor Arcana
    for suit, ranks in SUIT_RANKS.items():
        for rank in ranks:
            all_cards.append(f"{rank}-{suit}")

    print(f"Downloading {len(all_cards)} RWS tarot images to:\n  {out_dir}\n")

    success = 0
    failed = []

    for i, card_id in enumerate(all_cards):
        url = build_url(card_id, i)
        dest = os.path.join(out_dir, f"{card_id}.jpg")
        label = f"[{i+1:2d}/78] {card_id}"
        print(f"{label} ... ", end="", flush=True)

        if os.path.exists(dest):
            print("skip (already exists)")
            success += 1
            continue

        if not url:
            print("✗ no URL mapping")
            failed.append(card_id)
            continue

        if download_image(url, dest):
            print("✓")
            success += 1
        else:
            failed.append(card_id)

    print(f"\nDone: {success}/{len(all_cards)} succeeded")
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for cid in failed:
            print(f"  - {cid}")

    print(f"\nImages saved to: {out_dir}")
    print("Now update getTarotCardImageUrl() in src/lib/tarot-data.ts to return local paths.")

if __name__ == "__main__":
    main()
