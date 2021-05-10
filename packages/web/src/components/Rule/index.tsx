import React from 'react';
import { Props } from './interface';
import './index.css';
import RuleChart from './chart';
export default class Rule extends React.Component<Props> {
  chart?: RuleChart;
  render = () => {
    return <div className="rule-wrapper"></div>;
  };
  componentDidMount = () => {
    this.chart = RuleChart.getInstance('.rule-wrapper');
  };
  componentWillReceiveProps = (nextProps: Props) => {
    if (this.chart == null || nextProps.rules == null) return;
    if (this.props.rules != nextProps.rules)
      this.chart.load(nextProps.rules, nextProps.activatePOI.poiId, nextProps.colorMap);
  };
}
