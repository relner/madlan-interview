import { Pipe, PipeTransform } from '@angular/core';

const full = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

// 39608 → "₪39,608"; with 'compact': 3973000 → "₪3.97M"; null → "—"
@Pipe({
    name: 'nis',
    standalone: false
})
export class NisPipe implements PipeTransform {
    transform(value: number | null | undefined, mode: 'full' | 'compact' = 'full'): string {
        if (value === null || value === undefined) return '—';
        if (mode === 'compact' && Math.abs(value) >= 1_000_000) {
            return `₪${(value / 1_000_000).toFixed(2).replace(/\.?0+$/, '')}M`;
        }
        if (mode === 'compact' && Math.abs(value) >= 10_000) {
            return `₪${Math.round(value / 1000)}K`;
        }
        return `₪${full.format(value)}`;
    }
}
