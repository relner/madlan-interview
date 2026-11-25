# Madlan Tech Challenge — Working Plan

## Current status

Last updated: November 21, 2026.

We have reviewed the brief and CSV, identified data quality issues, and sent three questions to the organizers. We have not received their answers yet; this does not block work, because every data rule below is a documented assumption that can be changed later.

Decided:

- **Product:** a Hebrew assistant for buyers. It first asks why the person is buying (to live in or as an investment), then clarifies must-haves and trade-offs, and shows matching past deals with the facts behind every statement. Lead capture (section 6) follows the results.
- **Data:** cleaned once by a repeatable script, loaded as a prepared dataset (section 5).
- **Architecture:** the LLM interprets language and writes explanations; code computes every number; the form is the core interface and works without the model; caching and precomputation keep cost low (section 8).
- **Scope:** this is a demo of a product direction, not a production product. The small CSV is acceptable; a real product would have more data.

- **Stack:** Angular + Node.js/Express + MongoDB in docker-compose (section 8.0).

Not decided yet: final model choice, VPS provider, which conversion path to implement in the demo (mini-site or platform page).

Implementation started: the API skeleton with search, facts, grounding check, LLM calls, cache and leads is written; unit tests pass. Next: the cleaning/seed script, then the Angular client.

## 1. Requirements

Source: `madlan_tech_challenge (4).md`.

Build a useful application using the provided property deals and an LLM, deploy it publicly, and deliver the URL.

Mandatory requirements:

- A live, public URL.
- Hebrew interface with RTL support.
- The LLM performs meaningful work beyond generating a summary.
- Design and explain costs for 10,000 requests per day on our own budget.
- Do not make claims unsupported by the data.
- Remain useful when the model is slow, wrong, or unavailable.
- Use AI assistance and keep a short work log, including a real example of an AI mistake that we caught and corrected.

The brief allows approximately five focused hours of work and three days to deliver. The actual deadline and the start of that period have not been recorded here.

The review session is in English: demo (5 minutes), architecture (15), teaching a technical topic to a junior developer (10), and Q&A (10).

## 2. Dataset overview

File: `madlan_deals_sample (3) (4).csv`.

The file contains records of Israeli residential property deals. The brief describes the data as real-world shaped and uncleaned. We should not assume it is entirely synthetic or representative of the whole market.

- 530 data rows.
- 19 columns.
- 520 distinct `deal_id` values.
- 29 raw city labels, including spelling variants; this does not mean 29 distinct cities.
- Dates cover 2021–2026. Records with day-level dates range from January 5, 2021 to July 26, 2026, assuming day/month/year for non-ISO numeric dates.
- Three source categories: `רשות המסים` (Tax Authority), `מתווך` (agent), and `בעל נכס` (property owner).
- Raw source counts, before deduplication: 307 Tax Authority rows, 121 agent rows, and 102 owner rows.
- No building number, coordinates, original record URL, or version update timestamp is provided. These fields cannot be used to identify an exact property or determine which conflicting version is newer.

### Schema

| Field | Meaning and limitations |
|---|---|
| `deal_id` | Apparent transaction identifier; its meaning across sources needs confirmation |
| `city` | City; includes abbreviations, English names, and spelling variants |
| `neighborhood` | Neighborhood; some missing values and extra spaces |
| `street` | Street name without a building number |
| `property_type` | Apartment, penthouse, private house, etc. |
| `rooms` | Room count; numeric values and strings such as `2 חדרים` |
| `size_sqm` | Area in square metres; the exact definition is unspecified |
| `floor` | Property floor; some values are missing |
| `total_floors` | Number of floors in the building |
| `year_built` | Construction year; some missing values and ambiguous combinations with condition |
| `condition` | Property condition, such as `חדש מקבלן` or `משופץ` |
| `has_elevator` | Elevator availability |
| `has_parking` | Parking availability; missing does not mean no |
| `has_balcony` | Balcony availability |
| `has_safe_room` | Safe room availability |
| `deal_date` | Date; mixed formats and precision, including month-only values |
| `price_nis` | Price in shekels; some values contain commas or a currency symbol |
| `price_per_sqm` | Reported price per square metre; not always consistent with price and area |
| `source` | Source category; no specific agent or owner is identified |

## 3. Data quality findings

Counts below refer to raw rows unless stated otherwise.

### Duplicates and conflicting versions

Six records have an exact duplicate, including the source:

`D100311`, `D100025`, `D100196`, `D100099`, `D100416`, `D100215`.

These can be deduplicated without choosing between sources.

Four IDs have two versions with different prices:

| Deal ID | Source and price | Other source and price | Absolute difference |
|---|---|---|---:|
| `D100017` | `רשות המסים`: ₪1,919,000 | `מתווך`: ₪1,851,548 | ₪67,452 |
| `D100124` | `רשות המסים`: ₪5,727,000 | `מתווך`: ₪5,429,440 | ₪297,560 |
| `D100032` | `בעל נכס`: ₪5,141,000 | `מתווך`: ₪5,343,137 | ₪202,137 |
| `D100303` | `בעל נכס`: ₪6,064,000 | `מתווך`: ₪6,195,332 | ₪131,332 |

All other fields in these pairs match after trimming whitespace, including `price_per_sqm`, even though the total prices differ.

No pair differs only in source while matching in every other field. If such records appear, the proposed approach is to keep one deal with multiple source references.

No deal appears under all three source categories. The four conflicting pairs do not establish that sources always report different prices; most deals have only one source and cannot be compared.

### Formatting and missing values

- City aliases include `ת"א`, `Tel Aviv-Yafo`, and `תל אביב-יפו`. Use explicit normalization rules.
- Extra whitespace appears in neighborhoods, property types, and conditions.
- Boolean values use `כן` / `לא`, `TRUE` / `FALSE`, `1` / `0`, and `yes` / `no`.
- Date formats: 373 ISO rows, 76 with slashes, 55 with dots, and 26 month-and-year values such as `Aug 2025`.

| Field | Missing rows |
|---|---:|
| `neighborhood` | 11 |
| `size_sqm` | 10 |
| `floor` | 24 |
| `year_built` | 35 |
| `condition` | 16 |
| `has_parking` | 20 |
| `price_per_sqm` | 10 |

### Numeric and semantic inconsistencies

- `D100251` has zero price and zero price per sqm, an area of 114 sqm, and source `רשות המסים`. The reason is unknown.
- In 28 rows, reported price per sqm differs from price divided by area by more than 2%. This is an exploratory threshold, not an approved product rule.
- Example: `D100178` has ₪3,586,000 and 65 sqm, giving approximately ₪55,169 per sqm, while the file reports ₪68,592.
- Some properties marked `חדש מקבלן` have old construction years: `D100432` (1950), `D100080` (1956), and `D100301` (1985). These combinations require interpretation rather than automatic correction.

