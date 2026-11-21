export type FactType =
    | 'count'
    | 'period'
    | 'price'
    | 'price_per_sqm'
    | 'city_period_price_per_sqm'
    | 'city_change_pct'
    // advice facts (api/src/services/advice.service.js)
    | 'offer_check'
    | 'budget_city'
    | 'budget_selected'
    | 'nearby_city'
    | 'city_price_per_sqm'
    | 'live_most_area'
    | 'invest_growth';

export interface Period {
    from: number;
    to: number;
}

export interface Fact {
    id: string;
    type: FactType;
    label: string;
    value: number | Period | null;
    n: number;
    enoughData?: boolean;
    city?: string;
    period?: Period;
    from?: { period: Period; value: number | null; n: number };
    to?: { period: Period; value: number | null; n: number };
    notComparableReason?: 'not_enough_deals' | 'property_type_mix_changed' | null;
    minSampleSize?: number;
    nearTo?: string;
    details?: Record<string, number>;
    caveat?: string;
    dealIds?: string[];
    excludedIds?: string[];
}
