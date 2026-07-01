"""Download Lenormand card images from GitHub and rename to our ID format."""
import urllib.request
import os

BASE_URL = "https://raw.githubusercontent.com/JohnnyDaMan/Tarot/main/Lenormand36cards/images/c%20({}).jpg"
OUTPUT_DIR = "C:/Users/Admin/Desktop/学习营第二期/cosmic-echo-demo/public/lenormand"

# Mapping from number to our ID
NUM_TO_ID = {
    1: "rider", 2: "clover", 3: "ship", 4: "house", 5: "tree",
    6: "clouds", 7: "snake", 8: "coffin", 9: "bouquet", 10: "scythe",
    11: "whip", 12: "birds", 13: "child", 14: "fox", 15: "bear",
    16: "stars", 17: "stork", 18: "dog", 19: "tower", 20: "garden",
    21: "mountain", 22: "crossroads", 23: "mice", 24: "heart", 25: "ring",
    26: "book", 27: "letter", 28: "man", 29: "woman", 30: "lily",
    31: "sun", 32: "moon", 33: "key", 34: "fish", 35: "anchor", 36: "cross",
}

os.makedirs(OUTPUT_DIR, exist_ok=True)

for num in range(1, 37):
    card_id = NUM_TO_ID[num]
    url = BASE_URL.format(num)
    out_path = os.path.join(OUTPUT_DIR, f"{card_id}.jpg")

    if os.path.exists(out_path):
        print(f"[{num}/36] {card_id}.jpg already exists, skipping")
        continue

    print(f"[{num}/36] Downloading {card_id}.jpg from {url}...")
    try:
        urllib.request.urlretrieve(url, out_path)
        size = os.path.getsize(out_path)
        print(f"  -> OK ({size} bytes)")
    except Exception as e:
        print(f"  -> FAILED: {e}")

print("Done!")
