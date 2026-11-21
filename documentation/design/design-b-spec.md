# Design B — "Answer-first"

The page reads like an answer: **one number, one AI sentence, then the evidence**. Input is a compact sticky top bar; the full form lives in a side sheet that is always one tap away. All numbers in the mockup are real values from the current API.

## 1. Hierarchy (top → bottom)

| # | Block | Role | Visual weight |
|---|---|---|---|
| 0 | **Top bar** (sticky): wordmark · query pill · `סינון` button with count | Input / refine | Medium, quiet background |
| 0a | Assistant reply line (one line, under the pill) | Clarifying question only | Small, ink-2, ✦ in violet |
| 0b | Filter chips (horizontal scroll) | What is applied; tap to remove, `+ עיר` opens sheet | Small |
| 1 | **Answer**: eyebrow (`N עסקאות · period`) → headline number (median ₪/m²) + label + n → AI line | The answer | Highest: 44px display |
| 2 | **Key numbers row**: 3 stat tiles | Supporting facts | Medium |
| 3 | **Trends list**: published changes (4 cities), then collapsed "no fair comparison" group | Evidence (investor) | Medium |
| 4 | **Deals**: compact cards | Raw evidence | Low per card |
| 5 | **Lead bar** (sticky bottom, dark) → bottom sheet | Conversion | High contrast, small footprint |
| 6 | Footer: one line | Legal | Lowest |

Headline rule (code, not AI): `median_price_per_sqm` if `enoughData`, else `matched_count` as "N עסקאות" with the weak tag. The headline never comes from the LLM.

Separation of facts vs AI: facts sit on white surfaces with n; the AI line is the only violet block, labelled `✦ העוזר`. Facts the AI used get a violet `✦` and a violet inset outline. Legend under the AI line.

## 2. Hebrew copy (all visible strings)

Top bar
- Wordmark: `דירות דומות` (second word in brand blue)
- Query placeholder: `מה אתם מחפשים?`
- Send (aria): `שליחה` · Filter button: `סינון` (+ count badge)
- Reply line: the LLM `clarifyingQuestion`, or nothing. Link: `הצגת השיחה` / `הסתרת השיחה`
- Rejected fields (prepend to reply): `לא זיהיתי: עיר. אפשר לבחור בסינון.`
- AI chip: `✦ מולא ע״י העוזר` (only after the AI filled the form)
- Chips: `להשקעה` / `למגורים`, city names, `עד 3.5 מ׳ ₪`, `3–4.5 חד׳`, `60–90 מ״ר`, `חניה`, `מעלית`, `ממ״ד`, `מרפסת`; empty slots: `+ עיר`, `+ תקציב`, `+ חדרים`; remove (aria): `הסרה`
- Fallback banner: `העוזר לא זמין כרגע. הסינון עובד כרגיל.` + button `לסינון`

Answer
- Eyebrow: `{n} עסקאות · {from}–{to}`
- Headline label: `מחיר חציוני למ״ר` · n: `לפי {n} עסקאות`
- AI badge: `✦ העוזר` · legend: `✦ מסמן נתון שהעוזר השתמש בו`
- AI unavailable: `אין הסבר כרגע — המספרים מחושבים ישירות מהנתונים.`
- AI loading: shimmer lines, no text
- Weak tag: `מעט נתונים`

Stats
- `עסקאות` / `{n} בחישובי מחיר`
- `מחיר חציוני` / `לפי {n}`
- `תקופה` / `שנות העסקאות`

Trends
- Title: `שינוי במחיר למ״ר` · meta: `2021–23 מול 2024–26`
- Row: city · `30,013 → 35,885 ₪ (10 / 19)` · `+19.6%`
- Collapsed group: `עוד {k} ערים — אין השוואה הוגנת`
- Reasons: `מעט עסקאות` (not_enough_deals) · `תמהיל נכסים שונה` (property_type_mix_changed)
- Footnote: `בסוגריים: מספר עסקאות בכל תקופה. שינוי בעבר בקובץ הזה, לא תחזית.`

