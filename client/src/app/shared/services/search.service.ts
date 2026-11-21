import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Observable } from "rxjs";
import { Filters } from "../models/Filters";
import { SearchResponse } from "../models/Responses";


// Works without the LLM — this is the core search and the fallback path.
@Injectable({
    providedIn: 'root'
})
export class SearchService {

    constructor(private http: HttpClient){}

    search(filters: Filters): Observable<SearchResponse> {
        return this.http.post<SearchResponse>('/api/search', { filters });
    }
}
