import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, tap, timeout } from "rxjs";
import { UsageService } from "./usage.service";
import { Filters } from "../models/Filters";
import { Example, ExplainResponse, ParseResponse } from "../models/Responses";

export interface ChatState {
    filters: Filters;
    answered: string[];
    questionsAsked: number;
    lastQuestion: string | null;
}

// The server has its own model timeouts (parse 8s, explain 20s). The client adds a limit on top,
// so a hung connection also ends in the same fallback, never in an endless spinner.
const PARSE_TIMEOUT_MS = 12000;
const EXPLAIN_TIMEOUT_MS = 25000;


@Injectable({
    providedIn: 'root'
})
export class AssistantService {

    constructor(private http: HttpClient, private usage: UsageService){}

    // State sent with every step: filters, answered slots, how many questions were asked
    // (the server never needs the whole chat)
    parse(message: string, state: ChatState): Observable<ParseResponse> {
        return this.post({ message, lastQuestion: state.lastQuestion, ...this.base(state) }, state, 'message');
    }

    // A click on a bank quick reply: applied by code on the server, no LLM call
    answer(questionId: string, optionId: string, state: ChatState): Observable<ParseResponse> {
        return this.post({ answer: { questionId, optionId }, ...this.base(state) }, state, 'reply');
    }

    // A welcome example: its filters are fixed on the server, no LLM call
    example(id: string, state: ChatState): Observable<ParseResponse> {
        return this.post({ example: id }, state, 'example');
    }

    examples(): Observable<Example[]> {
        return this.http.get<Example[]>('/api/assistant/examples').pipe(catchError(() => of([])));
    }

    private base(state: ChatState) {
        return { filters: state.filters, answered: state.answered, questionsAsked: state.questionsAsked };
    }

    private post(body: object, state: ChatState, step: 'message' | 'example' | 'reply'): Observable<ParseResponse> {
        return this.http.post<ParseResponse>('/api/assistant/parse', body).pipe(
            timeout(PARSE_TIMEOUT_MS),
            catchError(() => of<ParseResponse>({
                source: 'fallback',
                reason: 'network',
                filters: state.filters,
                rejected: [],
                answered: state.answered,
                question: null,
                readyToSearch: true,
                assumptions: []
            })),
            tap((r) => this.usage.record(step, r.source, r.usage ?? null))
        );
    }

    explain(filters: Filters): Observable<ExplainResponse | null> {
        return this.http.post<ExplainResponse>('/api/assistant/explain', { filters }).pipe(
            timeout(EXPLAIN_TIMEOUT_MS),
            catchError(() => of(null)),
            tap((r) => this.usage.record('advice', r?.source ?? 'fallback', r?.usage ?? null))
        );
    }
}
