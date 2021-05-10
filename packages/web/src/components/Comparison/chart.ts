import * as d3 from 'd3';
import { throttle } from '../../utils/optimize';
import { ComparsionDataItem } from './interface';
declare const zrender: any;

type Datum = {
  month: string;
  data: {
    poiId: string;
    sentimentValue?: [string, number][];
    month: string;
    value: number;
    data: { rate: number; count: number }[];
  }[];
};

type StackDatum = {
  month: string;
  stackData: Array<{ d0: number; d1: number; value: number; poiId: string }>;
};

export default class Chart {
  _zr: any;
  timeRange: string[] = [];
  data: ComparsionDataItem[] = [];
  container: any = new zrender.Group({ name: 'bump-container' });
  tooltipElm?: HTMLDivElement;

  private static instance: Chart;
  width = 0;
  height = 0;

  cachePosition: Array<{ date: string; x0: number; x1: number }> = [];
  color: string[] = ['#FAC7C4', '#C5D7E5', '#D5ECDD', '#DBC4DF'];
  barColor: string[] = ['#c23531', '#61a0a8', '#d48265', '#2f4554', '#91c7ae'];

  paddingTop = 10;
  valuePadding = 20;
  paddingBottom = 30;

  colorMap: Record<string, string> = {};

  paddingLeft = 30;

  lineChartHeight = 0;

  calendarGridWidth = 13;

  nameMap: Record<string, string> = {};

  bandwidth = 0;
  barWidth = 0;
  groupWidth = 0;
  yScale = d3.scaleLinear();
  contextScale = d3.scaleLinear();

  valueScale = d3.scaleLinear();

  categories = ['景点', '感觉', '美食', '环境', '价格'];

  static getInstance(selector: string): Chart {
    if (this.instance == null) this.instance = new Chart(selector);
    return this.instance;
  }
  axisContainer: any = new zrender.Group({ name: 'axis' });
  contextContainer: any = new zrender.Group({ name: 'context' });
  constructor(public selector: string) {
    const elm = document.querySelector(selector);
    this._zr = zrender.init(elm);
    this.width = this._zr.getWidth();
    this.height = this._zr.getHeight();
    this._zr.add(this.container);
    this._zr.add(this.axisContainer);
    this._zr.add(this.contextContainer);

    this.container.attr('position', [this.paddingLeft + 0.5, this.paddingTop + 0.5]);
    this.lineChartHeight = this.height - this.paddingTop - this.paddingBottom;
    this.axisContainer.attr('position', [
      this.paddingLeft + 0.5,
      this.paddingTop + this.lineChartHeight + 0.5
    ]);
    this.contextContainer.attr('position', [
      this.paddingLeft + 0.5,
      this.paddingTop + this.lineChartHeight + this.paddingBottom + 10 + 0.5
    ]);

    this.createTooltip();
  }
  load = (data: ComparsionDataItem[], timeRange: string[]) => {
    this.timeRange = timeRange;

    this.data = data;
    // [this.timeRange[5], this.timeRange[4]] = [this.timeRange[4], this.timeRange[5]];
    this.data
      .map(i => ({ id: i.poiId, name: i.poiName }))
      .forEach(({ id, name }, index) => {
        this.nameMap[id] = name;
        this.colorMap[id] = this.color[index];
      });
    this.barWidth = 100;
    // 计算图形宽度, 默认情况下仅展示6个月的对比数据, 若超过6个月则固定宽度
    if (this.timeRange.length <= 6)
      this.bandwidth =
        (this.width - this.paddingLeft * 2 - this.timeRange.length * this.barWidth) /
        (this.timeRange.length - 1);
    else {
      this.bandwidth = 250;
      this.width =
        this.timeRange.length * this.barWidth +
        this.paddingLeft * 2 +
        this.bandwidth * (this.timeRange.length - 1);
      this._zr.resize({ width: this.width, height: this.height });
    }
    // 设置时间范围
    // 计算最大值
    this.getMaxValue(this.data);
    this.update();
  };

  createNameLegend = () => {
    let group = this.container.childOfName('name-legend-container');
    if (group == null) group = new zrender.Group({ name: 'name-legend-container' });
    group.removeAll();
    const legendRadius = 7;
    const padding = 20;
    Object.keys(this.nameMap).forEach((id, index) => {
      const fill = d3.rgb(this.colorMap[id]);
      const stroke = fill.darker();
      const circle = new zrender.Circle({
        shape: {
          cy: index * (legendRadius + padding),
          cx: Math.round(legendRadius / 2),
          r: legendRadius
        },
        style: {
          fill,
          text: this.nameMap[id],
          textPosition: [legendRadius * 2 + 8, Math.round(legendRadius / 2) - 2],
          stroke
        }
      });
      group.add(circle);
    });
    this.container.add(group);
  };

