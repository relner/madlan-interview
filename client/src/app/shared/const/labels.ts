// Short Hebrew UI labels for values that come from the API (design F: few words, no long captions)

// Shown on deal tiles: only flags that affect trusting the price
export const WARNING_FLAG_LABELS: Record<string, string> = {
    price_conflict: 'מחיר שונה בין מקורות',
    version_conflict: 'גרסאות שונות לעסקה',
    zero_price: 'מחיר חסר',
    implausible_price: 'מחיר לא סביר',
    price_per_sqm_mismatch: 'מחיר למ״ר לא תואם'
};

export const NOT_COMPARABLE_SHORT: Record<string, string> = {
    not_enough_deals: 'מעט עסקאות',
    property_type_mix_changed: 'תמהיל שונה'
};

export const FILTER_LABELS = {
    purpose: { live: 'למגורים', invest: 'להשקעה' } as Record<string, string>,
    requireParking: 'חניה',
    requireElevator: 'מעלית',
    requireSafeRoom: 'ממ״ד',
    requireBalcony: 'מרפסת'
};

export const REJECTED_FIELD_LABELS: Record<string, string> = {
    cities: 'עיר',
    neighborhoods: 'שכונה',
    propertyTypes: 'סוג נכס',
    roomsMin: 'חדרים',
    roomsMax: 'חדרים',
    sizeMin: 'שטח',
    sizeMax: 'שטח',
    priceMin: 'מחיר',
    priceMax: 'מחיר',
    offerPrice: 'מחיר מוצע'
};
