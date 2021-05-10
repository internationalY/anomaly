import Vec2 from './vec2';
export default class Arc {
  center: Vec2;
  constructor(
    public x: number,
    public y: number,
    public startAngle: number,
    public endAngle: number,
    public radius: number
  ) {
    this.center = new Vec2(x, y);
  }
}
