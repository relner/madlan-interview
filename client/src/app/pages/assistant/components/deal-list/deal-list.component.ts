import { Component, Input, inject, signal } from '@angular/core';
import { Deal } from 'src/app/shared/models/Deal';
import { DealService } from 'src/app/shared/services/deal.service';
import { WARNING_FLAG_LABELS } from 'src/app/shared/const/labels';

const FIRST_PAGE = 3;

@Component({
    selector: 'app-deal-list',
    templateUrl: './deal-list.component.html',
    standalone: false
})
export class DealListComponent {

    @Input() deals: Deal[] = [];
    @Input() total = 0;

    private dealService = inject(DealService);

    showAll = signal(false);

    // Original CSV rows, loaded on demand: "show me where this number comes from"
    openSource = signal<string | null>(null);
    sourceRows = signal<Deal[]>([]);
    sourceLoading = signal(false);

    readonly amenities: { key: 'hasParking' | 'hasElevator' | 'hasSafeRoom' | 'hasBalcony'; label: string }[] = [
        { key: 'hasParking', label: 'חניה' },
        { key: 'hasElevator', label: 'מעלית' },
        { key: 'hasSafeRoom', label: 'ממ״ד' },
        { key: 'hasBalcony', label: 'מרפסת' }
    ];

    get visible(): Deal[] {
        return this.showAll() ? this.deals : this.deals.slice(0, FIRST_PAGE);
    }

    // Only the flag that matters most for trusting the price; the rest are visible in the original row
    warning(deal: Deal): string | null {
        const flag = deal.qualityFlags.find((f) => WARNING_FLAG_LABELS[f]);
        return flag ? WARNING_FLAG_LABELS[flag] : null;
    }

    toggleSource(deal: Deal): void {
        if (this.openSource() === deal._id) {
            this.openSource.set(null);
            return;
        }
        this.openSource.set(deal._id);
        this.sourceLoading.set(true);
        this.sourceRows.set([]);
        this.dealService.getByDealId(deal.dealId).subscribe({
            next: (rows) => {
                this.sourceRows.set(rows);
                this.sourceLoading.set(false);
            },
            error: () => this.sourceLoading.set(false)
        });
    }

    rawEntries(row: Deal): [string, string][] {
        return Object.entries(row.raw ?? {});
    }
}
