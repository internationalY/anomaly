import { POIItem, GridItem } from '../components/Map/interface';
import CommonService from '../api/common.service';
import { BaseResponse } from '../api/interface';
import { Model } from 'dva';

const service = CommonService.getInstance();

export interface InitialState {
  loading: boolean;
  pois: POIItem[];
  selectedPOIs: POIItem[];
  grids: GridItem[];
  relatedPOIs: Record<string, string>[];
  timeRange: string[];
  activatePOI: string;
  gridRange: number;
  statistics?: Array<{ key: string; value: [number, number] }>;
  enableMapSelect: boolean;
}

export type MapState = Readonly<InitialState>;
export interface MapModel extends Model {
  state: MapState;
}

const model: MapModel = {
  namespace: 'mapModel',
  state: {
    loading: false,
    enableMapSelect: false,
    gridRange: 50,
    pois: [],
    grids: [],
    relatedPOIs: [],
    selectedPOIs: [],
    activatePOI: '5015',
    timeRange: Array.from({ length: 6 }, (v, k) => {
      const base = k + 1;
      return base < 10 ? `2019-0${base}` : `2019-${base}`;
    })
  },
  effects: {
    *computeRelatedPOIsAsync({ payload }, { call, put }) {
      const response: BaseResponse<string[]> = yield call(
        service.computeRelatedPOIIds.bind(service),
        payload
      );
      yield put({
        type: 'relatedPOIs',
        payload: response.data
      });
    },
    *fetchPOIs({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });
      const response: BaseResponse<POIItem[]> = yield call(service.getCoordinates.bind(service));
      yield put({ type: 'loading', payload: false });
      yield put({ type: 'pois', payload: response.data });
    },
    *statisticsAsync({ payload }, { call, put }) {
      const response: BaseResponse<Record<string, [number, number]>[]> = yield call(
        service.statistics.bind(service)
      );
      yield put({
        type: 'statistics',
        payload: response.data
      });
    }
  },
  reducers: {
    relatedPOIs(state: MapState, { payload }) {
      return { ...state, relatedPOIs: payload };
    },
    pois(state: MapState, { payload }) {
      return { ...state, pois: payload };
    },
    grids(state: MapState, { payload }) {
      return { ...state, grids: payload };
    },
    selectedPOIs(state: MapState, { payload }) {
      return { ...state, selectedPOIs: payload };
    },
    loading(state: MapState, { payload }) {
      return { ...state, loading: payload };
    },
    changeTimeRange(state: MapState, { payload }) {
      return { ...state, timeRange: payload };
    },
    setActivatePOI(state: MapState, { payload }) {
      return { ...state, activatePOI: payload };
    },
    statistics(state: MapState, { payload }) {
      return { ...state, statistics: payload };
    },
    changeGridRange(state: MapState, { payload }) {
      return { ...state, gridRange: payload };
    },
    changeMapSelect(state: MapState, { payload }) {
      return { ...state, enableMapSelect: payload };
    }
  }
};

export default model;
