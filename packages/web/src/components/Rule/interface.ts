import { Point } from '../Map/interface';

export interface Props {
  activatePOI: Point;
  colorMap: Record<string, string>;
  rules: { map: Record<string, string>; data: Array<{ ids: string[]; support: number }> };
}
