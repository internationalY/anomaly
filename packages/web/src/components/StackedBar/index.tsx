import React from 'react';
import './index.css';

import Chart from './chart';

import { POIState } from '../../models/poi';
import { connect } from 'dva';
import { Props } from './inteface';
import { MapState } from '../../models/map';

class StackedBar extends React.Component<Props> {
  chart?: Chart;
  render() {
    return (
      <div className="stacked-bar">
        <div className="container"></div>
      </div>
    );
  }
  componentDidMount() {
    this.chart = Chart.getInstance('.stacked-bar > .container');
  }
  componentWillReceiveProps = (nextProps: Props) => {
    if (this.chart == null) return;
    const { grids, selectedPOIs } = nextProps;
    if (grids.length !== 0 && grids !== this.props.grids) this.chart.load(grids);
    if (selectedPOIs.length !== 0 && selectedPOIs !== this.props.selectedPOIs)
      this.chart.highlight(selectedPOIs);
  };
}

const mapStateToProps = ({ mapModel }: { mapModel: MapState }) => ({
  grids: mapModel.grids,
  selectedPOIs: mapModel.selectedPOIs
});

export default connect(mapStateToProps)(StackedBar);
