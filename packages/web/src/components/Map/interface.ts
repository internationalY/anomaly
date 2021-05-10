import { KeywordPairItem } from '../TextBubble/interface';

export interface POIItem {
  poiId: string;
  poiName: string;
  poiType: string;
  latitude: string;
  longtitude: string;
  avgRate: number;
  rate: any;
  group: number[][];
  sentimentKeyword: KeywordPairItem;
  rateGroup: Record<
    string,
    { month_count: number; items: Array<{ key: string; value: number; rate: number[] }> }
  >;
}

export interface State {
  map?: any;
  bounds?: any;
  width: number | string;
  height: number | string;
}

export interface Point extends POIItem {
  x: number;
  y: number;
}

export interface GridItem {
  name?: string;
  pois: Array<Point>;
  y1: number;
  y2: number;
  rateGroup?: number[];
  count: number;
  avgRate: number;
}

export interface MapStateToPropsInterface {
  pois: Array<POIItem>;
  loading: boolean;
  selectedPOIs: Record<string, number[][]>;
  timeRange: string[];
  activatePOI: string;
  gridRange: number;
  enableMapSelect: boolean;
}

export interface MapDispatchToPropsInterface {
  fetch(): void;
  grids(payload: GridItem[]): void;
  selectedGrids(payload: GridItem[]): void;
  computeSelectedPOIs(payload: Point[]): void;
  computeMonth(payload: string[]): void;
  computeRelations(payload: string): void;
  computeRelatedPOIs(payload: { poiId: string; timeRange: string[] }): void;
  setLoading(payload: boolean): void;
  computeKeywords(payload: { poiId: string; timeRange: string[] }): void;
  setActivatePOI(payload: string): void;
}

export interface Props extends MapStateToPropsInterface, MapDispatchToPropsInterface {}