## 4. Questions for the organizers

The message was sent; its text is in `questions.md`. It has a Hebrew introduction, English questions and explanations, and original Hebrew values from the CSV.

### Question 1: Transaction identity, price meaning, and source priority

Can I assume that rows with the same `deal_id` refer to the same transaction, even when the sources differ?

I found four deals where the same ID appears with different prices from different sources: `רשות המסים`, `מתווך`, or `בעל נכס`. For example, deal `D100124` has a price of ₪5,727,000 from `רשות המסים` and ₪5,429,440 from `מתווך`.

Are all prices in the file final sale prices, or could some be asking prices? When they disagree, is there a source I should trust, or should I keep both versions and flag the difference?

**Why it matters:** Avoid double-counting and arbitrary price selection. We should not assume that Tax Authority records take priority without confirmation.

### Question 2: Area definition and price per square metre

What does `size_sqm` include? For example, does it include balconies or other additional spaces? Is the definition the same across all sources?

In some rows, `price_per_sqm` does not match `price_nis / size_sqm`. For example, deal `D100178` has a price of ₪3,586,000 and an area of 65 sqm. This gives about ₪55,169 per sqm, but the file lists ₪68,592 per sqm.

Should I calculate the price per sqm from the price and area in the row, or is the existing value based on a different definition of area?

**Why it matters:** Code can detect the discrepancy, but cannot determine which field is wrong or whether a different calculation was used.

### Question 3: Condition versus construction year

Some properties are marked as `חדש מקבלן`, but have an old construction year. For example, deal `D100432` has `year_built = 1950`.

Could the year refer to the original building, while the condition describes a new apartment following redevelopment or rebuilding? Or should I flag this combination as a data inconsistency?

**Why it matters:** Avoid discarding valid records or using ambiguous attributes for comparisons without qualification.

### Optional question not included in the current message

How was the sample selected: all deals from a particular source and period, or a filtered selection?

We can inspect the distribution but cannot reconstruct the selection process from the file. For now, results describe this dataset only; we will not assume it represents the whole market.

## 5. Preliminary data handling decisions

These decisions can be made without waiting for answers, but should be revisited after clarification and final product selection.

- Preserve original rows and values alongside normalized data.
- Normalize whitespace, numbers, booleans, and unambiguous city aliases.
- Remove exact duplicate rows while retaining provenance.
- Treat missing values as unknown, not false or zero.
- Preserve month-only date precision; do not invent a day.
- Preserve and flag conflicting versions. Until clarified, do not silently pick a price; provisionally exclude unresolved price conflicts from price aggregates.
- Exclude zero prices from price calculations while retaining the record and exclusion reason.
- Keep reported and calculated price per sqm separately. Calculate only when price and area are positive. Recalculation does not prove that the source price or area is correct.
- Do not automatically correct condition/year combinations.
- Do not remove expensive or unusual deals solely because they are outliers.
- Show record counts, date coverage, and relevant limitations alongside statistics.

### How the data is prepared

The brief does not require a cleaning service, a file upload feature, or ongoing data ingestion. We clean the CSV once and the application works with the prepared result:

**Raw CSV → normalization and validation script → prepared dataset + exclusion report → application.**

- Use a script, not manual edits in a spreadsheet: the processing is repeatable, the applied rules are visible, and a rule can be changed and the data rebuilt after the organizers answer.
- The script fixes formats, merges exact duplicates, and flags contradictions. It never silently picks a "correct" price or invents missing values.
- The raw file is kept unchanged. The rules and the list of excluded or flagged records are documented.
- Cleaning is preparation, not a user-facing feature.
- For 530 rows a full database is optional; a prepared file is enough if the chosen architecture allows it.

### Seed result (implemented: `api/scripts/seed.js`, rules in `api/src/utils/dealNormalize.js`)

530 raw rows → 524 documents, 520 distinct deal ids, 515 in price statistics. Full report: `api/data/seed_report.json`.

- 6 exact duplicates merged; 4 price conflicts (8 versions) kept, flagged and excluded from statistics; 1 zero price excluded.
- 28 price-per-sqm mismatches, 26 month-only dates, 19 unknown parking, 9 missing areas — flagged, not corrected.
- City aliases → 18 cities. Assumption: `מודיעין` and `מודיעין מכבים רעות` are one city (identical neighborhoods in the data).
- Neighborhood aliases: `Florentin` → `פלורנטין`; `רמב"ש א'` / `רמת בית שמש א` → `רמת בית שמש א'` (same for ג). Assumption: `מרכז` and `מרכז העיר` both mean the city center.
- Slash and dot dates are confirmed day/month/year: the first part is sometimes above 12, the second never.
- **`חדש מקבלן` with a building older than 5 years before the deal: 86 of ~102 such records.** The condition field is not reliable; it is flagged and not offered as a search filter.
- **Trend finding:** with a minimum of 5 deals per city-year, 17 of 18 cities got a "trend", but each city compared different years (e.g. 2022→2025 vs 2025→2026) and mixed property types; Jerusalem showed −45% from 5 vs 5 deals. Not a meaningful comparison. Resolved in 8.1 (trend rules).

## 6. Business option 1: Comparable deals and buyer lead generation

The first business idea is a Hebrew natural-language search for comparable property deals that converts visitor interest into a lead or a registered user. This is a documented product option, not a commitment to implement every variation.

### User value and business value

Visitors describe the apartment they are looking for, see relevant past transactions, and can save their search or receive a convenient summary through their preferred channel.

The company receives a contact with confirmed search preferences: location, budget, room count, area, and other requirements the visitor has provided. These preferences give the sales team more context than a contact form alone.

The page should be useful as a direct destination for advertising, even if it is also part of a larger product.

### Version A: Standalone mini-site

- A self-contained mini-site that can be promoted through advertising campaigns.
- Primary business objective: capture leads from people interested in properties in a particular location.
- Show useful search results before asking for contact details.
- Offer to send the search summary and relevant results by email or WhatsApp.
- Ask for a name and the selected contact method, rather than requiring both email and phone.
- Offer a separate opt-in for future matching property listings.
- Save the contact together with the confirmed search criteria and the requested follow-up.

### Version B: A page within a CRM or larger property platform

The same page can operate inside a larger system and still have its own advertising URL. After viewing results, the visitor has two options:

1. **Leave contact details:** receive a summary and matching property listings through the chosen channel. The company receives a lead without requiring an account.
2. **Register:** retain access to search history, saved searches, viewed deals, and other benefits supported by the platform. The company gains a registered user with known property preferences.

Registration could support a paid product or future subscription conversion if that fits the platform's business model. Pricing and a paid CRM are possibilities, not established requirements.

The CRM is the business context; the visitor-facing experience should use familiar property-search language rather than expose internal CRM terminology.

### Shared search flow and the LLM's role

