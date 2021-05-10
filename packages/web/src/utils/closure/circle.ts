import Vec2 from './vec2';

export default class Circle {
  center: Vec2;
  constructor(public x: number, public y: number, public radius: number) {
    this.center = new Vec2(x, y);
    this.radius = radius;
  }
  intersects = (circle: Circle) => {
    const distance = this.center.distance(circle.center as Vec2);

    // Circles are to far from each other.
    if (distance > this.radius + circle.radius) return false;
    // One circle is contained in the other.
    if (distance < Math.abs(this.radius - circle.radius)) return false;
    // Circles intersect.
    return true;
  };
  intersectionPoints = (circle: Circle): [Vec2, Vec2] => {
    const P0 = this.center;
    const P1 = circle.center;

    const d = this.center.distance(circle.center);
    const a = (this.radius * this.radius - circle.radius * circle.radius + d * d) / (2 * d);
    const h = Math.sqrt(this.radius * this.radius - a * a);

    const P2 = P1.sub(P0)
      .scale(a / d)
      .add(P0);

    const x3 = P2.x + (h * (P1.y - P0.y)) / d;
    const y3 = P2.y - (h * (P1.x - P0.x)) / d;
    const x4 = P2.x - (h * (P1.y - P0.y)) / d;
    const y4 = P2.y + (h * (P1.x - P0.x)) / d;

    return [new Vec2(x3, y3), new Vec2(x4, y4)];
  };
}
