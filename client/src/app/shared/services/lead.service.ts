import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Observable } from "rxjs";
import { LeadRequest, LeadResponse } from "../models/Responses";


@Injectable({
    providedIn: 'root'
})
export class LeadService {

    constructor(private http: HttpClient){}

    create(lead: LeadRequest): Observable<LeadResponse> {
        return this.http.post<LeadResponse>('/api/lead', lead);
    }
}
