import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const assistantModule = () => import('./pages/assistant/assistant.module').then(x => x.AssistantModule);

const routes: Routes = [
    { path: '', loadChildren: assistantModule },
    { path: '**', redirectTo: '' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
