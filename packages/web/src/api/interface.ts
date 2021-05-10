import { AxiosRequestConfig } from 'axios';

export interface BaseResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
export interface RxiosConfig extends AxiosRequestConfig {
  localCache?: boolean;
}
