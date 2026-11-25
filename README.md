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

There is one filter contract for the whole app: city, neighborhood, property type, rooms, area, price, must-haves (parking, elevator, safe room, balcony), purpose, and an optional **offered price**. It is filled in five ways:

| Source | How | LLM? |
|---|---|---|
| **Quick-reply buttons** in the chat | Each option in the question bank ([api/src/utils/questionBank.js](api/src/utils/questionBank.js)) states exactly which filters it sets. City buttons come from the data: the 3 cities with the most matching deals. | No |
| **Example requests** on the welcome screen | 15 presets with fixed filters ([api/src/utils/examples.js](api/src/utils/examples.js)), each checked against the data | No |
| **The filter form** | The buyer picks values from lists built from the data | No |
| **Free text** ("4 חדרים בחולון עם חניה עד 3 מיליון") | The model returns only the fields the message sets or changes. If the message is unclear in a way the bank does not cover, it may ask its own clarifying question. | Yes |
| **Buyer vocabulary** ("דירה נעימה", "שכונה לא יקרה", "להשקעה") | Checked first, before the model: the rag service finds which rows of the vocabulary table the message expresses ([Buyer vocabulary](#buyer-vocabulary-the-table-and-the-rag-service)). | No (local embeddings) |

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

## Buyer vocabulary: the table and the rag service

Buyers write wishes, not filters: "דירה נעימה ליד הים", "שכונה לא יקרה", "דירה לסטודנטים". Left to the model, the same words got a different reading each time: four different explanations for "דירה לסטודנטים" in four messages, and once an extra `sizeMax: 75`. The vocabulary gives every such wish **one definition**, kept in a table, applied by code and shown to the buyer.

Two parts:
- **The table**: the `concepts` collection in MongoDB. It holds what each wish means.
- **The rag service**: a separate container. It finds which rows of the table a message expresses, and it adds new rows learned from buyers' messages.

### The table: `concepts` in MongoDB

One collection; the vectors are stored in the same documents, there is no separate vector store.

```
{ conceptId:  "cozy",
  title:      "דירה נעימה",
  examples:   ["דירה נעימה", "דירה קטנה ונעימה", "משהו קטן וחמים", ...],
  meaning:    "פירשנו "דירה נעימה" כדירה עד 70 מ״ר",
  filters:    { sizeMax: 70 },
  basis:      "curated",
  source:     "seed",
  enabled:    true,
  embeddings: [[…384 numbers], …],
  examplesHash, embeddingModel }
```

| Field | What it is | Written by |
|---|---|---|
| `examples` | How buyers phrase the wish. A message matches a row by its closest example | us (seed) or learned from messages |
| `filters` | What the wish means, as a part of the filter contract. Validated by the api like any input | us, or the reading 3 buyers agreed on |
| `meaning` | Shown to the buyer as an assumption | us, or code from the filters (never the model) |
| `basis` | `data`: computed from the deals; `curated`: our interpretation; `learned`: from buyers' messages | |
| `source` | `seed`: from [rag/data/concepts.js](rag/data/concepts.js); `llm`: learned | |
| `enabled` | Only enabled rows are used for search | seed: true; learned: true after 3 matching readings |
| `interpretations`, `hits` | Learned rows only: each reading the model gave and which buyers (hashed) got it | rag service |
| `embeddings`, `examplesHash` | One vector per example, and the examples they were computed from | rag service |

**Where rows come from**

1. **Our rows.** There are 13 of them, written in [rag/data/concepts.js](rag/data/concepts.js) and loaded with `npm run seed`.

   | Wish | Filters | Basis |
   |---|---|---|
   | דירה נעימה | up to 70 sqm (≤ 60 had only 38 deals in 18 cities) | curated |
   | ליד הים | the coastal cities in the data | curated |
   | אזור לא יקר | the 5 cities with the lowest median price per sqm | data |
   | להשקעה | purpose = invest | curated |
   | משפחה עם ילדים | 4+ rooms, to live in | curated |
   | … | 8 more: first home for a couple, spacious, luxury, garden, near Tel Aviv, accessible, safe room, quiet and green | |

2. **Learned rows.** These are added by the rag service from buyers' messages (see below). The seed never touches them.

### The rag service

A Node.js container with a local multilingual embedding model (`multilingual-e5-small`, about 130 MB, baked into the image). It runs on CPU, needs no API key and costs no tokens. It is reachable only from the api, on the internal Docker network.

| Endpoint | Called by | What it does |
|---|---|---|
| `POST /concepts/search {text}` | api, on every free-text message | Returns the enabled rows the message expresses (up to 3) |
| `POST /concepts/learn {voter, wishes}` | api, after a model call that met new wishes | Adds votes and candidates; enables a row after 3 matching readings |
| `POST /concepts/reload` | the seed, or by hand | Re-reads the table now |
| `GET /health` | docker healthcheck | Number of rows and candidates, table version |

The service keeps the table with its vectors in memory. A search compares a few hundred short vectors in about 100 ms, so the table needs no vector database.

### Using the table on a message

1. **Retrieve.** The service cuts the message into 2–4-word windows: "רוצה לגור קרוב לים עד 3 מיליון" contains "קרוב לים". It embeds them and compares them with every example. A row matches above 0.95 cosine.
   - Whole messages are not compared: the other parts pull them toward unrelated rows. Single words ("דירה", "עם") are left out too: they scored up to 0.95 against everything.
   - On the calibration sentences, real matches scored 0.955–0.998 and the strongest false one 0.944 ([rag/test/calibration.test.js](rag/test/calibration.test.js)).
2. **The model decides.** The matched rows go into the parse request. The model only says which ones the message does *not* express (an accidental or negated match: "לא חייב ליד הים") and sets explicit values.
3. **Code applies.** The row filters are added after the model's changes. An explicit value wins: "ליד הים בנתניה" → Netanya only. Code applies them, not the model, because Sonnet kept asking about rows that are a list of cities even when told to apply them.
4. **The buyer sees it.** Each applied row's meaning is shown as an assumption, and the form shows the resulting filters.

### When the table grows: learning new wishes

1. **The model reports a new wish.** A message has a vague wish that no row covers, and the model turned it into filters. In the same call it reports the phrase and the names of the fields, for example `{phrase: "דירה לסטודנטים", fields: ["roomsMax"]}`. There is no extra call and only a few output tokens.
2. **The api cleans it.** It takes the values from the model's changes and keeps only fields a word may define. Price is never learned, because a budget is personal. The phrase must be 2–4 words without numbers, because the search only compares 2–4-word windows. The api sends the wish to rag as a vote from a salted hash of the buyer's IP, so no IP is stored. This is fire and forget: the buyer never waits for it.
3. **rag compares the phrase with every row**, enabled or not:
   - close to an enabled row (≥ 0.95): nothing to learn;
   - close to a candidate: one more vote for this reading, and the phrase is added to its examples;
   - new: a new candidate, disabled.
4. **A candidate is enabled when 3 different buyers got exactly the same reading** (`RAG_MIN_VOTES`). One buyer cannot enable a row alone, and a reading the model gives inconsistently never becomes a definition. The meaning is written by code from the filters: "פירשנו "דירה לסטודנטים" כ: עד 3 חדרים".

**Measured.** Before the row existed, each of four messages got a different explanation, and one got an extra `sizeMax: 75`. After the third buyer, the next messages got the same filter and the same wording.

### What the service does when the table changes

No timer: the table changes only through the service itself or the seed, so each change comes with its own trigger.

| Change | Trigger | What the service does |
|---|---|---|
| Service starts | startup | Loads the model, reads the table, embeds rows whose examples changed, starts listening |
| Our rows edited in `concepts.js` | `npm run seed` → the seed calls `/concepts/reload` | Re-reads the table, embeds only the changed rows (`examplesHash`), replaces its copy |
| A vote, a new candidate, a row enabled | `/concepts/learn` | Writes the row with its vector, refreshes its copy at once |
| A hand edit in MongoDB (for example `enabled: false`) | call `/concepts/reload`, or restart | Same as a seed reload |

Every refresh changes the **table version**. The api puts it, with the matched row ids, in the parse cache key, so a changed table never serves an old parse. `RAG_RELOAD_INTERVAL_MS` can turn on a periodic re-read as well; it is off by default.

### Failures and limits

- **rag down or slow (1.5 s limit):** the message is parsed without the table, as before. A failed vote is one vote less.
- **Synonyms are not merged:** "קרוב לפארק" and "ליד פארק" become two candidates and collect votes separately. Synonyms scored 0.903, while different wishes ("דירה לסטודנטים" / "דירה למשפחה") scored 0.919, so no threshold separates them safely.
- **Votes are counted by IP:** people behind one router count as one, and someone who changes IP three times could enable a row. A bad row is disabled by hand: `enabled: false`, then `/concepts/reload`.
- **The "data" rows are computed once:** "אזור לא יקר" lists the 5 cheapest cities in the current deals. After a new deals seed, recompute it in `concepts.js` and run the rag seed.
- **The first call after a schema change is slow:** the Claude API compiles the output schema once (about 25 s), and that call falls back to the form. Send one warm-up message after a deploy.
- **Cost:** no tokens for search or learning. About 100 ms per message, about 500 MB of RAM for the service, and a 940 MB image.

**Operating it**

```bash
docker compose run --rm rag npm run seed      # load or update our rows; reloads the service
docker compose exec mongo mongosh madlan --eval 'db.concepts.find({source: "llm"}, {title: 1, enabled: 1, filters: 1, hits: 1})'
docker compose exec api node -e "fetch('http://rag:4000/concepts/reload', {method: 'POST'}).then(r => r.json()).then(console.log)"
```

Settings: `RAG_MIN_VOTES` (3), `RAG_MIN_SCORE` (0.95) and `RAG_MAX_RESULTS` (3) in the rag service; `RAG_URL`, `RAG_TIMEOUT_MS` and `VOTER_SALT` (set your own) in `api/.env`.

---

## When tokens are spent, and when not

| Interaction | Model call? | Typical cost |
|---|---|---|
| Click on a quick reply in the chat | **No.** Applied by code from the question bank. | $0 |
| Click on an example request | **No.** A preset with fixed filters. | $0 |
| Search from the filter form | **No.** | $0 |
| Free-text message seen before (same text and state) | **No.** Parse cache, 7 days. | $0 |
| Free-text message, new | **Yes:** parse, Sonnet 5.5 | ≈ $0.0015–0.002 |
| Buyer vocabulary: search and learning (rag service) | **No.** Local embeddings in the container. New wishes add a few output tokens to the same parse call. | $0 |
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
docker compose run --rm rag npm run seed   # load the buyer vocabulary (rag/data/concepts.js)
```

Then open http://localhost.

- Concepts table: `docker compose run --rm rag npm run seed` (once; it never touches learned rows). At the end the seed calls the service's `/concepts/reload`, so changes are live at once. Learned rows: `db.concepts.find({source: 'llm'})`, disable one with `enabled: false` and call `/concepts/reload`. Set `VOTER_SALT` in `api/.env`.
- Tests: `cd api && npm test` (55 tests: filters, data cleaning, question bank and examples, advice, grounding, rag client, concepts) and `cd rag && npm test` (retrieval, the table, calibration on the real model).
- Models: `LLM_PARSE_MODEL`, `LLM_EXPLAIN_MODEL`, or `LLM_MODEL` to set both.
- Advice lifetime: `ADVICE_TTL_SECONDS`, default 86400.

## Services

Everything runs from one [docker-compose.yml](docker-compose.yml) on a private Docker network. Only nginx is exposed.

```
browser ──► nginx :80 ──┬── /      ──► client   (Angular app, static files)
                        └── /api/* ──► api      (Node.js / Express)
                                        ├──► mongo (MongoDB 7)
                                        ├──► rag   (buyer vocabulary, local embeddings) ──► mongo
                                        └──► Claude API (Anthropic, external)
seed (one-off) ──► reads api/data/deals_raw.csv ──► mongo
```

| Service | What it is | Role |
|---|---|---|
| **nginx** | `nginx:1.27-alpine`, port 80 | Single entry point: `/` → client, `/api` → api. Request size limit, proxy timeout. HTTPS is added on the server. |
| **client** | Angular 21 build served by `serve` | The UI: chat, results, filter form, token counter. Hebrew, RTL, mobile and desktop. |
| **api** | Node.js 22 / Express | All logic: search, statistics and trends, advice comparisons, LLM calls, grounding checks, caches, leads. Rate limit per IP. |
| **rag** | Node.js 22 / Express, `@huggingface/transformers` | Buyer vocabulary retrieval: which concepts a message expresses; learns new ones from buyers' messages (3 matching readings). Local embedding model baked into the image (~130 MB), vectors kept in Mongo, searched in memory. Internal only, called by api. |
| **mongo** | MongoDB 7, volume `mongo_data` | Collections: `deals` (cleaned data with original rows), `concepts` (buyer vocabulary with embeddings), `advice` (stored advice, 24 h), `llm_caches` (parse cache, 7 days), `learned_questions` (questions the model asked itself, for review), `leads`. TTL indexes remove expired cache entries. |
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
rag/
  data/concepts.js               the buyer vocabulary (seed for the `concepts` collection)
  src/services/                  embedding (local model), retrieval (windows, ranking), index (table in memory)
  test/                          retrieval, the table, calibration on the real model
```
