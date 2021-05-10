import * as d3 from 'd3';

declare const zrender: any;

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
  paddingTop = 25;
  paddingLeft = 10;
  avgRateScale = d3.scaleLinear<number, number>();
  pointScale = d3.scalePoint();
  container: any = new zrender.Group({ position: [0.5, 0.5] });
  containerWidth = 0;
  data: Array<number> = [];
  monthLabels: string[] = [
    '一月',
    '二月',
    '三月',
    '四月',
    '五月',
    '六月',
    '七月',
    '八月',
    '九月',
    '十月',
    '十一月',
    '十二月'
  ];

  containerHeight = 0;
  yScale = d3.scaleBand();
  xScale = d3.scaleLinear();
  brushContainer = new zrender.Group({ name: 'brush' });

  constructor(public selector: string) {
    this.selector = selector;
    this.elm = document.querySelector(selector);
    this._zr = zrender.init(this.elm);
    this._zr.add(this.container);
    this.height = this._zr.getHeight();
    this.width = this._zr.getWidth();
    this.containerWidth = this.width - 50;
    this.containerHeight = this.height - this.paddingTop * 2;
    this.container.attr('position', [50.5, this.paddingTop + 0.5]);
    this._zr.add(this.brushContainer);
    this.yScale
      .rangeRound([0, this.containerHeight])
      .domain(Array.from({ length: 12 }, (v, k) => `${k + 1}`))
      .paddingInner(0.2)
      .paddingOuter(0.2);
    this.xScale.rangeRound([0, this.containerWidth]).nice();
    this.brushContainer.attr('position', [this.width - 50 + 0.5, this.paddingTop + 0.5]);
  }
  load = (data: Array<number>) => {
    this.data = data;
    this.xScale.domain([0, d3.max(this.data) as number]);
    this.update();
  };
  createAxis = () => {
    const yAxis = new zrender.Group({ name: 'y-axis', position: [0, 0] });
    const step = Math.ceil(this.containerHeight / 7);
    Array.from({ length: 7 }, (v, k) => k).forEach(_ => {
      if (_ > 3) return;
      const tick = new zrender.Line({
        shape: {
          x1: _ * step,
          y1: this.containerHeight,
          x2: _ * step,
          y2: this.containerHeight + 5
        },
        style: { stroke: '#000' }
      });
      const yAxisLine = new zrender.Line({
        shape: { x1: _ * step, y1: 0, x2: _ * step, y2: this.containerHeight },
        style: {
          stroke: '#ccc',
          textPosition: 'bottom',
          lineDash: [5, 5],
          text: Math.round(this.xScale.invert(_ * step))
        }
      });

      yAxis.add(tick);
      yAxis.add(yAxisLine);
    });
    const xAxisLine = new zrender.Line({
      shape: { x1: 0, y1: this.containerHeight, x2: this.containerWidth, y2: this.containerHeight },
      style: { stroke: '#000' }
    });
    this.container.add(xAxisLine);
    this.container.add(yAxis);
  };
  update = () => {
    this.data.forEach((d, index) => {
      const width = this.xScale(d);
      const color = d3.rgb(0, 131, 250);
      const stroke = color.darker();
      const height = this.yScale.bandwidth() / 2;
      const y = this.yScale(`${index + 1}`) as number;
      // 125 106， 199
      const bar = new zrender.Rect({
        shape: { x: 0, y, height: height - 2, width },
        style: {
          fill: color,
          stroke,
          text: this.monthLabels[index],
          textPosition: 'left',
          textOffset: [-2, 0]
        },
        z: 50
      });
      const rect = new zrender.Rect({
        shape: { x: 0, y: y + height, height: height - 2, width: width / 2 },
        style: {
          fill: d3.rgb(125, 106, 199)
        },
        z: 50
      });
      this.container.add(bar);
      this.container.add(rect);
    });
    this.createAxis();
    // this.createBrushContext();
  };
  createBrushContext = () => {
    const rect = new zrender.Rect({
      shape: { x: 10, y: 0, width: 30, height: this.containerHeight },
      style: { stroke: '#ccc', fill: 'transparent' }
    });
    this.xScale.domain([0, d3.max(this.data) as number]);
    this.pointScale.range([0, this.containerHeight]).domain(d3.range(12).map(i => `${i}`));
    this.brushContainer.add(rect);
    const points = this.data.map((d, index) => {
      return { x: this.xScale(d), y: this.pointScale(`${index}`) };
    });
    this.brushContainer.add(
      new zrender.Polyline({
        shape: { points: points },
        style: { stroke: '#000', fill: 'red' }
      })
    );
  };
}
