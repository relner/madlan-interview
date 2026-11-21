# Direction C — Calm split workspace

One idea: **the page is a results workspace**. The input and the filters are tools on the start side (the right side in RTL); the results take the space and are read top→bottom like a report: number of deals → 4 key facts → one AI sentence → comparison → save → the deals.

Mockup: `mockup.html` (desktop results, first state, fallback state, two 375px phone frames). The phone frames use container queries, so the mockup shows the real mobile layout.

## 1. Hierarchy (results state)

Desktop grid: `320px | 1fr`, gap 24, max-width 1240, 16px gutter.

**Side panel (sticky, top 16)**
1. Brand: small square + "דירות דומות"
2. **Ask** panel: one-line auto-growing textarea + send icon. Below it only the **last** assistant reply (one line) + one muted line of assumptions. Older messages are not shown.
3. **Filters** panel: a compact key/value list, one line per filter. Clicking a row opens an inline editor under it, only one at a time. AI-filled values get a 6px accent dot. Footer: primary "חיפוש" (full width) + ghost "ניקוי".

**Results (main)**
1. Results header: H1 "39 עסקאות · חולון" (the count is the headline) + meta line "2021–2026 · החדשות קודם".
2. **KPI row**: 4 tiles in one bordered strip with 1px dividers: עסקאות / מחיר חציוני / חציון למ"ר / שינוי למ"ר. Each tile has a label, a value (tabular), and an `n=…` line. A tile used by the AI gets a 6px accent dot in its corner.
3. **AI note**: one bordered panel with a soft accent gradient and an "AI" badge. 1–3 sentences plus one footnote line: "מספרים מסומנים ב-● נבדקו מול הנתונים." The accent dot is the shared mark between the note and the facts.
4. **Trends table** "מחיר למ"ר לפי עיר": columns city, 2021–2023, 2024–2026, change. Published rows first, sorted by change; non-comparable rows are muted with a 2-word reason. Shows 6 rows, then "עוד N ערים". The selected/used city row has a 3px accent bar on its start edge. One footnote line.
5. **Lead band**: a single row, with the heading and one line on the start side and a form inline: name · contact · "שמירה". Consent is a checkbox under it. Channel switch is a text link ("מייל במקום") instead of radios.
6. **Deals table**: compact rows `נכס | שכונה | תאריך | מחיר | למ"ר | ⌄`. A warning flag shows as a 6px amber dot after the title. Expanding a row shows inline facts (floor, year, source, ID), feature pills, flag labels, and a link to the original CSV row (a small key/value table). 7 rows, then "עוד N".
7. Footer: one muted line.

Why the lead band sits **before** the deals: the user has just seen the answer (KPIs + AI + trends). The deals list is long, and a CTA after it is rarely reached.

## 2. Copy (every visible string)

Current page ≈ 330 words of UI copy; this version ≈ 140 (−58%).