  createLegend = () => {
    let group = this.container.childOfName('legend-container');
    if (group == null) group = new zrender.Group({ name: 'legend-container' });
    group.removeAll();
    const legendWidth = 30;
    const padding = 30;
    this.categories.forEach((c, index) => {
      const fill = d3.rgb(this.barColor[index]);
      const stroke = fill.darker();
      const rect = new zrender.Rect({
        shape: { x: (legendWidth + padding) * index, y: 0, width: legendWidth - 5, height: 20 },
        style: { opacity: 0.7, fill, stroke, text: c, textPosition: [30, 5] }
      });
      group.add(rect);
    });
    const { width } = group.getBoundingRect();
    const offsetX = Math.round((this.width - width) / 2);
    group.attr('position', [offsetX, 0]);
    this.container.add(group);
  };

  createAxis = () => {
    const group = new zrender.Group({ name: 'axis-group', position: [0, 5] });
    this.axisContainer.removeAll();
    const totalWidth = this.width - this.paddingLeft * 2;
    group.add(
      new zrender.Line({
        shape: { x1: 0, y1: 0, x2: totalWidth, y2: 0 },
        style: { stroke: '#000' }
      })
    );
    this.cachePosition.forEach(c => {
      const x = Math.round((c.x0 + c.x1) / 2);
      group.add(
        new zrender.Line({
          shape: { x1: x, x2: x, y0: 0, y1: 5 },
          style: { text: c.date, textPosition: [0, 10], textAlign: 'center' }
        })
      );
    });
    this.axisContainer.add(group);
  };

  createToolipContent = (ev: MouseEvent) => {
    // const { offsetX } = ev;
    // const realX = offsetX - this.paddingLeft;
    // const domain = this.timeScale.domain() as string[];
    // const range = this.timeScale.range();
    // const step = range[1] / domain.length;
    // const selectedMonth = domain.filter(d => {
    //   const pos = this.timeScale(d) as number;
    //   return Math.abs(realX - pos) < step / 2;
    // });

    // this.activateAxisLine(this.timeScale(selectedMonth[0]) as number);

    // const idx = this.matrix.findIndex(i => i.key === selectedMonth[0]);
    // if (idx === -1) return null;
    // const selectedData = this.matrix[idx].value.map(i => ({ ...i }));
    // selectedData.sort((a, b) => b.data - a.data);
    // let content = selectedData
    //   .map(i => {
    //     const color = this.colorMap[i.poiId];
    //     return `<li>
    //     <span class="tip" style="background-color: ${color}"></span><span>${i.name}: ${i.data}</span>
    //     </li>`;
    //   })
    //   .join('');
    // content =
    //   `<li><span class="tip" style="background-color: transparent"></span><span>${selectedMonth[0]}</span></li>` +
    //   content;
    // const ul = document.createElement('ul');
    // ul.innerHTML = content;
    // return ul;
    return null;
  };

  createTooltip = () => {
    const div = document.createElement('div');
    div.setAttribute('class', 'tooltip');
    this.tooltipElm = div;
    this._zr.dom.appendChild(div);
    const onMouseover = () => {
      if (this.tooltipElm == null) return;
      this.tooltipElm.style.visibility = 'visible';
      const onMousemove = throttle<Chart>(
        100,
        (ev: MouseEvent) => {
          if (this.tooltipElm == null) return;
          const ul = this.createToolipContent(ev);
          const { height } = this.tooltipElm.getBoundingClientRect();
          const { offsetX, offsetY } = ev;
          if (offsetX > this.width || offsetY - 20 + height > this.height) {
            this.tooltipElm.style.visibility = 'hidden';
            return;
          }
          this.tooltipElm.style.left = `${offsetX + 30}px`;
          this.tooltipElm.style.top = `${offsetY - 20}px`;
          if (ul != null) {
            this.tooltipElm.style.visibility = 'visible';
            this.tooltipElm.innerHTML = '';
            this.tooltipElm.appendChild(ul);
          }
        },
        this
      );
      const onMouseleave = () => {
        if (this.tooltipElm == null) return;
        this.tooltipElm.style.visibility = 'hidden';
      };
      this._zr.dom.addEventListener('mousemove', onMousemove);
      this._zr.dom.addEventListener('mouseleave', onMouseleave);
    };
    this._zr.dom.addEventListener('mouseover', onMouseover);
  };

  processData = (data: ComparsionDataItem[]) => {
    // 对数据进行归类
    const allItems = data
      .map(i =>
        i.data.map(c => ({ ...c, value: d3.sum(c.data, item => item.count), poiId: i.poiId }))
      )
      .flat();
    const newData = this.timeRange.map(dateStr => {
      const filtered = allItems.filter(i => i.month === dateStr);
      return { month: dateStr, data: filtered };
    });
    newData.forEach(i => {
      i.data.sort((a, b) => a.value - b.value);
    });
    return newData;
  };

  computeStack = (data: Datum[]) => {
    const result = data.map(item => {
      let sum = 1;
      const dateStr = item.month;
      return {
        month: dateStr,
        stackData: item.data.map(i => {
          sum = sum + i.value + this.valuePadding;
          return {
            poiId: i.poiId,
            d0: sum - i.value - this.valuePadding,
            d1: sum - this.valuePadding,
            value: i.value
          };
        })
      };
    });
    return result;
  };

