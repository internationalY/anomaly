class ConvexHullPoint {
  x = 0;
  y = 0;
  constructor(public index: number, public angle: number, public distance: number) {}
  compare = (p: ConvexHullPoint) => {
    if (this.angle === p.angle && this.distance === p.distance) return 0;
    return this.angle === p.angle
      ? this.distance < p.distance
        ? -1
        : 1
      : this.angle < p.angle
      ? -1
      : 1;
  };
}

class ConvexHull {
  points: Array<{ x: number; y: number }> | null = null;
  indices: number[] | null = null;
  getIndices = () => this.indices;
  clear = () => {
    this.indices = null;
    this.points = null;
  };
  ccw = (p1: number, p2: number, p3: number) => {
    if (this.points == null) return false;
    return (
      (this.points[p2].x - this.points[p1].x) * (this.points[p3].y - this.points[p1].y) -
      (this.points[p2].y - this.points[p1].y) * (this.points[p3].x - this.points[p1].x)
    );
  };
  angle = (o: number, a: number) => {
    if (this.points == null) return;

    return Math.atan((this.points[a].y - this.points[o].y) / (this.points[a].x - this.points[o].x));
  };
  distance = (a: number, b: number) => {
    if (this.points == null) return;
    return (
      (this.points[b].x - this.points[a].x) * (this.points[b].x - this.points[a].x) +
      (this.points[b].y - this.points[a].y) * (this.points[b].y - this.points[a].y)
    );
  };
  compute = (_points: Array<{ x: number; y: number }>) => {
    this.indices = null;
    if (_points.length < 3) return;
    this.points = _points;

    // Find the lowest point
    let min = 0;
    for (let i = 1, j = this.points.length; i < j; i++) {
      if (this.points[i].y == this.points[min].y) {
        if (this.points[i].x < this.points[min].x) min = i;
      } else if (this.points[i].y < this.points[min].y) min = i;
    }

    // Calculate angle and distance from base
    const al = [];
    let ang = 0.0;
    let dist = 0.0;
    for (let i = 0; i < this.points.length; i++) {
      if (i == min) continue;
      ang = this.angle(min, i) as number;
      if (ang < 0) ang += Math.PI;
      dist = this.distance(min, i) as number;
      al.push(new ConvexHullPoint(i, ang, dist));
    }

    al.sort(function(a, b) {
      return a.compare(b);
    });

    // Create stack
    const stack = new Array(this.points.length + 1);
    let j = 2;
    for (let i = 0; i < this.points.length; i++) {
      if (i == min) continue;
      stack[j] = al[j - 2].index;
      j++;
    }
    stack[0] = stack[this.points.length];
    stack[1] = min;

    let tmp;
    let M = 2;
    for (let i = 3; i <= this.points.length; i++) {
      while (this.ccw(stack[M - 1], stack[M], stack[i]) <= 0) M--;
      M++;
      tmp = stack[i];
      stack[i] = stack[M];
      stack[M] = tmp;
    }

    this.indices = new Array(M);
    for (let i = 0; i < M; i++) {
      this.indices[i] = stack[i + 1];
    }
  };
}

export { ConvexHull as default };
