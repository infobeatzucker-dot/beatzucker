const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
module.exports=async function(page){
  const out=path.resolve('validation-output/sections-character-1.5');fs.mkdirSync(out,{recursive:true});
  await page.setViewportSize({width:1440,height:1100});
  const dial=page.getByRole('slider',{name:/Mastering character|Mastering-Klangcharakter/}),card=page.locator('.character-card');
  assert.equal(await dial.getAttribute('aria-valuenow'),'50');await dial.focus();await page.keyboard.press('End');assert.equal(await dial.getAttribute('aria-valuenow'),'100');await page.keyboard.press('Home');assert.equal(await dial.getAttribute('aria-valuenow'),'0');
  await dial.dblclick();assert.equal(await dial.getAttribute('aria-valuenow'),'50');
  const b=await dial.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2-45,{steps:10});await page.mouse.up();assert.ok(Number(await dial.getAttribute('aria-valuenow'))>50);
  await card.getByRole('button',{name:/Reset to balanced|Auf ausgewogen/}).click();assert.equal(await dial.getAttribute('aria-valuenow'),'50');
  await page.locator('.song-sections').waitFor();assert.ok(await page.locator('.song-region').count());
  await card.evaluate(el=>el.scrollIntoView({block:'center'}));await card.screenshot({path:path.join(out,'character-desktop.png')});await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  // Taller capture preserves the complete card; the actual mobile-width/height
  // overflow check above remains at 390x844. Never retouch screenshot pixels.
  await page.setViewportSize({width:390,height:1600});await card.evaluate(el=>el.scrollIntoView({block:'center'}));await card.screenshot({path:path.join(out,'character-mobile.png')});
  console.log('PASS actual Chrome 3D dial: keyboard, drag, double-click/reset, measured energy map and mobile overflow; screenshots saved');
};