  computePoints = (data: StackDatum[]) => {
    const result: Record<string, [number, number][]> = {};

    const maxValue = d3.max(data, d =>
      d.stackData.map(i => i.value).reduce((a, b) => a + b)
    ) as number;
    const width = this.barWidth;
    this.yScale
      .domain([
        1,
        maxValue + (this.data.length === 0 ? 0 : (this.data.length - 1) * this.valuePadding)
      ])
      .nice()
      .rangeRound([this.lineChartHeight, 5]);
    data.forEach((d, monthIndex) => {
      const x = monthIndex * (this.barWidth + this.bandwidth);

      d.stackData.forEach(i => {
        const poiId = i.poiId;
        const y0 = this.yScale(i.d0);
        const y1 = this.yScale(i.d1);
        if (result[poiId] == null)
          result[poiId] = [[x, y1], [x, y0], [x + width, y1], [x + width, y0]];
        else result[poiId] = [...result[poiId], [x, y1], [x, y0], [x + width, y1], [x + width, y0]];
      });
    });
    Object.keys(result).forEach(key => {
      result[key] = [
        ...result[key].filter((_, i) => i % 2 === 0),
        ...result[key].filter((_, i) => i % 2 === 1).reverse()
      ];
    });
    return result;
  };
  // 绘制连接线
  drawBand = (data: Record<string, [number, number][]>) => {
    const lineGenerator = d3.line().curve(d3.curveMonotoneX);
    Object.keys(data).forEach(key => {
      const fill = this.colorMap[key];
      const points = data[key];
      const group = new zrender.Group({ name: 'key' });
      const lineData = lineGenerator(points);
      const path = zrender.path.createFromString(lineData, {
        style: { fill: d3.rgb(fill), opacity: 0.7, stroke: d3.rgb(fill).darker() }
      });
      group.add(path);
      this.container.add(group);
    });
  };

  // 计算最大值才有可比性
  getMaxValue = (data: ComparsionDataItem[]) => {
    let maxValue = 0;
    data.forEach(d => {
      // d为某一个景点数据
      d.data.forEach(item => {
        const { sentimentValue } = item;
        const max = d3.max(sentimentValue, i => i[1]) as number;
        if (max > maxValue) maxValue = max;
      });
    });
    this.valueScale.domain([1, maxValue]).clamp(true);
  };

  // 绘制对比柱图
  drawCompareBar = (data: Datum[]) => {
    data.forEach(d => {
      const dateStr = d.month;
      const group = this.container.childOfName(dateStr);

      this.valueScale.nice().rangeRound([this.barWidth, 0]);

      d.data.forEach(item => {
        const sentimentValue = (item.sentimentValue as [string, number][]).filter(
          i => this.categories.findIndex(c => c === i[0]) !== -1
        );
        const subgroup = group.childOfName(`${dateStr}_${item.poiId}`);
        if (subgroup == null) return;
        const bandwidth = Math.round(subgroup.height / this.categories.length);
        this.categories.forEach((c, cIndex) => {
          const index = sentimentValue.findIndex(i => i[0] === c);
          const offsetX = this.valueScale(sentimentValue[index][1]);
          const width = this.barWidth - offsetX;
          const fill = d3.rgb(this.barColor[cIndex]);
          const stroke = fill.darker();

          subgroup.add(
            new zrender.Rect({
              z: 200,
              shape: {
                x: offsetX,
                width,
                height: bandwidth - 4,
                y: cIndex * bandwidth + 2
              },
              style: {
                fill,
                stroke,
                opacity: 0.7
              }
            })
          );
        });
      });
    });
  };

  drawBar = (data: StackDatum[]) => {
    this.container.removeAll();
    const width = this.barWidth;
    this.cachePosition = [];
    data.forEach((d, index) => {
      const x = index * (width + this.bandwidth);
      const group = new zrender.Group({ name: d.month, position: [x, 0] });
      this.cachePosition.push({ date: d.month, x0: x, x1: x + width });
      d.stackData.forEach(s => {
        const y = this.yScale(s.d1);
        const height = this.yScale(s.d0) - y;

        const subgroup = new zrender.Group({
          name: `${d.month}_${s.poiId}`,
          height: height,
          position: [0, y]
        });
        subgroup.add(
          new zrender.Rect({
            z: 100,
            shape: { x: 0, y: 0, width, height },
            style: { fill: '#fff', stroke: '#000' }
          })
        );
        group.add(subgroup);
      });
      this.container.add(group);
    });
  };
  update = () => {
    const processedData = this.processData(this.data);
    const stack = this.computeStack(processedData);
    const points = this.computePoints(stack);

    this.drawBar(stack);
    this.drawBand(points);
    this.drawCompareBar(processedData);
    this.createAxis();
    this.createLegend();
    this.createNameLegend();
  };
}
