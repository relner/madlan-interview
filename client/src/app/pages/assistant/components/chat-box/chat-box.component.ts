import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Example } from 'src/app/shared/models/Responses';

const MAX_LENGTH = 500;

// The message input. 'welcome' adds example pills under it; 'chat' sits under the chat thread;
// 'bar' is the sticky bar above the results (a follow-up message refines the search).
@Component({
    selector: 'app-chat-box',
    templateUrl: './chat-box.component.html',
    standalone: false
})
export class ChatBoxComponent {

    @Input() mode: 'welcome' | 'chat' | 'bar' = 'bar';
    @Input() parsing = false;
    // Welcome examples come from the API with fixed filters: a click is applied by code, not by the LLM
    @Input() examples: Example[] = [];
    @Output() send = new EventEmitter<string>();
    @Output() example = new EventEmitter<Example>();

    text = '';
    readonly maxLength = MAX_LENGTH;

    submit(): void {
        const text = this.text.trim();
        if (!text || this.parsing) return;
        this.send.emit(text);
        this.text = '';
    }

    useExample(example: Example): void {
        if (this.parsing) return;
        this.example.emit(example);
    }
}
