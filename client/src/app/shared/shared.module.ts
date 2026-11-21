import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NisPipe } from './pipes/nis.pipe';
import { DealDatePipe } from './pipes/deal-date.pipe';

const MATERIAL = [
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatSidenavModule,
    MatProgressSpinnerModule,
    MatTooltipModule
];

@NgModule({
    declarations: [
        NisPipe,
        DealDatePipe
    ],
    imports: [
        CommonModule,
        FormsModule,
        ...MATERIAL
    ],
    exports: [
        CommonModule,
        FormsModule,
        ...MATERIAL,
        NisPipe,
        DealDatePipe
    ]
})
export class SharedModule { }
