import React from 'react';
import './index.css';
import Chart from './chart';
import * as d3 from 'd3';
import { Props } from './interface';
import { connect } from 'dva';
import { POIState } from '../../models/poi';
import { Selection } from 'd3';
import { Dispatch } from 'redux';

const mapStateToProps = ({ poiModel }: { poiModel: POIState }) => ({
  documents: poiModel.documents
});
const mapDispatchToProps = (dispatch: Dispatch) => ({
  countDocuments() {
    dispatch({ type: 'poiModel/countDocuments' });
  }
});

class Area extends React.Component<Props> {
  chart?: Chart;
  svg?: Selection<SVGElement, {}, HTMLElement, {}>;
  ref: React.RefObject<HTMLDivElement> = React.createRef();
  render() {
    return (
      <div className="area" ref={this.ref}>
        <div className="brush">
          <svg width="100%" height="100%"></svg>
        </div>
        <div className="area-container"></div>
      </div>
    );
  }
  componentWillReceiveProps = (nextProps: Props) => {
    const { documents } = nextProps;
    if (documents == null || documents.length === 0 || this.chart == null) return;
    this.chart.load(documents);
    this.createBrush();
  };
  componentDidMount() {
    this.chart = new Chart('.area .area-container');
    const { countDocuments } = this.props;
    countDocuments();
  }
  createBrush = () => {
    const svg = d3.select('.area .brush svg');
    const brush = d3.brushY();
    svg
      .append('g')
      .attr('class', 'brush')
      .call(brush);
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Area);
