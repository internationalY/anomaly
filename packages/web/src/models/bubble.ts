import CommonService from '../api/common.service';
import { BaseResponse } from '../api/interface';
import { Model } from 'dva';
import { KeywordItem, CommentItem } from '../components/TextBubble/interface';

const service = CommonService.getInstance();

export interface InitialState {
  loading: boolean;
  keywords: KeywordItem[];
  comments: CommentItem[];
}

export type BubbleState = Readonly<InitialState>;
export interface BubbleModel extends Model {
  state: BubbleState;
}

const model: BubbleModel = {
  namespace: 'bubbleModel',
  state: {
    loading: false,
    keywords: [],
    comments: []
  },
  effects: {
    *computeKeywordsAsync({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });
      const response: BaseResponse<KeywordItem[]> = yield call(
        service.computeKeywords.bind(service),
        payload
      );
      yield put({ type: 'loading', payload: false });
      yield put({ type: 'keywords', payload: response.data });
    },
    *computeCommentsAsync({ payload }, { call, put }) {
      yield put({ type: 'loading', payload: true });
      const response: BaseResponse<KeywordItem[]> = yield call(
        service.computeComments.bind(service),
        payload
      );
      yield put({ type: 'loading', payload: false });
      yield put({ type: 'comments', payload: response.data });
    }
  },
  reducers: {
    keywords(state: BubbleState, { payload }) {
      return { ...state, keywords: payload };
    },
    loading(state: BubbleState, { payload }) {
      return { ...state, loading: payload };
    },
    comments(state: BubbleState, { payload }) {
      return { ...state, comments: payload };
    }
  }
};

export default model;
