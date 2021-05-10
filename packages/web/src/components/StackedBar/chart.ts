import * as d3 from 'd3';
import emitter from '../../event';
import { Color } from './inteface';
declare const zrender: any;
import { ScaleLinear, ScalePower, ScaleLogarithmic, ScalePoint, ScaleBand } from 'd3';
import { GridItem, Point } from '../Map/interface';

export default class Chart {
  private static instance: Chart;
  static getInstance(selector: string) {
    if (this.instance == null) this.instance = new Chart(selector);
    return this.instance;
  }
  width = 0;
  height = 0;
  _zr: any = null;
  elm: null | HTMLDivElement = null;
  center: [number, number] = [0, 0];
  bandwidth = 10;
  paddingLeft = 10;
  paddingTop = 0;
  data: Array<GridItem> = [];
  container: any = new zrender.Group({ position: [0.5, this.paddingTop + 0.5] });
  POIContainer: any = new zrender.Group({ position: [0.5, this.paddingTop + 0.5] });
  lineWidth = 0;
  singleScale: ScalePower<number, number> = d3.scalePow().exponent(8);
  boxScale: ScaleLinear<number, number> = d3.scaleLinear();
  // singleRadiusScale: ScalePower<> = d3.scaleSqrt();
  lineData: Array<{ id: string; source?: [number, number]; target: [number, number] }> = [];
  yScale: ScaleBand<string> = d3
    .scaleBand()
    .paddingInner(0.2)
    .paddingOuter(0.5);

  // 坐标轴容器
  axisContainer: any = new zrender.Group({
    name: 'axis'
  });

  scales: Array<ScaleLinear<number, number>> = [];
  barWidth = 0;
  rateScale: ScalePower<number, number> = d3.scalePow();
  countScale: ScaleLinear<number, number> = d3.scaleLinear();
  xScale: ScaleLogarithmic<number, number> = d3
    .scaleLog()
    .base(10)
    .clamp(true);
  lineHeight = 15;

  heatmapWidth = 0;
  poiScale: ScaleLinear<number, number> = d3.scaleLog().base(200);

  constructor(public selector: string) {
    this.selector = selector;
    this.elm = document.querySelector(selector);
    this._zr = zrender.init(this.elm);
    this._zr.add(this.container);
    this._zr.add(this.axisContainer);
    this.height = this._zr.getHeight();
    this.width = this._zr.getWidth();
    this.center = [Math.round(this.width / 2), Math.round(this.height / 2)];
    this.axisContainer.attr('position', [
      this.paddingLeft + 0.5,
      this.height - this.paddingTop + 0.5
    ]);
    this._zr.add(this.POIContainer);
    this.container.attr({ position: [0.5, 0.5] });
    this.lineWidth = Math.round(this.height / 3 / 1.4);
    this.yScale.rangeRound([0, this.height]);
  }
  load = (data: Array<GridItem>) => {
    this.data = data;
    this.bandwidth = this.data[0].y2 - this.data[0].y1;
    this.heatmapWidth = 45;
    this.barWidth = (this.width - this.heatmapWidth * 5) / 2;

    this.rateScale
      .rangeRound([this.barWidth - 10, 0])
      .domain([0, 5])
      .exponent(10);
    this.countScale.rangeRound([0, this.barWidth - 10]).domain([0, 15]);
    this.poiScale.rangeRound([20, this.width - 100]);
    this.update();
  };
  restore = () => {
    this.container.eachChild((c: any) => c.show());
  };

  bindEvent = () => {
    const dom = this._zr.dom as HTMLDivElement;
    const lineGroup = this.container.childOfName('hover-line-group');
    const line = lineGroup.childOfName('hover-line');
  };

  createHoverLine = () => {
    const hoverLineGroup = new zrender.Group({
      name: 'hover-line-group',
      position: [this.paddingLeft, 0]
    });
    hoverLineGroup.hide();
    const hoverLine = new zrender.Line({
      name: 'hover-line',
      shape: { x1: 0, y1: 0, x2: 0, y2: this.height - this.paddingTop * 2 },
      style: { stroke: '#000', lineWidth: 1, lineDash: [5, 5], text: '0', textPosition: 'top' },
      z: 50
    });
    hoverLineGroup.add(hoverLine);
    this.container.add(hoverLineGroup);
    this.bindEvent();
  };

