declare const zrender: any;
import * as d3 from 'd3';
export default class Chart {
  _zr: any;
  timeRange: string[] = [];
  data?: { map: Record<string, string>; data: Array<{ ids: string[]; support: number }> };
  container: any = new zrender.Group();
  tooltipElm?: HTMLDivElement;

  private static instance: Chart;
  width = 0;
  height = 0;
  paddingTop = 70;
  paddingLeft = 70;
  paddingRight = 30;
  ids: string[] = [];
  colorMap: Record<string, string> = {};
  barHeight = 12;
  barWidth = 0;
  padding = 15;
  pivot = '';
  containerWidth = 0;
  static getInstance(selector: string): Chart {
    if (this.instance == null) this.instance = new Chart(selector);
    return this.instance;
  }
  constructor(public selector: string) {
    const elm = document.querySelector(selector);
    this._zr = zrender.init(elm);
    this.width = this._zr.getWidth();
    this.height = this._zr.getHeight();
    this._zr.add(this.container);
    this.container.attr('position', [this.paddingLeft + 0.5, this.paddingTop + 0.5]);
  }
  load = (
    data: {
      map: Record<string, string>;
      data: Array<{ ids: string[]; support: number }>;
    },
    pivot = '1242',
    colorMap: Record<string, string>
  ) => {
    this.data = data;
    this.resize(data.data.length);
    this.sort();
    this._zr.refresh();
    this.pivot = pivot;
    this.colorMap = colorMap;
    this.ids = Object.keys(this.data.map);
    const idx = this.ids.findIndex(i => i === this.pivot);
    if (idx === -1) return;
    // 将基准景点至于第一位
    [this.ids[0], this.ids[idx]] = [this.ids[idx], this.ids[0]];
    // 计算宽度、高度
    this.containerWidth = this.width - this.paddingLeft - this.paddingRight;
    this.barWidth = Math.round(this.containerWidth / this.ids.length);
    this.update();
  };
  resize = (len: number) => {
    const canvasHeight = this.paddingTop * 2 + len * (this.barHeight + this.padding);
    this.height = canvasHeight;
    this._zr.resize({
      width: this.width,
      height: canvasHeight
    });
  };
  update = () => {
    this.paintText();
    this.paintBar();
  };
  sort = () => {
    if (this.data == null) return;
    // 按照项数排序
    const { data } = this.data;
    data.sort((a, b) => {
      const aLen = a.ids.length;
      const bLen = b.ids.length;
      if (aLen !== bLen) return bLen - aLen;
      else return b.support - a.support;
    });
  };
  paintText = () => {
    if (this.data == null) return;
    const { map } = this.data;
    const group = new zrender.Group({ name: 'title-container', position: [0, -this.paddingTop] });
    this.ids.forEach((id, index) => {
      const text = map[id];
      const x = index * this.barWidth + this.barWidth / 2;
      const line = new zrender.Line({
        shape: { x1: x, y1: this.paddingTop, x2: x, y2: this.paddingTop - 5 },
        style: {
          stroke: '#000',
          text,
          textAlign: 'start',
          textRotation: Math.PI / 4,
          textPosition: [0, -10]
        }
      });
      group.add(line);
    });

    this.container.add(group);
  };
  paintBar = () => {
    if (this.data == null) return;
    const { data } = this.data;
    data.forEach((item, groupIndex) => {
      const group = new zrender.Group({
        position: [0, (this.barHeight + this.padding) * groupIndex]
      });
      const { ids, support } = item;
      this.ids.forEach((bar, index) => {
        const isExists = ids.findIndex(i => i === bar) !== -1;
        const fill = d3.rgb(this.colorMap[bar]);
        const stroke = fill.darker();
        const opacity = isExists === true ? 0.7 : 0.1;
        const rect = new zrender.Rect({
          shape: { x: index * this.barWidth, y: 0, width: this.barWidth, height: this.barHeight },
          style: { fill, stroke, opacity }
        });
        group.add(rect);
      });
      const star = new zrender.Star({
        shape: {
          n: ids.length,
          cx: -15,
          cy: Math.round(this.barHeight / 2),
          r: Math.round(this.barHeight * 0.65)
        },
        style: {
          fontSize: 14,
          text: support,
          textAlign: 'left',
          textPosition: [-35, 0],
          fill: 'transparent',
          stroke: '#000'
        }
      });
      group.add(star);
      this.container.add(group);
    });
  };
}
