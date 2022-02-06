import { DOCUMENT } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from "@angular/core";
import { FormBuilder } from "@angular/forms";
import { MatDialog } from "@angular/material/dialog";
import { MatSelectionList } from "@angular/material/list";
import { MatSnackBar } from "@angular/material/snack-bar";
import { BehaviorSubject, NEVER, of, Subject } from "rxjs";
import {
  catchError,
  filter,
  map,
  switchMap,
  take,
  takeUntil,
  takeWhile,
  tap,
} from "rxjs/operators";
import { IDocument } from '../../models';
import { AddDocumentDialogComponent } from "../add-document/add-document-dialog.component";
import { ConfirmDeletesDialogComponent } from "../confirm-deletes/confirm-deletes-dialog.component";
import { DocumentService } from "../documents.service";

enum SelectAllType {
  none,
  some,
  all,
}

@Component({
  selector: "cp-document-list",
  templateUrl: "./document-list.component.html",
  styleUrls: ["./document-list.component.scss"],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentListComponent implements OnInit, OnDestroy {
  destroy$ = new Subject();
  docs$ = new BehaviorSubject<IDocument[]>([]);
  @ViewChild(MatSelectionList)
  documents!: MatSelectionList;
  sortMethod = this.fb.control("name");

  constructor(
    private fb: FormBuilder,
    private service: DocumentService,
    private dialog: MatDialog,
    private snack: MatSnackBar,
    @Inject(DOCUMENT) private dom: any
  ) {}

  ngOnInit() {
    this.service
      .getDocumentsPageData()
      .pipe(
        takeUntil(this.destroy$),
        tap((data) => {
          this.docs$.next(this.sortDocuments(data.documents));
        })
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.destroy$.next();
  }

  addDocument() {
    const stop$ = new Subject();
    let uploadedResult: IDocument;

    this.dialog
      .open(AddDocumentDialogComponent, {
        maxWidth: "25vw",
      })
      .afterClosed()
      .pipe(
        map((result: IDocument) => {
          if (!result) return NEVER;

          uploadedResult = result;
          return result;
        }),
        switchMap((result) => {
          const newDocs = this.sortDocuments([
            ...this.docs$.value,
            uploadedResult,
          ]);
          this.docs$.next(newDocs);

          return this.docs$.asObservable();
        }),
        takeUntil(stop$),
        tap((result) => {
          const scrollElement = this.dom.getElementById(
            `doc_${uploadedResult.id}`
          );

          if (scrollElement) {
            scrollElement.scrollIntoView({ behavior: "smooth" });
            this.snack.open(`Saved your document!`, "dismiss", {
              duration: 10000,
            });
            stop$.next();
          }
        })
      )
      .subscribe();
  }

  changeSortMethod(event: any) {
    console.dir(event);
  }

  private sortDocuments(documents: IDocument[]): IDocument[] {
    return documents.sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    );
  }

  openDocument(event: Event, document: IDocument) {
    event.stopPropagation();

    // this.service.openDocument(document.filePath)
    //     .sub
  }

  deleteDocument() {
    const pendingDeletes: IDocument[] =
      this.documents.selectedOptions.selected.map((opt) => opt.value);

    const ids = pendingDeletes.map((pd) => pd.id);

    // confirm you want to delete!
    // open dialog and get user to click that they confirm they're deleting files
    this.dialog
      .open(ConfirmDeletesDialogComponent, {
        data: {
          documents: pendingDeletes,
        },
      })
      .afterClosed()
      .subscribe((isConfirmDelete) => {
        if (isConfirmDelete) {
          this.service
            .deleteDocuments(ids)
            .pipe(
              filter(res => !!res),
              map((res) => {
                const current = this.docs$.value;
                return current.filter((c) => !ids.includes(c.id));
              })
            )
            .subscribe((remainingDocuments) => {
              if (remainingDocuments) {
                this.docs$.next(remainingDocuments);
              }
            });
        }
      });
  }

  getSelectAllIcon(documents: MatSelectionList): string {
    return documents.selectedOptions.selected.length === 0
      ? "check_box_outline_blank"
      : documents.selectedOptions.selected.length === documents.options.length
      ? "check_box"
      : "indeterminate_check_box";
  }

  selectAllToggle(documents: MatSelectionList) {
    const selectAllMode: SelectAllType =
      documents.selectedOptions.selected.length === 0
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
