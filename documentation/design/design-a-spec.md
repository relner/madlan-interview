# Design A — Search-first, minimal

One column (max 760px). The free-text box is the product; everything else is a result of it. The form is not removed — it becomes the chips under the search box plus a "סינון" sheet with the full form.

## 1. Hierarchy (top → bottom)

1. **Top bar** (56px): brand at start, "שמירה" link at end (scrolls to lead card; only after results).
2. **Search box** — the single largest element. Text + round send button.
3. **Filter chips** — one chip per active filter (removable ✕), dashed "+" chips for 1–2 common missing filters, black "סינון" chip opens the full form sheet. Chips set by the AI get a faint violet tint.
4. **Clarifying question** (only if the AI asked one): one line with ✦ and up to 3 quick-reply chips.
5. **AI summary** card — violet start-edge, label "✦ סיכום", 2–3 sentences, "מבוסס על ①②③" row.
6. **Numbers** — one strip of 3 stat tiles (deals / median price / median per sqm). Tiles used by the AI carry the same numbered badge. Weak tiles: greyed value + "מעט נתונים" pill.
7. **Price per sqm change** — compact list: selected city first (highlighted), then the cities with a published change, then one collapsed row "עוד N ערים — אין מספיק נתונים להשוואה" that expands to rows with a short reason.
8. **Deals** — cards, first 3 shown, "עוד N עסקאות" button.
9. **Lead card** — dark card, one row form.
10. **Footer** — one line.

States: empty (centered hero: title + search + 3 example chips + "או סינון ידני"), loading (skeletons in place of 5–8), fallback (warm banner under search + sheet opens automatically).

## 2. Copy (every visible string)

| Place | Hebrew |
|---|---|
| Brand | דירות.דומות |
| Empty title | כמה עלו דירות כמו שאתם מחפשים? |
| Search placeholder | למשל: 3 חדרים ברמת גן עד 3 מיליון |
| Search aria-label | מה אתם מחפשים? |
| Examples | יש לי 2 מיליון, מחפש דירה · 4 חדרים בחולון עם חניה · להשקעה עד 2.5 מיליון |
| Manual link | או סינון ידני |
| Filter chip | סינון |
| Chip formats | {עיר} · {n}+ חדרים · עד {x} מ׳ ₪ · {x}–{y} מ״ר · למגורים / להשקעה · חניה / מעלית / ממ״ד / מרפסת |
| Add-chips | + חניה · + מטרה |
| AI label | ✦ סיכום |
| AI based-on | מבוסס על |
| AI unavailable (in card) | אין סיכום כרגע. המספרים למטה מחושבים ישירות מהעסקאות. |
| AI loading | (skeleton lines, no text) |
| Numbers heading | במספרים · meta: {from}–{to} |
| Stat labels | עסקאות · מחיר חציוני · חציון למ״ר |
| Stat n | לפי {n} |
| Weak pill | מעט נתונים |
| Excluded note (under deals tile, only if >0) | {k} הוצאו (מחיר לא אמין) |
| Trend heading | שינוי מחיר למ״ר · meta: 2021–23 → 2024–26 |
| Trend row | {עיר} · {a} → {b} ₪ · {n1}/{n2} · {±x%} |
| Trend collapsed row | עוד {N} ערים · אין מספיק נתונים להשוואה |
| Trend reasons | מעט עסקאות · תמהיל נכסים שונה |
| Trend footnote | עבר, לא תחזית. דירות שונות בכל תקופה. |
| Deals heading | עסקאות · meta: {total} |
| Deal title | {סוג} · {חדרים} חד׳ · {שטח} מ״ר |
| Deal place | {שכונה}, {רחוב} |
| Deal per sqm | {x} ₪/מ״ר |
| Deal meta | {MM.YYYY} (month precision) or {DD.MM.YYYY} · קומה {f}/{t} (0 → קרקע) |
| Features | חניה · מעלית · ממ״ד · מרפסת (✓ / strikethrough / trailing ?) |
| Original row | שורה מקורית / הסתרה |
| Excluded deal | לא בחישובים |
| Conflict | מקור אחר: {מקור} {מחיר} |
| Show more | עוד {N} עסקאות |
| Lead title | לשמור את החיפוש? |
| Lead sub | נשלח לכם את {total} העסקאות. |
| Lead channel | וואטסאפ · מייל |
| Lead fields | שם · טלפון / מייל |
| Lead button | שמירה |
| Lead consent | גם דירות חדשות שמתאימות |
| Lead done | נשמר. בדמו השליחה עוד לא מחוברת. |
| Fallback banner | העוזר לא זמין כרגע. הסינון עובד כרגיל. |
| Sheet title / clear | סינון · ניקוי |
| Sheet fields | מטרה · עיר · שכונה · סוג נכס · חדרים מ- · עד · מחיר מ- · עד · שטח מ- · עד · חובה |
| Sheet button | הצגת {N} עסקאות (or "חיפוש" before the count is known) |
| Footer | מבוסס על כ-520 עסקאות מקובץ לדוגמה, 2021–2026. לא הערכת שווי. |
| Errors | החיפוש נכשל. נסו שוב. · בדקו את הפרטים. · יותר מדי ניסיונות. נסו בעוד דקה. |

