# Comparable Deals Assistant

A Hebrew (RTL) web app that helps a home buyer in Israel find out **what similar homes actually sold for**, and gives short, fact-based advice: where their budget goes further, whether a price they were offered is in line with similar deals, and what to look at for their purpose (to live in or to invest).

Built for the Madlan Tech Challenge on the supplied CSV of past property deals. Detailed reasoning, measurements and the AI work log are in [documentation/WORK_PLAN.md](documentation/WORK_PLAN.md).

> The data is **past, closed deals (2021–2026)**, not homes for sale. The app never shows listings and never promises any. It shows what similar homes sold for.

---

## What it does

1. **The buyer describes what they want.** They can type in Hebrew, click one of 5 example requests (a random set from 15 on every page load), or open the filter form.
2. **A short clarifying chat follows.** The assistant asks one question at a time: purpose, apartment or house, city, rooms, budget. Each question has quick-reply buttons. It skips what the buyer already said, asks at most 4 questions, and the buyer can jump to results at any time ("להציג עסקאות עכשיו").
3. **Results.** The results page shows, from top to bottom:
   - **"מה אנחנו ממליצים"**: 1–3 recommendations. Each has a headline, a one-line reason, and below it the exact facts it is based on.
   - **Key numbers** for the matching deals: count, median price, and median price per sqm, each with its number of deals.
   - **A city trend table:** median price per sqm in 2021–2023 vs 2024–2026, for cities with enough deals for a fair comparison.
   - **The matching deals**, each with its original CSV row.
   - **Lead capture:** "save this search" by email or WhatsApp. In the demo, nothing is sent.
4. **"↺ חיפוש חדש"** goes back to the start. A floating **token counter** (bottom right) shows what every interaction cost.

---

## Why it is built this way

| Principle | What it means in the app |
|---|---|
| **Code owns every number** | Statistics, comparisons and trends are computed by code from the data. The LLM never calculates. It reads text into filters and chooses and phrases advice from facts it is given. |
| **Every claim shows its facts** | Each recommendation lists the facts behind it, and every number shows how many deals it is based on. The server rejects advice that uses a number not in the facts. |
| **The model is optional** | The filter form does the same search without the LLM. If the model is slow, wrong or unavailable, the buyer still gets results, and the form opens by itself. |
| **Tokens only where language is needed** | Clicks, examples, repeats and stored advice cost nothing. The model is called only for free text and for new advice. |
| **Honest about the data** | Too few deals → "not enough data", never a trend. Past price changes are history, not a forecast. There is no rent data, so there are no yield claims. |

---

## Data: what was cleaned, and what is kept visible

The CSV is cleaned once by a seed script ([api/scripts/seed.js](api/scripts/seed.js), rules in [api/src/utils/dealNormalize.js](api/src/utils/dealNormalize.js)) and loaded into MongoDB. It turns 530 raw rows into 524 deals, and 514 of them are used in price statistics.

- **Normalized:**
  - city spellings, e.g. `ת"א`, `Tel Aviv-Yafo`, `תל אביב` → `תל אביב-יפו` (18 cities);
  - neighborhood aliases;
  - prices like `₪2,500,000`;
  - dates in four formats;
  - room counts such as `4 חדרים`;
  - yes/no fields in Hebrew and English.
- **Kept but excluded from price statistics:** conflicting prices for the same deal id, a zero price, and an implausible price (18,000 NIS for 132 sqm).
- **Flagged, not "fixed":**
  - price-per-sqm mismatches;
  - month-only dates;
  - missing area;
  - unknown parking;
  - "new from developer" in old buildings (86 cases). Because of these, condition is not offered as a filter.
- Every deal keeps its **original row**, which the buyer can open.

---

## How filters are set

There is one filter contract for the whole app: city, neighborhood, property type, rooms, area, price, must-haves (parking, elevator, safe room, balcony), purpose, and an optional **offered price**. It is filled in four ways:

| Source | How | LLM? |
|---|---|---|
| **Quick-reply buttons** in the chat | Each option in the question bank ([api/src/utils/questionBank.js](api/src/utils/questionBank.js)) states exactly which filters it sets. City buttons come from the data: the 3 cities with the most matching deals. | No |
| **Example requests** on the welcome screen | 15 presets with fixed filters ([api/src/utils/examples.js](api/src/utils/examples.js)), each checked against the data | No |
| **The filter form** | The buyer picks values from lists built from the data | No |
| **Free text** ("4 חדרים בחולון עם חניה עד 3 מיליון") | The model returns only the fields the message sets or changes. If the message is unclear in a way the bank does not cover, it may ask its own clarifying question. | Yes |

