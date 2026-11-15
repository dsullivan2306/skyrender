module.exports = async ({ page, step, shot, click, act }) => {
  const park = () => page.click('#park');
  await click(4); await step(760);
  await park(); await step(30); await shot('p1-swap'); await step(40); await shot('p2-door'); await step(80); await shot('p3-driving'); await step(200); await shot('p4-parked');
  await park(); await step(300); await shot('p5-out');
  await click(1); await step(500); await park(); await step(90); await shot('p6-robot-walk'); await step(200); await shot('p7-robot-home');
  await click(5); await step(400); await shot('p8-unpark-to-tractor'); await step(500); await shot('p9-tractor');
  await click(0); await step(500); await step(200); await park(); await step(60); await shot('p10-plane'); await step(300); await shot('p11-plane-parked');
  await click(3); await step(500); await step(300); await park(); await step(200); await shot('p12-rocket'); await step(300); await shot('p13-rocket-parked');
  await park(); await step(400); await shot('p14');
};