| Place | Hebrew |
|---|---|
| Brand | דירות דומות |
| Page `<title>` | דירות דומות — כמה עלו דירות כמו שלכם |
| Ask placeholder | מה אתם מחפשים? |
| Examples (first state only) | 4 חדרים בחולון עם חניה, עד 3 מיליון · יש לי 2 מיליון, מחפש דירה · דירה להשקעה עד 2.5 מיליון |
| Send button aria-label | שליחה |
| Assumptions line | הנחתי: {assumption} · שינוי |
| Default reply (no question) | עדכנתי את הסינון. |
| Rejected value reply | לא מצאתי: {field}. בחרו בסינון. |
| Thinking | חושב… |
| Fallback status | ● העוזר לא זמין. הטופס עובד. |
| Filters eyebrow | סינון (first state: או לסנן ידנית) |
| AI chip | מולא ע"י AI |
| Filter keys | מטרה · עיר · שכונה · סוג נכס · חדרים · שטח · מחיר · חובה |
| Purpose segments | מגורים · השקעה |
| Empty values | הכול (multi-selects) · — (ranges) · בחרו (city, first state) |
| Range placeholders | מ- · עד |
| Must-haves | חניה · מעלית · ממ"ד · מרפסת |
| Neighborhood disabled hint | בחרו עיר |
| Buttons | חיפוש · ניקוי · (mobile sheet) הצגת {n} עסקאות |
| Results H1 | {n} עסקאות · {cities} |
| Results meta | {from}–{to} · החדשות קודם |
| KPI labels | עסקאות · מחיר חציוני · חציון למ"ר · שינוי למ"ר |
| KPI sublines | כולן בחישוב / {k} הוצאו · n={n} · {early} → {late} |
| Weak data tag | מעט עסקאות |
| AI badge | AI |
| AI footnote | מספרים מסומנים ב-● נבדקו מול הנתונים. |
| AI unavailable | אין סיכום כרגע. המספרים מחושבים ישירות מהעסקאות. |
| AI loading | מסכם… |
| Trends title | מחיר למ"ר לפי עיר |
| Trends hint | בסוגריים: מספר עסקאות |
| Trends reasons | מעט עסקאות · תמהיל השתנה |
| Trends footnote | שינוי מוצג רק מ-10 עסקאות בכל תקופה. עבר, לא תחזית. |
| Show more | עוד {n} ערים · עוד {n} |
| Lead heading / line | לשמור את החיפוש? · נשלח לכם את {n} העסקאות. |
| Lead fields | שם · טלפון לוואטסאפ / מייל · שמירה |
| Lead channel link | מייל במקום / וואטסאפ במקום |
| Lead consent | עדכנו אותי על דירות חדשות |
| Lead done | נשמר. (demo line, muted:) בדמו השליחה עוד לא מחוברת. |
| Lead errors | בדקו את הפרטים. · יותר מדי ניסיונות, נסו בעוד דקה. · משהו השתבש, נסו שוב. |
| Deals title / count | עסקאות · {shown} מתוך {total} |
| Deals header | נכס · שכונה · תאריך · מחיר · למ"ר |
| Deal title | {type} · {rooms} חד' · {size} מ"ר |
| Deal detail labels | קומה · שנת בנייה · מקור · מזהה |
| Original row toggle | השורה המקורית / הסתרת השורה המקורית |
| Conflict line | מקור אחר: {source} {price} |
| Excluded line | לא בחישובי המחיר |
| Flags | keep current `QUALITY_FLAG_LABELS` |
| No results | לא נמצאו עסקאות. נסו להרחיב את הסינון. |
| Empty state | כמה עלו דירות דומות? · עסקאות אמיתיות מהעבר, עם המספרים שמאחורי כל מסקנה. · 1 מתארים · 2 בודקים את הסינון · 3 רואים עסקאות |
| Search error | החיפוש נכשל. נסו שוב. |
| Footer | עסקאות מקובץ לדוגמה, 2021–2026. לא הערכת שווי. |

## 3. Design tokens

**Type** (Heebo; weights 400 / 500 / 600 only)
| Token | Size / line | Use |
|---|---|---|
| display | 28 / 1.2, 600, −0.01em | results H1, empty H1 (mobile 22) |
| kpi | 20 / 1.3, 600, tabular | KPI values |
| title | 16 / 1.4, 600 | section titles, brand |
| body-l | 15 / 1.6 | AI note text |
| body | 14 / 1.5 | default, table cells |
| small | 13 / 1.45 | secondary, deal meta |
| caption | 12 / 1.4 | labels, n=, footnotes |
| micro | 11 / 1.3, 600 | badges |

All numbers use `font-variant-numeric: tabular-nums`. Signed % and IDs are wrapped in `dir="ltr"` with `unicode-bidi:isolate`. The minus sign is U+2212.

**Spacing** (4-pt): 4 · 8 · 12 · 16 · 24 · 32 · 48. Panel padding 12 (side) / 16 (main). Gap between main sections 24.

**Radius**: controls 8 · small chips and segments 6 · panels 12 · pills 999 · phone sheet 16 (top only).

**Color** (one accent; green/red/amber only for meaning)
| Token | Value | Use |
|---|---|---|
| bg | #f7f7f8 | page |
| surface | #ffffff | panels |
| sunken | #f2f2f4 | table headers, open editor, hover |
| border | #e7e7eb | panel borders, row dividers |
| border-strong | #d4d4da | inputs |
| text / muted / subtle | #18181b / #6b6b76 / #a1a1aa | |
| accent | #2f5bea | primary button, AI marks, focus |
| accent-soft / accent-ring | #eef2fe / #c9d6fb | AI note background and border, focus ring |
| up / down | #15803d / #b91c1c | change sign only |
| warn / warn-soft | #a16207 / #fdf6e3 | data flags, fallback status |

**Elevation**: panels have no shadow (1px border only). The only shadow is popovers / mat-select panel / mobile sheet: `0 8px 24px rgba(24,24,27,.08), 0 1px 2px rgba(24,24,27,.06)`. Focus: `0 0 0 3px var(--accent-ring)` + accent border.

**Material**: theme `primary: mat.$azure-palette`, density −3 in the side panel. Override `--mat-sys-primary` to `#2f5bea`. Use `appearance="outline"` form fields only inside the inline editor.

## 4. Component mapping

