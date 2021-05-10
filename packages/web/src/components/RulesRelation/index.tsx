import React from 'react';
import Rule from '../Rule';
import './index.css';
import Relation from '../Relation';
import TitleBar from '../TitleBar';
import { Props } from './interface';
import { connect } from 'dva';
import { Dispatch } from 'redux';
import { RelationState } from '../../models/relation';
import { MapState } from '../../models/map';
class RulesRelation extends React.Component<Props> {
  render = () => {
    return (
      <div className="rule-relation">
        <TitleBar title={'Relation'}></TitleBar>
        {this.state.showRules === true ? (
          <Rule
            activatePOI={this.props.activatePOI}
            rules={this.props.rules}
            colorMap={this.state.colorMap}
          ></Rule>
        ) : (
          <Relation colorMap={this.state.colorMap} relations={this.props.relations}></Relation>
        )}
      </div>
    );
  };
  state = {
    showRules: true,
    color: [
      '#FA5B74',
      '#FF9578',
      '#FFDB5C',
      '#00C12B',
      '#32C5E9',
      '#9FE6B8',
      '#4947D3',
      '#37A2DA',
      '#E062AE',
      '#F47D23'
    ],
    colorMap: {}
  };
  setColorMap = (ids: string[]) => {
    const map: Record<string, string> = {};
    ids.forEach((id, index) => (map[id] = this.state.color[index]));
    this.setState({ colorMap: map });
  };
  componentDidMount = () => {
    this.props.computeRules({
      poiId: '5015',
      timeRange: this.props.timeRange
    });
  };
  componentWillReceiveProps = (nextProps: Props) => {
    if (nextProps.loading === true) return;
    if (nextProps.activatePOI != this.props.activatePOI && nextProps.activatePOI != null) {
      this.props.computeRules({
        poiId: nextProps.activatePOI.poiId,
        timeRange: nextProps.timeRange
      });
    }
    // 设置颜色配色,并计算共现关系
    if (nextProps.rules != this.props.rules && nextProps.rules != null) {
      const ids = Object.keys(nextProps.rules.map);
      this.setColorMap(ids);
      this.props.computeRelations({ poiIds: ids, timeRange: nextProps.timeRange });
    }
  };
}
const MapDispatchToProps = (dispatch: Dispatch) => {
  return {
    computeRules(payload: { poiId: string; timeRange: string[] }) {
      dispatch({
        type: 'relationModel/computeRulesAsync',
        payload
      });
    },
    computeRelations(payload: { poiIds: string[]; timeRange: string[] }) {
      dispatch({
        type: 'relationModel/computeRelationsAsync',
        payload
      });
    }
  };
};
const MapStateToProps = (state: { mapModel: MapState; relationModel: RelationState }) => {
  const { mapModel, relationModel } = state;
  return {
    loading: relationModel.loading,
    timeRange: mapModel.timeRange,
    activatePOI: mapModel.activatePOI,
    relations: relationModel.relations,
    rules: relationModel.rules
  };
};
export default connect(
  MapStateToProps,
  MapDispatchToProps
)(RulesRelation);
