import { Point, POIItem } from '../Map/interface';
import { RelationItem } from '../RulesRelation/interface';

export interface ComparsionDataItem {
  poiId: string;
  poiName: string;
  data: Array<{
    month: string;
    sentimentValue: Array<[string, number]>;
    data: Array<{ rate: number; count: number }>;
  }>;
}

export interface Props {
  pois: Point[];
  loading: boolean;
  timeRange: string[];
  relations: RelationItem[];
  comparisons: Pick<POIItem, 'rateGroup' | 'poiId' | 'poiName'>[];
  computeComparison(payload: string[]): void;
  relatedPOIs: Record<string, string>[];
  colorMap: Record<string, string>;
  calendarData: ComparsionDataItem[];
  getCalendarData(payload: { poiIds: string[]; timeRange: string[] }): void;
}
