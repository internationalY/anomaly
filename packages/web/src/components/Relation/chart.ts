import * as d3 from 'd3';
import { RelationItem, Relation } from '../RulesRelation/interface';
import { Chords, Ribbon, ChordGroup, Chord, arc } from 'd3';
import emitter from '../../event';
declare const AMap: any;
declare const zrender: any;

type ChordGroupDatum = {
  poiId: string;
  poiName: string;
  relations: Relation[];
} & ChordGroup;

type DistanceItem = {
  subIndex: number;
  startAngle: number;
  endAngle: number;
  index: number;
  distance: number;
  fill: string;
};

export default class Chart {
  _zr: any;
  data: Array<RelationItem> = [];
  container: any = new zrender.Group({ name: 'bump-container' });
  private static instance: Chart;
  width = 0;
  height = 0;
  tooltipElm?: HTMLDivElement;
  arcScale = d3.scaleLinear();
  recomputeMatrix: number[][] = [];
  chordComputer = d3
    .chord()
    .padAngle(0.05)
    .sortSubgroups(d3.ascending);
  ribbonComputer = d3.ribbon();
  distanceScale = d3.scaleLinear();
  nameMap: Record<string, string> = {};
  maxBarRadius = 50;
  matrix: number[][] = [];
  static getInstance(selector: string): Chart {
    if (this.instance == null) this.instance = new Chart(selector);
    return this.instance;
  }
  distanceData: Array<DistanceItem> = [];
  ribbonGroup = new zrender.Group({ name: 'ribbon-group' });
  chordGroup = new zrender.Group({ name: 'chord-group' });
  colorMap: Record<string, string> = {};
  color: Record<string, string> = {};
  origin: [number, number] = [0, 0];
  activatePOI = '';
  scale: d3.ScaleLinear<number, number> = d3
    .scalePow()
    .exponent(2)
    .rangeRound([0, this.maxBarRadius]);
  radius = 0;
  axisContainer: any = new zrender.Group({ name: 'axis' });
  timeRange: string[] = [];
  constructor(public selector: string) {
    const elm = document.querySelector(selector);
    this._zr = zrender.init(elm);
    this.width = this._zr.getWidth();
    this.height = this._zr.getHeight();
    this._zr.add(this.container);
    this.origin = [Math.round(this.width / 2) + 0.5, Math.round(this.height / 2) + 0.5];
    this.radius = Math.round(Math.min(this.width, this.height) * 0.5 * 0.65);
    this._zr.add(this.ribbonGroup);
    this._zr.add(this.chordGroup);
    this.ribbonGroup.attr('position', this.origin);
    this.chordGroup.attr('position', this.origin);
  }
  load = (data: Array<RelationItem>, colorMap: Record<string, string>) => {
    // this.timeRange = timeRange;
    this.data = data;
    this.colorMap = colorMap;
    this.data.forEach(d => (this.nameMap[d.source] = d.name));
    this.update();
    this.createTooltip();
  };
  update = () => {
    const matrix = this.computeMatrix();
    this.computeArcWidth(matrix);
    const chordGroup = this.chordComputer(matrix);
    this.computeRibbon(chordGroup.groups);
    const groups = chordGroup.groups.map((g, index) => {
      const sourceId = (matrix[index] as any).row;
      const item = this.data.find(i => i.source === sourceId) as RelationItem;
      return {
        ...g,
        poiId: item.source,
        poiName: item.name,
        relations: item.relations
      };
    });
    this.drawArc(groups);
    const ribbons: any = this.computeRibbon(chordGroup.groups);
    ribbons.groups = groups;
    this.drawRibbon(ribbons);
  };
  setActivatePOI(id: string) {
    this.activatePOI = id;
  }
  drawRibbon = (chordGroup: Chords) => {
    const totalValue = chordGroup.groups.map(item => item.value);
    const ribbons = [...chordGroup] as d3.Chords;
    const group = this.ribbonGroup;
    group.removeAll();
    this._zr.add(group);
    ribbons.forEach((d, index) => {
      const newRibbon: d3.Ribbon = Object.assign(
        {},
        {
          source: {
            startAngle: d.source.startAngle,
            endAngle: d.source.endAngle,
            radius: this.radius
          },
          target: {
            startAngle: d.target.startAngle,
            endAngle: d.target.endAngle,
            radius: this.radius
          }
        }
      );
      const value = d.source.value;
      const sourceRatio = value / totalValue[d.source.index];
      const targetRatio = value / totalValue[d.target.index];
      const fillIndex = sourceRatio >= targetRatio ? d.source.index : d.target.index;
      // const distance = Math.round(Math.random() * 20);
      const distance = 5;
      if (fillIndex === d.source.index) newRibbon.target.radius -= distance;
      else newRibbon.source.radius -= distance;

      const ribbonData = this.ribbonComputer(newRibbon as any);

      const fill = d3.rgb(this.color[fillIndex]);
      const stroke = fill.darker();
      const path = zrender.path.createFromString(ribbonData, {
        style: { stroke, fill, opacity: 0.5 },
        z: 1000 - 50 * index
      });
      path.on('mouseover', (ev: MouseEvent) => {
        this.onRibbon(ev, d);
      });

      group.add(path);
    });
    this._zr.dom.addEventListener('mouseleave', () => {
      if (this.tooltipElm == null) return;
      this.tooltipElm.style.visibility = 'hidden';
    });
  };
  computeScaleDomain = () => {
    const tmp = this.data
      .map(poi => {
        const relations = poi.relations;
        const result = this.timeRange.map(date => {
          const foundRelations = relations
            .map(i => i.total)
            .flat()
            .filter(i => i.key === date);
          return { key: date, value: foundRelations.map(i => i.value).reduce((a, b) => a + b) };
        });
        return result;
      })
      .flat();
    const maxValue = d3.max(tmp, i => i.value) as number;
    this.scale.domain([0, maxValue]);
  };
  drawArc = (groupData: ChordGroupDatum[]) => {
    this.computeScaleDomain();
    const group = this.chordGroup;
    group.removeAll();
    const colorMap: Record<string, string> = {};
    groupData.forEach((g, index) => {
      const subGroup = new zrender.Group({
        name: g.poiId
      });

      const fill = d3.rgb(this.colorMap[g.poiId]);
      this.color[index] = this.colorMap[g.poiId];
      const stroke = fill.darker();

      const radius = 10;

      const sector = new zrender.Sector({
        shape: {
          cx: 0,
          cy: 0,
          r0: this.radius,
          r: this.radius + radius,
          startAngle: g.startAngle - Math.PI / 2,
          endAngle: g.endAngle - Math.PI / 2
        },
        style: { fill, stroke }
      });
      const paddingRadius = 5;
      let angle = (-1 * (g.startAngle - Math.PI / 2 + g.endAngle - Math.PI / 2)) / 2;
      const arcWidth = radius;
      const textRadius = this.radius + arcWidth + this.maxBarRadius + paddingRadius;
      const offsetX = Math.cos(angle) * textRadius;
      const offsetY = Math.sin(angle) * -textRadius;

      const avgAngle = (g.endAngle - g.startAngle) / this.timeRange.length;
      this.timeRange.forEach((date, index) => {
        const data = g.relations
          .map(i => i.total)
          .flat()
          .filter(i => i.key === date);
        const totalValue = data.map(i => i.value).reduce((a, b) => a + b);
        const radius = this.scale(totalValue);
        const startAngle = g.startAngle + index * avgAngle - Math.PI / 2;
        const endAngle = startAngle + avgAngle;
        const r0 = this.radius + arcWidth + paddingRadius * 2 + this.maxBarRadius;
        const r = r0 + radius;
        // group.add(
        //   new zrender.Sector({
        //     shape: {
        //       endAngle,
        //       startAngle,
        //       r0,
        //       r
        //     },
        //     style: { opacity: 0.7, fill: fill, stroke: stroke }
        //   })
        // );
      });

      // 绘制距离柱图
      const distanceData = this.distanceData.filter(d => d.index === index);
      distanceData.forEach(d => {
        // const fill = d3.rgb(d.fill);
        // const stroke = fill.darker();
        const distance = this.distanceScale(d.distance);
        group.add(
          new zrender.Sector({
            shape: {
              startAngle: d.startAngle - Math.PI / 2,
              endAngle: d.endAngle - Math.PI / 2,
              r0: this.radius + 15,
              r: this.radius + 15 + distance
            },
            style: { fill, stroke, opacity: 0.7 }
          })
        );
      });
      const textOption: any = {
        position: [offsetX, offsetY],
        rotation: angle,
        style: {
          textFill: g.poiId === this.activatePOI ? '#2f54eb' : '#000',
          text: `${g.poiName}`,
          textVerticalAlign: 'middle'
        }
      };
      if (angle < (-1 * Math.PI) / 2) {
        angle = angle - Math.PI;
        textOption.rotation = angle;
        textOption.style.textAlign = 'right';
      }
      const text = new zrender.Text(textOption);
      subGroup.add(sector);
      subGroup.add(text);
      subGroup.on('click', () => console.log(sector));
      group.add(subGroup);
    });
    this._zr.refresh();
    emitter.emit('color-map', colorMap);
  };
  computeRibbon = (groups: ChordGroup[]) => {
    const ribbonCount = groups.length;
    const reMatrix: number[][] = [];
    const distanceData: DistanceItem[] = [];
    const loopArray = Array.from({ length: ribbonCount }, (v, k) => ribbonCount - k - 1);
    let maxDistance = 0;
    Array.from({ length: ribbonCount }, (v, k) => k).forEach(row => {
      reMatrix[row] = [];
      loopArray.slice(0, ribbonCount - 1).forEach((col, subIndex) => {
        const source = this.data.find(
          i => i.source === (this.matrix[row] as any).row
        ) as RelationItem;
        const target = this.data.find(
          i => i.source === (this.matrix[col] as any).row
        ) as RelationItem;

        const distance = new AMap.LngLat(source.longtitude, source.latitude).distance(
          new AMap.LngLat(target.longtitude, target.latitude)
        );
        if (distance > maxDistance) maxDistance = distance;
        distanceData.push({
          subIndex,
          distance: distance,
          index: row,
          startAngle: 0,
          endAngle: 0,
          fill: ''
        });
        reMatrix[row].push(this.matrix[row][col]);
      });
      // 循环结束
      const rear = loopArray.pop() as number;
      loopArray.unshift(rear);
    });

    const subgroups: Array<{
      index: number;
      subindex: number;
      startAngle: number;
      endAngle: number;
      value: number;
    }> = [];
    groups.forEach((g, index) => {
      const { startAngle, endAngle } = g;
      const data = reMatrix[index];
      const value = data.reduce((a, b) => a + b);

      let x0 = startAngle;
      data.forEach((d, subIndex) => {
        const angle = (d / value) * (endAngle - startAngle);
        subgroups.push({
          index: index,
          subindex: subIndex,
          startAngle: x0,
          endAngle: x0 + angle,
          value: d
        });

        const dis = distanceData.find(
          i => i.index === index && i.subIndex === subIndex
        ) as DistanceItem;
        dis.startAngle = x0;
        dis.endAngle = x0 + angle;
        dis.fill = this.color[index];

        x0 += angle;
      });
    });
    const ribbons: Chord[] = [];
    const loop = Array.from({ length: ribbonCount }, (v, k) => ribbonCount - k - 1);
    const len = ribbonCount - 1;
    for (let i = 0; i < len; ++i) {
      for (let j = i; j < len; ++j) {
        const source = subgroups[len * i + j];
        const targetRow = loop[j];
        const targetCol = len - j - 1;
        const target = subgroups[targetRow * len + targetCol];
        ribbons.push({ source, target });
      }
      const rear = loop.pop() as number;
      loop.unshift(rear);
    }
    this.distanceData = distanceData;
    this.distanceScale.domain([0, maxDistance]).range([5, this.maxBarRadius]);
    this.recomputeMatrix = reMatrix;
    return ribbons;
  };

