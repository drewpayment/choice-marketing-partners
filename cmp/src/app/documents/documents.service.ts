import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DocumentListData } from '../models';

@Injectable({
    providedIn: 'root',
})
export class DocumentService {

    constructor(private http: HttpClient) {}

    getDocumentsPageData(): Observable<DocumentListData> {
        return this.http.get<DocumentListData>('/api/documents-view');
    }

    deleteDocuments(ids: number[]): Observable<number[]> {
        const params = new HttpParams().set('ids', `${ids}`);
        return this.http.delete<number[]>('/api/documents', { params });
    }

    openDocument(filename: string): any {
        return this.http.get<any>(`/api/documents/${filename}/download`);
    }

}
