import CommonService from '../api/common.service';
import { BaseResponse } from '../api/interface';
import { Model } from 'dva';
import { RelationItem } from '../components/RulesRelation/interface';

const service = CommonService.getInstance();

export interface InitialState {
  loading: boolean;
  relations: RelationItem[];
  rules?: { map: Record<string, string>; data: Array<{ ids: string[]; support: number }> };
  colorMap?: Record<string, string>;
}

export type RelationState = Readonly<InitialState>;
export interface RelationModel extends Model {
  state: RelationState;
}

const model: RelationModel = {
  namespace: 'relationModel',
  state: {
    loading: false,
    relations: []
  },
  effects: {
    *computeRelationsAsync({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });
      const response: BaseResponse<RelationItem[]> = yield call(
        service.computeRelation.bind(service),
        payload
      );
      yield put({
        type: 'relations',
        payload: response.data
      });
      yield put({ type: 'loading', payload: false });
    },
    // 计算频繁项集
    *computeRulesAsync({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });
      const response: BaseResponse<{
        data: Array<{ ids: string[]; support: number }>;
        map: Record<string, string>;
      }> = yield call(service.getRules.bind(service), payload);
      yield put({ type: 'loading', payload: false });
      yield put({ type: 'rules', payload: response.data });
    }
  },
  reducers: {
    relations(state: RelationState, { payload }) {
      return { ...state, relations: payload };
    },
    rules(state: RelationState, { payload }) {
      return { ...state, rules: payload };
    },
    loading(state: RelationState, { payload }) {
      return { ...state, loading: payload };
    },
    setColorMap(state: RelationState, { payload }) {
      return { ...state, colorMap: payload };
    }
  }
};

export default model;
