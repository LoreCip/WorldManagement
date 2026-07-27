// Definizione base dei metadati
export interface ArticleMeta {
    id: string;
    title: string;
    category: string;
}

export interface ArticleItem extends ArticleMeta {
    snippet: string;
}

export interface Article extends ArticleMeta {
    content: string;
    tags: string[];
}