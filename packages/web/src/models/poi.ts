import { POIItem, GridItem } from '../components/Map/interface';
import CommonService from '../api/common.service';
import { BaseResponse } from '../api/interface';
import { Model } from 'dva';
import { RelationItem } from '../components/RulesRelation/interface';
const service = CommonService.getInstance();

export interface InitialState {
  pois: Array<POIItem>;
  loading: boolean;
  grids: Array<GridItem>;
  selectedGrids: GridItem[];
  selectedPOIs?: Record<string, number[][]>;
  documents: number[];
  relations?: Array<RelationItem>;
  comparisons?: Array<Pick<POIItem, 'poiId' | 'poiName' | 'rateGroup'>>;
  keywords?: any;
  relatedPOIs: Record<string, string>[];
}

export type POIState = Readonly<InitialState>;
export interface POIModel extends Model {
  state: POIState;
}

export interface Relations {
  source: string;
  target: string;
  value: number;
}

const model: POIModel = {
  namespace: 'poiModel',
  state: {
    pois: [],
    loading: false,
    grids: [],
    selectedGrids: [],
    documents: [],
    relatedPOIs: []
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
    *fetch({ payload: _ }, { call, put }) {
      yield put({ type: 'loading', payload: true });
      const response: BaseResponse<Array<POIItem>> = yield call(
        service.getCoordinates.bind(service)
      );

      yield put({
        type: 'pois',
        payload: response.data
      });
      yield put({ type: 'loading', payload: false });
    },
    *countDocuments({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });

      const response: BaseResponse<Array<any>> = yield call(service.countDocuments.bind(service));
      yield put({
        type: 'documents',
        payload: response.data
      });
      yield put({ type: 'loading', payload: false });
    },
    *computeRelationsAsync({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });
      const response: BaseResponse<Array<RelationItem>> = yield call(
        service.computeRelation.bind(service),
        payload
      );
      yield put({
        type: 'relations',
        payload: response.data
      });
      yield put({ type: 'loading', payload: false });
    },
    *computeComparisonAsync({ payload }, { call, put }) {
      const response: BaseResponse<Pick<POIItem, 'poiId' | 'poiName' | 'rateGroup'>> = yield call(
        service.computeComparison.bind(service),
        payload
      );
      yield put({ type: 'comparisons', payload: response.data });
    },
    *computeKeywordsAsync({ payload }, { call, put }) {
      const response: BaseResponse<any> = yield call(
        service.computeKeywords.bind(service),
        payload
      );
      yield put({ type: 'keywords', payload: response.data });
    }
  },
  reducers: {
    relatedPOIs(state: POIState, { payload }) {
      return { ...state, relatedPOIs: payload };
    },
    keywords(state: POIState, { payload }) {
      return { ...state, keywords: payload };
    },
    comparisons(state: POIState, { payload }) {
      return { ...state, comparisons: payload };
    },
    relations(state: POIState, { payload }) {
      return { ...state, relations: payload };
    },
    pois(state: POIState, { payload }) {
      return { ...state, pois: payload };
    },
    loading(state: POIState, { payload }) {
      return { ...state, loading: payload };
    },
    grids(state: GridItem[], { payload }) {
      return { ...state, grids: payload };
    },
    selectedGrids(state: GridItem[], { payload }) {
      return { ...state, selectedGrids: payload };
    },
    selectedPOIs(state: POIState, { payload }) {
      return { ...state, selectedPOIs: payload };
    },
    documents(state: POIState, { payload }) {
      return { ...state, documents: payload };
    }
  }
};

export default model;
