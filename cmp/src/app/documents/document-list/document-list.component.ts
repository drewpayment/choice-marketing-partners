import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSelectionList } from '@angular/material/list';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { catchError, filter, map, takeUntil, tap } from 'rxjs/operators';
import { IDocument } from 'src/app/models';
import { ConfirmDeletesDialogComponent } from '../confirm-deletes/confirm-deletes-dialog.component';
import { DocumentService } from '../documents.service';

enum SelectAllType {
    none,
    some,
    all
}

@Component({
    selector: 'cp-document-list',
    templateUrl: './document-list.component.html',
    styleUrls: ['./document-list.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentListComponent implements OnInit, OnDestroy {

    destroy$ = new Subject();
    docs$ = new BehaviorSubject<IDocument[]>([]);
    @ViewChild(MatSelectionList) documents: MatSelectionList;

    constructor(private service: DocumentService, private dialog: MatDialog) {}

    ngOnInit() {
        this.service.getDocumentsPageData()
            .pipe(
                takeUntil(this.destroy$),
                tap(data => {
                    this.docs$.next(data.documents);
                })
            )
            .subscribe();
    }

    ngOnDestroy() {
        this.destroy$.next();
    }

    addDocument() {
        console.log('Open dialog and let user upload a file.');
    }

    openDocument(event: Event, document: IDocument) {
        event.stopPropagation();

        // this.service.openDocument(document.filePath)
        //     .sub
    }

    deleteDocument() {
        const pendingDeletes: IDocument[] = this.documents.selectedOptions.selected.map(opt => opt.value);

        const ids = pendingDeletes.map(pd => pd.id);

        // confirm you want to delete!
        // open dialog and get user to click that they confirm they're deleting files
        this.dialog.open(ConfirmDeletesDialogComponent, {
            data: {
                documents: pendingDeletes,
            }
        }).afterClosed().subscribe(isConfirmDelete => {
            if (isConfirmDelete) {
                this.service.deleteDocuments(ids)
                    .pipe(
                        catchError(err => {
                            console.dir(err);
                            return of(null);
                        }),
                        map(res => {
                            if (res) {
                                const current = this.docs$.value;
                                return current.filter(c => !ids.includes(c.id));
                            }
                        }),
                    )
                    .subscribe(remainingDocuments => {
                        if (remainingDocuments) {
                            this.docs$.next(remainingDocuments);
                        }
                    });
            }
        });


    }

    getSelectAllIcon(documents: MatSelectionList): string {
        return documents.selectedOptions.selected.length === 0
            ? 'check_box_outline_blank'
            : documents.selectedOptions.selected.length === documents.options.length
                ? 'check_box'
                : 'indeterminate_check_box';
    }

    selectAllToggle(documents: MatSelectionList) {
        const selectAllMode: SelectAllType = documents.selectedOptions.selected.length === 0
            ? SelectAllType.none
            : documents.selectedOptions.selected.length === documents.options.length
                ? SelectAllType.all
                : SelectAllType.some;

        switch (selectAllMode) {
            case SelectAllType.none:
            case SelectAllType.some:
                documents.selectAll();
                break;
            case SelectAllType.all:
                documents.deselectAll();
                break;
        }
    }

}
