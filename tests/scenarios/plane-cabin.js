module.exports = async ({ page, step, shot, act }) => {
  await step(40); await page.click('#park'); await step(260); await page.waitForTimeout(500); await step(5); await shot('f1');
  await page.evaluate(() => window.__cab.openSeatPicker(window.__cab.travelers[2])); await act('Surprise me'); await step(200); await shot('f2');
  await act('Seatbelt sign'); await act('Cockpit'); await step(30);
  await page.evaluate(() => { const c = window.__cab; c.ckButtons.forEach(b => b.b.userData.onClick()); }); await step(100); await shot('f3');
  await act('Cabin'); await step(20);
  await act('Get off the plane'); await page.waitForTimeout(700); await step(10); await shot('f4');
  await step(200); await shot('f5');
  await act('Robot'); await step(200); await page.click('#park'); await step(300); await shot('f6');
};
