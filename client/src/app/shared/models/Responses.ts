import { Deal } from './Deal';
import { Fact } from './Fact';
import { Filters } from './Filters';

// Where an assistant answer came from. 'fallback' is not an error: the form is used instead.
export type AnswerSource = 'cache' | 'llm' | 'fallback';

// A welcome example: fixed text with filters defined on the server, applied without the LLM
export interface Example {
    id: string;
    text: string;
}

// Tokens and cost of one model call, from the API. null when no model was called (cache hit, quick reply).
export interface LlmUsage {
    kind: 'parse' | 'explain';
    model: string;
    ms: number;
    inputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    outputTokens: number;
    costUsd: number | null;
}

export interface SearchResponse {
    filters: Filters;
    rejected: string[];
    total: number;
    deals: Deal[];
    facts: Fact[];
}

export interface QuestionOption {
    id: string;
    label: string;
}

// 'bank' questions come from the curated list: a click is applied by code on the server, without the LLM.
// 'llm' questions were asked by the model itself: a click is sent as a normal message.
export interface AssistantQuestion {
    id: string;
    source: 'bank' | 'llm';
    text: string;
    // Why we ask / what will be shown — reminds that the data is closed deals, not listings
    hint: string | null;
    options: QuestionOption[];
}

export interface ParseResponse {
    source: AnswerSource | 'bank';
    reason?: string;
    filters: Filters;
    rejected: string[];
    answered: string[];
    question: AssistantQuestion | null;
    readyToSearch: boolean;
    assumptions: string[];
    usage?: LlmUsage | null;
}

export interface Recommendation {
    headline: string;
    reason: string;
    usedFactIds: string[];
}

// Every part passed the server's grounding check; a part that failed is not sent.
export interface Explanation {
    text: string | null;
    usedFactIds: string[];
    recommendations?: Recommendation[];
}

export interface ExplainResponse {
    source: AnswerSource;
    reason?: string;
    facts: Fact[];
    explanation: Explanation | null;
    usage?: LlmUsage | null;
}

export interface LeadRequest {
    name: string;
    channel: 'email' | 'whatsapp';
    contact: string;
    wantsSummary: boolean;
    wantsNewListings: boolean;
    filters: Filters;
    hp?: string;
}

export interface LeadResponse {
    id: string;
    status: string;
    deliveryConnected: boolean;
}
