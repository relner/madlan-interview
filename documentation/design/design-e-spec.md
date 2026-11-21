# Design E — "AI-native, centered"

One calm column (680px) on an off-white page. The page is a thread: the question, then the answer, then the evidence. Nothing is boxed except the AI layer and the input.

## Hierarchy (top → bottom)

**First visit:** top bar (brand · `סינון ידני`) → big question → one input → 3 suggestion pills. Nothing else.

**Answer:**
1. Query as a quiet line plus editable filter pills (AI-filled pills get a faint violet wash). Tapping a pill opens a small popover with one field; `כל הסינונים` opens the full form (side sheet on desktop, bottom sheet on phone).
2. **Answer**: one big number (median ₪/sqm, or the deal count when there is too little data), then the AI sentence in the only gradient-tinted shape on the page. Numbered citations `①②③` point to the facts.
3. **מקורות** (sources): fact pills with n. A pill the AI used carries the same number and a violet outline.
4. **Trends**: 4 rows without borders (city · n early/late · change). The other 14 cities sit in a collapsed `details` line with their reasons. One 7-word footnote.
5. **Lead**: a thin row between rules — one line of copy, name, contact, button.
6. **Deals**: light rows (what · price / where+month · ₪/sqm). A warning is an amber dot. Expanding a row shows tags (features, unknown as dashed `?`, warning tags, source) and the original CSV row. `עוד 33` loads more.

**Phone:** same order. The input is pinned to the bottom (`לשנות משהו?`) like a chat. Filters open as a bottom sheet with `הצגת N עסקאות`.

**Fallback:** grey pill notice at the top, plain filter pills (no violet), the AI shape turns into an outline with one line, and all facts stay.

## Airiness rules (applied)
Spacing comes only from 8 / 16 / 24 / 40 / 64. Exactly three type sizes: 40 / 17 / 13. Every text block is ≤12 words. No cards inside cards, no table borders (only 1px row separators), no icons in headings. Shadows are used only on the input and on popovers.

## Tokens
| Token | Value |
|---|---|
| bg / surface | `#fbfbfa` / `#ffffff` |
| ink / ink-2 / ink-3 | `#16181d` / `#5f6570` / `#9aa0a9` |
| line / tint | `#eeeef0` / `#f3f3f1` |
| AI | gradient `#7c5cff → #3b8bff` at 5–7% for the wash, 35% for the outline; text `#5b3fe0` |
| semantic | up `#15803d`, down `#c2410c`, warn `#b45309` on `#fff7ea` |
| radius | pill 999, input 28, AI block / popover / sheet 20–28 |
| type | Heebo 600 40/1.1 · 400 17/1.55 · 400 13/1.4; tabular numbers |
| shadow | input `0 12px 40px rgba(22,24,29,.08)`; popover `0 20px 60px rgba(22,24,29,.14)` |
| motion | answer fades and rises 8px (200ms); AI shimmer while loading; the popover scales from its pill |

## Hebrew copy (complete)
- Brand: `כמה עלה` (gradient on `עלה`) · `סינון ידני` · `חיפוש חדש` / `חדש`
- Hello: `איזו דירה אתם מחפשים?` / `נראה כמה עלו דומות.`
- Input placeholder: `למשל: 4 חדרים בנתניה, עד 4 מיליון`; follow-up: `לשנות משהו?`
- Suggestions: `4 חדרים בנתניה עם חניה` · `יש לי 2 מיליון, מה אפשר?` · `איפה המחירים עלו?`
- Filter pills: values only (`נתניה`, `4+ חד'`, `חניה`, `עד ₪4M`) · `+ חדרים` · `+ מחיר` · `כל הסינונים` · popover button `עדכון`
- Answer: `<number> למ"ר, חציון` · AI label `✦ העוזר` · AI text comes from the API (prompt: ≤2 sentences)
- Sources: `מקורות` · `<n> עסקאות` · `<₪> חציון n=<n>` · `<₪> למ"ר n=<n>` · `מעט נתונים`
- Trends title: `שינוי במחיר למ"ר · 2021–23 מול 2024–26` · collapsed: `<k> ערים בלי השוואה הוגנת` · reasons `מעט עסקאות` / `תמהיל השתנה` · footnote `דירות שונות בכל תקופה. עבר, לא תחזית.`
- Lead: `לשלוח לכם את החיפוש?` · `שם` · `וואטסאפ` / `מייל` (a small link swaps the channel) · `שליחה` · done: `נשמר. בדמו לא נשלחת הודעה.`
- Deals: `<N> עסקאות · חדשות קודם` · `עוד <k>` · tags: feature names, `?` for unknown, warning labels from `QUALITY_FLAG_LABELS` (shorten: `מחיר שונה בין מקורות`, `מחיר למ"ר בקובץ שונה`, `מחיר חסר`)
- Fallback: `העוזר לא זמין כרגע. הסינון עובד כרגיל.` · `אין הסבר כרגע. המספרים מחושבים ישירות.`
- Footer: removed; the "this file only, not a forecast" rule lives in the trends footnote and in the AI prompt.

## Mapping to Angular components
- **assistant page**: drops the hero, the 2-column grid and the "how it works" card. Two modes: `hello` (no result) and `thread`. Keeps the current signals and `switchMap` flow. Adds `mat-sidenav` (`mode="over"`, position start) for the full form.
- **chat-box** → becomes `ask-bar`: one input plus a round send button. `hello` shows 3 suggestion pills. In `thread` mode it is pinned at the bottom on phone. It shows only the last assistant reply: a clarifying question goes inline under the query as one line plus up to 3 quick-reply pills. Assumptions become the tooltip of the AI-filled pills. The message history is not rendered.
- **filters-form**: (a) new `filter-pills` row built from `filters` (each pill opens a `cdk-overlay` popover editing one field, `×` clears it); (b) the existing full form moves into the sidenav or bottom sheet unchanged in logic. Must-haves become toggle pills instead of checkboxes.
- **facts-panel** → `answer` + `sources` + `trends`: a big number (code picks `median_price_per_sqm` if `enoughData`, else `matched_count`), the AI block (states: loading shimmer / text with citations / off), fact pills. Citation numbers are assigned by the client in order of `usedFactIds`; the API schema is unchanged. The trends list shows `enoughData` rows first and the rest in `<details>`.
- **deal-list**: rows built on `<details>` instead of cards. Shows 10 first, then `עוד N`. Fetching the original row is unchanged.
- **lead-form**: a single inline row, one consent (summary). The channel is a text link toggle. The success state replaces the row.
- Material is kept for `mat-sidenav`, inputs inside the sheet, `cdk-overlay` and the bottom sheet (`MatBottomSheet`). Everything else is plain SCSS with the tokens above.

## Mobile (≤600px)
16px gutter. Big number stays 40px. The input is sticky at the bottom with a fade. Filter pills wrap. Lead fields stack. A deal row keeps 2 lines × 2 columns. The trends row keeps the city, n and change.

## Removed vs the current design
Hero banner, the side column, chat history bubbles, the "how it works" card, the boxed cards for every section, icons in headings, the period fact tile (moved into the sources pills), the second lead consent, the long footer disclaimer, the "from cache" badges.

## Note
All numbers come from the running API: Netanya 36 deals, ₪3,973,000, ₪39,608/sqm n=35, +7.8% 13/22, four published cities; phone frame: Netanya 4+ rooms with parking, 10 deals, ₪42,115/sqm, ₪5,976,500. The expanded deal's warning tag and its `price_per_sqm` raw value are illustrative only, to show the state.
