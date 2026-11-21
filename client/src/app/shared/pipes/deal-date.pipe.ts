import { Pipe, PipeTransform } from '@angular/core';

// Respects date precision: a month-only date is never shown with an invented day.
@Pipe({
    name: 'dealDate',
    standalone: false
})
export class DealDatePipe implements PipeTransform {
    transform(value: string | null | undefined, precision: 'day' | 'month' | null | undefined): string {
        if (!value) return '—';
        const date = new Date(value);
        const options: Intl.DateTimeFormatOptions = precision === 'month'
            ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
            : { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' };
        return new Intl.DateTimeFormat('he-IL', options).format(date);
    }
}
