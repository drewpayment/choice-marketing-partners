
export interface SaveDocumentRequest {
    name: string;
    description: string;
    file: File;
    filePath: string;
    mimeType: string;
    uploadedBy: string;
}

export interface SaveDocumentResult {
    files: IDocument[];
    [key: string]: any;
}

export interface DocumentListData {
    isAdmin: boolean;
    documents: IDocument[];
    selected: DocumentTag[];
    tags: DocumentTag[];
    uTags: DocumentTag[];
}

export interface IDocument {
    id: number;
    description: string;
    filePath: string;
    mimeType: string;
    name: string;
    tagged: string[];
    updatedAt: Date;
    createdAt: Date;
    uploadedBy: string;
}

export interface DocumentTag {
    slug: string;
    name: string;
    count: number;
}

export interface SelectedDocument {
    docId: number;
    tags: string[];
}
