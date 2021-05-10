import React from 'react';
import './index.css';
import { POIItem, Point, GridItem, Props } from './interface';
import * as d3 from 'd3';
import { Quadtree, QuadtreeLeaf, QuadtreeInternalNode, BrushBehavior, Selection } from 'd3';
import Chart from './chart';
import emitter from '../../event';
import ConvexHullGrahamScan from '../../utils/convex-hull/gramham';
import { connect } from 'dva';
import { Dispatch } from 'redux';
import StackedBar from '../StackedBar';
import TitleBar from '../TitleBar';
import { Spin, Icon } from 'antd';
import { MapState } from '../../models/map';
import TimeSelection from '../TimeSelection';
declare const AMap: any;

class Map extends React.Component<Props> {
  map?: any;
  dummyMap: any = null;
  chart?: Chart;
  width = 0;
  height = 0;
  activatePOI = '5015';
  svg?: Selection<SVGElement, {}, HTMLElement, {}>;
  bandwidth = 15;
  data: Array<POIItem> = [];
  ref: React.RefObject<HTMLDivElement> = React.createRef();
  selected?: Array<Point>;
  brush: BrushBehavior<any> = d3.brush();
  gridsCache: GridItem[] = [];
  selectedQuadTree = d3
    .quadtree<Point>()
    .x(d => d.x)
    .y(d => d.y);
  quadTree = d3
    .quadtree<Point>()
    .x(d => d.x)
    .y(d => d.y);
  hasBrush = false;

  state = {
    hasBrush: false
  };

  render() {
    return (
      <div className="map-view">
        <TitleBar title="Map"></TitleBar>
        {this.props.loading === true ? (
          <div className="loading-mask">
            <Spin
              tip="地图计算中..."
              indicator={<Icon style={{ fontSize: 24 }} type="loading"></Icon>}
            ></Spin>
          </div>
        ) : null}
        <div className="map-wrapper" ref={this.ref}>
          <div
            className="brush-container"
            style={{ zIndex: this.props.enableMapSelect ? 200 : -1 }}
          >
            <svg width="100%" height="100%"></svg>
          </div>
          <div className="canvas-map"></div>
          <div id="map-container" className="map-container"></div>
          <div id="dummy-map"></div>
        </div>
        <StackedBar></StackedBar>
        <TimeSelection></TimeSelection>
      </div>
    );
  }

  lngLatToContainer = (
    x: number | string,
    y: number | string,
    map: any
  ): { x: number; y: number } => {
    const lngLat = new AMap.LngLat(x, y);
    const pixel = map.lnglatTocontainer(lngLat);
    return { x: Math.ceil(pixel.x), y: Math.ceil(pixel.y) };
  };

  containerToLngLat = (x: number, y: number, map: any) => {
    const pixel = new AMap.Pixel(x, y);
    return map.containerToLngLat(pixel);
  };

  search = (
    quadTree: Quadtree<Point>,
    x0: number,
    y0: number,
    x3: number,
    y3: number,
    selected: Array<Point>
  ) => {
    quadTree.visit(
      (
        node: QuadtreeLeaf<Point> | QuadtreeInternalNode<Point>,
        x1: number,
        y1: number,
        x2: number,
        y2: number
      ) => {
        if (!node.length) {
          do {
            const d = (node as QuadtreeLeaf<Point>).data;
            const isSelected = d.x >= x0 && d.x < x3 && d.y >= y0 && d.y < y3;
            if (isSelected === true) selected.push({ ...d });
          } while ((node = (node as QuadtreeLeaf<Point>).next as QuadtreeLeaf<Point>));
        }
        return x1 >= x3 || y1 >= y3 || x2 < x0 || y2 < y0;
      }
    );
  };

  init() {
    // 计算容器宽高
    if (this.ref == null || this.ref.current == null) return;
    const { width, height } = this.ref.current.getBoundingClientRect();
    this.width = width;
    this.height = height;
    // 使用四叉树加速空间查找
    this.quadTree.extent([[0, 0], [this.width, this.height]]);
    this.selectedQuadTree.extent([[0, 0], [this.width, this.height]]);

    const map = new AMap.Map('map-container', {
      zoom: 13,
      features: ['bg', 'building', 'point', 'road'],
      mapStyle: 'amap://styles/whitesmoke',
      center: [104.064865, 30.654403] //中心点坐标
    });
    const dummyMap = new AMap.Map('dummy-map', {
      zoom: 16,
      center: [104.064865, 30.654403] //中心点坐标
    });
    // AMap.plugin(['AMap.Scale', 'AMap.ToolBar'], function() {
    //   const scale = new AMap.Scale();
    //   map.addControl(scale);
    // });
    this.map = map;
    this.map.on(
      'zoomend',
      () => {
        // 计算得到真正的坐标点
        setTimeout(() => {
          if (this.selected == null || this.selected.length === 0) return;
          const points = this.selected.map(d => {
            const { x, y } = this.lngLatToContainer(d.longtitude, d.latitude, this.map);
            return { ...d, x, y };
          });
          // 计算选中的poi点的关键词
          if (this.chart != null) this.chart.highlight(points);
        });
      },
      1000
    );

    this.dummyMap = dummyMap;
  }