Quality-flag labels (shorter): מחיר שונה בין מקורות · מחיר חסר · מחיר למ״ר לא תואם · תאריך ברמת חודש · שטח חסר · "חדש מקבלן" בבניין ישן. Only warning flags render as chips on the card; informational flags are shown only inside "שורה מקורית".

## 3. Tokens

- **Font**: Heebo 400/500/600/700. Numbers: `font-variant-numeric: tabular-nums`; % values in `dir="ltr"` isolate.
- **Type scale**: 12 meta · 13 labels/secondary · 15 body · 17 card titles / AI text / search · 19 deal price · 24 stat value · 32 hero (26 on mobile). Line height 1.5 (1.6 AI text, 1.2 hero).
- **Spacing** (4-based): 4, 6, 8, 10, 12, 14, 16, 18, 20, 28 (between sections), 40 (page bottom). Gutter 16px.
- **Radius**: 8 small (flags), 12 inputs/buttons, 20 cards/search/sheet, 999 chips.
- **Colors**: bg #f7f8fa · surface #fff · text #111827 / #4b5563 / #9ca3af · line #e5e7eb / #f0f1f3 · accent #2563eb (soft #eff4ff) · AI #7c3aed (soft #f5f0ff, chip border #e4d8fd) · up #15803d · down #b91c1c · warn #b45309 (soft #fff7ed). Lead card #111827.
- **Shadows**: sh-1 `0 1px 2px rgba(17,24,39,.05)` (cards) · sh-2 `0 8px 24px rgba(17,24,39,.08)` (search box, sheet only).
- Material theme: azure primary, density −2; override mat-form-field outline radius to 12px.

## 4. Component mapping

- **assistant page**: single column `max-width:760px`; remove hero gradient, side column and "איך זה עובד" card. Owns `state: 'empty' | 'results'` → empty renders the centered hero. Fallback sets `sheetOpen = true`.
- **chat-box → search-box** (rename or keep selector): one input, no message history bubbles. Show only the *latest* AI turn as the clarifying-question line (+ quick replies from purpose options when purpose is null). Assumptions move into a tooltip on the AI-tinted chips ("הנחה: …"). History is kept in state but not rendered.
- **filters-form → filter-chips + filter-sheet**: chips derived from `Filters` (remove = set field to null/[] and re-search). Sheet = existing form fields (Material selects/inputs), 2-col grid, toggles as chips, primary button. Desktop: inline panel under chips; mobile: bottom sheet (`MatBottomSheet`) full-height. The form keeps working without AI; "סינון ידני" in empty state opens it.
- **facts-panel**: split into three blocks: AI summary card, stats strip, trend list. Numbered badges: assign 1..k to `usedFactIds` in order; same number on the stat tile / trend row. Drop the long notes; one footnote under trends.
- **deal-list**: denser card, 2-col head (title/place vs price/per-sqm), one meta row, warning flags only, "שורה מקורית" link in a divider footer. Show 3, then "עוד N".
- **lead-form**: dark card, segmented channel, inputs in one row (wrap on mobile), single consent checkbox (summary is implied by saving). Done state = one line.

## 5. Mobile (≤600px)

16px gutter. Stats: deals tile full width, two tiles below. Trend rows: city + numbers stacked, change on the end. Deal card single column, price under title. Lead: segmented control full width, inputs stacked. Filter sheet becomes a bottom sheet. Search box stays at top (not sticky); "שמירה" in top bar jumps to the lead card.

## 6. Removed / cut (≈60% less copy)

- Hero subtitle, "איך זה עובד" list, assistant greeting bubble — the empty state title + placeholder + examples explain it.
- Chat history bubbles and "חושב…" — replaced by the chip update + one-line question; loading = skeletons.
- Long AI note ("כל מספר בהסבר נבדק…"), long trend explanation, "בחרו עיר קודם", "חובה" hint — replaced by numbered badges, a 6-word footnote, and disabled state.
- Informational flags on cards (unknown parking etc.) — the "?" on the feature already says it.
- Two consents → one (saving = wants the summary).

## 7. Notes for implementation (outside the design)

- With filters applied, the city trend is computed from the *filtered* deals, so it is almost always "not enough". For this layout the trend list should use city-level facts (all deals of the city), independent of rooms/price filters — needs a small API change (e.g. a `marketContext` facts block).
- Inline reference markers inside the AI sentence would need the model to output markers; the design uses a trailing "מבוסס על ①②③" row so no schema change is needed.
