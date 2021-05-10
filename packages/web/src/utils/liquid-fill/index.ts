declare const zrender: any;
declare const d3: any;

interface LiquidFillOption {
  length: number;
  offset: number;
  speed: number;
  padding: number;
  percent: number; // 用于保存当前百分比
  lineWidth: number;
  waveHeight: number;
  waveWidth: number;
}
export const defaultLiquidFillOption: LiquidFillOption = {
  length: 0,
  waveHeight: 20,
  waveWidth: 0.02,
  percent: 0.01,
  speed: 0.5,
  padding: 2,
  lineWidth: 1,
  offset: 10
};

export function drawSineWave(data: number, opt: LiquidFillOption) {
  const points: null | number[][] = [];
  const offset: number = (opt.offset = opt.offset + opt.speed);
  // 确定水球图的起始X坐标值与终点X坐标值
  const [originX, endX] = [opt.padding, opt.length - opt.padding];

  const height = opt.length - 2 * opt.padding;

  // 确定sin曲线的基准位置
  const dy = height * (1 - data) + opt.padding;

  // 逐渐增加百分比值起到动画效果,并在达到目标百分比后保持不变
  // if (opt.percent < data) {
  //   opt.percent += 0.01;
  // }

  // 用于保存sin曲线的各点坐标
  for (let x = 0; x <= endX - originX; x = x + 1) {
    // 因为canvas画布坐标原点位于左上角,因此需要对Math.sin求值结果取负
    let y = -Math.sin(x * opt.waveWidth + offset);
    // 改变sin曲线的振幅
    y = dy + y * opt.waveHeight;
    points.push([x + originX, y]);
  }
  // 封闭路径
  points.push([endX, opt.length - opt.padding]);
  points.push([originX, opt.length - opt.padding]);
  points.push([...points[0]]);
  return points;
}

export function LiquidFill(
  value: string,
  fill: string,
  data: Array<{ percent: number; fill: string }>,
  length: number
) {
  // 合并配置项
  const opt = { ...defaultLiquidFillOption, length: length };
  // 获取圆心坐标
  const origin = [opt.length / 2, opt.length / 2];
  // 获取水球半径
  const radius = (opt.length - 2 * (opt.padding + opt.lineWidth)) / 2;
  // 设置背景文字
  const backGroundText = new zrender.Text({
    style: {
      text: value,
      textFill: '#000',
      fontSize: Math.round(opt.length / 4),
      textAlign: 'center',
      textVerticalAlign: 'middle'
    },
    position: [...origin],
    name: 'background-text'
  });
  const text = new zrender.Text({
    style: {
      text: value,
      textFill: '#fff',
      fontSize: Math.round(opt.length / 4),
      textAlign: 'center',
      textVerticalAlign: 'middle'
    },
    position: [...origin],
    name: 'foreground-text'
  });

  const clipCircle = new zrender.Circle({
    shape: { cx: origin[0], cy: origin[1], r: radius },
    style: { lineWidth: opt.lineWidth, stroke: fill, fill: 'transparent' },
    name: 'clip-circle',
    z: 50
  });

  // text.setClipPath(polyline);

  // const render = function() {
  //   // 避免内存泄漏
  //   points = [];
  //   points = drawSineWave(percent, { ...opt, offset: opt.offset + 2 });
  //   polyline.attr('shape', { points: points });
  //   // window.requestAnimationFrame(render);
  // };
  // render();
  const group = new zrender.Group();
  group.add(clipCircle);
  data.forEach((d, index) => {
    const percent = d.percent;
    // 波浪线
    const polyline = new zrender.Polyline({
      style: { stroke: '#ccc', opacity: 1, fill: d.fill },
      name: 'sine-wave',
      position: [-origin[0], -origin[1]],
      z: index + 10
    });
    polyline.setClipPath(clipCircle);
    const points = drawSineWave(percent, {
      ...opt,
      waveWidth: 0.3,
      waveHeight: 5,
      speed: opt.length * d.percent,
      offset: (Math.random() * opt.length) / 2
    });
    polyline.attr('shape', { points: points });
    group.add(polyline);
  });
  // group.add(backGroundText);
  // group.add(text);
  return group;
}
