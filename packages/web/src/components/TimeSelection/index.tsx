import React from 'react';
import Chart from './chart';
import { MapState } from '../../models/map';
import { connect } from 'dva';
import { Props } from './interface';
import emitter from '../../event';
import { Dispatch } from 'redux';

class TimeSelection extends React.Component<Props> {
  render = () => {
    return <div className="time-selection"></div>;
  };
  chart?: Chart;
  componentDidMount = () => {
    this.chart = Chart.getInstance('.time-selection');
    this.props.statisticsAsync();
    this.chart.loadData(this.props.timeRange);
    emitter.on('change-time-range', (message: string[]) => {
      this.props.changeTimeRange(message);
    });
  };
  componentWillReceiveProps = (nextProps: Props) => {
    if (this.chart == null) return;
    if (nextProps.statistics != null && nextProps.statistics != this.props.statistics) {
      this.chart.loadData(nextProps.timeRange, nextProps.statistics);
    }
  };
}

const mapStateToProps = (state: { mapModel: MapState }) => {
  return {
    timeRange: state.mapModel.timeRange,
    statistics: state.mapModel.statistics
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    changeTimeRange(payload: string[]) {
      dispatch({ type: 'mapModel/changeTimeRange', payload });
    },
    statisticsAsync() {
      dispatch({ type: 'mapModel/statisticsAsync' });
    }
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TimeSelection);
