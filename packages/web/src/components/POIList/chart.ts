import * as d3 from 'd3';

declare const zrender: any;
import { ScaleLinear, ScalePoint } from 'd3';
import { Point } from '../Map/interface';
import contour from '../../utils/closure/contour';

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
  bandwidth = 15;
  padding = 10;
  avgRateScale = d3.scaleLinear<number, number>();
  container: any = new zrender.Group({ position: [0.5, this.padding + 0.5] });

  scales: Array<ScaleLinear<number, number>> = [];
  xScale: ScalePoint<number> = d3.scalePoint<number>();

  data: Array<Point> = [];

  constructor(public selector: string) {
    this.selector = selector;
    this.elm = document.querySelector(selector);
    this._zr = zrender.init(this.elm);
    this._zr.add(this.container);
    this.height = this._zr.getHeight();
    this.width = this._zr.getWidth();

    this.center = [Math.round(this.width / 2), Math.round(this.height / 2)];

    this.container.attr({
      position: [0.5, 0.5]
    });
  }
  load = (data: Array<Point>) => {
    this.data = data;
    this.update();
  };
  update = () => {
    this.data.forEach(d => {
      const circle = new zrender.Circle({
        shape: { cx: d.x, cy: d.y, r: 10 },
        style: { fill: 'transparent', stroke: '#000' }
      });
      this.container.add(circle);
    });
    const test = this.data.map(d => ({ contourPadding: 10, x: d.x, y: d.y, r: 10 }));
    const result = contour(test, 5);
  };
}
