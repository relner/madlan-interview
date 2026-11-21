import { Component, DestroyRef, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatSidenav } from '@angular/material/sidenav';
import { EMPTY, Subject, Subscription, catchError, of, switchMap, tap } from 'rxjs';
import { DealService } from 'src/app/shared/services/deal.service';
import { SearchService } from 'src/app/shared/services/search.service';
import { AssistantService, ChatState } from 'src/app/shared/services/assistant.service';
import { Filters, Options, emptyFilters } from 'src/app/shared/models/Filters';
import { Example, ExplainResponse, ParseResponse, SearchResponse } from 'src/app/shared/models/Responses';
import { REJECTED_FIELD_LABELS } from 'src/app/shared/const/labels';
import { ChatMessage, QuickReply } from './components/chat-thread/chat-thread.component';

// Welcome examples: a different random set on every page load (all of them are presets, no LLM)
const EXAMPLES_SHOWN = 5;
function pickRandom<T>(list: T[], count: number): T[] {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, count);
}

// Page flow (WORK_PLAN.md 7 and 8.1–8.3):
//   welcome → chat: the assistant asks one clarifying question at a time (quick replies), filling the filters
//   → when it is ready (or after a code-enforced limit, or "show now") → search → results (bento)
//   → the AI sentence arrives later and is shown only if it passed the server's grounding check.
// The filter sheet always works on its own; when the assistant is unavailable it opens by itself.
@Component({
    selector: 'app-assistant',
    templateUrl: './assistant.component.html',
    standalone: false
})
export class AssistantComponent implements OnInit {

    @ViewChild('sheet') sheet?: MatSidenav;

    private dealService = inject(DealService);
    private searchService = inject(SearchService);
    private assistantService = inject(AssistantService);
    private destroyRef = inject(DestroyRef);

    options = signal<Options | null>(null);
    examples = signal<Example[]>([]);
    filters = signal<Filters>(emptyFilters());
    filledByAssistant = signal(false);
    assumptions = signal<string[]>([]);

    messages = signal<ChatMessage[]>([]);
    lastQuestion = signal<string | null>(null);
    questionsAsked = signal(0);
    answered = signal<string[]>([]);
    parsing = signal(false);
    assistantAvailable = signal(true);

    result = signal<SearchResponse | null>(null);
    searching = signal(false);
    searchError = signal(false);
    explanation = signal<ExplainResponse | null>(null);
    explaining = signal(false);

    phase = computed<'welcome' | 'chat' | 'results'>(() => {
        if (this.result() || this.searching()) return 'results';
        return this.messages().length ? 'chat' : 'welcome';
    });

    // In the results view: the assistant's latest line (a follow-up question with quick replies)
    lastAssistant = computed(() => {
        const list = this.messages();
        const last = list[list.length - 1];
        return last?.role === 'assistant' ? last : null;
    });

    // Every new search cancels the previous one (search and its explanation together), so a late answer
    // never overwrites newer results. null cancels without searching — used by "new search".
    private searchTrigger = new Subject<Filters | null>();
    private parseSub?: Subscription;

    ngOnInit(): void {
        this.dealService.getOptions()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({ next: (options) => this.options.set(options), error: () => this.options.set(null) });

        this.assistantService.examples()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((list) => this.examples.set(pickRandom(list, EXAMPLES_SHOWN)));

        // Errors are caught inside each step, so one failed request never stops later searches
        this.searchTrigger.pipe(
            switchMap((filters) => {
                if (!filters) return EMPTY;
                this.searching.set(true);
                this.searchError.set(false);
                this.explanation.set(null);
                return this.searchService.search(filters).pipe(
                    catchError(() => of(null)),
                    tap((result) => {
                        this.searching.set(false);
                        if (!result) {
                            this.searchError.set(true);
                            return;
                        }
                        this.result.set(result);
                        this.explaining.set(true);
                    }),
                    switchMap((result) => result ? this.assistantService.explain(result.filters) : EMPTY),
                    tap((explanation) => {
                        this.explanation.set(explanation);
                        this.explaining.set(false);
                    })
                );
            }),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe();
    }

    private get chatState(): ChatState {
        return {
            filters: this.filters(),
            answered: this.answered(),
            questionsAsked: this.questionsAsked(),
            lastQuestion: this.lastQuestion()
        };
    }

    // Free text → the LLM extracts the filters
    onMessage(text: string): void {
        if (this.parsing()) return;
        this.messages.update((list) => [...list, { role: 'user', text }]);
        this.parsing.set(true);
        this.parseSub = this.assistantService.parse(text, this.chatState)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => this.onParsed(response));
    }

