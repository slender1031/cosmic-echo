#!/usr/bin/env python3
"""
Download all 78 RWS tarot card images.
Step 1: Search Wikimedia API to find actual filenames (no hardcoding).
Step 2: Batch-get image URLs (1 API call).
Step 3: Download all to public/tarot/.
"""
import os
import json
import time
import urllib.request
import urllib.parse

def wikimedia_search(query, limit=50):
    """Search Wikimedia for image titles matching query."""
    params = {
        "action": "query",
        "list": "search",
        "srsearch": query,
        "srnamespace": "6",  # File namespace
        "srlimit": str(limit),
        "format": "json",
    }
    url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": "CosmicEchoBot/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return [hit["title"] for hit in data.get("query", {}).get("search", [])]

def get_image_urls_batch(titles):
    """Batch query Wikimedia API for image URLs. titles = list of 'File:XXX.jpg'."""
    url_map = {}  # title -> url
    for i in range(0, len(titles), 50):
        batch = titles[i:i+50]
        params = {
            "action": "query",
            "titles": "|".join(batch),
            "prop": "imageinfo",
            "iiprop": "url|thumburl",
            "iiurlwidth": "300",
            "format": "json",
        }
        url = "https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"User-Agent": "CosmicEchoBot/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            for page in data.get("query", {}).get("pages", {}).values():
                title = page.get("title", "")
                info = page.get("imageinfo", [])
                if info:
                    # Prefer thumbnail URL (smaller, faster download)
                    img_url = info[0].get("thumburl") or info[0].get("url", "")
                    url_map[title] = img_url
        except Exception as e:
            print(f"  API error: {e}")
        time.sleep(0.5)
    return url_map

def download_image(url, dest):
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": "https://commons.wikimedia.org/",
    })
    with urllib.request.urlopen(req, timeout=60) as resp:
        with open(dest, "wb") as f:
            f.write(resp.read())

