import React from 'react';
import './index.css';
import Chart from './chart';
import { Props } from './interface';

export default class Relation extends React.Component<Props> {
  chart?: Chart;
  render() {
    return (
      <div className="relation">
        <div className="relation-wrapper"></div>
      </div>
    );
  }
  componentDidMount = () => {
    this.chart = Chart.getInstance('.relation-wrapper');
  };

  componentWillReceiveProps = (nextProps: Props) => {
    if (this.chart == null || nextProps.relations == null) return;
    this.chart.load(nextProps.relations, nextProps.colorMap);
  };
}
