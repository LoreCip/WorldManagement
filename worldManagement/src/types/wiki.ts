import { ArticleId } from "./core";
import { CategoryKey } from "../components/theme/theme";

export interface ArticleMeta {
  id: ArticleId;
  title: string;
  category: CategoryKey;
}

export interface ArticleItem extends ArticleMeta {
  snippet: string;
}

export interface Article extends ArticleMeta {
  content: string;
  tags: string[];
}