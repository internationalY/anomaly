import { Point, GridItem } from '../Map/interface';
export interface Datum {
  x1: number;
  x2: number;
  pois: Array<Point>;
}
export enum DatumKey {
  RateOne = 'rateOne',
  RateTwo = 'rateTwo',
  RateThree = 'rateThree',
  RateFour = 'rateFour',
  RateFive = 'rateFive'
}

export interface MapStateToPropsInterface {
  grids: GridItem[];
  selectedGrids: GridItem[];
  selectedPOIs: Point[];
}
export interface MapDispatchToPropsInterface {
  fetch(): void;
}
export interface Props extends MapStateToPropsInterface, MapDispatchToPropsInterface {}

export const Color: string[] = ['#CB2920', '#EC7743', '#D9F0F6', '#80B2D3', '#3561A7'].reverse();

export interface RateGroup {
  star_1: number[];
  star_2: number[];
  star_3: number[];
  star_4: number[];
  star_5: number[];
}
