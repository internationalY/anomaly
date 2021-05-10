import * as d3 from 'd3';
import * as d3Array from 'd3-array';
import { HierarchyCircularNode } from 'd3';
import { KeywordItem } from './interface';
import emitter from '../../event';
declare const zrender: any;

type KeywordType = KeywordItem;
type LeafNode = {
  r: number;
  x: number;
  y: number;
  group: string;
  sentiment: number;
  name: string;
  value: number;
};

export default class Chart {
  _zr: any;
  data?: Array<KeywordType>;
  container: any = new zrender.Group({ name: 'bump-container' });
  private static instance: Chart;
  width = 0;
  height = 0;
  radiusScale = d3.scaleSqrt();
  static getInstance(selector: string): Chart {
    if (this.instance == null) this.instance = new Chart(selector);
    return this.instance;
  }
  ribbonGroup = new zrender.Group({ name: 'ribbon-group' });
  chordGroup = new zrender.Group({ name: 'chord-group' });
  packGenerator = d3.pack();
  color: string[] = [
    '#8dd3c7',
    '#ffffb3',
    '#bebada',
    '#fb8072',
    '#80b1d3',
    '#fdb462',
    '#b3de69',
    '#fccde5',
    '#d9d9d9'
  ];
  // color: string[] = ['#FA5B74', '#FF9578', '#FFDB5C', '#00C12B', '#32C5E9', '#9FE6B8', '#4947D3'];
  // color: string[] = ['#d53e4f', '#fc8d59', '#fee08b', '#ffffbf', '#e6f598', '#99d594', '#3288bd'];
  origin: [number, number] = [0, 0];
  colorMap?: Record<string, string>;
  colorScale: d3.ScaleOrdinal<string, string> = d3.scaleOrdinal();
  axisContainer: any = new zrender.Group({ name: 'axis' });
  constructor(public selector: string) {
    const elm = document.querySelector(selector);
    this._zr = zrender.init(elm);
    this.width = this._zr.getWidth();
    this.height = this._zr.getHeight();
    this._zr.add(this.container);
    this.origin = [Math.round(this.width / 2) + 0.5, Math.round(this.height / 2) + 0.5];
    this.packGenerator.size([this.width, this.height]);
  }
  load = (data: Array<KeywordType>) => {
    this.data = data;
    this.colorScale.domain(this.data.map(i => i.prop)).range(this.color);
    this.update();
  };
  clear = () => {
    this.container.removeAll();
    this._zr.dispose();
  };
  update = () => {
    if (this.data == null) return;

    const root = this.hierarchy(this.data);
    const packData = this.pack(root) as d3.HierarchyCircularNode<Omit<LeafNode, 'x' | 'y' | 'r'>>;
    this.draw(packData);
  };

  centroid = (nodes: Array<{ r: number; x: number; y: number }>) => {
    let x = 0;
    let y = 0;
    let z = 0;
    nodes.forEach(node => {
      const k = node.r ** 2;
      x += node.x * k;
      y += node.y * k;
      z += k;
    });
    return { x: x / z, y: y / z };
  };
  repaint = (colorMap: Record<string, string>) => {
    this.container.eachChild((c: any) => {
      const group = c.group;
      const fill = d3.rgb(colorMap[group]);
      const stroke = fill.darker();
      c.attr('style', { fill, stroke });
    });
  };

  drawBubble = (
    nodes: d3.HierarchyCircularNode<Pick<LeafNode, 'group' | 'sentiment' | 'name' | 'value'>>[]
  ) => {
    this.container.removeAll();
    nodes.forEach(node => {
      const group = node.data.group;
      const fill = this.colorScale(group);
      const stroke = '#000';
      const radius = this.radiusScale(node.data.value);
      const cx = Math.max(radius, Math.min(this.width - radius, node.x));
      const cy = Math.max(radius, Math.min(this.height - radius, node.y));
      node.x = cx;
      node.y = cy;
      const bubble = new zrender.Circle({
        group: node.data.group,
        shape: { cx: node.x, cy: node.y, r: node.r },
        style: {
          text: node.data.name,
          fontSize: 12,
          stroke,
          fill,
          opacity: 0.7
        }
      });
      const [prop, adj] = node.data.name.split('\n');
      bubble.on('click', () => {
        emitter.emit('get-comments', { prop, adj });
      });
      this.container.add(bubble);
    });
  };

