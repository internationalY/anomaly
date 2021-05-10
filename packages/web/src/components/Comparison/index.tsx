import React from 'react';
import { Spin, Icon } from 'antd';
import './index.css';
import Chart from './chart';
import { Props } from './interface';
import { connect } from 'dva';
import { Dispatch } from 'redux';
import TitleBar from '../TitleBar';
import { RelationState } from '../../models/relation';
import { MapState } from '../../models/map';
import { ComparisonState } from '../../models/comparison';

class Comparison extends React.Component<Props> {
  chart?: Chart;
  render = () => {
    return (
      <div className="comparison">
        <TitleBar title="Comparison"></TitleBar>
        {this.props.loading ? (
          <div className="loading-mask">
            <Spin
              tip="对比关系计算中..."
              indicator={<Icon style={{ fontSize: 24 }} type="loading"></Icon>}
            ></Spin>
          </div>
        ) : null}
        {/* <PerfectScrollbar> */}
        <div className="canvas-container"></div>
        {/* </PerfectScrollbar> */}
      </div>
    );
  };

  componentDidMount = () => {
    this.chart = Chart.getInstance('.comparison .canvas-container');
    this.props.getCalendarData({
      poiIds: ['5015', '1242', '87950'],
      timeRange: this.props.timeRange
    });
  };
  componentWillReceiveProps = (nextProps: Props) => {
    if (nextProps.loading === true || this.chart == null) return;
    const { calendarData, timeRange } = nextProps;

    if (calendarData.length !== 0 && calendarData != this.props.calendarData) {
      this.chart.load(calendarData, timeRange);
    }
    if (nextProps.timeRange != this.props.timeRange) {
      nextProps.getCalendarData({
        poiIds: ['5015', '1242', '87950'],
        timeRange: nextProps.timeRange
      });
    }
  };
}

const mapStateToProps = (state: {
  comparisonModel: ComparisonState;
  mapModel: MapState;
  relationModel: RelationState;
}) => {
  const { relationModel, mapModel, comparisonModel } = state;
  return {
    loading: comparisonModel.loading,
    colorMap: relationModel.colorMap,
    comparisons: comparisonModel.comparisons,
    relatedPOIs: mapModel.relatedPOIs,
    timeRange: mapModel.timeRange,
    calendarData: comparisonModel.calendarData
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  computeComparison(payload: string[]) {
    dispatch({ type: 'comparisonModel/computeComparisonAsync', payload });
  },
  getCalendarData(payload: { poiIds: string[]; timeRange: string[] }) {
    dispatch({ type: 'comparisonModel/computeCalendarDataAsync', payload });
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Comparison);
