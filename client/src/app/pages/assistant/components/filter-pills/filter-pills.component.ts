import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Filters, emptyFilters } from 'src/app/shared/models/Filters';
import { FILTER_LABELS } from 'src/app/shared/const/labels';
import { NisPipe } from 'src/app/shared/pipes/nis.pipe';

interface Pill {
    label: string;
    remove: (f: Filters) => Filters;
}

const nis = new NisPipe();
const HOUSE = 'בית פרטי';

// Read view of the current filters. ✕ removes one filter and searches again; "סינון" opens the full form.
// Filters filled by the assistant are tinted, and its assumptions are in the tooltip.
@Component({
    selector: 'app-filter-pills',
    templateUrl: './filter-pills.component.html',
    standalone: false
})
export class FilterPillsComponent {

    @Input() filters: Filters = emptyFilters();
    @Input() aiFilled = false;
    @Input() assumptions: string[] = [];
    @Output() changed = new EventEmitter<Filters>();
    @Output() openSheet = new EventEmitter<void>();

    get pills(): Pill[] {
        const f = this.filters;
        const pills: Pill[] = [];

        for (const city of f.cities) {
            pills.push({ label: city, remove: (x) => ({ ...x, cities: x.cities.filter((c) => c !== city), neighborhoods: [] }) });
        }
        for (const n of f.neighborhoods) {
            pills.push({ label: n, remove: (x) => ({ ...x, neighborhoods: x.neighborhoods.filter((v) => v !== n) }) });
        }
        if (f.purpose) {
            pills.push({ label: FILTER_LABELS.purpose[f.purpose], remove: (x) => ({ ...x, purpose: null }) });
        }
        // "Any apartment" (every type except a private house) is one pill, not five
        if (f.propertyTypes.length >= 3 && !f.propertyTypes.includes(HOUSE)) {
            pills.push({ label: 'דירה', remove: (x) => ({ ...x, propertyTypes: [] }) });
        } else {
            for (const t of f.propertyTypes) {
                pills.push({ label: t, remove: (x) => ({ ...x, propertyTypes: x.propertyTypes.filter((v) => v !== t) }) });
            }
        }
        if (f.roomsMin !== null || f.roomsMax !== null) {
            const label = f.roomsMin !== null && f.roomsMax !== null
                ? (f.roomsMin === f.roomsMax ? `${f.roomsMin} חד׳` : `${f.roomsMin}–${f.roomsMax} חד׳`)
                : f.roomsMin !== null ? `${f.roomsMin}+ חד׳` : `עד ${f.roomsMax} חד׳`;
            pills.push({ label, remove: (x) => ({ ...x, roomsMin: null, roomsMax: null }) });
        }
        if (f.sizeMin !== null || f.sizeMax !== null) {
            const label = f.sizeMin !== null && f.sizeMax !== null ? `${f.sizeMin}–${f.sizeMax} מ״ר`
                : f.sizeMin !== null ? `מ־${f.sizeMin} מ״ר` : `עד ${f.sizeMax} מ״ר`;
            pills.push({ label, remove: (x) => ({ ...x, sizeMin: null, sizeMax: null }) });
        }
        if (f.priceMin !== null || f.priceMax !== null) {
            const label = f.priceMin !== null && f.priceMax !== null
                ? `${nis.transform(f.priceMin, 'compact')}–${nis.transform(f.priceMax, 'compact')}`
                : f.priceMax !== null ? `עד ${nis.transform(f.priceMax, 'compact')}` : `מ־${nis.transform(f.priceMin, 'compact')}`;
            pills.push({ label, remove: (x) => ({ ...x, priceMin: null, priceMax: null }) });
        }
        if (f.offerPrice !== null) {
            pills.push({ label: `הוצע: ${nis.transform(f.offerPrice, 'compact')}`, remove: (x) => ({ ...x, offerPrice: null }) });
        }
        for (const key of ['requireParking', 'requireElevator', 'requireSafeRoom', 'requireBalcony'] as const) {
            if (f[key]) pills.push({ label: FILTER_LABELS[key], remove: (x) => ({ ...x, [key]: null }) });
        }
        return pills;
    }

    get tooltip(): string {
        return this.aiFilled && this.assumptions.length ? this.assumptions.join(' · ') : '';
    }

    remove(pill: Pill): void {
        this.changed.emit(pill.remove(this.filters));
    }
}