Example request: four-room apartments in Holon, with parking, up to three million shekels.

Proposed flow:

1. The LLM converts the request into structured filters using a strict schema.
2. The application validates the output and shows the interpreted criteria.
3. Deterministic code filters records and calculates statistics.
4. Results show deal IDs, sources, and record-specific quality notes.
5. Manual filters remain available independently of the model.
6. The visitor can request a summary through a chosen channel or, in the platform version, register to retain ongoing access.

The LLM turns the visitor's description into structured buyer preferences and helps clarify ambiguous requirements. The application uses the confirmed preferences both for search and for the lead record. Code selects records and calculates numerical results.

### Demo scope and production dependencies

The goal is to demonstrate the product direction and business value, rather than build a complete production platform. The size of the supplied CSV should not block demonstrating this idea.

- Keep results and calculations grounded in the provided CSV.
- Distinguish completed transactions in the CSV from available property listings.
- Future matching-listing notifications require a live listings source. Email and WhatsApp delivery require integrations; registration and search history require account and storage features.
- Clearly identify any simulated delivery, notification, or account behavior in the demo. Do not present an unconnected integration as working.
- Select which conversion path to implement for the demo before development; the other version can be explained as an extension.

### Proposed success measures

For a real deployment, measure search completion, result-to-lead conversion, result-to-registration conversion, and how often saved leads contain usable search preferences. These are proposed metrics; no performance or revenue claims have been validated.

Ambiguous requests such as “a good apartment for a family” should trigger clarification rather than silently becoming specific requirements.

Do not promise fair-value estimates, price forecasts, or investment returns based on this dataset. Define comparison criteria explicitly before presenting records as comparable.

## 7. Selected direction: buyer assistant

We chose the buyer as the user. Other options considered and set aside for now: checking a specific listing before calling the seller, preparing an owner for a sale, and a realtor meeting assistant. They can be mentioned as extensions.

### Purpose first

A request such as "I have two million and I want an apartment" is not enough to search well. The assistant first asks one question:

> אתה מחפש דירה למגורים או להשקעה?

The conversation then branches:

