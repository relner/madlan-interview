import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Observable } from "rxjs";
import { Options } from "../models/Filters";
import { Deal } from "../models/Deal";


@Injectable({
    providedIn: 'root'
})
export class DealService {

    constructor(private http: HttpClient){}

    getOptions(): Observable<Options> {
        return this.http.get<Options>('/api/deal/options');
    }

    // All versions of a deal, including the original CSV row
    getByDealId(dealId: string): Observable<Deal[]> {
        return this.http.get<Deal[]>(`/api/deal/${encodeURIComponent(dealId)}`);
    }
}