  draw = (packData: d3.HierarchyCircularNode<Omit<LeafNode, 'x' | 'y' | 'r'>>) => {
    const nodes = packData.leaves();
    const simulation = d3
      .forceSimulation(nodes)
      .force('x', d3.forceX(this.width / 2).strength(0.01))
      .force('y', d3.forceY(this.height / 2).strength(0.01))
      .force('cluster', this.forceCluster())
      .force('collide', this.forceCollide());
    simulation.on('tick', () => {
      this.drawBubble(nodes);
    });
    simulation.on('end', () => {
      this.drawBubble(nodes);
    });
  };
  pack = (root: { children: { children: Omit<LeafNode, 'x' | 'y' | 'r'>[] }[] }) => {
    const treeData = d3.hierarchy(root);
    const packData = this.packGenerator(treeData.sum((d: any) => d.value));
    return packData;
  };
  forceCollide = () => {
    const alpha = 0.4; // fixed for greater rigidity!
    const padding1 = 2; // separation between same-color nodes
    const padding2 = 20; // separation between different-color nodes
    let nodes: any[] = [];
    let maxRadius = 0;

    function force() {
      const quadtree = d3.quadtree(nodes, d => d.x, d => d.y);
      for (const d of nodes) {
        const r = d.r + maxRadius;
        const nx1 = d.x - r,
          ny1 = d.y - r;
        const nx2 = d.x + r,
          ny2 = d.y + r;
        quadtree.visit((q: any, x1, y1, x2, y2) => {
          if (!q.length)
            do {
              if (q.data !== d) {
                const r =
                  d.r + q.data.r + (d.data.group === q.data.data.group ? padding1 : padding2);
                let x = d.x - q.data.x,
                  y = d.y - q.data.y,
                  l = Math.hypot(x, y);
                if (l < r) {
                  l = ((l - r) / l) * alpha;
                  (d.x -= x *= l), (d.y -= y *= l);
                  (q.data.x += x), (q.data.y += y);
                }
              }
            } while ((q = q.next));
          return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
        });
      }
    }

    force.initialize = (_: any[]) =>
      (maxRadius = d3.max((nodes = _), d => d.r) + Math.max(padding1, padding2));

    return force;
  };
  forceCluster = () => {
    const strength = 0.2;
    let nodes: HierarchyCircularNode<LeafNode>[] = [];
    const force = (alpha: number) => {
      const centroids = d3Array.rollup(nodes, this.centroid, d => d.data.group);
      const l = alpha * strength;
      nodes.forEach((node: any) => {
        const { x: cx, y: cy } = centroids.get(node.data.group) as { x: number; y: number };
        node.vx -= (node.x - cx) * l;
        node.vy -= (node.y - cy) * l;
      });
    };

    force.initialize = (_: HierarchyCircularNode<LeafNode>[]) => (nodes = _);

    return force;
  };
  hierarchy = (data: Array<KeywordType>) => {
    const leave = data.map(item => {
      const group = item.prop;
      const pos = item.adjs;
      return {
        children: [
          ...pos.map(p => ({ group, sentiment: 2, name: `${group}\n${p.adj}`, value: p.value }))
        ]
      };
    });
    const root = { children: leave };

    const maxValue = d3.max(root.children, d => {
      const children = d.children;
      const tmpMax = d3.max(children, d => d.value) as number;
      return tmpMax;
    }) as number;

    const minValue = d3.min(root.children, d => {
      const children = d.children;
      const tmpMax = d3.min(children, d => d.value) as number;
      return tmpMax;
    }) as number;

    this.radiusScale.domain([minValue, maxValue]).rangeRound([20, 45]);
    this.packGenerator.radius((d: any) => this.radiusScale(d.value));
    return root;
  };
}
