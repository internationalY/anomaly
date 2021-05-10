import CommonService from '../api/common.service';
import { BaseResponse } from '../api/interface';
import { Model } from 'dva';
import { RelationItem } from '../components/RulesRelation/interface';
import { POIItem } from '../components/Map/interface';
import { ComparsionDataItem } from '../components/Comparison/interface';

const service = CommonService.getInstance();

export interface InitialState {
  loading: boolean;
  comparisons: any[];
  colorMap?: Record<string, string>;
  calendarData: ComparsionDataItem[];
}

export type ComparisonState = Readonly<InitialState>;
export interface ComparisonModel extends Model {
  state: ComparisonState;
}

const model: ComparisonModel = {
  namespace: 'comparisonModel',
  state: {
    loading: false,
    comparisons: [],
    calendarData: []
  },
  effects: {
    *computeComparisonAsync({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });

      const response: BaseResponse<Pick<POIItem, 'poiId' | 'poiName' | 'rateGroup'>> = yield call(
        service.computeComparison.bind(service),
        payload
      );
      yield put({ type: 'loading', payload: false });
      yield put({ type: 'comparisons', payload: response.data });
    },
    *computeCalendarDataAsync({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });

      const response: BaseResponse<ComparsionDataItem[]> = yield call(
        service.getCalendarData.bind(service),
        payload
      );
      yield put({ type: 'loading', payload: false });

      yield put({ type: 'calendarData', payload: response.data });
    }
  },
  reducers: {
    loading(state: ComparisonState, { payload }) {
      return { ...state, loading: payload };
    },
    comparisons(state: ComparisonState, { payload }) {
      return { ...state, comparisons: payload };
    },

    setColorMap(state: ComparisonState, { payload }) {
      return { ...state, colorMap: payload };
    },

    calendarData(state: ComparisonState, { payload }) {
      return { ...state, calendarData: payload };
    }
  }
};

export default model;
