export interface Props {
  timeRange: string[];
  statistics: Array<{ key: string; value: [number, number] }>;
  statisticsAsync(): void;
  changeTimeRange(payload: string[]): void;
}