Deals
- Title: `עסקאות` · meta: `{shown} מתוך {total} · חדשות קודם`
- Card title: `{type} · {rooms} חד׳ · {size} מ״ר`; place: `{city} · {neighborhood} · {street}`
- Row: date (month precision → `מרץ 2023`), `קומה {f}/{t}`, `נבנה {year}`
- Features: only present ones (`חניה`, `מעלית`, `ממ״ד`, `מרפסת`); unknown → `חניה ?` dashed. "No" is not shown.
- Flags (max 2 visible): warnings `מחיר שונה בין מקורות`, `מחיר חסר`, `מחיר למ״ר לא תואם`; info `תאריך ברמת חודש`, `״חדש מקבלן״ בבניין ישן`, `לא בחישוב`
- Footer: `שורה מקורית` / `הסתרה` · `{source} · {dealId}`
- Empty: `לא נמצאו עסקאות` + `נסו להרחיב מחיר או ערים.` + button `לסינון`
- Error: `החיפוש נכשל. נסו שוב.`

Lead
- Bar: `לקבל את התוצאות בוואטסאפ?` (or `במייל?` after toggle) · sub `נשמור גם את החיפוש` · button `שמירת החיפוש`
- Sheet title: `שמירת החיפוש` · fields `שם`, segmented `וואטסאפ` / `מייל`, `טלפון` / `מייל`, checkbox `גם דירות חדשות שמתאימות` · button `שמירה` / `שומרים…`
- Saved: `נשמר` + `בדמו לא נשלחת הודעה.`
- Errors: `בדקו את השם ופרטי הקשר.` · `יותר מדי ניסיונות. נסו בעוד דקה.` · `משהו השתבש. נסו שוב.`

Filters sheet
- Title `סינון`, close (aria) `סגירה`
- `מטרה` (`למגורים` / `להשקעה`), `ערים`, `שכונות` (disabled placeholder `בחרו עיר`), `סוג נכס` (placeholder `הכול`), `חדרים`, `שטח מ״ר`, `מחיר ₪` (inputs `מ־` / `עד`), `חובה` + ⓘ tooltip `לא כולל עסקאות שבהן הפרט לא ידוע`
- Footer: `הצגת תוצאות` · `ניקוי`

Empty (first visit)
- `כמה עלו דירות דומות?` · `עסקאות אמיתיות מהעבר, עם המספרים שמאחורי כל תשובה.`
- Placeholder `לדוגמה: 4 חדרים בחולון עד 3 מיליון`
- Examples: `4 חד׳ בחולון עד 3 מ׳` · `להשקעה עד 2.5 מ׳` · `יש לי 2 מיליון`
- `או בחירה בטופס`

Footer: `נתונים מקובץ לדוגמה · לא הערכת שווי ולא תחזית`

Greeting message in chat: removed (the empty state replaces it).

## 3. Tokens

Type (Heebo): display 700 44/1.05 (36 on phone) · h1 700 20/28 · h2 600 16/24 · body 400 15/22 · small 400 13/18 · micro 500 12/16. Numbers: `font-variant-numeric: tabular-nums`.

Spacing (4-pt): 4 · 8 · 12 · 16 · 24 · 32 · 48. Page section gap 32 (24 phone). Card padding 16.

Radius: 8 chips-flags · 12 inputs/stats · 16 cards/lists · 20 bottom sheet · 999 pills.

Colors: bg `#f7f8fa` · surface `#fff` · ink `#0f172a` / `#475569` / `#94a3b8` · line `#e5e7eb` / `#f1f3f6` · brand `#2563eb` (soft `#eff4ff`) · AI `#7c3aed` (soft `#f5f3ff`, line `#ddd6fe`) · up `#15803d`/`#ecfdf3` · down `#b91c1c`/`#fef2f2` · warn `#b45309`/`#fffbeb`. Violet is reserved for AI only.

Shadows: sm `0 1px 2px rgba(15,23,42,.06)` · md `0 8px 24px rgba(15,23,42,.08)` (empty-state input) · lg `0 16px 48px rgba(15,23,42,.16)` (sheets, lead bar). Cards use borders, not shadows.