  computeStack = () => {
    // 计算比例尺
    const maxValues: number[] = [];
    const minValues: number[] = [];

    this.data.forEach(d => {
      if (d.rateGroup == null) return;
      // 以下计算各网格对应的评分值的最大个数
      d.rateGroup.forEach((rate, index) => {
        if (maxValues[index] == null) maxValues[index] = rate;
        else maxValues[index] = maxValues[index] < rate ? rate : maxValues[index];
        if (minValues[index] == null) minValues[index] = rate;
        else minValues[index] = minValues[index] > rate ? rate : minValues[index];
      });
    });
    maxValues.forEach((maxValue, index) => {
      this.scales[index] = d3
        .scaleLog()
        .base(Math.E)
        .domain([minValues[index] === 0 ? 1 : minValues[index], maxValue])
        .clamp(true)
        .range([3, this.heatmapWidth - 2]);
    });
  };
  update = () => {
    this.computeStack();
    this.computeAvgRateRange(this.data);
    this.container.removeAll();
    this.data.forEach(d => {
      const group = new zrender.Group({
        name: `${d.y1}_${d.y2}`,
        position: [0, d.y1]
      });
      group.on('click', function() {
        console.log(d);
      });

      // 绘制单轴散点图

      const offset = this.heatmapWidth * 5 + 10;

      const minValue = d3.min(d.pois, i => i.avgRate) as number;
      const maxValue = d3.max(d.pois, i => i.avgRate) as number;

      const minPos = this.singleScale(minValue) + offset;
      const maxPos = this.singleScale(maxValue) + offset;
      const realPos = this.singleScale(d.avgRate);
      const fill = d3.rgb(141, 205, 146);
      const commonY = Math.round(this.bandwidth / 2);

      const arcScale = d3.scaleSqrt().rangeRound([2, this.bandwidth / 2]);

      group.add(
        new zrender.Line({
          shape: { x1: minPos, y1: commonY, x2: maxPos, y2: commonY },
          style: { fill: 'transparent', stroke: '#000' }
        })
      );
      group.add(
        new zrender.Circle({
          shape: { cx: minPos, cy: commonY, r: 4 },
          style: { fill, stroke: fill.darker() }
        })
      );
      group.add(
        new zrender.Circle({
          shape: { cx: maxPos, cy: commonY, r: 4 },
          style: { fill, stroke: fill.darker() }
        })
      );

      // 添加色块
      if (d.rateGroup != null)
        d.rateGroup.forEach((rate, index) => {
          const color = d3.rgb(Color[index]);
          const opacity = this.scales[index](rate);
          const offset = this.heatmapWidth * index;
          const width = this.scales[index](rate);
          const rect = new zrender.Rect({
            style: { fill: color, opacity, stroke: d3.rgb(color).darker() },
            shape: {
              x: offset,
              y: 0,
              height: this.bandwidth - 2,
              width
            }
          });
          group.add(rect);
        });
      this.container.add(group);
    });
  };
  computeAvgRateRange = (data: GridItem[]) => {
    const allItems = data.map(i => i.pois.map(d => d.avgRate)).flat();
    const [min, max] = [
      +(d3.min(allItems) as number).toFixed(1),
      +(d3.max(allItems) as number).toFixed(1)
    ];
    const domain = [min, max];
    this.singleScale.domain(domain).range([0, this.barWidth * 2 - 20]);
  };
  createConnetLine = (source: [number, number], target: [number, number]) => {
    const generator = d3
      .linkHorizontal()
      .x(d => d[0])
      .y(d => d[1]);
    return generator({ source, target });
  };

  computePOIData = (selectedPOIs: Point[]) => {
    const maxSingleValue = d3.max(selectedPOIs, d => {
      const values = Object.keys(d.rate).map(key => d.rate[key]);
      return d3.max(values) as number;
    }) as number;
    this.poiScale.domain([1, maxSingleValue]);
  };

  // 绘制分组柱状图用于比较
  highlight = (selectedPOIs: Point[]) => {
    // 计算选中的POI的总评分数
    this.container.hide();
    this.POIContainer.removeAll();
    // this.axisContainer.hide();
    this.computePOIData(selectedPOIs);
    this.yScale.domain(d3.range(selectedPOIs.length).map(i => `${i}`));
    selectedPOIs.sort((a, b) => {
      return a.y - b.y;
    });
    const singleHeight = this.yScale.bandwidth();
    selectedPOIs.forEach((poi, idx) => {
      const group = new zrender.Group({
        name: poi.poiId,
        position: [0, this.yScale(`${idx}`)]
      });

      this.lineData.push({
        id: poi.poiId,
        target: [0, this.paddingTop + group.position[1] + Math.ceil(singleHeight / 5) * 4]
      });
      let maxWidth = 0;
      let maxHeight = 0;

      Object.keys(poi.rate).forEach((key, index) => {
        const fill = d3.rgb(Color[index]);
        const stroke = fill.darker();
        const width = this.poiScale(poi.rate[key]);
        if (poi.rate[key] !== 0) maxHeight += Math.ceil(singleHeight / 5);
        if (width > maxWidth) maxHeight = Math.ceil(singleHeight / 5) * index;

        maxWidth = Math.max(width, maxWidth);
        const rect = new zrender.Rect({
          shape: {
            x: 0,
            y: Math.ceil(singleHeight / 5) * index,
            width,
            height: Math.ceil(singleHeight / 5)
          },
          style: { fill, stroke }
        });
        group.add(rect);
      });

      group.add(
        new zrender.Text({
          position: [maxWidth + 5, Math.round(maxHeight / 2)],
          style: {
            text: poi.poiName,
            textPosition: 'right'
          }
        })
      );
      this.POIContainer.add(group);
    });
    emitter.emit('connect', this.lineData);
  };
}
