import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Filters, Options, emptyFilters } from 'src/app/shared/models/Filters';
import { FILTER_LABELS } from 'src/app/shared/const/labels';

type MustHave = 'requireParking' | 'requireElevator' | 'requireSafeRoom' | 'requireBalcony';

// The full filter form, shown in a side sheet. It is the core interface (WORK_PLAN.md 8.2):
// the assistant only fills it in, and search works with it alone when the assistant is unavailable.
@Component({
    selector: 'app-filters-form',
    templateUrl: './filters-form.component.html',
    standalone: false
})
export class FiltersFormComponent implements OnChanges {

    @Input() options: Options | null = null;
    @Input() filters: Filters = emptyFilters();
    @Input() resultCount: number | null = null;
    @Input() searching = false;
    @Output() searchRequested = new EventEmitter<Filters>();
    @Output() closed = new EventEmitter<void>();

    model: Filters = emptyFilters();

    readonly purposes: { value: Filters['purpose']; label: string }[] = [
        { value: 'live', label: 'למגורים' },
        { value: 'invest', label: 'להשקעה' },
        { value: null, label: 'לא משנה' }
    ];

    readonly mustHaves: { key: MustHave; label: string }[] = [
        { key: 'requireParking', label: FILTER_LABELS.requireParking },
        { key: 'requireElevator', label: FILTER_LABELS.requireElevator },
        { key: 'requireSafeRoom', label: FILTER_LABELS.requireSafeRoom },
        { key: 'requireBalcony', label: FILTER_LABELS.requireBalcony }
    ];

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['filters']) this.model = structuredClone(this.filters);
    }

    // Neighborhoods only of the selected cities, so the list stays short and valid
    get neighborhoodOptions(): string[] {
        if (!this.options || !this.model.cities.length) return [];
        return this.model.cities.flatMap((c) => [...(this.options!.neighborhoodsByCity[c] || [])].sort());
    }

    onCitiesChange(): void {
        const allowed = new Set(this.neighborhoodOptions);
        this.model.neighborhoods = this.model.neighborhoods.filter((n) => allowed.has(n));
    }

    toggleMustHave(key: MustHave): void {
        // "must have" or "don't care" — there is no "must not have"
        this.model[key] = this.model[key] ? null : true;
    }

    // Empty number inputs come back as null or ''; keep the contract: number | null
    private cleanNumbers(f: Filters): Filters {
        const out = { ...f };
        for (const k of ['roomsMin', 'roomsMax', 'sizeMin', 'sizeMax', 'priceMin', 'priceMax', 'offerPrice'] as const) {
            const v = out[k] as unknown;
            out[k] = v === '' || v === undefined || v === null || Number.isNaN(Number(v)) ? null : Number(v);
        }
        return out;
    }

    submit(): void {
        this.searchRequested.emit(this.cleanNumbers(this.model));
    }

    clear(): void {
        this.model = emptyFilters();
    }
}
