declare const zrender: any;
import * as d3 from 'd3';

import { Point, GridItem } from './interface';
import emitter from '../../event';
import { ScaleLogarithmic, ScalePower, ScaleLinear, pointRadial, ScaleSequential } from 'd3';
import Circle from '../../utils/closure/circle';
export default class Chart {
  private static instance: Chart;
  static getInstance(selector: string): Chart {
    if (this.instance == null) this.instance = new Chart(selector);
    return this.instance;
  }
  _zr?: any;
  data: Array<GridItem> = [];
  width = 0;
  height = 0;
  center: [number, number] = [0, 0];
  gridWidth = 30;
  arcScale: ScalePower<number, number> = d3.scaleSqrt();
  legendContainer = new zrender.Group({ name: 'legend-container', position: [0, 250] });
  highRateScale: ScaleLinear<number, number> = d3
    .scaleLog()
    .base(Math.E)
    .clamp(true);
  bandwidth = 0;
  lowRateScale: ScaleLinear<number, number> = d3.scaleLinear();
  lineGenerator = d3.linkHorizontal();
  radialLineGenerator = d3
    .lineRadial()
    .angle((d: [number, number]) => d[0])
    .radius((d: [number, number]) => d[1]);
  colorScale = d3.scaleSequential(d3.interpolateYlGnBu);
  nodes: Array<{ r: number; x: number; y: number }> = [];
  lineData: Array<{ id: string; source: [number, number]; target?: [number, number] }> = [];
  poiContainer: any = new zrender.Group({ position: [0.5, 0.5] });
  hoverContainer: any = new zrender.Group({ position: [0.5, 0.5] });
  brushContainer: any = new zrender.Group({ position: [0.5, 0.5] });
  gridContainer: any = new zrender.Group({ position: [0.5, 0.5] });
  connectionContainer: any = new zrender.Group({ position: [0.5, 0.5] });
  poiColorScale: ScaleSequential<string> = d3.scaleSequential(d3.interpolateOrRd).domain([0, 5]);
  thresholdColorScale: d3.ScaleThreshold<number, string> = d3.scaleThreshold<number, string>();
  gridPositionCache: number[][] = [];
  hoverRect: any = null;
  constructor(public selector: string) {
    const elm = document.querySelector(selector);
    this._zr = zrender.init(elm);

    this._zr.add(this.gridContainer);
    this._zr.add(this.poiContainer);
    this._zr.add(this.legendContainer);

    this._zr.add(this.hoverContainer);
    this._zr.add(this.brushContainer);
    this.width = this._zr.getWidth();
    this.height = this._zr.getHeight();
    this.center = [Math.round(this.width / 2), Math.round(this.height / 2)];
    emitter.on(
      'connect',
      (message: Array<{ id: string; source: [number, number]; target?: [number, number] }>) => {
        this.lineData = message;
      }
    );
  }
  load = (data: Array<GridItem>) => {
    this.data = data;
    // 建立颜色映射

    this.setColorScale(this.data);
    this.drawLegend();
    this.gridWidth = this.data[0].y2 - this.data[0].y1;
    this.update();
    this.gridInteraction();
  };

  setColorScale = (data: GridItem[]) => {
    let minAvgRate = Number.MAX_SAFE_INTEGER;
    let maxAvgRate = 0;
    data.forEach(grid => {
      const { pois } = grid;
      pois.forEach(poi => {
        const avgRate = poi.avgRate;
        if (minAvgRate > avgRate) minAvgRate = avgRate;
        if (avgRate > maxAvgRate) maxAvgRate = avgRate;
      });
    });
    // 将最高评分与最低评分划为7档
    // const step = +parseFloat(`${(maxAvgRate - minAvgRate) / 7}`).toFixed(1);
    const step = 0.1;
    const domain: number[] = [];
    for (let i = minAvgRate; i < maxAvgRate; i = i + step) {
      domain.push(+i.toFixed(1));
    }
    if (domain[domain.length - 1] < maxAvgRate) domain.push(+maxAvgRate.toFixed(1));
    this.thresholdColorScale
      .domain(domain)
      .range([
        '#f1f1f1',
        '#fff5eb',
        '#fee6ce',
        '#fdd0a2',
        '#fdae6b',
        '#fd8d3c',
        '#f16913',
        '#d94801',
        '#a63603'
      ]);
    // this.thresholdColorScale.domain(domain).range([]);
  };

