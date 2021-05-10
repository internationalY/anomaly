import Axios, { AxiosInstance, AxiosPromise } from 'axios';
import { RxiosConfig, BaseResponse } from './interface';
export default class HttpModule {
  private httpClient: AxiosInstance;
  constructor(
    private options: RxiosConfig = {
      baseURL: 'http://127.0.0.1:3001'
    }
  ) {
    this.httpClient = Axios.create(options);
  }
  private makeRequest<T>(method: string, url: string, body?: object) {
    let request: AxiosPromise<BaseResponse<T>>;
    switch (method) {
      case 'GET':
        request = this.httpClient.get<BaseResponse<T>>(url, {
          params: body
        });
        break;
      case 'POST':
        request = this.httpClient.post<BaseResponse<T>>(url, body);
        break;

      default:
        throw new Error('Method not supported');
    }
    return request;
  }
  public get<T>(url: string, queryParams?: object) {
    return this.makeRequest<T>('GET', url, queryParams);
  }
  public post<T>(url: string, body?: object) {
    return this.makeRequest<T>('POST', url, body);
  }
}
