# 宇宙回响手札 — Share Widget Spec

## App Context

宇宙回响手札是一个每日自我反思应用，以塔罗卡牌和星象为符号载体，将用户的行为和心理状态映射为可反思的文字。每天用户完成晨间抽卡 + 晚间日记后，系统生成个性化的"今日回响"。

**Design tokens:**
- Primary color: `#C2593F` (warm terracotta)
- Secondary: `#E98074`
- Background: `#F8F5F0` (warm off-white, like aged paper)
- Heading font: Noto Serif SC (literary, warm)
- Body font: Plus Jakarta Sans
- Border: `#EAE3D5`

**Visual identity:** warm, illustrative art style with mystic elements; warm amber/terracotta palette; like a handcrafted journal page.

## Share Scenarios

### Scenario 1: Daily Echo Complete

Triggered when a user taps "Share" from the Share Card screen after completing both morning draw and evening journal.

**Payload facts:**
- `morningTheme` — today's tarot-derived theme (e.g., "在喧嚣中寻找一处刻意留白")
- `eveningEcho` — one-sentence poetic echo (e.g., "当你停止对抗，湖面才还给你宁静")
- `cardName` — Chinese tarot card name (e.g., "星星")
- `astrologyTag` — astrology descriptor (e.g., "满月")
- `behaviorPatterns` — array of behavior keywords (e.g., ["主动抽离", "微观留白"])

**Widget inner composition (300px × ~400px content area):**

```
┌─────────────────────────────────────────┐
│  宇宙回响手札   10.24 DAILY            │  ← 9px uppercase, muted
│─────────────────────────────────────────│
│  ┌──────────┐  课题映射                 │
│  │ Card     │  [morningTheme]           │  ← Noto Serif SC, 14px bold
│  │ Thumb    │                           │
│  └──────────┘                           │
│─────────────────────────────────────────│
│  ❝  今日回响金句                        │  ← 9px uppercase, primary
│                                         │
│  "[eveningEcho]"                        │  ← Noto Serif SC, 15px bold
│                                         │
│  [pattern1] [pattern2]                  │  ← 9px pill tags
│─────────────────────────────────────────│
│  ■■■  长按扫码 · 开启心智手札           │  ← app icon + tagline
└─────────────────────────────────────────┘
```

**Color treatment:**
- Background: warm gradient `#FAF7F2` → `#FFF8F0`
- Card thumbnail: gradient matching card's palette (amber/coral/lavender based on card type)
- Echo quote block: subtle gradient `#FCECD8` → `#FDEAEA` → `#FFFFFF`
- Pattern tags: alternating `#FDEAEA`/`#FFF4E0`/`#E8F2E2` chips

**Tone:** The widget should feel like a page torn from a beautifully designed journal — not a social media post. Minimal, typographically driven. The tarot card's warm gradient anchors the visual identity.

## Notes for Post Drafter

- The quote `eveningEcho` is the emotional anchor — give it visual prominence with Noto Serif SC
- Pattern keywords are secondary decorative elements
- Do NOT use generic motivational framing — the app is a psychology/reflection tool, not a wellness brand
- Keep copy spare; let whitespace breathe
- The app icon (circle with compass-rose path) can appear as a small watermark bottom-right
