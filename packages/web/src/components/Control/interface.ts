export interface Props {
  timeRange: string[];
  gridRange: number;
  enableMapSelect: boolean;
  changeGridRange(payload: number): void;
  changeMapSelect(payload: boolean): void;
}
