# Design F — Soft bento

Calm grid of a few large rounded tiles. No borders: tiles separate by tint and soft elevation. One accent (indigo) means "AI / selected". Big numerals, short labels, lots of padding.

What changed vs A/B/C: radius 28 instead of 8–16; spacing jumps 8/16/24/40/64 instead of 4–12 steps; no borders, no icons in headings, no hero banner; trend is a dot-to-dot visual, not a table; ≤10 words per tile; ≤6 tiles above the fold (hero, 3 small, trend).

## Hierarchy (results)

1. Floating query bar (sticky, pill) → filter pills (AI-filled pills tinted accent) → `סינון` opens the full form sheet.
2. One assistant line: question + 2–3 quick-reply pills. No chat history.
3. Bento:
   - **Hero** (2×2): label, huge median ₪/sqm, `חציון · n עסקאות`, then the AI sentence in an accent-soft inner block.
   - **Small tiles**: deals count + period; median price + n; change ₪/sqm + `n → n עסקאות`.
   - **Trend** (full width): dot-to-dot per city, hollow dot 2021–2023 → filled dot 2024–2026, selected city in accent, change value at the end. Only published changes (4 cities). `עוד 14 ערים · אין השוואה הוגנת` collapses the rest with reasons.
   - **Lead** (full width, ink): name + one contact field + `שמירה`, link `מייל במקום`.
4. Deals: section title, 3 deal tiles, `כל N העסקאות`.

Hero number rule (code decides, not the model): median ₪/sqm if `enoughData`, otherwise the deal count.

## Grounding marker

An 8px accent dot (`.used`) after every number the AI explanation used (`usedFactIds`), and the AI block is the only accent-tinted text surface. Facts stay on white tiles with their n. No legend needed; the dot is explained by proximity to the AI block (optional tooltip `נבדק מול הנתונים`).

## Hebrew copy (complete)

| Where | Text |
|---|---|
| Title (first visit) | כמה עלו דירות דומות? |
| Subtitle | ספרו מה אתם מחפשים |
| Input placeholder | למשל: 4 חדרים בחולון עד 3 מיליון |
| Examples | יש לי 2 מיליון, מחפש דירה · 4 חדרים בחולון עם חניה · דירה להשקעה עד 2.5 מיליון |
| Manual link | או סינון ידני |
| Filter button | סינון |
| AI label | ✦ העוזר |
| Hero label | מחיר למ״ר ב{עיר} / מחיר למ״ר (no city) |
| Hero meta | חציון · {n} עסקאות |
| Tiles | עסקאות · מחיר חציוני · שינוי במחיר למ״ר |
| Tile meta | {from}–{to} · {n} עסקאות · {n1} → {n2} עסקאות |
| Not enough data | אין מספיק נתונים / {n1} ו־{n2} עסקאות · נדרשות {min} |
| Trend title | מחיר למ״ר לפי עיר |
| Trend collapsed | עוד {k} ערים · אין השוואה הוגנת |
| Reasons | מעט עסקאות · תמהיל שונה |
| Trend caveat | דירות שונות בכל תקופה |
| AI off | אין הסבר כרגע. המספרים מחושבים מהנתונים. |
| Fallback banner | העוזר לא זמין · הסינון עובד כרגיל |
| Lead | לשמור את החיפוש? / נשלח סיכום של {n} העסקאות / שם / טלפון לוואטסאפ / שמירה / מייל במקום |
| Lead saved | נשמר. בגרסת ההדגמה לא נשלחת הודעה. |
| Deals | העסקאות · הכי חדשות · כל {n} העסקאות · שורה מקורית |
| Deal flag (warnings only) | מחיר שונה בין מקורות · מחיר למ״ר לא תואם · מחיר חסר |
| Amenity unknown | {שם} ? |
| Sheet | סינון · מטרה (למגורים / להשקעה / לא משנה) · עיר · שכונה · חדרים · עד מחיר · חובה · הצגת {n} עסקאות |
| Footer (one line) | נתוני דוגמה · לא הערכת שווי |

## Tokens

- Colors: bg `#f4f4f6`, tile `#fff`, tint `#eef0f4`, ink `#111318`, ink-2 `#5c6270`, ink-3 `#9aa0ab`, accent `#4b5cf0`, accent-soft `#eceefe`; semantic only: warn `#9a5b00` / `#fff3df`. Up/down changes stay ink (sign carries meaning).
- Type (Heebo 400/500/700, tabular numerals): 13 / 15 / 20 / 28 / 64 (hero; 48 on phone). Max 3 sizes per tile.
- Spacing: 8 / 16 / 24 / 40 / 64. Tile padding 24, hero and wide 40. Grid gap 16.
- Radius: tile 28, inner 16, pills 999.
- Elevation: tile `0 1px 2px rgba(17,19,24,.04), 0 12px 32px rgba(17,19,24,.06)`; floating (query, sheet) `0 2px 4px …, 0 24px 48px rgba(17,19,24,.10)`.

## Angular mapping

- **assistant page**: drop hero/aside layout. Single column, max 1120. Order: query bar → pills → assistant line → `facts-panel` (bento incl. lead tile slot) → `deal-list`. `mat-sidenav` (`mode="over"`, position start) hosts `filters-form`; opens automatically on fallback.
- **chat-box** → query bar + assistant line. Keep only the last assistant message; quick replies from `clarifyingQuestion` are optional (send as a message). Assumptions → tooltip on the AI-filled pill.
- **filters-form** → sheet content. Segmented control for purpose, `mat-select` for city/neighborhood, compact number fields, toggle pills for must-haves, full-width button `הצגת {n} עסקאות` (n from last search). Filter pills above results are a read view of the same `Filters`; ✕ clears that field and re-searches.
- **facts-panel** → bento: hero (median ₪/sqm + AI block), 3 small tiles, trend tile (CSS dot-to-dot: position = (value − min)/(max − min) over the published cities, `direction: ltr` on the track only), `<details>` for non-comparable cities. `.used` dot from `usedFactIds`.
- **lead-form** → ink tile: name + one contact input (channel switch is a text link), one consent (summary); "new listings" consent moves to the saved state as an optional follow-up.
- **deal-list** → 3 tiles then "show all"; price big, ₪/sqm meta, one spec line, place + date (month precision respected), amenity pills (unknown = outlined with ?), warning flag only, `שורה מקורית` expands the raw row inline.

## Mobile (≤560px)

One column, 16px gutter. Hero 48px numeral. Count + median as a 2-up pair. Trend rows: 76px city / track / 56px value, short title `21–23 → 24–26`. Filter pills scroll horizontally. Lead becomes a sticky bottom button that opens a bottom sheet. Sheet = full-height bottom sheet.

## Removed

Hero banner, sidebar, chat history, "how it works", icons in titles, period tile (moved to tile meta), long caveats (one 4-word caveat on the trend tile), cache badges, informational flags on deal cards (kept in "original row").
