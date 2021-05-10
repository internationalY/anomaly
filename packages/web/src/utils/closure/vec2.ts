export default class Vec2 {
  constructor(public x: number, public y: number) {}
  distance = (vec: Vec2) => {
    const [deltaX, deltaY] = [this.x - vec.x, this.y - vec.y];
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  };
  sub = (vec: Vec2) => {
    return new Vec2(this.x - vec.x, this.y - vec.y);
  };
  add = (vec: Vec2) => {
    return new Vec2(this.x + vec.x, this.y + vec.y);
  };
  scale = (scale: number) => {
    return new Vec2(this.x * scale, this.y * scale);
  };
  angle = (vec: Vec2) => {
    let result = Math.atan2(vec.y, vec.x) - Math.atan2(this.y, this.x);
    if (result < 0) result += 2 * Math.PI;
    return result;
  };
  magnitude = () => {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  };

  toUnitVector = () => {
    return this.scale(1.0 / this.magnitude());
  };
}
