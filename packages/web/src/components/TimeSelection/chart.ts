declare const zrender: any;
import * as d3 from 'd3';
import emitter from '../../event';
export default class Chart {
  container: any = new zrender.Group({ name: 'container' });
  private static instance: Chart;
  static getInstance(selector: string): Chart {
    if (this.instance == null) this.instance = new Chart(selector);
    return this.instance;
  }
  width = 0;
  height = 0;
  origin = [0, 0];
  _zr: any = null;
  timeRange: string[] = [];
  paddingLeft = 100;
  contextTimeScale = d3.scalePoint();
  contextChartWidth = 0;
  controlLeft: any = null;
  controlRight: any = null;
  barContainer: any = new zrender.Group({ name: 'bar-container' });
  yScale = d3.scaleLinear();
  constructor(public selector: string) {
    const elm = document.querySelector(selector);
    this._zr = zrender.init(elm);
    this.width = this._zr.getWidth();
    this.height = this._zr.getHeight();
    this._zr.add(this.container);
    this.container.attr('position', [this.paddingLeft + 0.5, 0.5]);
    this.barContainer.attr('position', [this.paddingLeft + 0.5, 0.5]);
    this._zr.add(this.barContainer);
    this.contextChartWidth = this.width - this.paddingLeft * 2;
    this.origin = [Math.round(this.width / 2) + 0.5, Math.round(this.height / 2) + 0.5];
  }

  updateTimeScale = () => {
    const month = Array.from({ length: 12 }, (v, k) => (k + 1 < 10 ? `0${k + 1}` : `${k + 1}`));
    const domain = [...month.map(m => `2018-${m}`), ...month.map(m => `2019-${m}`)];
    this.contextTimeScale.domain(domain).range([0, this.contextChartWidth]);
  };

  loadData = (
    timeRange: string[],
    statistics?: Array<{ key: string; value: [number, number] }>
  ) => {
    this.timeRange = timeRange;
    this.updateTimeScale();
    this.buildBrushX();
    if (statistics != null) this.updateContext(statistics);
  };

  updateContext = (data: Array<{ key: string; value: [number, number] }>) => {
    const commentValue = data.map(i => ({ key: i.key, value: i.value[0] }));
    const pathStr = this.computePathStr(commentValue);
    const path = zrender.path.createFromString(pathStr, {
      style: { fill: d3.rgb(223, 225, 226), stroke: d3.rgb(223, 225, 226).darker() }
    });
    this.barContainer.add(path);
  };

  computePathStr = (data: Array<{ key: string; value: number }>) => {
    const maxValue = d3.max(data, i => i.value) as number;
    this.yScale
      .domain([0, maxValue])
      .nice()
      .rangeRound([this.height, 0]);
    const points: [number, number][] = [];
    const line = d3.line();

    data.forEach(c => {
      const x = this.contextTimeScale(c.key) as number;
      const y = this.yScale(c.value) as number;
      points.push([x, y]);
    });

    points.push([this.width - this.paddingLeft * 2, this.height]);
    points.push([0, this.height]);
    return line(points);
  };

  recomputeTimeRange = () => {
    const selectionGroup = this.container.childOfName('selection');
    if (selectionGroup == null) return;
    const selectionRect = selectionGroup.childOfName('selection-rect');
    const [left, right] = [
      selectionGroup.position[0],
      selectionGroup.position[0] + selectionRect.shape.width
    ];
    const newTimeRange = this.contextTimeScale.domain().filter(dateStr => {
      const pos = this.contextTimeScale(dateStr) as number;
      return left <= pos && pos <= right;
    });
    this.timeRange = newTimeRange;
    this.controlLeft.attr('style', { text: newTimeRange[0], textPosition: 'left' });
    this.controlRight.attr('style', {
      text: newTimeRange[newTimeRange.length - 1],
      textPosition: 'right'
    });
  };

