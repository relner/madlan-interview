// The buyer vocabulary: vague wishes people actually write, and what we decided they mean as filters.
// Seeded into the `concepts` collection (npm run seed); after that the collection is the source of truth
// and can be edited in the database — the service re-embeds a concept when its examples change.
//
//   examples — how buyers phrase the wish; each is embedded, a message matches by its closest example
//   meaning  — shown to the buyer as an assumption, so every interpretation is visible and can be changed
//   filters  — a partial of the API filter contract; the API validates them like any other input
//   basis    — 'data': derived from this dataset (the numbers are in the comment);
//              'curated': our interpretation of the wish, not a fact from the data
//
// Exact city / neighborhood / property type spelling matters: values the data does not have are dropped by the API.

const COASTAL_CITIES = ['תל אביב-יפו', 'בת ים', 'הרצליה', 'נתניה', 'אשדוד', 'חיפה', 'ראשון לציון'];

module.exports = [
    {
        id: 'cozy',
        title: 'דירה נעימה',
        examples: ['דירה נעימה', 'דירה קטנה ונעימה', 'משהו קטן וחמים', 'דירה חמימה', 'דירה קומפקטית', 'דירה מקסימה וקטנה'],
        meaning: 'פירשנו "דירה נעימה" כדירה עד 70 מ״ר',
        // 70 and not 60: only 38 of 514 priced deals are ≤ 60 sqm (about 2 per city), 71 are ≤ 70
        filters: { sizeMax: 70 },
        basis: 'curated'
    },
    {
        id: 'near-sea',
        title: 'ליד הים',
        examples: ['ליד הים', 'קרוב לים', 'עם נוף לים', 'עיר על חוף הים', 'לגור ליד החוף', 'הליכה לים'],
        meaning: 'פירשנו "ליד הים" כערים על חוף הים (בלי בדיקת מרחק מהחוף — אין כתובות מדויקות בנתונים)',
        filters: { cities: COASTAL_CITIES },
        basis: 'curated'
    },
    {
        id: 'cheap-area',
        title: 'אזור לא יקר',
        examples: ['שכונה לא יקרה', 'אזור זול', 'עיר זולה', 'מקום עם מחירים נמוכים', 'איפה הכי זול', 'משהו לא יקר'],
        meaning: 'פירשנו "אזור לא יקר" כחמש הערים עם המחיר החציוני הנמוך ביותר למ״ר בעסקאות שלנו',
        // Median price per sqm, all years, priced deals: Be'er Sheva 16.8k, Haifa 25.1k, Ashdod 28.0k,
        // Rishon LeZion 32.3k, Beit Shemesh 33.2k (next: Petah Tikva 38.9k). Re-check after a new seed.
        filters: { cities: ['באר שבע', 'חיפה', 'אשדוד', 'ראשון לציון', 'בית שמש'] },
        basis: 'data'
    },
    {
        id: 'investment',
        title: 'להשקעה',
        examples: ['דירה להשקעה', 'רוצה לקנות להשקעה', 'דירה להשכרה', 'לקנות ולהשכיר', 'נכס מניב', 'איפה כדאי להשקיע'],
        meaning: 'מטרה: השקעה — נראה איך המחיר למ״ר השתנה בעבר (לא תחזית)',
        filters: { purpose: 'invest' },
        basis: 'curated'
    },
    {
        id: 'family',
        title: 'למשפחה עם ילדים',
        examples: ['משפחה עם ילדים', 'דירה למשפחה', 'יש לנו שלושה ילדים', 'משפחה גדולה', 'מקום לילדים'],
        meaning: 'פירשנו "למשפחה עם ילדים" כ־4 חדרים לפחות',
        filters: { purpose: 'live', roomsMin: 4 },
        basis: 'curated'
    },
    {
        id: 'young-couple',
        title: 'דירה ראשונה לזוג',
        examples: ['זוג צעיר', 'דירה ראשונה', 'דירה לזוג', 'אנחנו זוג ומחפשים', 'דירה ראשונה שלנו'],
        meaning: 'פירשנו "דירה ראשונה לזוג" כ־2 עד 3.5 חדרים למגורים',
        filters: { purpose: 'live', roomsMin: 2, roomsMax: 3.5 },
        basis: 'curated'
    },
    {
        id: 'spacious',
        title: 'דירה מרווחת',
        examples: ['דירה מרווחת', 'דירה גדולה', 'הרבה מקום', 'משהו מרווח', 'דירה ענקית'],
        meaning: 'פירשנו "מרווחת" כ־120 מ״ר לפחות',
        // 120 ≈ the top quarter of the dataset (median 106, 90th percentile 166)
        filters: { sizeMin: 120 },
        basis: 'curated'
    },
    {
        id: 'luxury',
        title: 'נכס יוקרה',
        examples: ['דירת יוקרה', 'משהו מפואר', 'נכס יוקרתי', 'פנטהאוז', 'דירה עם גג גדול'],
        meaning: 'פירשנו "יוקרה" כפנטהאוז או דירת גג',
        filters: { propertyTypes: ['פנטהאוז', 'דירת גג'] },
        basis: 'curated'
    },
    {
        id: 'garden',
        title: 'עם גינה',
        examples: ['עם גינה', 'גינה לכלב', 'עם חצר', 'מקום עם דשא', 'יציאה לגינה'],
        meaning: 'פירשנו "עם גינה" כדירת גן או בית פרטי',
        filters: { propertyTypes: ['דירת גן', 'בית פרטי'] },
        basis: 'curated'
    },
    {
        id: 'near-tel-aviv',
        title: 'קרוב לתל אביב',
        examples: ['קרוב לתל אביב', 'ליד תל אביב', 'בגוש דן', 'דקות מתל אביב', 'לעבוד בתל אביב'],
        meaning: 'פירשנו "קרוב לתל אביב" כתל אביב והערים שגובלות בה בנתונים שלנו',
        filters: { cities: ['תל אביב-יפו', 'גבעתיים', 'רמת גן', 'חולון', 'בת ים'] },
        basis: 'curated'
    },
    {
        id: 'accessible',
        title: 'נגישה',
        examples: ['להורים מבוגרים', 'דירה נגישה', 'בלי מדרגות', 'מתאים לכיסא גלגלים', 'לאמא שלי שקשה לה ללכת'],
        meaning: 'פירשנו "נגישה" כבניין עם מעלית (חובה)',
        filters: { requireElevator: true },
        basis: 'curated'
    },
    {
        id: 'safe',
        title: 'עם מרחב מוגן',
        examples: ['מקום מוגן', 'חשוב לי חדר ביטחון', 'בטוח בזמן אזעקות', 'עם ממד', 'מרחב מוגן בדירה'],
        meaning: 'פירשנו "מוגן" כדירה עם ממ״ד (חובה)',
        filters: { requireSafeRoom: true },
        basis: 'curated'
    },
    {
        id: 'quiet-green',
        title: 'שקט וירוק',
        examples: ['מקום שקט וירוק', 'פרבר שקט', 'הרבה פארקים', 'רחוק מהרעש', 'עיר ירוקה ורגועה'],
        meaning: 'פירשנו "שקט וירוק" ככפר סבא, רעננה ומודיעין — זו בחירה שלנו, לא נתון מהעסקאות',
        filters: { cities: ['כפר סבא', 'רעננה', 'מודיעין-מכבים-רעות'] },
        basis: 'curated'
    }
];
