
export interface Paginator<T> {
    currentPage: number;
    data: T[];
    firstPageUrl: string;
    from: number;
    lastPage: number;
    lastPageUrl: string;
    nextPageUrl: string;
    path: string;
    perPage: number;
    prevPageUrl: string;
    to: number;
    total: number;
}

export interface PaginatorEvent {
    previousPageIndex: number;
    pageIndex: number;
    pageSize: number;
    length: number;
}
