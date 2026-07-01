"""
Crop 1799 Game of Hope Lenormand cards from Wikimedia Commons composite.
Uses auto-detected card positions with perspective/skew correction.
Properly sorts into 6x6 grid before mapping to card IDs.
"""
import cv2
import numpy as np
from PIL import Image
import os

# ── config ──
SRC = "/tmp/game_of_hope.png"
OUT_DIR = r"C:\Users\Admin\Desktop\学习营第二期\cosmic-echo-demo\public\lenormand"

# Card IDs in reading order: row 1→row 6, left→right within each row
CARD_IDS = [
    "rider",   "clover",  "ship",    "house",   "tree",     "clouds",      # row 1
    "snake",    "coffin",  "bouquet", "scythe",  "whip",    "birds",       # row 2
    "child",    "fox",     "bear",    "stars",   "stork",    "dog",         # row 3
    "tower",    "garden",  "mountain","crossroads","mice",    "heart",       # row 4
    "ring",     "book",    "letter",  "man",     "woman",    "lily",        # row 5
    "sun",      "moon",    "key",     "fish",    "anchor",   "cross",       # row 6
]

OUTPUT_W = 420
OUTPUT_H = 700


def detect_all_cards(img):
    """Auto-detect all 36 card positions."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    h, w = gray.shape

    edges = cv2.Canny(gray, 30, 100)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    rects = []
    min_area = w * h / 200
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area > min_area:
            x, y, cw, ch = cv2.boundingRect(cnt)
            cx = x + cw / 2
            cy = y + ch / 2
            hull = cv2.convexHull(cnt).reshape(-1, 2)
            rects.append({
                'cx': cx, 'cy': cy,
                'x': x, 'y': y, 'w': cw, 'h': ch,
                'hull': hull,
                'area': area,
            })

    return rects


def sort_into_grid(cards):
    """Sort detected cards into proper 6×6 reading order."""
    if len(cards) < 36:
        print(f"WARNING: Only {len(cards)} cards detected!")
    
    # Cluster Y positions into 6 rows using k-means-like approach
    all_cy = np.array([c['cy'] for c in cards])
    all_cx = np.array([c['cx'] for c in cards])
    
    # Use image height to estimate row spacing
    # Sort Y positions and divide into 6 groups
    sorted_y_idx = np.argsort(all_cy)
    n_cards = len(cards)
    row_size = n_cards // 6
    
    # Assign each card to a row (0-5) based on Y position
    row_assignments = []
    for i, idx in enumerate(sorted_y_idx):
        row = i // row_size
        row_assignments.append((idx, row))
    
    # Within each row, sort by X position
    rows = [[] for _ in range(6)]
    for idx, row in row_assignments:
        if row < 6:
            rows[row].append(idx)
    
    for r in range(6):
        rows[r].sort(key=lambda i: cards[i]['cx'])
    
    # Flatten: rows[0] + rows[1] + ... + rows[5]
    ordered_indices = []
    for r in range(6):
        ordered_indices.extend(rows[r])
    
    return [cards[i] for i in ordered_indices[:36]]


def order_corners(pts):
    """Order 4 corners: TL, TR, BR, BL."""
    pts = np.array(pts, dtype=np.float32)
    rect = np.zeros((4, 2), dtype=np.float32)
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]   # TL
    rect[2] = pts[np.argmax(s)]   # BR
    d = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(d)]   # TR
    rect[3] = pts[np.argmax(d)]   # BL
    return rect


def deskew_card(img_color, hull_points, output_size):
    """Apply perspective transform to make card rectangular."""
    try:
        rect = cv2.minAreaRect(hull_points.astype(np.float32))
        box = cv2.boxPoints(rect)
    except Exception:
        return None

    src_pts = order_corners(box)
    dst_pts = np.array([
        [0, 0], [output_size[0], 0],
        [output_size[0], output_size[1]], [0, output_size[1]]
    ], dtype=np.float32)

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped = cv2.warpPerspective(img_color, M, output_size,
                                  flags=cv2.INTER_LINEAR,
                                  borderMode=cv2.BORDER_CONSTANT,
                                  borderValue=(255, 255, 255))
    return warped


def save_with_pillow(bgr_array, filepath, quality=95):
    rgb = cv2.cvtColor(bgr_array, cv2.COLOR_BGR2RGB)
    Image.fromarray(rgb).save(filepath, 'JPEG', quality=quality)


def main():
    print("Loading image...")
    img = cv2.imread(SRC)
    if img is None:
        print(f"ERROR: Could not load {SRC}")
        return

    print("Detecting card positions...")
    raw_cards = detect_all_cards(img)
    print(f"Detected {len(raw_cards)} card regions")

    print("Sorting into grid...")
    ordered_cards = sort_into_grid(raw_cards)

    os.makedirs(OUT_DIR, exist_ok=True)

    # Clear old files
    for f in os.listdir(OUT_DIR):
        fp = os.path.join(OUT_DIR, f)
        if os.path.isfile(fp):
            os.remove(fp)

    print("Cropping with perspective correction...")
    success_count = 0
    for i, card_info in enumerate(ordered_cards):
        card_id = CARD_IDS[i]

        warped = deskew_card(img, card_info['hull'], (OUTPUT_W, OUTPUT_H))
        
        out_path = os.path.join(OUT_DIR, f"{card_id}.jpg")
        save_with_pillow(warped, out_path)
        success_count += 1
        
        file_size = os.path.getsize(out_path)
        print(f"[{success_count}/36] {card_id}.jpg ({file_size} bytes)")

    print(f"\nDone! {success_count} cards saved to {OUT_DIR}")


if __name__ == "__main__":
    main()
