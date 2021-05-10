import { Point } from '../Map/interface';

export interface Relation {
  target: string;
  source: string;
  value: number;
  total: Array<{ key: string; value: number }>;
}
export interface RelationItem {
  source: string;
  name: string;
  relations: Array<Relation>;
  longtitude: string;
  latitude: string;
}
export interface MapDispatchToProps {
  computeRules(payload: { poiId: string; timeRange: string[] }): void;
  computeRelations(payload: { poiIds: string[]; timeRange: string[] }): void;
}

export interface MapStateToProps {
  loading: boolean;
  rules: { map: Record<string, string>; data: Array<{ ids: string[]; support: number }> };
  relations: Array<RelationItem>;
  timeRange: string[];
  activatePOI: Point;
}

export interface Props extends MapDispatchToProps, MapStateToProps {}
