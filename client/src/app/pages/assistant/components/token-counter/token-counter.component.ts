import { Component, inject, signal } from '@angular/core';
import { UsageEntry, UsageService } from 'src/app/shared/services/usage.service';

const STEP_LABELS: Record<UsageEntry['step'], string> = {
    message: 'הודעה',
    example: 'דוגמה',
    reply: 'לחיצה על תשובה',
    advice: 'המלצות'
};

const SOURCE_LABELS: Record<string, string> = {
    llm: 'מודל',
    cache: 'מטמון',
    bank: 'ללא מודל',
    fallback: 'לא זמין'
};

// Floating token counter, bottom right: the cost of every interaction in this session.
// Collapsed: session totals. Open: one row per interaction (model, tokens in / out, cost, time).
@Component({
    selector: 'app-token-counter',
    templateUrl: './token-counter.component.html',
    standalone: false
})
export class TokenCounterComponent {

    readonly usage = inject(UsageService);
    readonly open = signal(false);

    readonly stepLabels = STEP_LABELS;
    readonly sourceLabels = SOURCE_LABELS;

    // "claude-haiku-5-5" → "Haiku 5.5"
    modelName(model: string): string {
        const m = /^claude-([a-z]+)-(\d+)-(\d+)/.exec(model);
        return m ? `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}.${m[3]}` : model;
    }

    tokens(n: number): string {
        return n >= 10_000 ? `${(n / 1000).toFixed(1)}K` : n.toLocaleString('en-US');
    }

    cost(usd: number | null | undefined): string {
        if (usd === null || usd === undefined) return '—';
        if (usd === 0) return '$0';
        return usd < 0.01 ? `$${usd.toFixed(5)}` : `$${usd.toFixed(3)}`;
    }

    // Input as billed: uncached + cache read + cache write
    inputOf(e: UsageEntry): number {
        return e.usage ? e.usage.inputTokens + e.usage.cacheReadTokens + e.usage.cacheWriteTokens : 0;
    }
}
