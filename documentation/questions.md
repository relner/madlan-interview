## 1. Same deal, different sources and prices

Can I assume that rows with the same `deal_id` refer to the same transaction, even when the sources differ?

I found four deals where the same ID appears with different prices from different sources: `רשות המסים`, `מתווך`, or `בעל נכס`. For example, deal `D100124` has a price of ₪5,727,000 from `רשות המסים` and ₪5,429,440 from `מתווך`.

Are all prices in the file final sale prices, or could some be asking prices? When they disagree, is there a source I should trust, or should I keep both versions and flag the difference?

**Why I’m asking:** I want to avoid counting the same deal twice or choosing a price without a clear reason. That choice affects both deal comparisons and the calculations shown to users.

## 2. Area and price per square metre

What does `size_sqm` include? For example, does it include balconies or other additional spaces? Is the definition the same across all sources?

In some rows, `price_per_sqm` does not match `price_nis / size_sqm`. For example, deal `D100178` has a price of ₪3,586,000 and an area of 65 sqm. This gives about ₪55,169 per sqm, but the file lists ₪68,592 per sqm.

Should I calculate the price per sqm from the price and area in the row, or is the existing value based on a different definition of area?

**Why I’m asking:** I can detect the difference in code, but the file alone does not tell me whether the price, area, or price per sqm is wrong, or whether a different calculation was used. This affects how properties can be compared.

## 3. Property condition and construction year

Some properties are marked as `חדש מקבלן`, but have an old construction year. For example, deal `D100432` has `year_built = 1950`.

Could the year refer to the original building, while the condition describes a new apartment following redevelopment or rebuilding? Or should I flag this combination as a data inconsistency?

**Why I’m asking:** I don’t want to change or exclude a record that has a valid explanation. At the same time, using both fields without understanding them could affect property filters and the selection of similar deals.