    // Welcome example: shown as the buyer's message, but its filters are fixed on the server — no LLM
    onExample(example: Example): void {
        if (this.parsing()) return;
        this.messages.update((list) => [...list, { role: 'user', text: example.text }]);
        this.parsing.set(true);
        this.parseSub = this.assistantService.example(example.id, this.chatState)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => this.onParsed(response));
    }

    // Quick reply → a bank answer is applied by code on the server (no LLM); an LLM question's reply is sent as text
    onReply({ question, option }: QuickReply): void {
        if (this.parsing()) return;
        if (question.source !== 'bank') {
            this.onMessage(option.label);
            return;
        }
        this.messages.update((list) => [...list, { role: 'user', text: option.label }]);
        this.parsing.set(true);
        this.parseSub = this.assistantService.answer(question.id, option.id, this.chatState)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => this.onParsed(response));
    }

    private onParsed(response: ParseResponse): void {
        this.parsing.set(false);

        if (response.source === 'fallback') {
            // Assistant off: the page becomes a plain filter search
            this.assistantAvailable.set(false);
            this.messages.update((list) => [...list, {
                role: 'assistant',
                fallback: true,
                text: 'העוזר לא זמין כרגע. אפשר להמשיך עם הסינון — הוא עושה את אותו החיפוש.'
            }]);
            this.lastQuestion.set(null);
            this.sheet?.open();
            return;
        }

        this.assistantAvailable.set(true);
        this.filters.set(response.filters);
        this.answered.set(response.answered);
        this.filledByAssistant.set(true);
        if (response.assumptions.length) this.assumptions.set(response.assumptions);

        const rejected = [...new Set(response.rejected.map((f) => REJECTED_FIELD_LABELS[f]).filter(Boolean))];
        const question = response.question;
        const text = [
            rejected.length ? `לא זיהיתי ${rejected.join(', ')}.` : '',
            question?.text ?? (response.readyToSearch && this.phase() === 'chat' ? 'מעולה, הנה העסקאות שנסגרו ומה הן אומרות' : '')
        ].filter(Boolean).join(' ');

        if (text) {
            this.messages.update((list) => [...list, { role: 'assistant', text, question: question ?? undefined }]);
        }

        if (response.readyToSearch) {
            this.lastQuestion.set(null);
            this.searchTrigger.next(response.filters);
        } else {
            this.lastQuestion.set(question?.text ?? null);
            this.questionsAsked.update((n) => n + 1);
            // Already on the results view: keep the results and refresh them with the refined filters
            if (this.result()) this.searchTrigger.next(response.filters);
        }
    }

    // The buyer can skip the remaining questions at any time
    searchNow(): void {
        this.lastQuestion.set(null);
        this.messages.update((list) => list.map((m) => ({ ...m, question: undefined })));
        this.searchTrigger.next(this.filters());
    }

    onSheetSearch(filters: Filters): void {
        this.filters.set(filters);
        this.filledByAssistant.set(false);
        this.searchTrigger.next(filters);
        this.sheet?.close();
    }

    onFiltersChanged(filters: Filters): void {
        this.filters.set(filters);
        if (this.phase() === 'results') this.searchTrigger.next(filters);
    }

    // "New search": back to the welcome screen with a clean state. Requests still in flight are cancelled,
    // so a late answer cannot bring the old results back.
    reset(): void {
        this.parseSub?.unsubscribe();
        this.searchTrigger.next(null);
        this.sheet?.close();
        this.filters.set(emptyFilters());
        this.filledByAssistant.set(false);
        this.assumptions.set([]);
        this.messages.set([]);
        this.lastQuestion.set(null);
        this.questionsAsked.set(0);
        this.answered.set([]);
        this.parsing.set(false);
        this.assistantAvailable.set(true);
        this.result.set(null);
        this.searching.set(false);
        this.searchError.set(false);
        this.explanation.set(null);
        this.explaining.set(false);
        window.scrollTo({ top: 0 });
    }

    openSheet(): void {
        this.sheet?.open();
    }
}
