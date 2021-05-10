import React from 'react';
import TitleBar from '../TitleBar';
import './index.css';
import { Props, CommentItem, Sentiment } from './interface';
import { Dispatch } from 'redux';
import { connect } from 'dva';
import Chart from './chart';
import { BubbleState } from '../../models/bubble';
import { MapState } from '../../models/map';
import { Spin, Icon, List, Collapse, Typography } from 'antd';
import { RelationState } from '../../models/relation';
import emitter from '../../event';
class TextBubble extends React.Component<Props> {
  chart?: Chart;

  state = {
    showText: false,
    sentiment: Sentiment.Positive,
    selectedBubble: { prop: '', adj: '' }
  };

  render = () => {
    return (
      <div className="text-bubble">
        <TitleBar title="Bubble"></TitleBar>
        {this.props.loading ? (
          <div className="loading-mask">
            <Spin
              tip="关键词计算中..."
              indicator={<Icon style={{ fontSize: 24 }} type="loading"></Icon>}
            ></Spin>
          </div>
        ) : null}
        {this.state.showText === false ? (
          <div className="canvas-container"></div>
        ) : (
          <div className="text-container">
            <Collapse>{this.renderItem(this.props.comments)}</Collapse>
          </div>
        )}
      </div>
    );
  };

  renderItem = (item: CommentItem[]) => {
    if (this.state.selectedBubble == null) return null;
    const { prop, adj } = this.state.selectedBubble;
    return item.map(i => {
      const stars = [];
      for (let count = 0; count < i.rating; ++count)
        stars.push(<Icon type="star" theme="filled" />);
      for (let count = 5; count > i.rating; --count) stars.push(<Icon type="star" />);

      const matchItem = i.sentiment_items.find(
        sentiment => sentiment.adj === adj && sentiment.prop === prop
      );
      const abstract = matchItem
        ? matchItem.abstract.replace('<span>', '').replace('</span>', '')
        : null;

      let content = i.content;
      i.sentiment_items.forEach(sentiment => {
        const matchSnippet = sentiment.abstract.replace('<span>', '').replace('</span>', '');
        if (matchSnippet == null) return;
        content = content.replace(matchSnippet, `<span class="highlight">${matchSnippet}</span>`);
      });

      const header = (
        <span className="panel-title">
          <span className="date">{i.date}</span>
          <span className="rate">{stars}</span>
          <span className="abstract">
            <Typography.Paragraph ellipsis={true}>{abstract}</Typography.Paragraph>
          </span>
        </span>
      );
      return (
        <Collapse.Panel key={i.id} header={header}>
          <p dangerouslySetInnerHTML={{ __html: content }}></p>
        </Collapse.Panel>
      );
    });
  };

  componentDidMount = () => {
    if (this.state.showText === true) return;
    emitter.on('get-comments', (message: { prop: string; adj: string }) => {
      const { prop, adj } = message;
      this.setState({ selectedBubble: { prop, adj } });
      this.props.computeComments({ poiId: '5004', timeRange: this.props.timeRange, prop, adj });
    });
    this.chart = Chart.getInstance('.text-bubble .canvas-container');
    this.props.computeKeywords({
      poiId: '5004',
      sentiment: this.state.sentiment,
      timeRange: this.props.timeRange
    });
  };

  componentWillReceiveProps = (nextProps: Props) => {
    if (nextProps.loading === true || this.chart == null) return;
    if (nextProps.timeRange != this.props.timeRange)
      nextProps.computeKeywords({
        poiId: '5004',
        sentiment: this.state.sentiment,
        timeRange: nextProps.timeRange
      });
    if (nextProps.keywords.length !== 0 && nextProps.keywords != this.props.keywords)
      this.chart.load(nextProps.keywords);
    if (nextProps.comments.length !== 0 && nextProps.comments != this.props.comments) {
      this.chart.clear();
      this.setState({ showText: true });
    }
  };
}

const mapStateToProps = (state: {
  relationModel: RelationState;
  mapModel: MapState;
  bubbleModel: BubbleState;
}) => {
  return {
    loading: state.bubbleModel.loading,
    keywords: state.bubbleModel.keywords,
    relatedPOIs: state.mapModel.relatedPOIs,
    colorMap: state.relationModel.colorMap,
    timeRange: state.mapModel.timeRange,
    comments: state.bubbleModel.comments
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  computeKeywords(payload: { poiId: string; sentiment: number; timeRange: string[] }) {
    dispatch({ type: 'bubbleModel/computeKeywordsAsync', payload });
  },
  computeComments(payload: { poiId: string; timeRange: string[]; prop: string; adj: string }) {
    dispatch({ type: 'bubbleModel/computeCommentsAsync', payload });
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TextBubble);
