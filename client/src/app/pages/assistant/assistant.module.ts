import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { SharedModule } from 'src/app/shared/shared.module';
import { AssistantComponent } from './assistant.component';
import { ChatBoxComponent } from './components/chat-box/chat-box.component';
import { ChatThreadComponent } from './components/chat-thread/chat-thread.component';
import { FilterPillsComponent } from './components/filter-pills/filter-pills.component';
import { FiltersFormComponent } from './components/filters-form/filters-form.component';
import { TokenCounterComponent } from './components/token-counter/token-counter.component';
import { AdvicePanelComponent } from './components/advice-panel/advice-panel.component';
import { FactsPanelComponent } from './components/facts-panel/facts-panel.component';
import { DealListComponent } from './components/deal-list/deal-list.component';
import { LeadFormComponent } from './components/lead-form/lead-form.component';

const routes: Routes = [
    { path: '', component: AssistantComponent }
];

@NgModule({
    declarations: [
        AssistantComponent,
        ChatBoxComponent,
        ChatThreadComponent,
        FilterPillsComponent,
        FiltersFormComponent,
        FactsPanelComponent,
        AdvicePanelComponent,
        TokenCounterComponent,
        DealListComponent,
        LeadFormComponent
    ],
    imports: [
        SharedModule,
        RouterModule.forChild(routes)
    ]
})
export class AssistantModule { }
