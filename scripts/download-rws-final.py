#!/usr/bin/env python3
"""
Download Rider-Waite-Smith tarot images.
Primary source: sacred-texts.com (no API needed, direct URLs)
Fallback: Wikimedia Commons API

Run on YOUR local machine:
  python scripts/download-rws-final.py
"""

import os
import time
import json
import urllib.request
import urllib.parse
import ssl

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "tarot")
OUT_DIR = os.path.normpath(OUT_DIR)

# sacred-texts.com URL patterns
# Major: ar00.jpg .. ar21.jpg
# Minor: cups -> acup01.jpg? Let's try multiple patterns.
SACRED_BASE = "https://www.sacred-texts.com/tarot/pkt/img"

# Wikimedia filenames for all 78 cards
MAJOR_FILES = [
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

# Minor arcana: try Wikimedia via API
MINOR_IDS = [
    "ace-cups","two-cups","three-cups","four-cups","five-cups","six-cups","seven-cups","eight-cups","nine-cups","ten-cups",
    "page-cups","knight-cups","queen-cups","king-cups",
    "ace-pentacles","two-pentacles","three-pentacles","four-pentacles","five-pentacles","six-pentacles","seven-pentacles","eight-pentacles","nine-pentacles","ten-pentacles",
    "page-pentacles","knight-pentacles","queen-pentacles","king-pentacles",
    "ace-swords","two-swords","three-swords","four-swords","five-swords","six-swords","seven-swords","eight-swords","nine-swords","ten-swords",
    "page-swords","knight-swords","queen-swords","king-swords",
    "ace-wands","two-wands","three-wands","four-wands","five-wands","six-wands","seven-wands","eight-wands","nine-wands","ten-wands",
    "page-wands","knight-wands","queen-wands","king-wands",
]

def make_headers():
    return {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.sacred-texts.com/",
    }

def download_url(url, out_path, timeout=30):
    """Download url to out_path. Returns True on success."""
    try:
        req = urllib.request.Request(url, headers=make_headers())
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            data = resp.read()
        if len(data) < 1024:  # too small, probably error page
            return False
        with open(out_path, "wb") as f:
            f.write(data)
        return True
    except Exception:
        return False

def fetch_wikimedia_urls_batch(card_ids_and_files):
    """Batch query Wikimedia API for image URLs. Returns {filename: url}."""
    titles = "|".join(f"File:{fname}" for _, fname in card_ids_and_files)
    params = urllib.parse.urlencode({
        "action": "query",
        "titles": titles,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
        "formatversion": "2",
    })
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    try:
        req = urllib.request.Request(url, headers=make_headers())
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
        result = {}
        for page in data.get("query", {}).get("pages", []):
            title = page.get("title", "")
            fname = title.replace("File:", "")
            info = page.get("imageinfo", [])
            if info and "url" in info[0]:
                result[fname] = info[0]["url"]
        return result
    except Exception as e:
        print(f"  Wikimedia API error: {e}")
        return {}

def run():
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f"Output: {OUT_DIR}")
    print("-" * 60)

    ok = 0
    failed = []
    skipped = 0

    # ============ Step 1: Major Arcana from sacred-texts.com ============
    print("[1/2] Downloading Major Arcana from sacred-texts.com ...")
    for i, (card_id, wm_filename) in enumerate(MAJOR_FILES):
        out_path = os.path.join(OUT_DIR, f"{card_id}.jpg")
        if os.path.exists(out_path):
            skipped += 1
            continue

        # Try sacred-texts.com (ar00.jpg .. ar21.jpg)
        st_url = f"{SACRED_BASE}/ar{i:02d}.jpg"
        print(f"  {card_id:20s} -> sacred-texts.com ... ", end="", flush=True)
        if download_url(st_url, out_path):
            print("OK")
            ok += 1
        else:
            # Fallback: try Wikimedia
            print("retry via Wikimedia ... ", end="", flush=True)
            wm_urls = fetch_wikimedia_urls_batch([(card_id, wm_filename)])
            wm_url = wm_urls.get(wm_filename)
            if wm_url and download_url(wm_url, out_path):
                print("OK (Wikimedia)")
                ok += 1
            else:
                print("FAILED")
                failed.append(card_id)
        time.sleep(0.5)

    # ============ Step 2: Minor Arcana from Wikimedia ============
    print(f"\n[2/2] Downloading Minor Arcana from Wikimedia ...")
    # Batch query all 56 minor arcana URLs
    minor_files = []
    for cid in MINOR_IDS:
        # Derive Wikimedia filename from card ID
        # e.g. "ace-cups" -> "RWS_Tarot_ACE_Cups.jpg"
        parts = cid.split("-")
        rank = parts[0].capitalize()
        suit = parts[1].capitalize()
        wm_fname = f"RWS_Tarot_{rank}_{suit}.jpg"
        minor_files.append((cid, wm_fname))

    print("  Querying Wikimedia API (batch) ...")
    wm_url_map = fetch_wikimedia_urls_batch(minor_files)
    print(f"  Got {len(wm_url_map)} URLs from API")

    for cid, wm_fname in minor_files:
        out_path = os.path.join(OUT_DIR, f"{cid}.jpg")
        if os.path.exists(out_path):
            skipped += 1
            continue

        print(f"  {cid:20s} ... ", end="", flush=True)
        wm_url = wm_url_map.get(wm_fname)
        if wm_url and download_url(wm_url, out_path):
            print("OK")
            ok += 1
        else:
            # Try sacred-texts.com with alternate pattern
            # Minor arcana on sacred-texts: try /tarot/pkt/img/acup01.jpg etc.
            alt_url = f"{SACRED_BASE}/{_minor_st_name(cid)}.jpg"
            if download_url(alt_url, out_path):
                print("OK (sacred-texts)")
                ok += 1
            else:
                print("FAILED")
                failed.append(cid)
        time.sleep(0.3)

    print("-" * 60)
    print(f"Done! Downloaded: {ok}, Skipped: {skipped}, Failed: {len(failed)}")
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for c in failed:
            print(f"  - {c}")
        print("\nTip: re-run this script to retry failed downloads.")
        print("     If Wikimedia is blocked, try using a VPN or proxy.")

def _minor_st_name(card_id):
    """Try to guess sacred-texts.com minor arcana filename."""
    # sacred-texts.com minor arcana pattern (best guess):
    # Cups: acup01, acup02, ... acup14 (page=11, knight=12, queen=13, king=14)
    parts = card_id.split("-")
    rank_map = {"ace": "01","two":"02","three":"03","four":"04","five":"05","six":"06","seven":"07","eight":"08","nine":"09","ten":"10",
                "page":"11","knight":"12","queen":"13","king":"14"}
    suit_map = {"cups":"cup","pentacles":"pen","swords":"swd","wands":"wan"}
    rank = rank_map.get(parts[0], "01")
    suit = suit_map.get(parts[1], "cup")
    return f"a{suit}{rank}"

if __name__ == "__main__":
    run()
