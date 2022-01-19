import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { DocumentListData, IDocument, SaveDocumentRequest, SaveDocumentResult } from '../models';
import { catchError, map } from 'rxjs/operators';
import Bugsnag from '@bugsnag/js';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root',
})
export class DocumentService {

    constructor(private http: HttpClient, private snack: MatSnackBar) {}

    getDocumentsPageData(): Observable<DocumentListData> {
        return this.http.get<DocumentListData>('/api/documents-view');
    }

    deleteDocuments(ids: number[]): Observable<number[]> {
        const params = new HttpParams().set('ids', `${ids}`);
        return this.http.delete<number[]>('/api/documents', { params })
            .pipe(
                catchError(err => {
                    Bugsnag.notify({
                        errorMessage: err.message,
                        message: `Attempting to delete: ${ids}`,
                        name: err.name,
                        stack: err.stack,
                    });

                    this.snack.open(`Looks like we ran into an issue deleting your file. Don't worry though, we reported it and
                    someone will get it taken care of for you asap. Refresh the page and we may have already fixed it.`,
                    'dismiss', { duration: 15000 });

                    return of(null as unknown as number[]);
                })
            );
    }

    downloadDocument(filename: string): any {
        return this.http.get<any>(`/api/documents/${filename}/download`);
    }

    saveDocument(dto: SaveDocumentRequest): Observable<IDocument | null> {
        const data = new FormData();

        data.append('file', dto.file);
        data.append('name', dto.name);
        data.append('description', dto.description);

        return this.http.post<SaveDocumentResult>(`/api/documents`, data)
            .pipe(
                map((res: SaveDocumentResult) => res.files[0]),
                catchError(err => {
                    Bugsnag.notify(new Error(err));
                    return of(null);
                }),
            );
    }

}