  // 高亮显示被选中的景点
  highlight = (data: Array<Point>) => {
    const nodes = this.computeRadius(data);

    this.poiContainer.hide();
    this.brushContainer.hide();
    this.hoverRect.hide();
    // 数据点偏移
    const simulation = d3
      .forceSimulation<{ x: number; y: number; r: number }>()
      .force('collision', d3.forceCollide((d: any) => d.r + 0.5))
      .on('tick', () => {
        this.hoverContainer.removeAll();
        nodes.forEach(node => {
          const idx = this.lineData.findIndex(i => i.id === node.point.poiId);
          if (idx !== -1) this.lineData[idx].source = [node.x, node.y];
          const g = this.gauge(node.x, node.y, node.r, node.point);
          this.hoverContainer.add(g);
        });
      });
    simulation.on('end', () => {
      emitter.emit('zoom-end');
      this.createConnectLine();
    });
    this.nodes = nodes;
    simulation.nodes(nodes);
  };

  createConnectLine = () => {
    this.lineData.forEach(item => {
      if (item.target == null || item.source == null) return;
      const pathStr = this.lineGenerator({
        source: item.source,
        target: [this.width, (item.target as [number, number])[1]]
      });
      const path = zrender.path.createFromString(pathStr, {
        style: { stroke: 'rgba(0,0,0,0.9)', lineWidth: 1, fill: 'transparent' },
        z: 10
      });
      this.hoverContainer.add(path);
    });
  };

  findGrid = (offsetY: number, cache: number[][]) => {
    const idx = cache.findIndex(c => c[0] < offsetY && c[1] > offsetY);
    return idx === -1 ? null : this.data[idx];
  };

  // 网格交互
  gridInteraction = () => {
    const dom: HTMLDivElement = this._zr.dom;
    const rect = new zrender.Rect({
      name: 'hover-rect',
      invisible: true,
      shape: { x: 0, y: 0, height: this.gridWidth, width: this.width },
      style: { fill: d3.rgb(203, 214, 223), opacity: 0.5, stroke: '#000', lineDash: [5] }
    });
    this.brushContainer.add(rect);
    this.hoverRect = rect;
    this.brushContainer.add(new zrender.Group({ name: 'hover-pois' }));
    dom.addEventListener('mouseover', ev => {
      // 计算当前鼠标所在网格
      this.poiContainer.eachChild((c: any) => {
        c.attr('style', { fill: d3.rgb(0, 0, 0, 0.5), stroke: 'transparent' });
      });
      this.hoverRect.attr('invisible', false);
    });
    dom.addEventListener('mousemove', ev => {
      const hoveredGrid = this.findGrid(ev.offsetY, this.gridPositionCache);
      if (hoveredGrid == null) return;
      if (this.hoverRect == null) return;
      const group = this.brushContainer.childOfName('hover-pois');
      if (group == null) return;
      group.removeAll();

      this.hoverRect.attr('shape', { y: hoveredGrid.y1 });
      hoveredGrid.pois.forEach(poi => {
        const fill = this.poiColorScale(poi.avgRate);
        const stroke = d3.rgb(fill).darker();
        const circle = new zrender.Circle({
          z: 100 * poi.avgRate,
          rawFill: fill,
          shape: { cx: poi.x, cy: poi.y, r: 4 },
          style: {
            fill,
            lineWidth: 1,
            stroke
          }
        });
        group.add(circle);
      });
    });
    dom.addEventListener('mouseleave', () => {
      this.hoverRect.attr('invisible', true);
      this.poiContainer.eachChild((c: any) => {
        const fill = d3.rgb(c.rawFill);
        const stroke = fill.darker();
        c.attr('style', { fill, stroke });
      });
    });
  };