  createTooltip = () => {
    const div = document.createElement('div');
    div.setAttribute('class', 'tooltip');
    this.tooltipElm = div;
    this._zr.dom.appendChild(div);
  };

  // 鼠标hover至ribbon上
  onRibbon = (ev: MouseEvent, d: any) => {
    if (this.tooltipElm == null) return;
    this.tooltipElm.style.visibility = 'visible';
    const source = (this.matrix[d.source.index] as any).row;
    const target = (this.matrix[d.target.index] as any).row;

    const foundRibbon =
      this.distanceData.find(i => i.index === d.source.index && i.subIndex === d.source.subindex) ||
      this.distanceData.find(i => i.index === d.target.index && i.subIndex === d.target.subindex);
    if (foundRibbon == null) return;

    const tooltipContent = `<ul><li>
    <span class="tip" style="background-color:${this.color[d.source.index]}"></span><span>${
      this.nameMap[source]
    }</span></li>
   <li><span class="tip" style="background-color:${this.color[d.target.index]}"></span><span>${
      this.nameMap[target]
    }</span></li>
   <li><span class="tip" style="background-color:transparent"></span><span>直线距离: 
   ${parseFloat(`${Math.round(foundRibbon.distance) / 1000}`).toFixed(1)}Km</span></li>
   <li><span class="tip" style="background-color:transparent"></span><span>两个景点共现
   ${d.source.value}次</span></li>
   </ul>
    `;
    this.tooltipElm.innerHTML = tooltipContent;
    this.tooltipElm.style.left = `${ev.offsetX + 20}px`;
    this.tooltipElm.style.top = `${ev.offsetY - 30}px`;
  };

