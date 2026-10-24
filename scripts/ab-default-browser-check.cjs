// Called with the isolated, authenticated dashboard page and synthetic WAV.
const assert=require('node:assert/strict');
module.exports=async function(page,buffer){
  await page.locator('.upload-zone input[type=file]').first().setInputFiles({name:'ab-default-fixture.wav',mimeType:'audio/wav',buffer});
  const toggle=page.getByRole('switch',{name:/Loudness matched|Lautheit angeglichen/});
  await toggle.waitFor({timeout:60000});
  assert.equal(await toggle.getAttribute('aria-checked'),'false');
  await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'true');
  await toggle.click();assert.equal(await toggle.getAttribute('aria-checked'),'false');
  console.log('PASS actual dashboard A/B starts with matching off; on/off controls remain functional');
  await require('./character-browser-check.cjs')(page);
};
