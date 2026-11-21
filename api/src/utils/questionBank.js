// Curated clarifying questions (WORK_PLAN.md 7).
// Each option says exactly which filters it sets, so a quick-reply click is applied by code —
// no LLM call, no tokens, no latency. The LLM is used only for free-text messages.
//
// Order matters: the next question is the first one whose slot is still empty and not skipped.
//
// The data is past, closed deals — not homes for sale. The client says so once before the first question,
// and every hint explains what the answer changes in that comparison (never promises listings).

const HOUSE = 'בית פרטי';

const QUESTIONS = [
    {
        id: 'purpose',
        text: 'בשביל מה הנכס — למגורים או להשקעה?',
        hint: 'בשני המקרים נראה כמה שילמו בפועל. להשקעה נוסיף גם איך המחיר למ״ר השתנה בין 2021–2023 לבין 2024–2026.',
        // Checking a price that was offered does not depend on the purpose
        isFilled: (f) => f.purpose !== null || f.offerPrice !== null,
        options: [
            { id: 'live', label: 'למגורים', patch: () => ({ purpose: 'live' }) },
            { id: 'invest', label: 'להשקעה', patch: () => ({ purpose: 'invest' }) }
        ]
    },
    {
        id: 'kind',
        text: 'להשוות לדירות או לבתים פרטיים?',
        hint: 'מחירי בתים ודירות שונים מאוד, ולכן נשווה רק לעסקאות מאותו סוג.',
        isFilled: (f) => f.propertyTypes.length > 0,
        options: [
            { id: 'apartment', label: 'דירה', patch: (ctx) => ({ propertyTypes: ctx.allowed.propertyTypes.filter((t) => t !== HOUSE) }) },
            { id: 'house', label: 'בית פרטי', patch: () => ({ propertyTypes: [HOUSE] }) },
            { id: 'any', label: 'לא משנה', patch: () => ({}) }
        ]
    },
    {
        id: 'city',
        text: 'באיזו עיר לבדוק עסקאות?',
        hint: 'הכפתורים הם הערים עם הכי הרבה עסקאות סגורות שמתאימות למה שבחרתם.',
        isFilled: (f) => f.cities.length > 0,
        // Options are built from the data: the cities with the most deals for the current filters
        dynamicOptions: 'cities',
        options: [
            { id: 'any', label: 'לא משנה', patch: () => ({}) }
        ]
    },
    {
        id: 'rooms',
        text: 'כמה חדרים לפחות?',
        hint: 'נשווה רק לעסקאות של נכסים בגודל דומה.',
        isFilled: (f) => f.roomsMin !== null || f.roomsMax !== null,
        options: [
            { id: '2', label: '2', patch: () => ({ roomsMin: 2 }) },
            { id: '3', label: '3', patch: () => ({ roomsMin: 3 }) },
            { id: '4', label: '4', patch: () => ({ roomsMin: 4 }) },
            { id: '5', label: '5+', patch: () => ({ roomsMin: 5 }) },
            { id: 'any', label: 'לא משנה', patch: () => ({}) }
        ]
    },
    {
        id: 'budget',
        text: 'עד איזה מחיר לבדוק?',
        hint: 'נראה עסקאות שנסגרו עד הסכום הזה, ומה אפשר היה לקנות בו.',
        isFilled: (f) => f.priceMax !== null || f.offerPrice !== null,
        options: [
            { id: '1500000', label: 'עד 1.5 מיליון', patch: () => ({ priceMax: 1500000 }) },
            { id: '2000000', label: 'עד 2 מיליון', patch: () => ({ priceMax: 2000000 }) },
            { id: '3000000', label: 'עד 3 מיליון', patch: () => ({ priceMax: 3000000 }) },
            { id: '4000000', label: 'עד 4 מיליון', patch: () => ({ priceMax: 4000000 }) },
            { id: 'any', label: 'לא משנה', patch: () => ({}) }
        ]
    }
];

const SLOT_IDS = QUESTIONS.map((q) => q.id);

module.exports = { QUESTIONS, SLOT_IDS, HOUSE };
