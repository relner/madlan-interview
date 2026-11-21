import { Component, Input } from '@angular/core';
import { Fact } from 'src/app/shared/models/Fact';
import { ExplainResponse, Recommendation } from 'src/app/shared/models/Responses';
import { NisPipe } from 'src/app/shared/pipes/nis.pipe';

interface AdviceCard {
    headline: string;
    reason: string | null;
    // The facts behind the advice, written by code — the buyer can check every number
    evidence: string[];
}

const nis = new NisPipe();
const signed = (v: number) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)}%`;

// One fact → one short line, written by code (no LLM). Used as the evidence under each recommendation,
// and as the whole panel when the assistant is unavailable.
export function factLine(f: Fact): string | null {
    const d = f.details ?? {};
    switch (f.type) {
        case 'offer_check':
            return f.enoughData
                ? `${d['cheaperCount']} מתוך ${f.n} עסקאות דומות ב${f.city} נסגרו בפחות מ־${nis.transform(f.value as number)} · חציון ${nis.transform(d['medianPrice'])}`
                : `רק ${f.n} עסקאות דומות ב${f.city} · מעט מדי להשוואה`;
        case 'budget_selected':
            return `${f.city}: ${d['withinBudget']} מתוך ${f.n} עסקאות דומות נסגרו בתקציב · חציון ${nis.transform(f.value as number)}`;
        case 'budget_city':
            return `${f.city}: ${f.n} עסקאות בתקציב · חציון ${nis.transform(d['medianPrice'])}${d['medianSizeSqm'] ? ` · ${d['medianSizeSqm']} מ״ר` : ''}`;
        case 'nearby_city':
            return `${f.city}: ${nis.transform(f.value as number)} למ״ר · זול ב־${d['cheaperPct']}% מ${f.nearTo} · ${f.n} עסקאות`;
        case 'live_most_area':
            return `${f.city}: ${f.value} מ״ר חציוני בתקציב שלכם · חציון ${nis.transform(d['medianPrice'])} · ${f.n} עסקאות`;
        case 'invest_growth':
            return `${f.city}: ${signed(f.value as number)} במחיר למ״ר (${nis.transform(d['fromPricePerSqm'])} ← ${nis.transform(d['toPricePerSqm'])}) · ${f.from?.n} ← ${f.to?.n} עסקאות${d['withinBudget'] !== undefined ? ` · ${d['withinBudget']} בתקציב` : ''} · לא תחזית`;
        case 'city_price_per_sqm':
            return `${f.city}: ${nis.transform(f.value as number)} למ״ר · ${f.n} עסקאות`;
        case 'city_change_pct':
            return f.enoughData && typeof f.value === 'number'
                ? `${f.city}: ${signed(f.value)} במחיר למ״ר · ${f.from?.n} ← ${f.to?.n} עסקאות`
                : `${f.city}: מעט מדי עסקאות להשוואת תקופות`;
        case 'price':
            return `מחיר חציוני ${nis.transform(f.value as number)} · ${f.n} עסקאות`;
        case 'price_per_sqm':
            return `${nis.transform(f.value as number)} למ״ר · ${f.n} עסקאות`;
        default:
            return null;
    }
}

// A purpose fact already contains the city's trend (invest) or its deals in budget (live):
// the model often cites both, which would print the same city twice.
const COVERED_BY: Partial<Record<Fact['type'], Fact['type']>> = {
    city_change_pct: 'invest_growth',
    budget_city: 'live_most_area'
};
function dedupe(facts: Fact[]): Fact[] {
    return facts.filter((f) => {
        const by = COVERED_BY[f.type];
        return !by || !facts.some((o) => o.type === by && o.city === f.city);
    });
}

// "What we recommend": 1–3 pieces of advice chosen and phrased by the LLM from facts computed by code
// (WORK_PLAN.md 7, "Advice"). Each one shows the facts it is based on.
// Without the LLM the same facts are shown as plain lines, so the useful part never depends on the model.
@Component({
    selector: 'app-advice-panel',
    templateUrl: './advice-panel.component.html',
    standalone: false
})
export class AdvicePanelComponent {

    @Input() facts: Fact[] = [];
    @Input() explanation: ExplainResponse | null = null;
    @Input() explaining = false;

    private byId(id: string): Fact | undefined {
        return this.facts.find((f) => f.id === id);
    }

    get recommendations(): Recommendation[] {
        return this.explanation?.explanation?.recommendations ?? [];
    }

    get cards(): AdviceCard[] {
        return this.recommendations.map((r) => ({
            headline: r.headline,
            reason: r.reason,
            evidence: dedupe(r.usedFactIds
                .map((id) => this.byId(id))
                .filter((f): f is Fact => !!f))
                .map(factLine)
                .filter((l): l is string => !!l)
        }));
    }

    // Without recommendations: the advice facts themselves, most decisive first
    get plainLines(): string[] {
        // The buyer's purpose comes first (live: largest homes for the budget; invest: largest past growth)
        const order: Fact['type'][] = ['live_most_area', 'invest_growth', 'offer_check', 'budget_selected', 'nearby_city', 'budget_city'];
        return order
            .flatMap((type) => this.facts.filter((f) => f.type === type).slice(0, 2))
            .map(factLine)
            .filter((l): l is string => !!l);
    }

    get hasAdviceFacts(): boolean {
        return this.plainLines.length > 0;
    }
}