  drawLegend = () => {
    const domain = this.thresholdColorScale.domain();
    const domainText: string[] = [];
    domain.forEach((d, dIndex) => {
      if (dIndex === 0) {
        domainText.push(`< ${d.toFixed(1)}`);
        return;
      }
      domainText.push(`>= ${domain[dIndex - 1].toFixed(1)}`);
    });
    domainText.push(`> ${domain[domain.length - 1].toFixed(1)}`);
    const range = this.thresholdColorScale.range();
    const padding = 10;
    const radius = 6;
    range.forEach((r, rIndex) => {
      const fill = d3.rgb(r);
      const stroke = fill.darker();
      const rect = new zrender.Rect({
        shape: {
          y: rIndex * (radius * 2 + 10),
          x: radius,
          height: radius * 2,
          width: radius * 2
        },
        style: {
          fill,
          stroke,
          text: domain[rIndex],
          textPosition: [15, 10]
          // text: domainText[rIndex],
          // textAlign: 'left',
          // textPosition: [radius * 3, -1]
        }
      });
      this.legendContainer.add(rect);
    });
  };

  // 更新视图
  update = () => {
    this.poiContainer.removeAll();
    this.gridPositionCache = this.data.map(grid => [grid.y1, grid.y2]);
    this.data.forEach(grid => {
      const pois = grid.pois;
      if (pois == null) return;
      pois.forEach(poi => {
        const fill = this.thresholdColorScale(poi.avgRate);
        const stroke = d3.rgb(fill).darker();
        const circle = new zrender.Circle({
          z: 100 * poi.avgRate,
          rawFill: fill,
          shape: { cx: poi.x, cy: poi.y, r: 4 },
          style: {
            fill,
            lineWidth: 1,
            stroke
          }
        });
        this.poiContainer.add(circle);
      });
    });
  };

  hide = () => {
    this.poiContainer.hide();
  };

  // 计算POI的半径
  computeRadius = (data: Point[]) => {
    // 计算每一个POI在12个月份内发表的景点评论数量
    const allCommentsCount = data.map(d =>
      Object.keys(d.rateGroup)
        .map(key => d.rateGroup[key].month_count)
        .reduce((a, b) => a + b)
    );
    const minValue = d3.min(allCommentsCount) as number;
    const maxValue = d3.max(allCommentsCount) as number;

    this.arcScale.domain([minValue, maxValue]).rangeRound([20, 90]);
    return data.map((d, index) => {
      const value = allCommentsCount[index];
      return { x: d.x, y: d.y, point: { ...d }, r: this.arcScale(value) };
    });
  };

  gauge = (x: number, y: number, r: number, d: Point) => {
    const group = new zrender.Group({ name: d.poiId });
    // group.on('click', () => emitter.emit('activate-poi', d.poiId));

    const monthComments = Object.keys(d.rateGroup).map(key => d.rateGroup[key].month_count);
    this.highRateScale.domain([1, d3.max(monthComments) as number]).rangeRound([0, r]);
    const fill = [d3.rgb(118, 184, 223).brighter(0.5), d3.rgb(255, 148, 164).brighter(0.5)];
    const stroke = [d3.rgb(118, 184, 223).darker(), d3.rgb(255, 148, 164).darker()];

    const months = Object.keys(d.rateGroup).map(key => d.rateGroup[key]);

    months.forEach((month, index) => {
      const originRadius = this.highRateScale(month.month_count);
      const raw = month.items;
      const paddingAngle = (Math.PI / 360) * 5;
      const startAngle = (index * Math.PI) / 6 + paddingAngle - Math.PI / 2;
      const endAngle = startAngle + Math.PI / 6 - paddingAngle;
      const r0 = 5;
      // 绘制2018年的数据
      const prevYearRadius = Math.round(originRadius * (raw[0].value / month.month_count));
      const sector = new zrender.Sector({
        shape: { r: prevYearRadius + r0, r0: r0, cx: x, cy: y, startAngle, endAngle },
        style: {
          fill: fill[0],
          stroke: stroke[0]
        },
        z: 50
      });

      group.add(
        new zrender.Sector({
          z: 50,
          shape: {
            r0: prevYearRadius + r0,
            r: originRadius + r0,
            cx: x,
            cy: y,
            startAngle,
            endAngle
          },
          style: { fill: fill[1], stroke: stroke[1] }
        })
      );
      // 有色圆表示评分
      // const rateFill = d3.rgb(this.poiColorScale(d.avgRate));
      const rateFill = d3.rgb(this.thresholdColorScale(d.avgRate));
      const rateStroke = rateFill.darker();
      const circle = new zrender.Circle({
        shape: { cx: x, cy: y, r: r0 },
        style: { fill: rateFill, stroke: rateStroke },
        z: 100
      });
      group.add(circle);
      group.add(sector);
    });
    return group;
  };
}