def main():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, ".."))
    out_dir = os.path.join(project_root, "public", "tarot")
    os.makedirs(out_dir, exist_ok=True)

    # card_id -> search query for Wikimedia
    SEARCH_QUERIES = {
        # Major Arcana
        "fool":        "RWS Tarot 00 Fool",
        "magician":    "RWS Tarot 01 Magician",
        "high-priestess": "RWS Tarot 02 High Priestess",
        "empress":     "RWS Tarot 03 Empress",
        "emperor":     "RWS Tarot 04 Emperor",
        "hierophant":  "RWS Tarot 05 Hierophant",
        "lovers":      "RWS Tarot 06 Lovers",
        "chariot":     "RWS Tarot 07 Chariot",
        "strength":    "RWS Tarot 08 Strength",
        "hermit":      "RWS Tarot 09 Hermit",
        "wheel":       "RWS Tarot 10 Wheel",
        "justice":     "RWS Tarot 11 Justice",
        "hanged-man":  "RWS Tarot 12 Hanged Man",
        "death":       "RWS Tarot 13 Death",
        "temperance":  "RWS Tarot 14 Temperance",
        "devil":       "RWS Tarot 15 Devil",
        "tower":       "RWS Tarot 16 Tower",
        "star":        "RWS Tarot 17 Star",
        "moon":        "RWS Tarot 18 Moon",
        "sun":         "RWS Tarot 19 Sun",
        "judgement":   "RWS Tarot 20 Judgement",
        "world":       "RWS Tarot 21 World",
        # Cups
        "ace-cups":      "RWS Tarot Ace Cups",
        "two-cups":      "RWS Tarot II Cups",
        "three-cups":    "RWS Tarot III Cups",
        "four-cups":     "RWS Tarot IV Cups",
        "five-cups":     "RWS Tarot V Cups",
        "six-cups":      "RWS Tarot VI Cups",
        "seven-cups":    "RWS Tarot VII Cups",
        "eight-cups":    "RWS Tarot VIII Cups",
        "nine-cups":     "RWS Tarot IX Cups",
        "ten-cups":      "RWS Tarot X Cups",
        "page-cups":     "RWS Tarot Page Cups",
        "knight-cups":   "RWS Tarot Knight Cups",
        "queen-cups":    "RWS Tarot Queen Cups",
        "king-cups":     "RWS Tarot King Cups",
        # Pentacles
        "ace-pentacles":      "RWS Tarot Ace Pentacles",
        "two-pentacles":      "RWS Tarot II Pentacles",
        "three-pentacles":    "RWS Tarot III Pentacles",
        "four-pentacles":     "RWS Tarot IV Pentacles",
        "five-pentacles":     "RWS Tarot V Pentacles",
        "six-pentacles":      "RWS Tarot VI Pentacles",
        "seven-pentacles":    "RWS Tarot VII Pentacles",
        "eight-pentacles":    "RWS Tarot VIII Pentacles",
        "nine-pentacles":     "RWS Tarot IX Pentacles",
        "ten-pentacles":      "RWS Tarot X Pentacles",
        "page-pentacles":     "RWS Tarot Page Pentacles",
        "knight-pentacles":   "RWS Tarot Knight Pentacles",
        "queen-pentacles":    "RWS Tarot Queen Pentacles",
        "king-pentacles":     "RWS Tarot King Pentacles",
        # Swords
        "ace-swords":      "RWS Tarot Ace Swords",
        "two-swords":      "RWS Tarot II Swords",
        "three-swords":    "RWS Tarot III Swords",
        "four-swords":     "RWS Tarot IV Swords",
        "five-swords":     "RWS Tarot V Swords",
        "six-swords":      "RWS Tarot VI Swords",
        "seven-swords":    "RWS Tarot VII Swords",
        "eight-swords":    "RWS Tarot VIII Swords",
        "nine-swords":     "RWS Tarot IX Swords",
        "ten-swords":      "RWS Tarot X Swords",
        "page-swords":     "RWS Tarot Page Swords",
        "knight-swords":   "RWS Tarot Knight Swords",
        "queen-swords":    "RWS Tarot Queen Swords",
        "king-swords":     "RWS Tarot King Swords",
        # Wands
        "ace-wands":      "RWS Tarot Ace Wands",
        "two-wands":      "RWS Tarot II Wands",
        "three-wands":    "RWS Tarot III Wands",
        "four-wands":     "RWS Tarot IV Wands",
        "five-wands":     "RWS Tarot V Wands",
        "six-wands":      "RWS Tarot VI Wands",
        "seven-wands":    "RWS Tarot VII Wands",
        "eight-wands":    "RWS Tarot VIII Wands",
        "nine-wands":     "RWS Tarot IX Wands",
        "ten-wands":      "RWS Tarot X Wands",
        "page-wands":     "RWS Tarot Page Wands",
        "knight-wands":   "RWS Tarot Knight Wands",
        "queen-wands":    "RWS Tarot Queen Wands",
        "king-wands":     "RWS Tarot King Wands",
    }

    print(f"Step 1: Searching Wikimedia for {len(SEARCH_QUERIES)} card image titles...")
    found_titles = {}  # card_id -> "File:XXX.jpg"
    not_found = []

    for i, (card_id, query) in enumerate(SEARCH_QUERIES.items()):
        try:
            results = wikimedia_search(query, limit=3)
            if results:
                # Pick the first result that looks like an RWS tarot image
                for title in results:
                    if "RWS" in title and ("Tarot" in title or "tarot" in title):
                        found_titles[card_id] = title
                        break
                else:
                    found_titles[card_id] = results[0]
            else:
                not_found.append(card_id)
        except Exception as e:
            print(f"  [{i+1}/78] {card_id} — search error: {e}")
            not_found.append(card_id)
        if (i + 1) % 10 == 0:
            print(f"  Searched {i+1}/78...")
        time.sleep(0.2)  # Be nice to Wikimedia

    print(f"\nFound {len(found_titles)} titles. {len(not_found)} not found.")
    if not_found:
        print(f"Not found: {not_found[:5]}...")

    print(f"\nStep 2: Batch-getting image URLs from Wikimedia...")
    titles_list = list(found_titles.values())
    url_map = get_image_urls_batch(titles_list)
    print(f"Got {len(url_map)} image URLs.")

    print(f"\nStep 3: Downloading images to {out_dir}...\n")
    print("=" * 60)

    ok = 0
    fail = 0
    skip = 0
    for card_id, wiki_title in found_titles.items():
        dest = os.path.join(out_dir, f"{card_id}.jpg")
        if os.path.exists(dest):
            print(f"  [skip] {card_id}")
            skip += 1
            continue
        img_url = url_map.get(wiki_title, "")
        if not img_url:
            print(f"  [FAIL] {card_id} — no URL for {wiki_title}")
            fail += 1
            continue
        try:
            download_image(img_url, dest)
            print(f"  [  OK  ] {card_id}")
            ok += 1
        except Exception as e:
            print(f"  [FAIL] {card_id} — {e}")
            fail += 1
        time.sleep(0.3)

    print("\n" + "=" * 60)
    print(f"Done! OK={ok}  skip={skip}  fail={fail}")
    print(f"Images saved to: {out_dir}")
    if fail > 0:
        print("\nSome images failed. Re-run this script to retry (skips existing).")

if __name__ == "__main__":
    main()