| Angular component | Change |
|---|---|
| `AssistantComponent` (page) | Becomes the shell: `.shell` grid with `aside.side` (chat-box + filters-form) and `main.main`. Remove the hero and the "how it works" card; the empty state moves inside `main`. New computed values: `headline` ("{n} עסקאות · {cities}"), `periodMeta`. Keep the `messages` signal, but pass only `lastAssistant` and `parsing` to chat-box. Add a `filtersSheetOpen` signal for mobile. |
| `ChatBoxComponent` | Single auto-growing textarea + icon send button (`mat-icon-button`, or plain button). Shows `lastReply` (text + assumptions joined into one line) or examples in the first state. The fallback status is a single amber line. Remove: message list, scroll logic, "העוזר" title, cache meta. |
| `FiltersFormComponent` | The default view is a summary list (`key → value` from `model`). Clicking a row sets `editing = 'cities' | 'rooms' | …` and renders that field's editor (mat-select multiple / two number inputs / checkboxes) below the row. Purpose is an always-visible `mat-button-toggle-group`. AI dot per field: compare `model` with the last AI-filled `filters` input (`aiFields: Set<keyof Filters>`). On mobile the same component renders inside the bottom sheet (CDK `Overlay`, or `MatBottomSheet` with the component as content), and the primary button reads "הצגת {n} עסקאות". |
| `FactsPanelComponent` | Split into three blocks rendered in order: **KPI strip** (4 tiles: matched_count, median_price, median_price_per_sqm, the selected city's change; or, if several or no cities are selected, the change tile shows "ראו טבלה"), **AI note**, **trends table** (limit 6 + "עוד N ערים" toggle). `isUsed` drives `.kpi.used` and `tr.used`. Weak tiles: `.kpi.weak` + "מעט עסקאות". Remove: long explanatory paragraphs, card titles with icons, the "תקופה" tile (moved to the header meta). |
| `LeadFormComponent` | A horizontal band: heading + line | inline form. Channel radio → text link toggle. Two checkboxes → one ("עדכנו אותי על דירות חדשות"); `wantsSummary` stays `true` implicitly, since saving the search means sending it. Done state is one line plus a muted demo line. Placed **between the trends table and the deals**. |
| `DealListComponent` | A CSS-grid row list with a header row. A row click toggles `expanded` (one open at a time). Expanded content: inline facts, feature pills (yes/no/unknown), flag labels, conflict and excluded lines, and the original row link that loads `getByDealId`. Shows 7 rows, then "עוד N" (+10 per click). Warning flags as an amber dot on the collapsed row. |

`styles.scss`: replace with the tokens above. Delete `.hero`, `.card__title` icons, `.msg*`, `.empty ol`, `.ai-box*`, and the big `.deal` card styles.

## 5. Mobile (≤ 760px, container query on `.app`)

- Single column. Order: ask panel → filters trigger → results.
- **Filters trigger**: one bordered button "סינון: {summary}" + "עריכה". It opens a **bottom sheet** with the same filters list, max-height 85vh, scrollable, sticky footer "הצגת {n} עסקאות" (live count after debounce, or "חיפוש" before the first search).
- KPI strip becomes 2×2.
- Trends table: hide the 2021–2023 column. Change + the 2024–2026 value remain; the full row is shown on tap.
- Deal rows: two lines — title · price / neighborhood + size · ₪/מ"ר, date as a third muted line. The chevron is hidden; the whole row is tappable.
- Lead band stacks; inputs are full width.
- Gutters 16px, no horizontal scroll. The tables are within `overflow:hidden` panels with no fixed widths.

## 6. Removed, and why

- **Blue hero banner + subtitle**: it cost 120px of the first screen and repeated the brand. The value proposition moves into the empty state only.
- **Full chat history**: the conversation's output is the filters list, which is the real state. Only the last reply matters; history added text and a scroll area.
- **"How it works" list (3 sentences)**: replaced by a 3-word stepper in the empty state.
- **Icons in every card title**: decoration that competed with the numbers.
- **The "תקופה" tile**: it moves into the header meta line, freeing the 4th KPI slot for the trend.
- **Long hints** (must-have explanation, trend methodology paragraph, AI "how we checked" paragraph): each became one short line or a tooltip. The rules stay enforced in code.
- **"שלחו לי את הסיכום הזה" checkbox and channel radios**: saving implies sending, and the channel is a link toggle. Two fewer controls.
- **Large deal cards**: 7 compact rows fit where ~2.5 cards did; details are one click away.
- **Cache badges** ("מהמטמון"): a backend detail with no user value. Keep it in a `title` attribute for the demo if needed.