  computeMaxValuePOI = (pois: Point[]) => {
    const tmp = pois.map(poi =>
      Object.keys(poi.rateGroup)
        .map(key => poi.rateGroup[key].month_count)
        .reduce((a, b) => a + b)
    );
    const maxValue = d3.max(tmp) as number;
    const index = tmp.findIndex(i => i === maxValue);
    return pois[index].poiId;
  };

  zoom = () => {
    if (this.selected == null || this.selected.length === 0) return;
    this.centriod(this.selected);
    d3.select('.map-wrapper > .brush-container').remove();
  };

  // 获取相关景点Id
  getRelatedPOIIds = () => {
    this.props.computeRelatedPOIs({ poiId: this.activatePOI, timeRange: this.props.timeRange });
  };

  createBrush = () => {
    // 创建Svg
    if (this.svg == null) this.svg = d3.select('.map-wrapper > .brush-container > svg');
    // 搜索
    const brushed = () => {
      if (d3.event.selection === null && this.chart != null) {
        emitter.emit('select', []);
        return;
      }

      const [[x0, y0], [x1, y1]] = d3.event.selection;
      const selected: Array<Point> = [];
      this.search(this.quadTree, x0, y0, x1, y1, selected);
      this.selected = selected;
      this.props.computeSelectedPOIs(this.selected);
      this.props.setLoading(true);
      this.zoom();
    };
    this.brush = d3.brush().on('end', brushed);
    this.svg
      .append('g')
      .attr('class', 'brush')
      .call(this.brush);
  };

  gridRangeToPixel = (range: number) => {
    if (range === 100) return 30;
    if (range === 50) return 15;
    if (range === 200) return 60;
  };

  grid = (gridRange: number) => {
    // 使用四叉树划分网格
    const midY = Math.round(this.height / 2);
    const grids: Array<Pick<GridItem, 'pois' | 'y1' | 'y2' | 'name'>> = [];
    const bandwidth = this.gridRangeToPixel(gridRange) as number;

    const maxGridCount = Math.ceil(midY / bandwidth) + 1;
    let count = 1;

    // 从中心点向下划分网格
    Array.from({ length: maxGridCount }).forEach((item, index) => {
      const x1 = 0;
      const x2 = this.width;
      const y1 = index * bandwidth + midY;
      const y2 = index * bandwidth + midY + bandwidth;
      if (y2 > this.height) return;
      const selected: Array<Point> = [];
      this.search(this.quadTree, x1, y1, x2, y2, selected);

      grids.push({ pois: selected, y1, y2 });
    });

    // 从中心点向上划分网格
    Array.from({ length: maxGridCount }).forEach((item, index) => {
      if (index === 0) return;
      const x1 = 0;
      const x2 = this.width;
      const y1 = -index * bandwidth + midY;
      const y2 = -index * bandwidth + midY + bandwidth;
      if (y1 < 0) return;
      const selected: Array<Point> = [];
      this.search(this.quadTree, x1, y1, x2, y2, selected);
      grids.push({ pois: selected, y1, y2 });
    });

    // 对网格按垂直位置从上到下排序
    grids.sort((a, b) => a.y1 - b.y1);
    grids.forEach(grid => (grid.name = `grid_${count++}`));
    const result = this.computeStack(grids) as GridItem[];
    this.gridsCache = [...result];
    this.props.grids(result);
    if (this.chart == null) return;
    this.chart.load(result);
  };

