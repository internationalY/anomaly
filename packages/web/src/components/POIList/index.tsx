import React from 'react';
import './index.css';
import Chart from './chart';
import { Point } from '../Map/interface';

declare const AMap: any;

export default class POIList extends React.Component {
  chart?: Chart;
  map: any;
  dummyMap?: HTMLDivElement;
  ref: React.RefObject<HTMLDivElement> = React.createRef();
  selected: Array<Point> = [];
  render = () => {
    return (
      <div className="poi-list" ref={this.ref}>
        <div className="poi-canvas"></div>
        {/* <div id="dummy-map"></div> */}
      </div>
    );
  };
  componentDidMount = () => {
    // this.chart = Chart.getInstance('.poi-list .poi-canvas');
    // this.dummyMap = document.createElement('div');
    // if (this.ref == null || this.ref.current == null) return;
    // const { width, height } = this.ref.current.getBoundingClientRect();
    // this.ref.current.appendChild(this.dummyMap);
    // this.map = new AMap.Map('dummy-map', {
    //   zoom: 17,
    //   center: [104.064865, 30.654403] //中心点坐标
    // });
    // emitter.on('detail-on-map', (message: Array<Point>) => {
    //   // this.centriod(message);
    // });
  };

  lngLatToContainer = (x: number | string, y: number | string): { x: number; y: number } => {
    const lngLat = new AMap.LngLat(x, y);
    const pixel = this.map.lnglatTocontainer(lngLat);
    return { x: Math.ceil(pixel.x), y: Math.ceil(pixel.y) };
  };

  containerToLngLat = (x: number, y: number) => {
    const pixel = new AMap.Pixel(x, y);
    return this.map.containerToLngLat(pixel);
  };
}
