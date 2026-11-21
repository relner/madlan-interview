// Example requests shown under the input on the welcome screen (5 random ones on each page load).
// Their text is fixed, so their filters are fixed too: a click is applied by code, like a quick reply —
// no LLM call, no tokens. The client gets the list from GET /api/assistant/examples, so text and
// filters cannot drift apart. Filters follow the same rules the parse prompt gives the model
// ("דירה" in a sentence = any apartment, "4 חדרים" = at least 4, a price someone asked = offerPrice).
// Each example was checked against the data on 2026-11-21: 6–89 matching deals, except the deliberately
// tight Tel Aviv one (2). Re-check after a new dataset.
const EXAMPLES = [
    { id: 'budget-2m', text: 'יש לי 2 מיליון, מחפש דירה', filters: { priceMax: 2000000 } },
    { id: 'holon-4-parking', text: '4 חדרים בחולון עם חניה', filters: { cities: ['חולון'], roomsMin: 4, requireParking: true } },
    { id: 'netanya-offer', text: 'הציעו לי 4 חדרים בנתניה ב־2.9 מיליון', filters: { cities: ['נתניה'], roomsMin: 4, offerPrice: 2900000 } },
    { id: 'invest-2-5m', text: 'דירה להשקעה עד 2.5 מיליון', filters: { purpose: 'invest', priceMax: 2500000 } },
    { id: 'house-family', text: 'בית פרטי למשפחה, לא משנה איפה', filters: { purpose: 'live', propertyTypes: ['בית פרטי'] }, skipped: ['city'] },
    { id: 'ramat-gan-3-elevator', text: '3 חדרים ברמת גן עם מעלית', filters: { cities: ['רמת גן'], roomsMin: 3, requireElevator: true } },
    { id: 'haifa-safe-room', text: 'דירה עם ממ״ד בחיפה', filters: { cities: ['חיפה'], requireSafeRoom: true } },
    { id: 'beer-sheva-5', text: 'מחפש 5 חדרים בבאר שבע', filters: { cities: ['באר שבע'], roomsMin: 5 } },
    { id: 'kfar-saba-garden', text: 'דירת גן או פנטהאוז בכפר סבא', filters: { cities: ['כפר סבא'], propertyTypes: ['דירת גן', 'פנטהאוז'] } },
    { id: 'petah-tikva-offer', text: 'ביקשו 3.5 מיליון על 4 חדרים בפתח תקווה, זה סביר?', filters: { cities: ['פתח תקווה'], roomsMin: 4, offerPrice: 3500000 } },
    { id: 'ashdod-offer', text: 'הציעו לי 3 חדרים באשדוד ב־1.9 מיליון', filters: { cities: ['אשדוד'], roomsMin: 3, offerPrice: 1900000 } },
    // Deliberately tight: few deals fit, so the advice shows nearby cities where the budget goes further
    { id: 'tel-aviv-4m', text: 'דירה בתל אביב עד 4 מיליון', filters: { cities: ['תל אביב-יפו'], priceMax: 4000000 } },
    { id: 'jerusalem-invest', text: 'להשקעה בירושלים, 3 חדרים', filters: { purpose: 'invest', cities: ['ירושלים'], roomsMin: 3 } },
    { id: 'rishon-parking-balcony', text: 'דירה עם חניה ומרפסת בראשון לציון', filters: { cities: ['ראשון לציון'], requireParking: true, requireBalcony: true } },
    { id: 'modiin-live-3m', text: 'דירה למגורים במודיעין עד 3 מיליון', filters: { purpose: 'live', cities: ['מודיעין-מכבים-רעות'], priceMax: 3000000 } }
];

module.exports = { EXAMPLES };