  computeMatrix = () => {
    const ids = this.data.map(i => i.source);
    const matrix: number[][] = [];
    const rowData = this.data.map(i => ({
      key: i.source,
      value: i.relations.map(d => d.value).reduce((a, b) => a + b)
    }));
    const allRelations = this.data.map(item => item.relations).reduce((a, b) => a.concat(b), []);
    ids.sort((a, b) => {
      const indexA = rowData.findIndex(item => item.key === a);
      const indexB = rowData.findIndex(item => item.key === b);
      return rowData[indexB].value - rowData[indexA].value;
    });
    ids.forEach((source, sIndex) => {
      ids.forEach((target, tIndex) => {
        const value = (allRelations.find(
          r => r.source === source && r.target === target
        ) as Relation).value;
        if (matrix[sIndex] == null) {
          matrix[sIndex] = [];
          (matrix[sIndex] as any).row = source;
        }
        matrix[sIndex][tIndex] = value;
      });
    });
    // 填充矩阵ß
    for (let i = 0, j = matrix.length - 1; i < j; ++i) {
      for (let k = i, m = matrix.length - 1; k < m; ++k) {
        if (i === j) continue;
        matrix[j][i] = matrix[i][j];
      }
    }
    this.matrix = matrix;
    // ids.forEach((source, sIndex) => (matrix[sIndex][sIndex] = 0));
    return matrix;
  };
  computeArcWidth = (matrix: number[][]) => {
    const data = matrix.map((row, index) => ({ key: row as any, value: row[index] }));
    const maxValue = d3.max(data, d => d.value) as number;
    this.arcScale.rangeRound([5, 20]).domain([0, maxValue]);
    matrix.forEach((row, index) => (row[index] = 0));
  };
}
