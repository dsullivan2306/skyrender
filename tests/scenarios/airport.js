export default async ({ page, step, shot, click, act, drag }) => {
  await step(30);
  await act('See inside airport'); await step(80); await shot('a1-peek'); await drag(-200, 0); await step(2); await shot('a2-peek');
  await act('See inside airport'); await step(80); await shot('a3-back');
  await act('Go inside airport'); await step(70); await shot('a4-doors'); await step(80); await shot('a5-rolling'); await step(140); await shot('a6-inside');
  await drag(250, -30); await step(2); await shot('a7-inside2');
  await act('Go inside airport'); await step(200); await shot('a8-out');
};