Whatever the source, the server checks the filters before searching:
- Cities, neighborhoods and types must exist in the data.
- Numeric ranges must be sane.
- A must-have only matches deals where the feature is known to exist.
- Anything that fails is dropped, and the buyer is told what was not recognized.

---

## How advice is made

**1. Code computes candidate comparisons** ([api/src/services/advice.service.js](api/src/services/advice.service.js)). Each one is a fact with an id, a value, the number of deals and the deal ids.

| Comparison | When | Example |
|---|---|---|
| **By purpose: live** | purpose = live, budget given | Cities where this budget and criteria bought the largest homes: Be'er Sheva, 112 sqm median, 18 deals |
| **By purpose: invest** | purpose = invest | Cities with the largest published past growth in price per sqm: Rishon LeZion +19.6% (10 → 19 deals). History, not a forecast |
| **Budget fit** | budget given | In the buyer's city: the median price for such homes and how many closed within the budget. Elsewhere: where the budget bought the most such homes |
| **Nearby cheaper** | one city chosen | Nearby cities with a lower price per sqm: Holon 51% lower than Tel Aviv, about 2.1× the area for the same money |
| **Offer check** | the buyer was offered a price | Similar closed deals (same city and type, rooms ±0.5, area ±15%) that closed below it: "1 of 14", plus the median |

Trends use fixed periods for every city (2021–2023 vs 2024–2026). A trend is published only with at least 10 deals in each period and a comparable mix of property types. Otherwise the app shows "not enough data".

**2. The LLM chooses and phrases.** It picks the comparisons that matter for this buyer and writes 1–3 recommendations. If a purpose is set, that advice comes first and says why: "כי אתם מחפשים להשקעה, …" or "כי אתם מחפשים דירה למגורים, …". The reason line contains no numbers: the facts are printed under it by code.

**3. The server checks every part before it is shown** ([api/src/services/grounding.service.js](api/src/services/grounding.service.js)):
- every number must appear in the facts it cites, and percentages must match a published change;
- the cited fact ids must exist;
- each recommendation must rest on one of the comparisons above, not on general statistics;
- the text must be Hebrew. This rule was added after one model returned garbled encoding with correct numbers.

A recommendation that fails is dropped and logged. If nothing passes, the panel shows the comparisons as plain lines written by code ("מה רואים בעסקאות"). The same happens when the model is unavailable.

---

## When tokens are spent, and when not

| Interaction | Model call? | Typical cost |
|---|---|---|
| Click on a quick reply in the chat | **No.** Applied by code from the question bank. | $0 |
| Click on an example request | **No.** A preset with fixed filters. | $0 |
| Search from the filter form | **No.** | $0 |
| Free-text message seen before (same text and state) | **No.** Parse cache, 7 days. | $0 |
| Free-text message, new | **Yes:** parse, Sonnet 5.5 | ≈ $0.002 |
| Advice for filters seen in the last 24 hours | **No.** Stored advice (Mongo collection `advice`, TTL 24 h). | $0 |
| Advice for new filters | **Yes:** explain, Haiku 5.5 | ≈ $0.0003 |
| Model slow or unavailable | Fallback to the form or to plain facts | $0 |

**A typical buyer** who sends one sentence, clicks 3 quick replies and gets advice costs **≈ $0.0023**. A buyer who starts from an example and clicks costs ≈ $0.0003.

| Requests / day | Cache hit rate | Per day |
|---|---|---|
| 10,000 | 0% | ~$23 |
| 10,000 | 50% | ~$12 |
| 10,000 | 80% | ~$5 |

How the cost is kept low:
- **One model per task, chosen by measurement.** Parse uses Sonnet: a missed field costs the buyer an extra question, and Haiku lost a budget in 1 of 4 multi-condition sentences. Explain uses Haiku: it is guarded by the checks above and stored for 24 hours.
- **Prompt caching** for the system prompts. They hold the allowed cities and neighborhoods in a sorted, byte-stable order.
- **Small calls:**
  - the model gets the current filter state, not the chat history;
  - parse returns only the fields that changed;
  - facts are trimmed and compacted before they are sent;
  - reasons do not repeat numbers.
