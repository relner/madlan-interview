# Direction D — "Airy editorial"

One column (760px), one idea per band, separated by space, not boxes. Three type sizes. The only surface is the save-search block; the only hairline is between deal rows.

What changed vs A/B/C: no cards, no card-in-card, no shadows on content, no badges in headings, no hero gradient, no sidebar, no sticky bars, no table chrome. The answer number is the hero.

## Hierarchy (top → bottom)

1. **Top bar** — brand (start), `סינון` text link (end). Nothing else.
2. **Query band** — one underlined input (22px) + round black `←` button. Below: refine line with current filters as plain text + `שינוי` link. If the AI asked something: one accent line `✦ question` + up to 3 quick-reply pills.
3. **Answer band** — eyebrow (15px, muted) → one display number (72px / phone 48px) → one AI sentence (22px, max 34ch) → `✦ העוזר · כל מספר נבדק מול הנתונים` (15px, accent).
4. **Supporting numbers** — 3 stats in a row (22px value / 15px label with n). Phone: first full width, then 2.
5. **Trends** — heading 22px. Published changes only (max 4): city · thin bar · % · meta line (`from ← to ₪ למ״ר · n / n עסקאות`). Others collapsed: `14 ערים בלי השוואה הוגנת` → list `city — reason`. One footnote line.
6. **Deals** — heading 22px. 3 rows: what (22px) + price (22px, bold) / meta line (15px muted) / max one warning badge / `השורה המקורית` disclosure. Then `כל 36 העסקאות` link.
7. **Save search** — white surface block, radius 20, padding 40: title, one sub line, name + phone inline underlined fields, black pill button, `מעדיפים מייל? החלפה`.
8. **Footer** — one muted line.

Refine = right-side sheet (400px, desktop) / bottom sheet (phone). Fields: purpose segmented, cities as pills, rooms pair, price pair, must-haves pills, primary `הצגת N עסקאות`, `ניקוי`.

## Grounding cues

- Facts are plain numbers (ink). AI text is the only accent-colored text, always preceded by `✦`.
- A fact used by the AI gets a 7px accent dot after the value (`usedFactIds` → dot). No other marking.
- n is always in the label/meta line next to the number, never in a tooltip.
- `enoughData = false` → the number is muted and the label reads `מעט עסקאות`; it never becomes the display number.
- Display number choice (code, not AI): median price/sqm if `enoughData`, else matched count.

## Hebrew copy (complete)

