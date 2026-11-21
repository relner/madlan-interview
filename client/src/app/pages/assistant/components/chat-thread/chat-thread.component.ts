import { AfterViewChecked, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { AssistantQuestion, QuestionOption } from 'src/app/shared/models/Responses';

export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    question?: AssistantQuestion;
    fallback?: boolean;
    note?: boolean;
}

export interface QuickReply {
    question: AssistantQuestion;
    option: QuestionOption;
}

// The clarifying chat before the results: one question at a time, with quick-reply buttons
// under the assistant's last question.
@Component({
    selector: 'app-chat-thread',
    templateUrl: './chat-thread.component.html',
    standalone: false
})
export class ChatThreadComponent implements AfterViewChecked {

    @Input() messages: ChatMessage[] = [];
    @Input() parsing = false;
    @Output() reply = new EventEmitter<QuickReply>();

    @ViewChild('end') end?: ElementRef<HTMLDivElement>;
    private lastCount = 0;

    get lastQuestion(): AssistantQuestion | null {
        const last = this.messages[this.messages.length - 1];
        return !this.parsing && last?.role === 'assistant' ? last.question ?? null : null;
    }

    ngAfterViewChecked(): void {
        const count = this.messages.length + (this.parsing ? 1 : 0);
        if (this.end && count !== this.lastCount) {
            this.lastCount = count;
            this.end.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
}