  buildBrushX = () => {
    const parentGroup = this.container;
    const totalWidth = this.contextTimeScale.range()[1];
    parentGroup.removeAll();
    // if (this.data.length >= 8) this.initBrushWidth = Math.round(this.cWidth / 2);
    const initSelectionHeight = 28;
    const [pos1, pos2] = [this.timeRange[0], this.timeRange[this.timeRange.length - 1]].map(i => {
      return this.contextTimeScale(i) as number;
    });

    const initSelectionWidth: number = pos2 - pos1;

    const extent = new zrender.Rect({
      shape: { x: 0, y: 0, width: totalWidth, height: initSelectionHeight },
      style: { fill: 'transparent', stroke: '#ededed' },
      name: 'extent',
      z: 20
    });
    const selection = new zrender.Group({
      z: 100,
      name: 'selection',
      position: [pos1, 0]
    });
    const selectionRect = new zrender.Rect({
      shape: { x: 0, y: 0, width: initSelectionWidth, height: initSelectionHeight },
      style: { fill: d3.rgb(203, 214, 223), opacity: 0.5, stroke: '#000', lineDash: [5] },
      name: 'selection-rect',
      cursor: 'move',
      z: 100
    });
    const controlLeft = new zrender.Rect({
      shape: { x: -4, y: Math.round((initSelectionHeight - 16) / 2), width: 8, height: 16 },
      style: { fill: '#a7b7cc', text: this.timeRange[0], textPosition: 'left' },
      name: 'left',
      cursor: 'ew-resize',
      z: 100
    });
    this.controlLeft = controlLeft;
    const controlRight = new zrender.Rect({
      shape: { x: -4, y: Math.round((initSelectionHeight - 16) / 2), width: 8, height: 16 },
      style: {
        text: this.timeRange[this.timeRange.length - 1],
        textPosition: 'right',
        fill: '#a7b7cc'
      },
      name: 'right',
      cursor: 'ew-resize',
      z: 100,
      position: [initSelectionWidth, 0]
    });
    this.controlRight = controlRight;
    selection.on('mousedown', (ev: any) => {
      const name = ev.target.name;
      const selectionRectWidth = selectionRect.shape.width;
      const distX = this.posAdjust(ev.offsetX) - selection.position[0];
      const selectionRectRearPosX = selectionRectWidth + selection.position[0];
      const selectionRectFrontPosX = selection.position[0];

      const onMove = (ev: any) => {
        let newPosX = this.posAdjust(ev.offsetX) - distX;
        if (newPosX < 0) newPosX = 0;
        if (newPosX + selectionRectWidth > totalWidth) newPosX = totalWidth - selectionRectWidth;
        selection.attr('position', [newPosX, 0]);
        // 移动时更新时间范围
        this.recomputeTimeRange();
      };

      const onResizeLeft = (ev: any) => {
        let newPosX = this.posAdjust(ev.offsetX) - distX;
        if (newPosX < 0) newPosX = 0;

        let newSWidth = selectionRectRearPosX - newPosX;
        // 此时左边的滑块已经超过了右边的滑块
        if (newSWidth < 0) {
          newPosX = selectionRectRearPosX;
          newSWidth = -newSWidth;
          if (newSWidth + selectionRectRearPosX > totalWidth)
            newSWidth = totalWidth - selectionRectRearPosX;
        }
        selection.attr('position', [newPosX, 0]);
        selectionRect.attr('shape', { width: newSWidth });
        controlRight.attr('position', [newSWidth, 0]);
        this.recomputeTimeRange();
        // this.initBrushWidth = selectionRect.shape.width;
      };

      const onResizeRight = (ev: any) => {
        let newSWidth = this.posAdjust(ev.offsetX) - selectionRectFrontPosX;
        if (newSWidth + selectionRectFrontPosX > totalWidth)
          newSWidth = totalWidth - selectionRectFrontPosX;
        if (newSWidth < 0) {
          // 此时右边的滑竿超过了左边的滑竿
          let newPosX = this.posAdjust(ev.offsetX);
          if (newPosX < 0) newPosX = 0;
          selection.attr('position', [newPosX, 0]);
          newSWidth = selectionRectFrontPosX - newPosX;
        } else {
          selection.attr('position', [selectionRectFrontPosX, 0]);
        }
        selectionRect.attr('shape', { width: newSWidth });
        controlRight.attr('position', [newSWidth, 0]);
        // this.initBrushWidth = selectionRect.shape.width;
        this.recomputeTimeRange();
      };
      const onUp = (ev: any) => {
        if (name === 'selection-rect') {
          document.removeEventListener('mousemove', onMove);
        }
        if (name === 'left') {
          document.removeEventListener('mousemove', onResizeLeft);
        }
        if (name === 'right') {
          document.removeEventListener('mousemove', onResizeRight);
        }
        document.removeEventListener('mouseup', onUp);
        emitter.emit('change-time-range', this.timeRange);
      };
      if (name === 'selection-rect') {
        document.addEventListener('mousemove', onMove);
      }
      if (name === 'left') {
        document.addEventListener('mousemove', onResizeLeft);
      }
      if (name === 'right') {
        document.addEventListener('mousemove', onResizeRight);
      }
      document.addEventListener('mouseup', onUp);
    });
    extent.on('click', (ev: any) => {
      const sWidth = selectionRect.shape['width'];
      let newPosX = ev.offsetX - 10 - Math.round(sWidth / 2);
      if (newPosX < 0) newPosX = 0;
      if (newPosX + sWidth > totalWidth) newPosX = totalWidth - sWidth;
      selection.attr('position', [newPosX, 0]);
      this.recomputeTimeRange();
    });
    selection.add(selectionRect);
    selection.add(controlLeft);
    selection.add(controlRight);
    let extentBackground = parentGroup.childOfName('background');
    if (extentBackground == null) {
      extentBackground = new zrender.Group({ name: 'background' });
    }
    parentGroup.add(extentBackground);
    parentGroup.add(extent);
    parentGroup.add(selection);
  };
  posAdjust = (offsetX: number) => {
    return offsetX - this.paddingLeft;
  };
}