- **Cache keys include a hash of the prompt and the model**, so a prompt change never serves stale answers.

Every API response carries `usage`: model, tokens in, cached and out, latency, and cost. The token counter in the UI shows it per interaction. Prices are configured in [api/src/helpers/configuration.js](api/src/helpers/configuration.js).

Measured history: the first version with advice on Opus 5.5 cost ≈ $0.02–0.03 per buyer (WORK_PLAN.md 8.4).

---

## When the model is slow, wrong or unavailable

- **Slow:**
  - hard timeouts with no retries: parse 8 s and explain 20 s on the server, plus a client limit on top;
  - results are shown before the advice arrives, with placeholders in the advice cards.
- **Wrong:**
  - filters are validated against the data;
  - advice is checked before it is shown, and ungrounded parts are dropped;
  - every number on screen comes from code.
- **Unavailable:** the form opens with whatever was understood, and the search works as usual. A banner says the assistant is unavailable.

---

## Running it

Requirements: Docker, and an Anthropic API key.

```bash
cp api/.env.example api/.env               # set ANTHROPIC_API_KEY
docker compose up -d --build               # nginx :80 → client + api, mongo
docker compose --profile tools run --rm seed   # load and clean the CSV (api/data/deals_raw.csv)
docker compose restart api                 # reload the form options after a seed
```

Then open http://localhost.

- Tests: `cd api && npm test` (47 tests: filters, data cleaning, question bank and examples, advice, grounding).
- Models: `LLM_PARSE_MODEL`, `LLM_EXPLAIN_MODEL`, or `LLM_MODEL` to set both.
- Advice lifetime: `ADVICE_TTL_SECONDS`, default 86400.

## Services

Everything runs from one [docker-compose.yml](docker-compose.yml) on a private Docker network. Only nginx is exposed.

```
browser ──► nginx :80 ──┬── /      ──► client   (Angular app, static files)
                        └── /api/* ──► api      (Node.js / Express) ──► mongo (MongoDB 7)
                                                     │
                                                     └──► Claude API (Anthropic, external)
seed (one-off) ──► reads api/data/deals_raw.csv ──► mongo
```

| Service | What it is | Role |
|---|---|---|
| **nginx** | `nginx:1.27-alpine`, port 80 | Single entry point: `/` → client, `/api` → api. Request size limit, proxy timeout. HTTPS is added on the server. |
| **client** | Angular 21 build served by `serve` | The UI: chat, results, filter form, token counter. Hebrew, RTL, mobile and desktop. |
| **api** | Node.js 22 / Express | All logic: search, statistics and trends, advice comparisons, LLM calls, grounding checks, caches, leads. Rate limit per IP. |
| **mongo** | MongoDB 7, volume `mongo_data` | Collections: `deals` (cleaned data with original rows), `advice` (stored advice, 24 h), `llm_caches` (parse cache, 7 days), `learned_questions` (questions the model asked itself, for review), `leads`. TTL indexes remove expired cache entries. |
| **seed** | Same image as api, profile `tools` | One-off job: cleans the CSV, loads `deals`, writes `api/data/seed_report.json`. Not running in normal operation. |
| **Claude API** | External (Anthropic) | Two kinds of calls only: **parse** (free text → filters, Sonnet 5.5) and **explain** (facts → advice, Haiku 5.5). The key lives in `api/.env` (gitignored). |

## Stack and structure

Angular 21 (Material, signals, RTL) · Node.js / Express · MongoDB · Claude API (structured outputs) · nginx · docker-compose.

```
api/
  scripts/seed.js                CSV → cleaned deals + seed report
  src/controllers/               search, assistant (parse / explain / examples), deal, lead
  src/services/                  search, facts, advice, grounding, llm, conversation, cache, advice-store
  src/utils/                     questionBank, examples, nearbyCities, dealNormalize
  src/models/                    Deal, Advice, LlmCache, LearnedQuestion, Lead
  test/
client/src/app/pages/assistant/  chat, results (advice panel, facts, deals), filter form, token counter
documentation/                   WORK_PLAN.md (decisions, measurements, AI work log), brief, designs
```