Material theme: `mat.theme` with `$blue-palette`, density `-2`, typography Heebo; override `--mat-sys-primary` to `#2563eb` if needed.

## 4. Mapping to Angular components

| Component | Change |
|---|---|
| `assistant` page | Layout becomes: `<header class="topbar">` (sticky) · `<main class="page">` single column, max 760px · `<app-lead-form>` as sticky bar · `<mat-sidenav-container>` wrapping everything with `<mat-sidenav mode="over" position="end">` holding `<app-filters-form>`. No hero, no side column. Empty state shown when `result() === null`. |
| `chat-box` → **query bar** | Renders the pill input + send in the top bar, the last assistant message as one `reply` line, and the conversation history only behind `הצגת השיחה` (expands under the bar, max 240px). Examples move to the empty state. Fallback → banner instead of a chat bubble. |
| `filters-form` | Same fields and logic, moved into the sidenav. Purpose = `mat-button-toggle-group`; must-haves = toggle pills (`mat-button-toggle` multiple, or plain buttons with `aria-pressed`) instead of checkboxes. Footer actions sticky. Emits `searchRequested` and closes the sidenav. New small piece: **filter chips** (`<app-filter-chips>` or a template in the page) rendering active filters from `filters()`; × clears that field and re-searches. |
| `facts-panel` | Split into three template blocks: `answer` (eyebrow, headline, AI line), `stats` (3 tiles), `trends` (list, not table). `isUsed()` logic unchanged → adds `.is-used` + `✦`. Trend rows sorted by change desc; non-comparable rows grouped into a collapsed `more` with reason labels. Headline chooser: `median_price_per_sqm` → else `matched_count`. |
| `deal-list` | Compact card: title / place / price on top, one meta row, one feature row (present + unknown only), max 2 flags, footer with `שורה מקורית` + source·ID. Original rows: when several versions exist, show them side-by-side and highlight differing fields (`.diff`). |
| `lead-form` | Two parts: sticky dark bar (always visible once there are results, hidden after save) and a `MatBottomSheet` (or the same sidenav on desktop) with name, channel toggle, contact, one checkbox (summary is implied; drop `wantsSummary` checkbox, send `true`). Saved state replaces the bar with a 3s toast `נשמר` then hides. |

Pipes stay (`nis`, `dealDate`). Add a `shortNis` pipe for chips (`3.5 מ׳ ₪`).

## 5. Mobile (≤600px)

- 16px side gutter everywhere; no horizontal page scroll (chips scroll inside their own row, edge-to-edge with 16px inner padding).
- Top bar: wordmark hidden; `סינון` becomes a 44px icon button with a count dot.
- Headline 36px; stats grid 2 columns, first tile full width.
- Trend row: city + range stacked, delta pill on the side.
- Sidenav and lead sheet are full width; footers respect `env(safe-area-inset-bottom)`.
- Lead bar: sub-line hidden, button stays.
- Original rows: versions stack vertically.
- Bidi: numbers, ranges and percentages are wrapped in `dir="ltr"`/`<bdi>` so `30,013 → 35,885` reads correctly and `+19.6%` keeps its sign on the left.

## 6. Removed and why

- **Hero banner + "how it works" list** — marketing text above the fold pushed results down; the empty state now does this job in two lines.
- **Side column with chat history and the full form** — two competing columns made hierarchy unclear. Input is now one bar; the form is one tap away.
- **Assistant greeting and "not available" bubble** — replaced by placeholder text and a single banner.
- **Long AI disclaimer paragraph** — replaced by a one-line legend; the separation is now visual (violet = AI).
- **Trends table with 18 rows and a 3-line footnote** — 4 meaningful rows visible, 14 grouped under one line with short reasons; footnote is one line.
- **Per-card labels (`תאריך`, `קומה`, `שנת בנייה`, `מקור`) and "no" features with strikethrough** — one meta row; only present or unknown features are shown.
- **Must-have hint under the form, card titles with icons on every section, "from cache" badges** — moved to tooltips or dropped; they did not help a decision.
- **`wantsSummary` checkbox** — saving the search already implies the summary.

Copy volume: the main results view drops from roughly 230 visible words (current build) to about 100.
