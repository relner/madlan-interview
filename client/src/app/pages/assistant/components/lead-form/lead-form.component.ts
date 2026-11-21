import { Component, Input, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Filters, emptyFilters } from 'src/app/shared/models/Filters';
import { LeadService } from 'src/app/shared/services/lead.service';

// Lead capture after the user has seen the results (WORK_PLAN.md section 6, standalone mini-site).
// Delivery by email / WhatsApp is not connected in the demo, and the saved state says so.
@Component({
    selector: 'app-lead-form',
    templateUrl: './lead-form.component.html',
    standalone: false
})
export class LeadFormComponent {

    @Input() filters: Filters = emptyFilters();
    @Input() total = 0;

    private leadService = inject(LeadService);

    name = '';
    channel: 'email' | 'whatsapp' = 'whatsapp';
    contact = '';
    hp = '';

    sending = signal(false);
    saved = signal(false);
    error = signal<string | null>(null);

    switchChannel(): void {
        this.channel = this.channel === 'whatsapp' ? 'email' : 'whatsapp';
        this.contact = '';
    }

    submit(): void {
        if (this.sending()) return;
        this.error.set(null);
        this.sending.set(true);

        this.leadService.create({
            name: this.name.trim(),
            channel: this.channel,
            contact: this.contact.trim(),
            wantsSummary: true,
            wantsNewListings: false,
            filters: this.filters,
            hp: this.hp
        }).subscribe({
            next: () => {
                this.sending.set(false);
                this.saved.set(true);
            },
            error: (e: HttpErrorResponse) => {
                this.sending.set(false);
                this.error.set(e.status === 400 ? 'בדקו את השם ופרטי הקשר'
                    : e.status === 429 ? 'יותר מדי ניסיונות · נסו בעוד דקה' : 'משהו השתבש · נסו שוב');
            }
        });
    }
}
