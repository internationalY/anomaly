import React from 'react';
import './index.css';
import TitleBar from '../TitleBar';
import { Slider, Switch, Radio } from 'antd';
import { connect } from 'dva';
import { MapState } from '../../models/map';
import { Props } from './interface';
import { SliderValue } from 'antd/lib/slider';
import { Dispatch } from 'redux';
class Control extends React.Component<Props> {
  render = () => {
    return (
      <div className="control">
        <TitleBar title="Control"></TitleBar>
        <div className="control-wrapper">
          <ul className="control-list">
            <li className="control-item select">
              <span>Chengdu</span>
              <span className="caret"></span>
            </li>
            {/* <li className="control-item">
              <span>
                Rate Range: {'>='} {4.3}
              </span>
              <Slider defaultValue={4.3} min={0} max={5} step={0.1}></Slider>
            </li> */}
            <li className="control-item">
              <span>Grid Range: {this.props.gridRange}M</span>
              <Slider
                onChange={this.changeGridRange}
                defaultValue={this.props.gridRange}
                min={0}
                step={50}
                max={150}
                dots={true}
              ></Slider>
            </li>
            <li className="control-item">
              <span>
                Enable Map Select:{' '}
                <Switch
                  checked={this.props.enableMapSelect}
                  onChange={this.changeMapSelect}
                  checkedChildren="Enable"
                  unCheckedChildren="Disable"
                  size="small"
                ></Switch>
              </span>
            </li>
            <li className="control-item">
              <span>
                Enable Map Zoom:{' '}
                <Switch
                  disabled={true}
                  checkedChildren="Enable"
                  unCheckedChildren="Disable"
                  size="small"
                ></Switch>
              </span>
            </li>
            <li className="control-item">
              <span>Minimum support: 150</span>
              <Slider min={0} max={1000} defaultValue={150}></Slider>
            </li>
            {/* <li className="control-item">
              <span>Patterns Sort By: Data Length</span>
              <Radio.Group
                value={2}
                options={[{ label: 'Support', value: 1 }, { label: 'Data Length', value: 2 }]}
              ></Radio.Group>
            </li> */}
            <li className="control-item">
              <span>Link Sort By: Relavtive Pos</span>
              <Radio.Group
                value={2}
                options={[{ label: 'Value', value: 1 }, { label: 'Relavtive Pos', value: 2 }]}
              ></Radio.Group>
            </li>
          </ul>
        </div>
      </div>
    );
  };

  changeGridRange = (range: SliderValue) => {
    this.props.changeGridRange(range as number);
  };
  changeMapSelect = (enable: boolean) => {
    this.props.changeMapSelect(enable);
  };
}

const mapStateToProps = (state: { mapModel: MapState }) => {
  const { mapModel } = state;
  return {
    timeRange: mapModel.timeRange,
    gridRange: mapModel.gridRange,
    enableMapSelect: mapModel.enableMapSelect
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => {
  return {
    changeGridRange(range: number) {
      dispatch({ type: 'mapModel/changeGridRange', payload: range });
    },
    changeMapSelect(enable: boolean) {
      dispatch({ type: 'mapModel/changeMapSelect', payload: enable });
    }
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Control);
