import { GridItem } from '../Map/interface';

export interface MapStateToPropsInterface {
  documents: number[];
}

export interface MapDispatchToPropsInterface {
  select(payload: GridItem[]): void;
  countDocuments(): void;
}

export interface Props extends MapStateToPropsInterface, MapDispatchToPropsInterface {}
