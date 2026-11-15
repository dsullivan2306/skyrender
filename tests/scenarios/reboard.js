module.exports = async ({ page, step, shot, act }) => {
  await step(40); await page.click('#park'); await step(260); await page.waitForTimeout(500); await step(5);
  await page.evaluate(() => { const c = window.__cab; ['3A','1C'].forEach((k, i) => c.sendToSeat(c.travelers[i], k)); }); await step(200);
  await act('Get off the plane'); await page.waitForTimeout(700); await step(60);
  await act('Board the plane'); await step(260); await page.waitForTimeout(500); await step(5); await shot('g1');
};
