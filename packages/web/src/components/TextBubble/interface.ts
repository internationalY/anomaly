export interface KeywordPairItem {
  pos: Array<{ key: string; value: number }>;
  neg: Array<{ key: string; value: number }>;
}

export enum Sentiment {
  Positive = 2,
  Negative = 0
}

export interface CommentItem {
  id: string;
  date: string;
  rating: number;
  content: string;
  sentiment_items: { prop: string; abstract: string; adj: string }[];
}

export interface KeywordItem {
  prop: string;
  totalValue: number;
  adjs: Array<{ adj: string; value: number }>;
}

export interface MapDispatchToProps {
  computeKeywords(payload: { poiId: string; sentiment: number; timeRange: string[] }): void;
  computeComments(payload: { poiId: string; prop: string; adj: string; timeRange: string[] }): void;
}

export interface MapStateToProps {
  loading: boolean;
  keywords: KeywordItem[];
  comments: CommentItem[];
  timeRange: string[];
}

export interface Props extends MapDispatchToProps, MapStateToProps {
  colorMap: Record<string, string>;
  relatedPOIs: Record<string, string>[];
}
