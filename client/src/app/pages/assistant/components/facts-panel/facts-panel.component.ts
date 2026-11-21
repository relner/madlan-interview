import { Component, Input } from '@angular/core';
import { Fact, Period } from 'src/app/shared/models/Fact';
import { Filters, emptyFilters } from 'src/app/shared/models/Filters';
import { ExplainResponse } from 'src/app/shared/models/Responses';
import { NOT_COMPARABLE_SHORT } from 'src/app/shared/const/labels';

interface TrendRow {
    fact: Fact;
    city: string;
    change: number;
    selected: boolean;
}

// Bento of computed facts (design F). Every number comes from the API with its n.
// The AI sentence is the only accent-tinted text, and a small accent dot marks each number it used
// (from usedFactIds, already checked by the server's grounding check) — WORK_PLAN.md 8.1.
@Component({
    selector: 'app-facts-panel',
    templateUrl: './facts-panel.component.html',
    standalone: false
})
export class FactsPanelComponent {

    @Input() facts: Fact[] = [];
    @Input() filters: Filters = emptyFilters();
    @Input() explanation: ExplainResponse | null = null;
    @Input() explaining = false;

    readonly reasons = NOT_COMPARABLE_SHORT;
    readonly Math = Math;

    fact(id: string): Fact | undefined {
        return this.facts.find((f) => f.id === id);
    }

    num(fact: Fact | undefined): number | null {
        return fact && typeof fact.value === 'number' ? fact.value : null;
    }

    used(id: string | undefined): boolean {
        return !!id && (this.explanation?.explanation?.usedFactIds ?? []).includes(id);
    }

    get aiText(): string | null {
        return this.explanation?.explanation?.text ?? null;
    }

    get selectedCity(): string | null {
        return this.filters.cities.length === 1 ? this.filters.cities[0] : null;
    }

    get count(): number {
        return this.num(this.fact('matched_count')) ?? 0;
    }

    get period(): Period | null {
        const v = this.fact('period')?.value;
        return v && typeof v === 'object' ? v : null;
    }

    // Hero number rule — decided by code, not by the model:
    // median price per sqm when there is enough data, otherwise the deal count.
    get heroIsPrice(): boolean {
        return !!this.fact('median_price_per_sqm')?.enoughData;
    }

    get cityChange(): Fact | undefined {
        return this.selectedCity ? this.fact(`city:${this.selectedCity}:change`) : undefined;
    }

    get trends(): TrendRow[] {
        const published = this.facts.filter((f) =>
            f.type === 'city_change_pct' && f.enoughData && f.from?.value && f.to?.value);
        if (!published.length) return [];

        return published
            .map((f) => ({
                fact: f,
                city: f.city!,
                change: f.value as number,
                selected: this.filters.cities.includes(f.city!)
            }))
            .sort((a, b) => Number(b.selected) - Number(a.selected) || b.change - a.change);
    }

    get anyTrendUsed(): boolean {
        return this.trends.some((r) => this.used(r.fact.id));
    }

    get notComparable(): Fact[] {
        return this.facts.filter((f) => f.type === 'city_change_pct' && !f.enoughData);
    }

    get trendPeriods(): { early: Period; late: Period } | null {
        const f = this.facts.find((x) => x.type === 'city_change_pct' && x.from && x.to);
        return f ? { early: f.from!.period, late: f.to!.period } : null;
    }

    signed(v: number): string {
        return `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`;
    }
}