| To live in | As an investment |
|---|---|
| Who will live there | Rent out or resell later |
| Which cities or areas they consider | Planned holding period |
| How many rooms they need | Location and property type limits |
| Must-haves: parking, elevator, safe room (ממ"ד) | What they want to compare in past deals |
| What they would give up to fit the budget | How open they are to alternatives |

Rules for the dialog:

- Ask one or two questions per step, not a full questionnaire.
- Separate must-haves from nice-to-haves; let the user test trade-offs ("what if I drop parking?", "what about the next city?").
- Ambiguous wishes ("a good apartment for a family") lead to a clarifying question, not a hidden assumption.

### Clarifying chat (implemented)

Before any results the assistant asks one short question at a time, with quick-reply buttons:
purpose (live / invest) → apartment or house → area → rooms → budget. Questions already answered in the first message are skipped.

- **Question bank** (`api/src/utils/questionBank.js`): every option states exactly which filters it sets. The next question is the first empty slot, chosen by code. Area buttons come from the data: the 3 cities with the most deals for the current filters (e.g. for a 2M budget: Be'er Sheva, Ashdod, Haifa).
- **Welcome examples work the same way** (`api/src/utils/examples.js`, served by `GET /api/assistant/examples`): 15 presets with fixed text and filters (optionally `skipped` slots, e.g. "לא משנה איפה"), applied by code; the welcome screen shows 5 random ones per page load. They cover the three advice scenarios (budget, nearby city, offer check). Each preset was checked against the data and matches 6–89 deals, except one Tel Aviv preset kept tight on purpose (2 deals) to show nearby-city advice. Before this, each example click was sent to the LLM as free text and paid for a parse call; the developer noticed it in the token counter.
- **A quick-reply click is applied by code — no LLM call** (measured 5–9 ms). The LLM is called only for free text, and only to extract filters. A typical chat (one sentence + three clicks) costs 1 LLM call instead of 4.
- **The LLM may ask its own question** when the bank does not cover the case (a place not in the data, contradictory or vague wishes). These are stored in the `learned_questions` collection with a counter, as candidates. Frequent ones are reviewed and moved into the bank by a person; they are not added automatically, so the model never rewrites the conversation script on its own. Repeating the same situation is already free via the parse cache.
- **Limits in code:** at most 4 questions, then the search runs anyway; "להציג עסקאות עכשיו" is always available; if the assistant is unavailable, the form opens.
- The model receives only the state (filters, answered slots, the question being answered), never the whole chat.
- **The data is closed deals, not homes for sale — the chat says so.** The welcome screen says it under the input ("לא דירות למכירה · עסקאות שכבר נסגרו, 2021–2026"). A separate intro message in the chat was tried and removed: together with the hints it was too much text. Questions are worded as "what to compare with", not "what are you looking for" (e.g. "להשוות לדירות או לבתים פרטיים?", "באיזו עיר לבדוק עסקאות?", "עד איזה מחיר לבדוק?"). Each bank question has a `hint` line that explains what the answer changes in the comparison. The LLM prompt forbids offering or promising listings in its own questions.

### Advice (implemented)

The results start with "מה אנחנו ממליצים": 1–3 recommendations, each with a headline, a reason, and the facts it is based on.
The developer's point: showing deal counts alone does not justify an LLM; the agreed goal was to advise ("based on your preferences, check X, because Y").

- **Code computes candidate comparisons** (`api/src/services/advice.service.js`), as facts with id, value, n and deal ids:
  1. *Budget fit* — in the buyer's city: the median price for homes like theirs and how many closed within the budget; and the cities where this budget bought the most such homes (median price and area).
  2. *Nearby cheaper* — nearby cities (hand-written list, `utils/nearbyCities.js`) with a lower median price per sqm: how much lower, and how many times more area the same money bought.
  3. *Offer check* — the buyer was offered a home at a price (`offerPrice`, a new field: not a search filter): how many similar closed deals (same city and type, rooms ±0.5, area ±15%) closed below it, and their median.
  4. *By purpose* (the purpose switch now changes the advice, also without the LLM):
     - **live** → `live_most_area`: the cities where this budget and criteria bought the largest homes (median area, n ≥ 5). Advice: "כדאי לבדוק את באר שבע — כי אתם מחפשים דירה למגורים, ובתקציב הזה נמצאו בה הדירות הגדולות ביותר" (112 sqm median, 18 deals).
     - **invest** → `invest_growth`: the cities with the largest published past change in price per sqm (the same fixed periods and checks as the trend table), with how many deals fit the budget. Advice: "שימו לב לראשון לציון — כי אתם מחפשים להשקעה, והעלייה הייתה הגבוהה ביותר בעסקאות האלה" (+19.6%, 10 → 19 deals, "לא תחזית").
     The prompt puts the purpose advice first and makes its reason start with the purpose. Before this, `purpose` only reached one line of the prompt and changed nothing on screen.
- **The LLM chooses and phrases**: it picks the comparisons that matter for this buyer and purpose, and writes the advice. It may not call a price a bargain, forecast, or call a place a good investment.
- **Grounding per recommendation**: the summary sentence and each recommendation are checked separately; an ungrounded one is dropped, the others stay. Percentages are allowed only from published changes or from a fact's own `…Pct` detail with enough deals.
- **Under each recommendation the facts are written by code**, so every number can be checked. Without the LLM the panel shows the same facts as plain lines ("מה רואים בעסקאות").
- **The cache key includes a hash of the prompt and model**, so a prompt change never serves old answers.
- Reasons contain no numbers; the facts under them are written by code. A recommendation must rest on an advice fact (offer / budget / nearby), otherwise it is dropped: without numbers in the reason, the number check alone cannot stop a vague claim. Cost re-measured in 8.4.

Examples from the real data (Opus 5.5):
- "3 rooms in Tel Aviv, 3M" → "0 of 18 similar deals in Tel Aviv closed within 3M; median 9.1M" + "כדאי לבדוק את חולון: 38,918 ₪ per sqm (37 deals), 51% lower, about 2.1× the area" + Bat Yam + "in Rishon LeZion 10 deals fit the budget, median 83 sqm".
- "Offered 4 rooms in Netanya for 2.9M" → "only 1 of 14 similar deals closed lower; median 4,425,500 ₪ — check the condition, size and location".

### What the investment branch may and may not say

- **May:** show historical price changes computed from the deals, with the number of deals and the period: *"In this dataset, the median price per sqm in city X changed from A to B between 2021 and 2025 (n = N deals). These are past deals, not a forecast."* Ranking cities by past change is fine.
- **May not:** conclude "this is a good place to invest", forecast growth, or estimate rental yield. Past growth does not prove future growth, and the CSV has no rents or costs. The conclusion belongs to the user.
- With 520 deals spread over many cities and six years, most neighborhoods have too few deals for a trend. Show trends at city level, and mark groups with too few deals as "not enough data" (section 8.1).

### End of the flow

After the results, the business options from section 6 apply: leave contact details to receive the summary, or register to keep the search history. The confirmed preferences (purpose, budget, location, must-haves) are saved with the lead.

## 8. Architecture decisions

General principles:

- Prepared dataset, a small backend, and a Hebrew RTL interface.
- **The LLM interprets language and writes explanations; code does filtering, arithmetic, and every factual result.**
- Validate the model's output against a strict schema and allowed values.
- Do not send the entire CSV to the model or let it execute arbitrary SQL.
- A vector database and complex RAG are not justified by the data volume or the task.

### 8.0 Stack and project structure

Decided: Angular frontend, Node.js/Express backend, MongoDB, everything in docker-compose. The backend follows the same structure as an existing production project of ours, so every part of it can be explained from experience.

Why this and not a single serverless app: this is how the feature would look as a real product — a separate API that any client can call, stored leads, a cache with expiry, and the whole system started by one command. The cost is about 1–1.5 hours of setup out of the 5-hour budget.

```
madlan/
├── docker-compose.yml        nginx, client, api, mongo, seed (one-off)
├── nginx/nginx.conf          / → client:4200, /api → api:3000
├── documentation/            brief, CSV, plan, questions, conversations
├── client/                   Angular 21 (NgModules), Material, Hebrew RTL
│   └── src/app/
│       ├── pages/assistant/  page + components: chat-box, filters-form,
│       │                     facts-panel, deal-list, lead-form
│       └── shared/           services (deal, search, assistant, lead), models,
│                             const (Hebrew labels), pipes (nis, dealDate)
└── api/
    ├── data/deals_raw.csv    original file, never modified
    ├── scripts/seed.js       cleaning + loading (next step)
    ├── src/
    │   ├── index.js          connect Mongo, start server
    │   ├── app.js            middleware + routes
    │   ├── routes/           paths only: deal, search, assistant, lead
    │   ├── controllers/      request handling, try/catch + errorHandler
    │   ├── services/         search, facts, grounding, llm, cache
    │   ├── models/           Deal, Lead, LlmCache (TTL index)
    │   ├── validators/       one filter schema (zod) for form + LLM; message; lead
    │   ├── middleware/       rate limit per IP
    │   ├── helpers/          configuration (env), db
    │   └── utils/            logger (pino), errorHandler
    └── test/                 node:test — filters, facts, grounding
```

API:

| Endpoint | Purpose | Uses LLM |
|---|---|---|
| `GET /api/deal/options` | Values for form dropdowns | No |
| `GET /api/deal/:dealId` | All versions of a deal, with the original row | No |
| `POST /api/search` | Filters → deals + facts. Works without the model | No |
| `POST /api/assistant/parse` | Hebrew message → filters + clarifying question | Yes, cached |
| `POST /api/assistant/explain` | Filters → facts + grounded explanation | Yes, cached, checked |
| `POST /api/lead` | Save contact + confirmed preferences | No |

Every assistant response carries `source: cache | llm | fallback`. `fallback` is not an error: the client shows the form with what was understood.

Models: one per task, `LLM_PARSE_MODEL` (default `claude-sonnet-5-5`) and `LLM_EXPLAIN_MODEL` (default `claude-haiku-5-5`); `LLM_MODEL` overrides both. The choice and its cost are discussed in 8.4.

Hosting: a Hetzner server running docker-compose, nginx in front for HTTPS. Not set up yet.

### 8.1 Grounding: the LLM always shows the facts behind what it says

Brief requirement 5: *"It must not state things the data doesn't support."* The user must be able to see what every statement is based on.

1. **Code computes the facts.** Examples: median price per sqm by city and year, change in %, number of deals (n), period covered, IDs of the deals used. Each fact gets an ID.
2. **The LLM receives only this fact list** (plus the user's confirmed filters) and writes its explanation with references to fact IDs. It is not allowed to introduce its own numbers.
3. **Code validates the answer.** Every number in the LLM's text must match a fact from the list, and every referenced fact ID must exist. If validation fails, the text is dropped and only the facts are shown.
4. **Minimum sample rule.** If a group has too few deals (fewer than 5 for a median), code marks the fact as "not enough data", and the LLM may not describe a trend from it.
   **Trend rules (implemented in `facts.service.js`):**
   - Every city is compared over the same two periods: 2021–2023 vs 2024–2026. Changes are comparable between cities.
   - At least 10 deals in each period.
   - Property type mix check: if the share of any property type differs by more than 25 percentage points between the periods, no change is published (`property_type_mix_changed`). Found on real data: Jerusalem showed −32% only because 5 penthouses (~92,000 NIS/sqm) were in the early period and none in the late one.
   - Result on the current data: a change is published for 4 of 18 cities (Ashdod +7.5%, Holon −0.7%, Netanya +7.8%, Rishon LeZion +19.6%); the other 14 show the reason (not enough deals or mix changed).
   - Every change fact carries a caveat: different apartments in each period, past change, not a forecast.
   - For the presentation: this is a concrete example of "it must not state things the data doesn't support" — the first version of the code would have shown 17 misleading trends.
5. **The UI separates facts from AI text.** Fact cards show "based on N deals, period X–Y" and expand to the actual deals (ID, source, quality flags). The AI comment is visually distinct and labeled as such.
6. **Explanations for choices.** When the assistant suggests an option (another city, a smaller area), it shows the facts that led to the suggestion, e.g. how many deals matched under the old and the new criteria.
7. Wording always refers to *this dataset*, never to "the market".

### 8.2 The model is unavailable or wrong: the form is the core

Brief requirement 6: the app must survive the model being slow, wrong, or unavailable.

- **The form is the primary interface; the LLM only fills it in.** The LLM converts free text into the same filter JSON that the form sends. There is one backend endpoint, and it does not care where the filters came from.
- The user sees how the assistant filled the form ("this is how I understood you") and can edit any field. This is also a transparency feature.
- Fields are mostly choices, not free typing: city dropdown (from normalized values), rooms, budget range, purpose (live / invest), checkboxes for parking, elevator, safe room, balcony.
- **Model unavailable:** the form opens empty with a short message; search works fully.
- **Model returns invalid output:** the schema validator keeps the fields that passed validation, pre-fills the form with them, and leaves the rest to the user.
- **Model returns valid but suspicious output** (e.g. a city not in the data): treat it as invalid for that field and ask the user.

### 8.3 The model is slow

- **Hard timeout** on the parsing call (provisional: ~5 seconds). On timeout, show the form.
- **Results do not wait for the LLM.** Matching deals and statistics are computed by code and shown immediately. The AI explanation loads afterwards (streaming). If it never arrives, the page is still useful.
- **Small calls:** a small, fast model for parsing; short prompts; short structured output.
- **Cache hits** (section 8.4) are the fastest answer: no model call at all.

### 8.4 Cost: precompute, cache, keep calls small

Brief requirement 4: 10,000 requests a day on our budget, and we must know what it costs.

**Precomputed before launch (no tokens at request time):**

- All statistics are computed by code during data preparation.
- **City texts:** the data is static, so explanations per city × purpose (about 15 cities × 2 purposes) can be generated once, reviewed by hand, and used as the initial cache.
- **Provider prompt caching:** the system prompt, schema, and list of cities are fixed and placed at the start of every request, so they are billed at the cached rate.

**Filled over time, two cache levels:**

1. **Text → filters.** Key: normalized request text (whitespace, case, city spelling variants). Exact match.
2. **Filters → advice** (collection `advice`, 24 hours). Every advice that passed the checks is stored with its filters (readable), model, prompt version, cost and hit count. The same filters within 24 hours always get it from the database, with no model call (measured: 2.5 s and $0.00035 for the first request, ~10–15 ms and $0 after). The developer chose "always from the database, 24 h" over refreshing every third request: maximum saving, one stable advice per filter set per day. Key: the structured filters, not the text. Many phrasings ("4 rooms in Holon up to 3M") give the same filters, so this level should give most of the hits.

**Other savings:**

- In a multi-turn dialog, send the current state (filter JSON) plus the last message, not the whole chat history.
- Never send raw CSV rows; send only the computed facts needed for the explanation.
- Limit message length and request rate per IP.
- Not now: semantic caching (matching by similar meaning). It can return someone else's answer for a different request. This is a "what we'd change at 10×" topic.

**Cost estimate for the presentation:**

`daily cost = 10,000 requests × cache miss rate × (input tokens × input price + output tokens × output price)`

**Measured on 2026-11-21** (Claude Opus 5.5, per-call usage from the API logs, warm provider cache):

| Call | Uncached input | Cached input (read) | Output | Latency |
|---|---:|---:|---:|---:|
| parse (text → filters) | ~165 | 2,570 (system prompt + allowed values) | ~220–270 | 3.1–3.8 s |
| explain (facts → sentence) | ~890 | 650 (system prompt) | ~110–125 | 2.3–3.2 s (one at 6.1 s) |

Two optimizations came directly from these measurements:
- The allowed cities/neighborhoods moved from the user message into the cached system prompt (sorted, byte-stable): ~1,300 tokens per parse moved from full price to cache-read price.
- The explain call was sending ~8,700 input tokens (all city facts for every request). Trimming to the facts the explanation can use (`factsForModel`) cut it to ~890 — about 10× less. The grounding check validates against exactly that trimmed list.
- A shorter explanation (≤25 words, no repeating numbers already on screen) cut output from ~370 to ~115 tokens.

Cost per uncached request (parse + explain), list prices Opus 5.5 $4 / $20 per MTok, cache read $0.20 (check current pricing before the presentation):
- parse ≈ $0.0061, explain ≈ $0.0060 → **≈ $0.012 per request**. Output tokens are about 60% of the cost.

| Requests/day | Cache hit rate | Per day | Per 30 days |
|---:|---:|---:|---:|
| 10,000 | 0% | ~$121 | ~$3,600 |
| 10,000 | 50% | ~$60 | ~$1,800 |
| 10,000 | 80% | ~$24 | ~$730 |

With Claude Haiku 5.5 ($0.10 / $0.50) the same token profile is ≈ $0.0003 per request (~$3/day uncached) — about 40× cheaper, and faster (~2.5 s parse in the benchmark). Quality on our parse benchmark was the same for Haiku, Sonnet and Opus; the explanation quality on Haiku is not measured yet.

**Re-measured after adding advice (2026-11-21).** Advice made the explain call long (3 recommendations with numbers, ~350–550 output tokens) and the whole flow cost **≈ $0.02–0.03 per buyer on Opus 5.5** (~$200–300/day at 10,000, uncached). The developer flagged it as too expensive. Where the money went:
1. Opus for two simple tasks (extraction; phrasing over given facts).
2. Output tokens (5× the input price, Hebrew is token-heavy): the reasons repeated numbers that the screen already shows under each recommendation.
3. Parse returned the full 15-field filter object (mostly null) on every call.
4. Facts went to the model with English labels and empty fields.

Changes: reasons without numbers (≤15 words; the code writes the facts under them), parse returns only changed fields, facts and filters are compacted and the fact types are defined once in the cached system prompt, thinking turned off where the model allows it, and **one model per task**, chosen on the same benchmark (5–7 parse messages, 3 advice cases):

| Model | parse (warm cache) | explain | Quality |
|---|---:|---:|---|
| Opus 5.5 | $0.004–0.006 | ~$0.011 | correct; some generic recommendations |
| Sonnet 5.5 | ~$0.002 | ~$0.004–0.006 | correct parse; one explain answer came back as mojibake |
| Haiku 5.5 | ~$0.0001 | ~$0.0002–0.0003 | lost the budget in 1 of 4 multi-condition sentences; some unsupported recommendations (caught by the new checks) |

**Chosen: parse on Sonnet 5.5, explain on Haiku 5.5** (`LLM_PARSE_MODEL`, `LLM_EXPLAIN_MODEL`). Parse blocks the buyer and a missed field costs an extra question; explain is guarded by three checks (numbers, advice basis, Hebrew text) and cached by filters.

| Requests/day | Cache hit rate | Per request | Per day |
|---:|---:|---:|---:|
| 10,000 | 0% | ≈ $0.0023 | ~$23 |
| 10,000 | 50% | | ~$12 |
| 10,000 | 80% | | ~$5 |

About 10× cheaper than Opus before advice, and ~100× cheaper than Opus with advice. Quick-reply clicks cost nothing. When idle for more than 5 minutes, the next parse pays a Sonnet cache write (~$0.01). This does not matter at 10,000/day.

**Visible in the UI:** every API response carries `usage` (model, tokens in / cached / out, latency, cost from `modelPrices` in the config; `null` when no model was called). A floating counter in the bottom right lists each interaction of the session ("הודעה", "לחיצה על תשובה", "המלצות") with its source (model / cache / no model / unavailable) and the session total. A typical chat: one Sonnet parse (~$0.0014–0.002), quick replies at $0, one Haiku advice call (~$0.0002–0.0003).

At 10×: switch the parse call to the cheapest model that passes a small eval set, keep the explanation cache keyed by filters (data is static, so hit rates should be high), and consider precomputing explanations for the most common filter combinations (city × purpose).

## 9. Workflow and deliverables

- [x] Review the brief and inspect the CSV.
- [x] Prepare three questions and an email introduction.
- [x] Send the questions to the organizers.
- [ ] Receive answers or document assumptions if decisions are left to us.
- [x] Document business option 1: standalone lead-generation mini-site and a page within a larger platform.
- [x] Choose the user: buyer assistant with a purpose-first dialog.
- [x] Define grounding, fallback, latency, and caching principles.
- [x] Choose stack: Angular + Node.js/Express + MongoDB + docker-compose.
- [x] Write the API skeleton (routes, controllers, services, models, validators) with unit tests.
- [ ] Choose the model and the VPS.
- [x] Choose the demo conversion path: standalone app.
- [x] Build the Angular client (chat, form, facts, AI explanation, trends, deals with original rows, lead form) and nginx; full stack runs with `docker compose up -d --build`.
- [ ] Add `ANTHROPIC_API_KEY` to `api/.env` and test the LLM path end to end (parse, explain, grounding rejections).
- [ ] Check the UI in a browser: desktop and phone width, RTL with numbers and IDs.
- [ ] Define success criteria for the demo.
- [x] Write the cleaning script; produce normalized data and an inclusion/exclusion report.
- [x] Decide how trends are compared: same periods, minimum 10 per period, property type mix check.
- [ ] Precompute statistics (facts with IDs, n, period, minimum-sample flags).
- [ ] Implement search and calculations independently of the LLM, behind the form.
- [ ] Add LLM query parsing, schema validation, timeout, and fallback to the form.
- [ ] Add grounded explanations: fact-list input, number/ID validation, facts-only fallback.
- [ ] Add the two cache levels and the precomputed city texts.
- [ ] Build the Hebrew interface and check RTL with numbers, IDs, and mixed-language text.
- [ ] Verify conflicts, missing values, date precision, empty results, invalid model output, and model unavailability.
- [ ] Estimate costs at 10,000 requests per day and explain changes at 10× traffic.
- [ ] Deploy publicly and verify the URL.
- [ ] Prepare the AI work log, architecture diagram, limitations, and English demo.
- [ ] Select a topic for the teaching segment; one candidate is the strict contract between LLM output and application code.

Provisional five-hour implementation budget:

| Work | Time |
|---|---:|
| Data preparation | 1 hour |
| Search and calculations | 1.5 hours |
| LLM integration | 1 hour |
| Interface and deployment | 1 hour |
| Verification and documentation | 0.5 hours |

Revisit this allocation after selecting the stack and conversion path. Maps and forecasting are outside the provisional scope. Full authentication is also outside the current time budget unless the registration path is selected and the scope is revised.

## 9a. Decision log

Questions that came up during the work, who decided, and why. Useful for the "decisions you can defend — including the ones your AI assistant made" part of the review.

| Date | Question | Decision | Reason |
|---|---|---|---|
| 2026-11-21 | Should the architecture decisions be recorded in the plan? | Yes, section 8 | Shared reference for the build and the presentation |
| 2026-11-21 | Is "as few separate services as possible" a requirement? | No. It was the AI's assumption, not part of the brief | The brief only asks for ~5 hours and "one thing done with real thought"; complexity is acceptable if it can be explained |
| 2026-11-21 | Stack: single serverless app (Next.js/Vercel) or separate frontend/backend? | Angular + Node.js/Express + MongoDB + docker-compose | Developer knows Angular well; backend mirrors the structure of an existing production project, so every part can be explained; shows how a real feature would be built |
| 2026-11-21 | Backend structure | Same as the developer's existing API: routes / controllers / services / models / validators / middleware / helpers / utils | Familiar and explainable |
| 2026-11-21 | Hosting | Hetzner server with docker-compose, nginx for HTTPS | Runs compose as is; low fixed monthly cost fits the budget story |
| 2026-11-21 | Cleaning: separate service or one-off script? | One-off seed script, repeatable, with a report | Brief does not require ingestion; a script keeps rules visible and re-runnable |
| 2026-11-21 | City / neighborhood spelling variants | Merged, assumptions documented (Modiin variants are one city; "מרכז" = "מרכז העיר") | Same neighborhoods in the data; otherwise filters would split one place in two |
| 2026-11-21 | Use `condition` as a filter? | No, flag only | 86 of ~102 "new from developer" records have buildings older than 5 years |
| 2026-11-21 | How to compare trends between cities | Option A: same periods for all cities, minimum 10 deals per period | Option B (per-year medians only) was more cautious but gave the investor no comparison |
| 2026-11-21 | Property type mix check (added by the AI after choosing option A) | Accepted as part of option A, threshold 25 pp | Jerusalem −32% was caused by penthouses, not prices |
| 2026-11-21 | Refusal handling: server-side model fallback or app fallback? | App fallback (form + facts) only, for now | Already covers refusal, timeout and invalid output; server-side fallback can be added later |
| 2026-11-21 | Design: six directions mocked by design agents (A–C rejected as dense, D–F made airier) | F — "Soft bento" (`documentation/design/design-f-*`) | Big rounded tiles, no borders, one accent = AI; trend as a dot-to-dot visual instead of a table |
| 2026-11-21 | City trends: from the filtered deals or from all deals in the city? | All deals in the city | A trend is market context; with rooms/price filters almost no city had enough deals for a fair comparison |
| 2026-11-21 | Timeouts | Parse 8 s, explain 20 s (client 12 s / 25 s) | Parse blocks the user; the explanation loads after results are already on screen. Opus parse measured 3–4 s |
| 2026-11-21 | Clarifying chat before results | Yes: one question at a time, quick replies, max 4 questions, "show now" always available | More useful for the buyer, and the LLM does real work on free text |
| 2026-11-21 | Where clarifying questions come from | A curated bank in a code file; the LLM only adds its own question when the bank does not cover the case | A click on a bank option is applied by code with no LLM call — this is where the real token saving is (a question's text is only ~15 tokens) |
| 2026-11-21 | Should LLM-invented questions be added to the bank automatically? | No: stored as candidates with a counter (`learned_questions`), moved to the bank after review | Keeps the conversation script under human control; same situations are already served from the parse cache |
| 2026-11-21 | Question wording | Questions ask what to compare with, each has a short hint, and the welcome screen says the data is closed deals (an extra intro message in the chat was removed as too wordy) | Feedback from the developer: "למגורים או להשקעה?" sounded like we sell homes, but the data is past deals and can only show statistics |
| 2026-11-21 | City trend display | A plain table (city · 2021–2023 · 2024–2026 · change), each price with its number of deals, instead of the dot-to-dot chart | The developer could not read the chart: no axis labels, two dot styles and an unexplained accent dot. A table is understood without explanation, and shows n next to every number |
| 2026-11-21 | What makes the LLM useful beyond parsing | Advice: code computes comparisons (budget fit, nearby cheaper, offer check); the LLM picks the relevant ones for this buyer and explains them; each is grounded separately | The developer: "we show deal counts — so why an LLM?" Advice is what the buyer needs, and the split keeps every number computed by code |
| 2026-11-21 | Data cleaning: implausible prices | Prices below 100,000 NIS are flagged `implausible_price` and excluded from statistics | Found while computing advice: D100317 (Rehovot, 4.5 rooms, 132 sqm) for 18,000 NIS was counted in price stats |
| 2026-11-21 | What the purpose changes | live → advise the cities with the largest homes for the budget; invest → advise the cities with the largest past price growth, stated as history | Developer's decision. Before, the switch changed nothing visible, and after the advice-basis rule the invest branch had no facts of its own |
| 2026-11-21 | Storing advice | Own collection `advice`, TTL 24 h; same filters → always from the database | Developer's choice among: always from DB / 2 of 3 from DB / 1 of 3 from DB. A day is short enough for prompt or data changes to show up quickly; the key also includes the prompt version |
| 2026-11-21 | Model | One per task: parse on Sonnet 5.5, explain/advice on Haiku 5.5 | Opus with advice cost ≈ $0.02–0.03 per buyer. Measured on the same benchmark: Haiku parse lost a budget, Sonnet parse correct; Haiku advice is acceptable behind the checks. ≈ $0.0023 per buyer (8.4) |
| 2026-11-25 | Vague wishes ("דירה נעימה", "שכונה לא יקרה") | A curated vocabulary table (`concepts`) behind a separate rag service; matched entries go into the parse request first | Developer's request: one definition per wish instead of the model's reading each time. Local embeddings (multilingual-e5-small): no key, no per-request cost; threshold 0.95 on 2–4-word windows, calibrated by a test |
| 2026-11-25 | "Cozy" = up to 60 sqm? | Up to 70 sqm | Only 38 of 514 priced deals are ≤ 60 sqm (about 2 per city); 71 are ≤ 70. "Near the sea OR small" cannot be one filter set, so they are two entries |
| 2026-11-25 | Who applies the vocabulary filters | Code; the model may only mark an entry as not expressed, and its explicit values win | Sonnet applied size entries but asked again about entries that are a list of cities, even when the prompt said to apply them |
| 2026-11-26 | How the vocabulary table grows | Automatically: the parse model reports new vague wishes; a row is enabled when 3 different buyers (salted IP hash) got the same reading | Developer's choice over manual approval (no review step). Price is never learned; phrases are 2–4 words, no numbers; meanings are written by code |
| 2026-11-26 | Re-reading the table every N minutes | Removed: events only (the service writes learned rows itself; the seed calls reload) | Developer did not want a timer; the table changes only through the service or the seed |
| 2026-11-21 | Demo conversion path: standalone mini-site or page inside a platform | Standalone app (business option 1, version A) | Can be advertised on its own; lead capture after the results, no registration needed |
| 2026-11-21 | Client structure | Same as the developer's existing Angular client: NgModules (`standalone: false`), `pages/` + `shared/` (services, models, const, pipes), Angular Material, Angular 21.2. No NgRx | Familiar and explainable; one page does not need a store |
| 2026-11-21 | Serving the client | `client` container with `serve`, `nginx` in front (`/` → client, `/api` → api) | Same pattern as the existing production setup |

## 10. AI work log

Record AI suggestions, our checks, any mistakes found, and the final correction as work happens.

The required mistake example must be real. Hypothetical mistakes discussed during planning must not be presented as actual events.

### Entries

- **2026-11-21 — outdated SDK and incompatible zod version (Claude Code).** The assistant pinned `@anthropic-ai/sdk@^0.70` and `zod@^3`. Unit tests passed, but a manual check of the LLM layer showed that `@anthropic-ai/sdk/helpers/zod` did not exist in 0.70 and, after upgrading the SDK to 1.12, failed with zod v3 (`Cannot read properties of undefined (reading 'def')`). Caught by loading the module and generating the output schema before any real API call. Fixed by upgrading to SDK 1.12 and zod 4. Lesson: tests that do not touch an integration do not prove it works; check the integration point directly.
- **2026-11-21 — misleading trends from the first facts implementation (Claude Code).** The first version of `facts.service.js` compared each city's first and last year with at least 5 deals. Unit tests passed, but running it on the real data showed 17 "trends" over different periods per city, including Jerusalem −45%. Caught by printing all city facts after the seed and breaking Jerusalem down by period and property type. Fixed with fixed shared periods, a minimum of 10 deals per period, and a property type mix check. Lesson: a statistically "valid" rule can still produce claims the data does not support; check outputs on real data, not only on test fixtures.
- **2026-11-21 — "דירה" read as a property type (model output, caught by the developer's benchmark).** Opus, Sonnet and Haiku all turned "דירת 4 חדרים" into `propertyTypes: ["דירה"]`, which silently excluded duplexes, garden and roof apartments. Caught by printing the parsed filters in a 3-model benchmark. Fixed in the prompt: in everyday Hebrew "דירה" means any apartment; also "4 חדרים" = at least 4. The model now lists both as assumptions.
- **2026-11-21 — grounding check rejected an honest answer (Claude Code).** The first rule rejected any explanation that referenced a "not enough data" trend fact — including a correct sentence saying there is not enough data in Be'er Sheva. Caught from the API log. Fixed: referencing such a fact is allowed; instead, every percentage in the text must match a published change, so a trend still cannot be invented.
- **2026-11-21 — cache cleared in the wrong collection (Claude Code).** While testing, the assistant repeatedly cleared `llm_cache`, but mongoose pluralizes model names, so the real collection is `llm_caches`. Old long explanations kept coming from the cache and the new prompt looked ignored. Caught because responses took ~10 ms and no `llm call` log lines appeared. Lesson: verify a cache miss by the logs, not by assumption.
- **2026-11-21 — explain call sent ~8,700 input tokens (Claude Code).** After city trends moved to "all deals", every explanation request included all 18 cities' facts. Caught from the per-call usage logs. Fixed by trimming the facts sent to the model (~890 tokens).
- **2026-11-21 — chat questions implied homes for sale (Claude Code, caught by the developer).** The assistant wrote the question bank as a listings site would ("הדירה בשבילכם למגורים או להשקעה?", "מחפשים דירה או בית פרטי?"). Tests and screenshots passed, but the developer, reading the chat as a buyer, saw that it promises homes to buy while the data has only closed deals. Fixed: a line on the welcome screen about the data, questions about what to compare with, and a hint under each question; the LLM prompt forbids promising listings. Lesson: checks prove the flow works, not that the wording is true to the data; read the UI as the user would.

- **2026-11-21 — the advice made each request cost ~$0.02–0.03 (Claude Code, flagged by the developer).** The assistant added three recommendations with numbers in every reason on Opus 5.5 and reported the higher output only as "to re-measure". The developer said it was too expensive. Breaking down the logged usage showed four causes (model choice, numbers repeated in output, full filter object returned by parse, verbose facts). Fixed and re-measured: ≈ $0.0023 per buyer. Lesson: when a feature changes the token profile, measure the cost before calling it done.
- **2026-11-21 — Sonnet 5.5 returned mojibake Hebrew that passed the grounding check (model output, caught in the benchmark).** One explain answer came back as "ื‘ืขืกืงืื•ืช…" (UTF-8 read as a Thai code page) with 864 output tokens. Its numbers were correct, so the number check passed. Fixed: text shown to the buyer must be mostly Hebrew letters (`looksLikeHebrew`), with a test using the real output.
- **2026-11-21 — number-free reasons let an unsupported claim through (Haiku 5.5, caught in the browser check).** After reasons stopped repeating numbers, Haiku recommended "check a nearby cheaper city" based only on Netanya's own trend. Nothing in the facts supported it, and there was no number to catch. Fixed in code: a recommendation must reference an advice fact (offer check, budget fit, nearby city), otherwise it is dropped. Lesson: removing numbers from text also removes what the check can see. Add a structural check in its place.
- **2026-11-21 — a benchmark sentence was added to the prompt as an example (Claude Code).** To fix Haiku missing a budget, the assistant added an example to the parse prompt that was the same sentence as a benchmark case, which would have made the benchmark meaningless. Noticed before the run. The benchmark sentence was replaced with three new ones, and Haiku still missed one budget out of four.

- **2026-11-21 — results page ~10,000px wide (Claude Code, noticed by the developer).** The lead form's honeypot field was hidden with the common `left: -9999px` trick. In an RTL page, content that sticks out on the left side becomes scrollable, so the results area got a page-wide horizontal scroll (scroll width 11,279px on a 1,280px screen). The screenshots did not show it. Found with a script that lists elements outside the viewport. Fixed by hiding the field in place (`clip-path`, 1px). Lesson: "off-screen" tricks from LTR layouts are not neutral in RTL. Check the scroll width, not only screenshots.

- **2026-11-25 — the model ignored retrieved vocabulary (Sonnet 5.5, caught in the end-to-end check).** The parse prompt said to apply the matched entries. Sonnet applied "דירה ראשונה לזוג" (rooms), but for "שכונה לא יקרה" it asked its own question ("לא יקרה בהשוואה למה?") listing the very cities of the entry. After the prompt conflict ("ask about vague wishes") was removed, it still dropped "שקט וירוק". Pattern: entries that are a list of cities. Fixed by moving the decision to code: code applies every matched entry, the model only lists the ones the message does not express. Lesson: when the model must follow a table, let code apply the table and ask the model only for the judgement.
- **2026-11-25 — first call with a new output schema timed out (Claude API).** After adding a field to the parse schema, three calls in a row failed at the 8 s limit, and the app fell back to the form. A timing script with a 60 s limit showed the first call took 26 s and the next ones 2–3 s: the structured-output grammar is compiled once per schema. Lesson: after a schema change, send one warm-up call before traffic (on deploy).

- **2026-11-26 — a second filters object broke the schema limit (Claude API).** To learn new wishes, the assistant added `newWishes: [{phrase, filters}]` with the full partial filter schema. Every parse call failed in 300 ms and fell back to the form. The error was hidden: the log only said `api_error`. After logging the message: "Schemas contains too many optional parameters (30) … (limit: 24)". Fixed by returning only the field names (`fields: ["roomsMax"]`) and taking the values from `changes`, which also avoids repeating them in the output. Also fixed: failed calls now log the status and the error text.
- **2026-11-26 — a learned row could never match (Claude Code, caught in the end-to-end check).** The model gave the phrase "לסטודנטים" (one word). The row was enabled after 3 buyers, but the next message did not use it: the search compares 2–4-word windows, and "דירה לסטודנטים" scored 0.943 against "לסטודנטים". Fixed: learned phrases must be 2–4 words, as written by the buyer.

## 11. General conclusions

- The main challenge is interpreting data correctly and communicating its limits, rather than handling its volume.
- Usefulness means helping the buyer make the next decision, not only listing deals. The purpose (live / invest) changes which questions and comparisons matter.
- The LLM earns its place by turning vague wishes into confirmed criteria and by explaining results, while code owns every number. This line is the core of the architecture discussion.
- Every statement shown to the user must be traceable to computed facts and specific deals. If it cannot be traced, it is not shown.
- The form makes the model optional: slow, wrong, or unavailable model output degrades the experience but never breaks the core search.
- Static data makes precomputation and caching very effective; most requests should not need a fresh model call.
- Past price changes may be shown; investment advice and forecasts may not.
- Technical cleaning cannot resolve the meaning of prices, area definitions, or conflicting versions.
- Unknown values and contradictions should remain visible.
- We can describe records in the supplied file; market-wide conclusions require additional evidence.
- One complete, verifiable workflow with a useful LLM role is preferable to a broad feature set.
