// Draw silhouettes into the same sampling surface as the mole video.
const stem = new Path2D(
  "M-4 0v-93h8V0zM-4-30h-17v-8h-12v-12h14v8h15zM4-50h18v-8h12v-12H20v8H4z",
);
const flower = new Path2D(
  "M-8-147H8v10h12v11h12v22H20v11H8v10H-8v-10h-12v-11h-12v-22h12v-11h12z",
);
const clouds = [
  new Path2D("M65 64h19V49h24V37h38v12h24v15h24v19H65z"),
  new Path2D("M386 101h24V83h25V71h41v12h29v18h23v17H386z"),
  new Path2D("M594 43h15V31h26V20h24v11h20v12h17v15H594z"),
];
export function drawEnvironment(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  phase: number,
) {
  ctx.save();
  ctx.scale(width / 700, height / 400);
  ctx.fillStyle = "#000";
  clouds.forEach((path, i) => {
    ctx.save();
    ctx.translate(Math.sin(phase + i * 2) * 38, 0);
    ctx.fill(path);
    ctx.restore();
  });
  [
    [38, 388, 1.05],
    [112, 406, 1.65],
    [201, 414, 0.9],
  ].forEach(([x, y, scale], i) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.rotate(Math.sin(phase * 4 + i * 2) * 0.06);
    ctx.fill(stem);
    ctx.translate(0, -115);
    ctx.rotate(Math.sin(phase * 4 + i * 2) * -0.04);
    ctx.translate(0, 115);
    ctx.fill(flower);
    ctx.fillStyle = "#fff";
    ctx.fillRect(-6, -122, 12, 13);
    ctx.fillStyle = "#000";
    ctx.restore();
  });
  ctx.restore();
}
