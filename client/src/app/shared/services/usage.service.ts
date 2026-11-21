import { Injectable, computed, signal } from '@angular/core';
import { LlmUsage } from '../models/Responses';

export type UsageStep = 'message' | 'example' | 'reply' | 'advice';

// One interaction with the assistant: what the buyer did, where the answer came from,
// and what the model call cost (null usage = no model call: cache hit, quick reply, or assistant unavailable).
export interface UsageEntry {
    id: number;
    step: UsageStep;
    source: string;
    usage: LlmUsage | null;
    at: Date;
}

// Session token counter (WORK_PLAN.md 8.4): makes the cost of every interaction visible during the demo.
// Kept in memory only — it is per page load, not stored anywhere.
@Injectable({
    providedIn: 'root'
})
export class UsageService {

    private nextId = 1;
    readonly entries = signal<UsageEntry[]>([]);

    readonly totals = computed(() => {
        const list = this.entries();
        const used = list.filter((e) => e.usage);
        return {
            interactions: list.length,
            modelCalls: used.length,
            inputTokens: used.reduce((s, e) => s + e.usage!.inputTokens + e.usage!.cacheReadTokens + e.usage!.cacheWriteTokens, 0),
            outputTokens: used.reduce((s, e) => s + e.usage!.outputTokens, 0),
            costUsd: used.reduce((s, e) => s + (e.usage!.costUsd ?? 0), 0)
        };
    });

    record(step: UsageStep, source: string, usage: LlmUsage | null): void {
        this.entries.update((list) => [...list, { id: this.nextId++, step, source, usage, at: new Date() }]);
    }

    clear(): void {
        this.entries.set([]);
    }
}
