#!/usr/bin/env python3
"""
Download Rider-Waite-Smith tarot images to public/tarot/
Uses batched Wikimedia API (1 request instead of 78) to avoid rate limiting.

Run this on YOUR local machine:
  python scripts/download-rws-images.py
"""

import os
import json
import time
import urllib.request
import urllib.parse

# --- All 78 RWS filenames ---
MAJOR = [
    ("fool",        "RWS_Tarot_00_The_Fool.jpg"),
    ("magician",     "RWS_Tarot_01_The_Magician.jpg"),
    ("high-priestess", "RWS_Tarot_02_The_High_Priestess.jpg"),
    ("empress",      "RWS_Tarot_03_The_Empress.jpg"),
    ("emperor",      "RWS_Tarot_04_The_Emperor.jpg"),
    ("hierophant",   "RWS_Tarot_05_The_Hierophant.jpg"),
    ("lovers",       "RWS_Tarot_06_The_Lovers.jpg"),
    ("chariot",      "RWS_Tarot_07_The_Chariot.jpg"),
    ("strength",     "RWS_Tarot_08_Strength.jpg"),
    ("hermit",       "RWS_Tarot_09_The_Hermit.jpg"),
    ("wheel",        "RWS_Tarot_10_Wheel_of_Fortune.jpg"),
    ("justice",      "RWS_Tarot_11_Justice.jpg"),
    ("hanged-man",   "RWS_Tarot_12_The_Hanged_Man.jpg"),
    ("death",        "RWS_Tarot_13_Death.jpg"),
    ("temperance",   "RWS_Tarot_14_Temperance.jpg"),
    ("devil",        "RWS_Tarot_15_The_Devil.jpg"),
    ("tower",        "RWS_Tarot_16_The_Tower.jpg"),
    ("star",         "RWS_Tarot_17_The_Star.jpg"),
    ("moon",         "RWS_Tarot_18_The_Moon.jpg"),
    ("sun",          "RWS_Tarot_19_The_Sun.jpg"),
    ("judgement",    "RWS_Tarot_20_Judgement.jpg"),
    ("world",        "RWS_Tarot_21_The_World.jpg"),
]

MINOR = [
    # Cups
    ("ace-cups",   "RWS_Tarot_ACE_Cups.jpg"),
    ("two-cups",   "RWS_Tarot_02_Cups.jpg"),
    ("three-cups", "RWS_Tarot_03_Cups.jpg"),
    ("four-cups",  "RWS_Tarot_04_Cups.jpg"),
    ("five-cups",  "RWS_Tarot_05_Cups.jpg"),
    ("six-cups",   "RWS_Tarot_06_Cups.jpg"),
    ("seven-cups", "RWS_Tarot_07_Cups.jpg"),
    ("eight-cups", "RWS_Tarot_08_Cups.jpg"),
    ("nine-cups",  "RWS_Tarot_09_Cups.jpg"),
    ("ten-cups",   "RWS_Tarot_10_Cups.jpg"),
    ("page-cups",  "RWS_Tarot_PAGE_Cups.jpg"),
    ("knight-cups", "RWS_Tarot_KNIGHT_Cups.jpg"),
    ("queen-cups", "RWS_Tarot_QUEEN_Cups.jpg"),
    ("king-cups",  "RWS_Tarot_KING_Cups.jpg"),
    # Pentacles
    ("ace-pentacles",   "RWS_Tarot_ACE_Pentacles.jpg"),
    ("two-pentacles",   "RWS_Tarot_02_Pentacles.jpg"),
    ("three-pentacles", "RWS_Tarot_03_Pentacles.jpg"),
    ("four-pentacles",  "RWS_Tarot_04_Pentacles.jpg"),
    ("five-pentacles",  "RWS_Tarot_05_Pentacles.jpg"),
    ("six-pentacles",   "RWS_Tarot_06_Pentacles.jpg"),
    ("seven-pentacles", "RWS_Tarot_07_Pentacles.jpg"),
    ("eight-pentacles", "RWS_Tarot_08_Pentacles.jpg"),
    ("nine-pentacles",  "RWS_Tarot_09_Pentacles.jpg"),
    ("ten-pentacles",   "RWS_Tarot_10_Pentacles.jpg"),
    ("page-pentacles",  "RWS_Tarot_PAGE_Pentacles.jpg"),
    ("knight-pentacles", "RWS_Tarot_KNIGHT_Pentacles.jpg"),
    ("queen-pentacles", "RWS_Tarot_QUEEN_Pentacles.jpg"),
    ("king-pentacles",  "RWS_Tarot_KING_Pentacles.jpg"),
    # Swords
    ("ace-swords",   "RWS_Tarot_ACE_Swords.jpg"),
    ("two-swords",   "RWS_Tarot_02_Swords.jpg"),
    ("three-swords", "RWS_Tarot_03_Swords.jpg"),
    ("four-swords",  "RWS_Tarot_04_Swords.jpg"),
    ("five-swords",  "RWS_Tarot_05_Swords.jpg"),
    ("six-swords",   "RWS_Tarot_06_Swords.jpg"),
    ("seven-swords", "RWS_Tarot_07_Swords.jpg"),
    ("eight-swords", "RWS_Tarot_08_Swords.jpg"),
    ("nine-swords",  "RWS_Tarot_09_Swords.jpg"),
    ("ten-swords",   "RWS_Tarot_10_Swords.jpg"),
    ("page-swords",  "RWS_Tarot_PAGE_Swords.jpg"),
    ("knight-swords", "RWS_Tarot_KNIGHT_Swords.jpg"),
    ("queen-swords", "RWS_Tarot_QUEEN_Swords.jpg"),
    ("king-swords",  "RWS_Tarot_KING_Swords.jpg"),
    # Wands
    ("ace-wands",   "RWS_Tarot_ACE_Wands.jpg"),
    ("two-wands",   "RWS_Tarot_02_Wands.jpg"),
    ("three-wands", "RWS_Tarot_03_Wands.jpg"),
    ("four-wands",  "RWS_Tarot_04_Wands.jpg"),
    ("five-wands",  "RWS_Tarot_05_Wands.jpg"),
    ("six-wands",   "RWS_Tarot_06_Wands.jpg"),
    ("seven-wands", "RWS_Tarot_07_Wands.jpg"),
    ("eight-wands", "RWS_Tarot_08_Wands.jpg"),
    ("nine-wands",  "RWS_Tarot_09_Wands.jpg"),
    ("ten-wands",   "RWS_Tarot_10_Wands.jpg"),
    ("page-wands",  "RWS_Tarot_PAGE_Wands.jpg"),
    ("knight-wands", "RWS_Tarot_KNIGHT_Wands.jpg"),
    ("queen-wands", "RWS_Tarot_QUEEN_Wands.jpg"),
    ("king-wands",  "RWS_Tarot_KING_Wands.jpg"),
]

