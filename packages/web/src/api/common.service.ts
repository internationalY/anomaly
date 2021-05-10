import HttpModule from './request';
export default class CommonService {
  private static instance: CommonService;
  public httpModule: HttpModule;
  constructor() {
    this.httpModule = new HttpModule();
  }
  static getInstance() {
    if (this.instance == null) this.instance = new CommonService();
    return this.instance;
  }
  getCoordinates<T>() {
    return this.httpModule.get<T>(`/`).then(res => res.data);
  }
  countDocuments<T>() {
    return this.httpModule.get<T>(`/count_documents`).then(res => res.data);
  }
  computeComparison<T>(payload: string[]) {
    return this.httpModule
      .post<T>(`/compute_comparison`, { poiIds: payload })
      .then(res => res.data);
  }
  computeRelation<T>(payload: { poiIds: string[]; timeRange: string[] }) {
    return this.httpModule.post<T>(`/compute_relations`, payload).then(res => res.data);
  }
  computeKeywords<T>(payload: { poiId: string; sentiment: number; timeRange: string[] }) {
    return this.httpModule.post<T>(`/compute_keywords`, payload).then(res => res.data);
  }
  computeRelatedPOIIds<T>(payload: { poiId: string; timeRange: string[] }) {
    return this.httpModule.post<T>(`/compute_related_pois`, payload).then(res => res.data);
  }
  computeComments<T>(payload: { poiId: string; timeRange: string[]; prop: string; adj: string }) {
    return this.httpModule.post<T>(`/compute_comments`, payload).then(res => res.data);
  }
  statistics<T>() {
    return this.httpModule.get<T>(`/statistics`).then(res => res.data);
  }
  getCalendarData<T>(payload: { poiIds: string; timeRange: string[] }) {
    return this.httpModule.post<T>(`/compute_calendar`, payload).then(res => res.data);
  }
  getRules<T>(payload: { poiId: string; timeRange: string[] }) {
    return this.httpModule.post<T>(`/compute_rules`, payload).then(res => res.data);
  }
}