| Where | Text |
|---|---|
| Brand | עסקאות דומות |
| Top link | סינון |
| First visit title | כמה עלו דירות דומות? |
| First visit lede | ספרו מה אתם מחפשים. נראה עסקאות אמיתיות מהעבר. |
| Input placeholder | למשל: 4 חדרים בחולון עד 3 מיליון |
| Examples | יש לי 2 מיליון ואני מחפש דירה · 4 חדרים בחולון עם חניה · דירה להשקעה עד 2.5 מיליון |
| Manual entry | או בחירה ידנית |
| Refine link | שינוי |
| AI asks | ✦ {clarifyingQuestion} |
| AI thinking | ✦ חושב… |
| Eyebrow | מחיר חציוני למ״ר ב{city} / בחיפוש הזה |
| Eyebrow (count fallback) | עסקאות שנמצאו |
| AI byline | ✦ העוזר · כל מספר נבדק מול הנתונים |
| AI loading | ✦ מנסח הסבר… |
| AI unavailable (answer band) | לפי {n} עסקאות. *(muted, no ✦)* |
| Stats labels | עסקאות נמצאו · מחיר חציוני · {n} עסקאות · תקופה |
| Weak data | מעט עסקאות |
| Trends heading | איך זזו המחירים |
| Trend meta | {from} ← {to} ₪ למ״ר · {n1} / {n2} עסקאות |
| Collapsed | {k} ערים בלי השוואה הוגנת |
| Reasons | מעט עסקאות · סוגי נכסים שונים |
| Trends footnote | שינוי בעבר, לא תחזית. דירות שונות בכל תקופה. |
| Deals heading | עסקאות אחרונות |
| Deal what | {type} · {rooms} חד׳ · {size} מ״ר |
| Deal meta | {neighborhood} · {date} · {ppsqm} ₪ למ״ר |
| Badge (one, by priority) | מחיר שונה בין מקורות › מחיר לא תקין › מחיר למ״ר לא תואם › שטח חסר › תאריך ברמת חודש |
| Original row | השורה המקורית |
| All deals | כל {total} העסקאות |
| Save title | לשמור את החיפוש? |
| Save sub | נשלח סיכום של {total} העסקאות. |
| Fields | שם · טלפון לוואטסאפ / מייל |
| Channel switch | מעדיפים מייל? החלפה / מעדיפים וואטסאפ? החלפה |
| Save button | שמירה |
| Saved | נשמר, {name}. |
| Saved sub | דמו: שליחה ב{channel} עוד לא מחוברת. |
| Fallback | העוזר לא זמין כרגע. הסינון עובד כרגיל. |
| Empty result | לא נמצאו עסקאות. נסו להרחיב את הסינון. |
| Sheet | סינון · סגירה · מטרה · למגורים · להשקעה · ערים · + עוד עיר · חדרים · מחיר ₪ · מ־ · עד · חובה שיהיה · חניה · מעלית · ממ״ד · מרפסת · הצגת {n} עסקאות · ניקוי |
| AI-filled marker (sheet) | · מולא ע״י העוזר |
| Footer | כ־520 עסקאות מקובץ לדוגמה. לא הערכת שווי. |

## Tokens

- Spacing: 8 / 16 / 24 / 40 / 64 / 96. Bands: 64 vertical (phone 40). First visit top: 96.
- Type (Heebo 400/500/600): display 72 (phone 48), letter-spacing −0.035em, lh 1.05 · lead 22, lh 1.5 · body 15, lh 1.6. Tabular numerals for all numbers.
- Color: bg `#faf9f7`, surface `#fff`, ink `#141414`, muted `#74726d`, faint `#ecebe7`, accent `#2f55d4` (AI only) / soft `#eef2fd`, up `#17734a`, down `#b42318`, warn `#9a5b00` (text only).
- Radius: 20 (save block, sheet), pill 999 (buttons, chips). No other radii.
- Shadows: none on content; only the active segment in the sheet.
- Max content width 760; gutter 24 desktop / 16 phone.

## Angular mapping

- **assistant page** — single column `.page`; bands in order above; `mat-sidenav` (`position="end"`, `mode="over"`) for the refine sheet on desktop, `MatBottomSheet` on phone (or the same sidenav full-width). Remove hero, `layout__side`, "איך זה עובד".
- **chat-box** → query band. Keep: input, send, examples (first visit only), clarifyingQuestion line + quick replies (new: derive from question type is optional; can be omitted). Remove: message history bubbles, assumptions list (move to a `title` tooltip on the refine line).
- **filters-form** → sheet content. Pills (`mat-chip-listbox`) for purpose/cities/must-haves; underlined `matInput` pairs. Button label shows live count from the last search.
- **facts-panel** → answer band + stats + trends. AI text inside the answer band; facts as plain numbers with dots for `usedFactIds`. Trends: published first, others in a `<details>`.
- **deal-list** → rows, 3 visible + "all" toggle; one badge by priority; `<details>` for original row (lazy `/api/deal/:id`).
- **lead-form** → save block; one channel at a time with a switch link; one consent (send summary) implied by the action; keep honeypot.

## Mobile

Same order. Display 48. Stats 1 + 2. Trend meta shortened to n only. Deals: what/price wrap to two lines. Sheet becomes a bottom sheet with radius 24 top corners. Save fields stack.
