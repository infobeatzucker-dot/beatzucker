const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
module.exports=async page=>{
  const panel=page.locator('.reference-mastering'),dial=panel.getByRole('slider',{name:'Referenzeinfluss',exact:true});
  assert.equal(await panel.locator('.reference-dial-module').count(),4);
  await dial.focus();await page.keyboard.press('End');assert.equal(await dial.getAttribute('aria-valuenow'),'100');await page.keyboard.press('ArrowLeft');assert.equal(await dial.getAttribute('aria-valuenow'),'95');
  await panel.getByRole('button',{name:'Referenzeinfluss: zurücksetzen',exact:true}).click();assert.equal(await dial.getAttribute('aria-valuenow'),'65');
  const b=await dial.boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2-45,{steps:10});await page.mouse.up();assert.equal(await dial.getAttribute('aria-valuenow'),'90');
  await dial.dblclick();assert.equal(await dial.getAttribute('aria-valuenow'),'65');
  const bass=panel.getByRole('slider',{name:'Bass-Wunsch',exact:true});await bass.focus();await page.keyboard.press('Home');assert.equal(await bass.getAttribute('aria-valuenow'),'-100');await page.keyboard.press('End');assert.equal(await bass.getAttribute('aria-valuenow'),'100');await bass.dblclick();assert.equal(await bass.getAttribute('aria-valuenow'),'0');
  const out=path.resolve('validation-output/reference-dials-1.5.1');fs.mkdirSync(out,{recursive:true});
  await panel.locator('.reference-console').screenshot({path:path.join(out,'desktop.png')});
  for(const width of [390,320]){await page.setViewportSize({width,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await panel.locator('.reference-console').screenshot({path:path.join(out,`mobile-${width}.png`)});}
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await dial.locator('.character-pointer').evaluate(el=>getComputedStyle(el).transitionDuration),'0s');await page.emulateMedia({reducedMotion:'no-preference'});await page.setViewportSize({width:1440,height:1100});
  console.log('PASS Chrome reference dials: drag/keyboard/reset, bipolar bounds, mobile 320/390px and reduced motion');
};
