#!/usr/bin/env python3
"""
Download Rider-Waite-Smith tarot card images via Wikimedia API.
Properly resolves each filename to its actual URL.
"""

import os
import json
import time
import urllib.request
import urllib.parse

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "public", "tarot")
os.makedirs(OUTPUT_DIR, exist_ok=True)

HEADERS = {
    "User-Agent": "CosmicEchoTarotBot/1.0",
    "Accept": "application/json",
}

# All 78 cards: (id, wikimedia_filename)
CARDS = []

# Major Arcana
MAJOR = [
    ("fool",        "RWS_Tarot_00_The_Fool.jpg"),
    ("magician",    "RWS_Tarot_01_The_Magician.jpg"),
    ("high-priestess", "RWS_Tarot_02_The_High_Priestess.jpg"),
    ("empress",     "RWS_Tarot_03_The_Empress.jpg"),
    ("emperor",     "RWS_Tarot_04_The_Emperor.jpg"),
    ("hierophant",  "RWS_Tarot_05_The_Hierophant.jpg"),
    ("lovers",      "RWS_Tarot_06_The_Lovers.jpg"),
    ("chariot",     "RWS_Tarot_07_The_Chariot.jpg"),
    ("strength",    "RWS_Tarot_08_Strength.jpg"),
    ("hermit",      "RWS_Tarot_09_The_Hermit.jpg"),
    ("wheel",       "RWS_Tarot_10_Wheel_of_Fortune.jpg"),
    ("justice",     "RWS_Tarot_11_Justice.jpg"),
    ("hanged-man",  "RWS_Tarot_12_The_Hanged_Man.jpg"),
    ("death",       "RWS_Tarot_13_Death.jpg"),
    ("temperance",  "RWS_Tarot_14_Temperance.jpg"),
    ("devil",       "RWS_Tarot_15_The_Devil.jpg"),
    ("tower",       "RWS_Tarot_16_The_Tower.jpg"),
    ("star",        "RWS_Tarot_17_The_Star.jpg"),
    ("moon",        "RWS_Tarot_18_The_Moon.jpg"),
    ("sun",         "RWS_Tarot_19_The_Sun.jpg"),
    ("judgement",   "RWS_Tarot_20_Judgement.jpg"),
    ("world",       "RWS_Tarot_21_The_World.jpg"),
]

# Minor Arcana
SUITS_WM = ["Cups", "Pentacles", "Swords", "Wands"]
RANKS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"]
COURT_WM = [("Page", "Knave"), ("Knight", "Knight"), ("Queen", "Queen"), ("King", "King")]

def get_wm_image_url(filename):
    """Use Wikimedia API to get the actual image URL."""
    # Normalize filename: replace spaces with underscores for API
    api_filename = filename.replace(" ", "_")
    title = f"File:{api_filename}"
    
    params = urllib.parse.urlencode({
        "action": "query",
        "titles": title,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
    })
    url = f"https://commons.wikimedia.org/w/api.php?{params}"
    
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            pages = data.get("query", {}).get("pages", {})
            for page in pages.values():
                ii = page.get("imageinfo", [])
                if ii:
                    return ii[0].get("url", "")
    except Exception as e:
        pass
    return ""


def download(url, path):
    req = urllib.request.Request(url, headers={**HEADERS, "Accept": "image/*"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status == 200:
                data = resp.read()
                if len(data) > 1000:
                    with open(path, "wb") as f:
                        f.write(data)
                    return True
    except Exception:
        pass
    return False


def main():
    print(f"Output: {OUTPUT_DIR}")
    print("=" * 60)
    
    # Build full card list
    cards = list(MAJOR)
    for suit_id, suit_wm in [("cups","Cups"), ("pentacles","Pentacles"), ("swords","Swords"), ("wands","Wands")]:
        # Ace
        cards.append((f"ace-{suit_id}", f"RWS_Tarot_01_{suit_wm}_Ace.jpg"))
        # 2-10
        for i, num in enumerate(["02","03","04","05","06","07","08","09","10"], 2):
            cards.append((f"{i}-{suit_id}" if i > 1 else f"ace-{suit_id}", 
                       f"RWS_Tarot_{num}_{suit_wm}.jpg"))
        # Fix: regenerate properly
        pass  # Will rebuild below
    
    # Rebuild minor arcana properly
    cards = list(MAJOR)
    for suit_id, suit_wm in [("cups","Cups"), ("pentacles","Pentacles"), ("swords","Swords"), ("wands","Wands")]:
        cards.append((f"ace-{suit_id}", f"RWS_Tarot_01_{suit_wm}_Ace.jpg"))
        for num in ["02","03","04","05","06","07","08","09","10"]:
            rank_id = str(int(num)) if num != "10" else "10"
            cards.append((f"{rank_id}-{suit_id}", f"RWS_Tarot_{num}_{suit_wm}.jpg"))
        for rank_id, rank_wm in [("page","Knave"), ("knight","Knight"), ("queen","Queen"), ("king","King")]:
            cards.append((f"{rank_id}-{suit_id}", f"RWS_Tarot_{rank_wm}_{suit_wm}.jpg"))

    ok = 0
    fail = []

    for card_id, wm_filename in cards:
        out = os.path.join(OUTPUT_DIR, f"{card_id}.jpg")
        if os.path.exists(out):
            print(f"  [skip] {card_id}")
            ok += 1
            continue
        
        print(f"  {card_id}: ", end="", flush=True)
        
        # Try Wikimedia API
        img_url = get_wm_image_url(wm_filename)
        if img_url:
            print(f"API OK, downloading... ", end="", flush=True)
            if download(img_url, out):
                print("✓")
                ok += 1
                time.sleep(0.3)
                continue
            else:
                print("DOWNLOAD FAIL", flush=True)
        else:
            print("API FAIL, ", end="", flush=True)
            
            # Try alternative filename (with spaces)
            alt_filename = wm_filename.replace("_", " ")
            img_url2 = get_wm_image_url(alt_filename)
            if img_url2:
                print(f"alt API OK, downloading... ", end="", flush=True)
                if download(img_url2, out):
                    print("✓")
                    ok += 1
                    time.sleep(0.3)
                    continue
                else:
                    print("DOWNLOAD FAIL", flush=True)
            else:
                print("alt FAIL", flush=True)
        
        fail.append(card_id)
        time.sleep(0.5)

    print("\n" + "=" * 60)
    print(f"Done: {ok}/78  success")
    if fail:
        print(f"Failed ({len(fail)}): {fail[:10]}...")
    else:
        print("All 78 cards downloaded!")


if __name__ == "__main__":
    main()