ALL_CARDS = MAJOR + MINOR


def fetch_all_image_urls():
    """Batch query Wikimedia API - one request for all 78 cards."""
    titles = "|".join(f"File:{fn}" for _, fn in ALL_CARDS)
    params = urllib.parse.urlencode({
        "action": "query",
        "titles": titles,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
        "formatversion": "2",
    })
    url = f"https://commons.wikimedia.org/w/api.php?{params}"

    print("Querying Wikimedia API (batch, 1 request for all 78 cards)...")
    req = urllib.request.Request(url, headers={"User-Agent": "CosmicEchoTarot/1.0 (contact@example.com)"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode())

    # Map filename -> image URL
    url_map = {}
    pages = data.get("query", {}).get("pages", [])
    for page in pages:
        title = page.get("title", "")          # "File:RWS_Tarot_00_The_Fool.jpg"
        info = page.get("imageinfo", [])
        if info and "url" in info[0]:
            fname = title.replace("File:", "")
            url_map[fname] = info[0]["url"]

    print(f"  Got URLs for {len(url_map)} / {len(ALL_CARDS)} cards")
    return url_map


def download_image(img_url, out_path):
    req = urllib.request.Request(
        img_url,
        headers={"User-Agent": "CosmicEchoTarot/1.0 (contact@example.com)"}
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = resp.read()
    with open(out_path, "wb") as f:
        f.write(data)
    return len(data)


def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)
    out_dir = os.path.join(project_root, "public", "tarot")
    os.makedirs(out_dir, exist_ok=True)

    print(f"Output directory: {out_dir}")
    print("-" * 60)

    # --- Step 1: Batch fetch all image URLs from Wikimedia ---
    try:
        url_map = fetch_all_image_urls()
    except Exception as e:
        print(f"FATAL: Wikimedia API request failed: {e}")
        print("Try again later, or check your internet connection.")
        return

    # --- Step 2: Download each image ---
    ok = 0
    failed = []
    skipped = 0
    total = len(ALL_CARDS)

    for i, (card_id, filename) in enumerate(ALL_CARDS, 1):
        out_path = os.path.join(out_dir, f"{card_id}.jpg")

        if os.path.exists(out_path):
            skipped += 1
            continue

        img_url = url_map.get(filename)
        if not img_url:
            print(f"  [{i:2d}/{total}] {card_id:<18} SKIP (no URL from API)")
            failed.append(card_id)
            continue

        try:
            size = download_image(img_url, out_path)
            print(f"  [{i:2d}/{total}] {card_id:<18} OK ({size//1024} KB)")
            ok += 1
        except Exception as e:
            print(f"  [{i:2d}/{total}] {card_id:<18} FAILED: {e}")
            failed.append(card_id)

    print("-" * 60)
    print(f"Done! Downloaded: {ok}, Skipped (already exist): {skipped}, Failed: {len(failed)}")
    if failed:
        print(f"\nFailed cards ({len(failed)}):")
        for cid in failed:
            print(f"  - {cid}")
        print("\nRe-run this script to retry failed downloads.")


if __name__ == "__main__":
    main()
