import Arc from '../closure/arc';
import Circle from '../closure/circle';
import Vec2 from '../closure/vec2';
import * as d3 from 'd3';
const FLOATINGPOINT_EPSILON = 0.00001;

interface Ring {
  circle: Circle;
  circleIndex: number;
  intersectionPoint: Vec2;
}

interface Intersection {
  circleIndex: number;
  intersectionPoint: Vec2;
}

// Get index and intersection point of next circle on border, in counter-clockwise direction.
// The parameter 'direction' points into the direction, where the first intersection with current circle was found.
function getNextClockwiseIntersection(
  currentCircleIndex: number,
  circleArray: Array<Circle>,
  direction: Vec2
): undefined | Intersection {
  const currentCircle = circleArray[currentCircleIndex];
  const allIntersections: Array<Intersection> = [];

  for (let i = 0; i < circleArray.length; i++) {
    if (!(i === currentCircleIndex)) {
      if (circleArray[i].intersects(circleArray[currentCircleIndex])) {
        const intersectionPoints = circleArray[i].intersectionPoints(
          circleArray[currentCircleIndex]
        );
        // Store intersection points and index of corresponding circle
        allIntersections.push({
          intersectionPoint: intersectionPoints[0],
          circleIndex: i
        });
        allIntersections.push({
          intersectionPoint: intersectionPoints[1],
          circleIndex: i
        });
      }
    }
  }

  let smallestAngle = 7; // Init with max angle (> 2*PI).
  let intersectionWithSmallestAngle: Intersection | undefined = undefined; // Init as undefined.
  allIntersections.forEach(function(intersection) {
    const angle = direction.angle(intersection.intersectionPoint.sub(currentCircle.center));

    if (angle > FLOATINGPOINT_EPSILON && angle < smallestAngle) {
      smallestAngle = angle;
      intersectionWithSmallestAngle = intersection;
    }
  });

  return intersectionWithSmallestAngle;
}

// Get ring of circles that defines the outer border, together with the corresponding intersection points.
function getOuterCircleRing(circles: Array<Circle>, curvature: number) {
  // Create deep copy of circles, as they are modified in the next steps.
  //let circlesEnlarged = circles.map(a = > Object.assign({}, a));
  const circlesEnlarged = circles.map(function(a) {
    return Object.assign({}, a);
  });

  // Add the radius s of the tangent circles to avoid self-intersections.
  circlesEnlarged.forEach(function(circle) {
    circle.radius += curvature;
  });

  // Find index of the leftmost circle.
  let leftmostCircleIndex = 0;
  for (let i = 1; i < circlesEnlarged.length; i++) {
    if (
      circlesEnlarged[i].center.x - circlesEnlarged[i].radius <
      circlesEnlarged[leftmostCircleIndex].center.x - circlesEnlarged[leftmostCircleIndex].radius
    ) {
      leftmostCircleIndex = i;
    }
  }

  // Get the outer ring of circles.
  const outerCircleRing: Array<Ring> = [];
  let index = leftmostCircleIndex;
  let referenceDirection = new Vec2(-1, 0);
  const real = true;
  while (real) {
    const intersection: undefined | Intersection = getNextClockwiseIntersection(
      index,
      circlesEnlarged,
      referenceDirection
    );
    if (intersection === undefined) break;

    index = intersection.circleIndex;
    const circle = circles[index];
    referenceDirection = intersection.intersectionPoint.sub(circle.center);

    if (
      outerCircleRing[0] &&
      index === outerCircleRing[0].circleIndex &&
      intersection.intersectionPoint.distance(outerCircleRing[0].intersectionPoint) <
        FLOATINGPOINT_EPSILON
    ) {
      break;
    }

    outerCircleRing.push({
      circle: circle,
      intersectionPoint: intersection.intersectionPoint,
      circleIndex: index
    });
  }

  return outerCircleRing;
}

// Generate arcs that describe the outer border of circles.
function generateCircleArcs(outerCircleRing: Array<Ring>) {
  const arcs = [];

  for (let i = 0; i < outerCircleRing.length; i++) {
    const circle = outerCircleRing[i].circle;
    const firstIntersection = outerCircleRing[i].intersectionPoint;
    const secondIntersection = outerCircleRing[(i + 1) % outerCircleRing.length].intersectionPoint;

    const centerToFirstIntersection = firstIntersection.sub(circle.center);
    const centerToSecondIntersection = secondIntersection.sub(circle.center);
    const arcStartAngle = new Vec2(0, -1).angle(centerToFirstIntersection);
    const arcEndAngle = new Vec2(0, -1).angle(centerToSecondIntersection);

    arcs.push(new Arc(circle.center.x, circle.center.y, arcStartAngle, arcEndAngle, circle.radius));
  }

  return arcs;
}

// Generate tangent arcs that fill the space between circle arcs.
function generateTangentArcs(outerCircleRing: Array<Ring>, curvature: number) {
  const arcs = [];

  for (let i = 0; i < outerCircleRing.length; i++) {
    const intersection = outerCircleRing[i].intersectionPoint;
    const firstCircle = outerCircleRing[i > 0 ? i - 1 : outerCircleRing.length - 1].circle;
    const secondCircle = outerCircleRing[i].circle;

    const intersectionToFirstCenter = firstCircle.center.sub(intersection);
    const intersectionToSecondCenter = secondCircle.center.sub(intersection);
    const arcEndAngle = new Vec2(0, -1).angle(intersectionToFirstCenter);
    const arcStartAngle = new Vec2(0, -1).angle(intersectionToSecondCenter);

    arcs.push(new Arc(intersection.x, intersection.y, arcStartAngle, arcEndAngle, curvature));
  }

  return arcs;
}

function arcsToPaths(arcs: Array<Arc>) {
  const paths: Array<{ d: string; transform: string }> = [];
  const arcGen = d3.arc();

  arcs.forEach(function(arc) {
    let startAngleTemp = arc.startAngle;

    if (startAngleTemp > arc.endAngle) {
      startAngleTemp -= 2 * Math.PI;
    }

    paths.push({
      d: arcGen({
        innerRadius: arc.radius,
        outerRadius: arc.radius,
        startAngle: startAngleTemp,
        endAngle: arc.endAngle
      }) as string,
      transform: 'translate(' + arc.center.x + ',' + arc.center.y + ')'
    });
  });

  return paths;
}

interface Node {
  contourPadding: number;
  r: number;
  x: number;
  y: number;
}

export default function(nodes: Node[], curvature: number) {
  const circles: Array<Circle> = [];
  nodes.forEach(function(node) {
    // Add circles with radius increased by padding. This generates the spacing between circle and contour.
    circles.push(new Circle(node.x, node.y, node.r + node.contourPadding));
  });

  const outerCircleRing = getOuterCircleRing(circles, curvature);
  let arcs: Array<Arc> = [];

  arcs = arcs.concat(generateCircleArcs(outerCircleRing));
  arcs = arcs.concat(generateTangentArcs(outerCircleRing, curvature));
  return arcsToPaths(arcs);
}