  computeStack = (data: Array<Pick<GridItem, 'pois' | 'y1' | 'y2' | 'name'>>) => {
    return data.map(item => {
      if (item.pois == null || item.pois.length === 0)
        return { name: item.name, pois: [], y1: item.y1, y2: item.y2 };
      const rateGroup: number[] = [];
      let avgRate = 0;
      item.pois.forEach(poi => {
        if (poi.rate == null) return;
        Object.keys(poi.rate).forEach((key: string, index: number) => {
          const rate = poi.rate[key];
          if (rateGroup[index] == null) rateGroup[index] = rate;
          else rateGroup[index] += rate;
        });
        avgRate += parseFloat(`${poi.avgRate}`);
      });

      return {
        name: item.name,
        pois: item.pois,
        rateGroup,
        count: item.pois.length,
        y1: item.y1,
        y2: item.y2,
        avgRate: +parseFloat('' + avgRate / item.pois.length).toFixed(2)
      };
    });
  };

  computeConvexHull = (points: Array<Point>) => {
    const convexHull = new ConvexHullGrahamScan();
    convexHull.compute(points);
    const indices = convexHull.getIndices() as number[];
    return indices.map(i => ({ ...points[i] }));
  };

  computeGravityCentriod = (points: Array<Point>) => {
    let x = 0;
    let y = 0;
    points.forEach(point => {
      x += point.x;
      y += point.y;
    });
    return { x: Math.round(x / points.length), y: Math.round(y / points.length) };
  };

  centriod = (data: Array<Point>) => {
    // 计算刷选区域的中心点
    if (this.chart == null) return;
    this.chart.hide();
    // 取消刷选
    d3.select('.brush-container svg g.brush').call(this.brush.move as any, null);

    const points = data.map(d => {
      const { x, y } = this.lngLatToContainer(d.longtitude, d.latitude, this.dummyMap);
      return { ...d, x, y };
    });

    const result = points.length >= 3 ? this.computeConvexHull(points) : points;
    const centroid = this.computeGravityCentriod(result);
    const { lng, lat } = this.containerToLngLat(centroid.x, centroid.y, this.dummyMap);

    this.map.setCenter(new AMap.LngLat(lng, lat));
    this.map.setZoom(16);
  };

  addPOI2Quadtree = (pois: POIItem[], gridRange: number) => {
    pois.forEach(poi => {
      const { x, y } = this.lngLatToContainer(poi.longtitude, poi.latitude, this.map);
      if (x < 0 || x > this.width || y < 0 || y > this.height) return;
      this.quadTree.add({ ...poi, x, y });
    });
    this.grid(gridRange);
  };

  componentWillReceiveProps = (nextProps: Props) => {
    if (this.chart == null) return;
    // 数据仍在加载中
    if (nextProps.loading === true) return;
    if (nextProps.pois.length !== 0 && this.props.pois !== nextProps.pois)
      this.addPOI2Quadtree(nextProps.pois, nextProps.gridRange);

    if (nextProps.timeRange != this.props.timeRange) {
      this.props.computeRelatedPOIs({
        poiId: '5015',
        timeRange: nextProps.timeRange
      });
    }
  };

  componentDidMount() {
    this.init();
    this.chart = Chart.getInstance('.canvas-map');
    this.getRelatedPOIIds();
    const { fetch } = this.props;
    fetch();
    emitter.on('zoom-end', () => this.props.setLoading(false));
    emitter.on('activate-poi', (id: string) => {
      this.activatePOI = id;
      this.props.setActivatePOI(id);
    });
    this.createBrush();
  }
}

const mapStateToProps = (state: { mapModel: MapState }) => {
  const { mapModel } = state;
  return {
    pois: mapModel.pois,
    loading: mapModel.loading,
    selectedPOIs: mapModel.selectedPOIs,
    timeRange: mapModel.timeRange,
    gridRange: mapModel.gridRange,
    enableMapSelect: mapModel.enableMapSelect
  };
};

const mapDispatchToProps = (dispatch: Dispatch) => ({
  fetch() {
    dispatch({
      type: 'mapModel/fetchPOIs'
    });
  },
  setActivatePOI(payload: string) {
    dispatch({ type: 'mapModel/setActivatePOI', payload });
  },
  grids(payload: GridItem[]) {
    dispatch({ type: 'mapModel/grids', payload });
  },
  computeSelectedPOIs(payload: Point[]) {
    dispatch({ type: 'mapModel/selectedPOIs', payload });
  },
  computeRelatedPOIs(payload: { poiId: string; timeRange: string[] }) {
    dispatch({ type: 'mapModel/computeRelatedPOIsAsync', payload });
  },
  setLoading(payload: boolean) {
    dispatch({ type: 'mapModel/loading', payload });
  },
  computeKeywords(payload: { poiId: string; timeRange: string[] }) {
    dispatch({ type: 'bubbleModel/computeKeywordsAsync', payload });
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Map);
