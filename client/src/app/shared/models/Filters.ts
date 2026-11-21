// Same contract as api/src/validators/filters.validators.js.
// null = not specified / don't care.
export interface Filters {
    purpose: 'live' | 'invest' | null;
    cities: string[];
    neighborhoods: string[];
    propertyTypes: string[];
    roomsMin: number | null;
    roomsMax: number | null;
    sizeMin: number | null;
    sizeMax: number | null;
    priceMin: number | null;
    priceMax: number | null;
    // A price the buyer was offered for a specific home: compared with similar deals, not used to filter
    offerPrice: number | null;
    requireParking: boolean | null;
    requireElevator: boolean | null;
    requireSafeRoom: boolean | null;
    requireBalcony: boolean | null;
}

export const emptyFilters = (): Filters => ({
    purpose: null,
    cities: [],
    neighborhoods: [],
    propertyTypes: [],
    roomsMin: null,
    roomsMax: null,
    sizeMin: null,
    sizeMax: null,
    priceMin: null,
    priceMax: null,
    offerPrice: null,
    requireParking: null,
    requireElevator: null,
    requireSafeRoom: null,
    requireBalcony: null
});

export interface Options {
    cities: string[];
    neighborhoods: string[];
    propertyTypes: string[];
    neighborhoodsByCity: Record<string, string[]>;
}
