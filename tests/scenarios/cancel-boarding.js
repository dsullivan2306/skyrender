export default async ({ page, step, shot, act, click }) => {
  await step(40); await act('Board the plane'); await step(60); await click(1); await step(300); await shot('h1');
};
