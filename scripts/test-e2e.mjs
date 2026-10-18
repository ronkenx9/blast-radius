import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const base=process.env.BASE || 'http://localhost:3100';
mkdirSync('test-results',{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--enable-webgl']});
const page=await browser.newPage({viewport:{width:1600,height:960},deviceScaleFactor:1});
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try {
 await page.goto(new URL('/app',base).href,{waitUntil:'networkidle'});
 await page.locator('canvas').first().waitFor({timeout:60000});
 // The graph shares the viewport with two panels; validate its rendered container, not a fixed screen width.
 await page.waitForFunction(()=>{
   const host=document.querySelector('.graph-canvas'),c=host?.querySelector('canvas');
   if(!host||!c)return false;
   const area=host.getBoundingClientRect(),rect=c.getBoundingClientRect();
   return c.width>0&&c.height>0&&area.width>200&&area.height>200&&rect.width>0&&rect.height>0
     &&Math.abs(rect.width-area.width)<3&&Math.abs(rect.height-area.height)<3;
 });
 await page.waitForTimeout(2500);
 await page.screenshot({path:'test-results/01-overview.png'});
 await page.getByRole('button',{name:/Simulate CVE drop/}).first().click();
 await page.getByText(/Brief filed to investigation/).waitFor({timeout:60000});
 await page.getByRole('button',{name:/Simulate CVE drop/}).first().waitFor();
 await page.waitForFunction(()=>!Array.from(document.querySelectorAll('button')).find(b=>b.textContent.includes('Simulate CVE drop'))?.disabled);
 assert((await page.locator('body').innerText()).includes('5 services exposed (3 tier-1)'));
 await page.getByRole('button',{name:/Cypher/}).nth(1).click();
 await page.getByText(/shortestPath/).last().waitFor();
 const claim=page.locator('button').filter({hasText:'payments-api (tier 1'}).first();
 await claim.click();
 await page.getByRole('button',{name:'Reset',exact:true}).waitFor();
 await page.waitForTimeout(4500);
 await page.screenshot({path:'test-results/02-brief-evidence.png'});
 await page.getByRole('button',{name:'Key holders',exact:true}).click();
 await page.getByRole('heading',{name:'Who holds the keys?',exact:true}).waitFor();
 const riskPanel=page.getByRole('complementary',{name:'Key-holder analysis',exact:true});
 await riskPanel.locator('.maintainer-list button').first().waitFor();
 assert((await riskPanel.locator('.maintainer-reach').first().innerText()).replace(/\s/g,'').includes('8/10'));
 await page.screenshot({path:'test-results/03-key-holders.png'});
 await page.getByRole('button',{name:'Memory',exact:true}).first().click();
 await page.getByRole('heading',{name:'Investigation memory',exact:true}).waitFor();
 await page.getByRole('complementary',{name:'Investigation memory',exact:true}).locator('.investigation-list button').last().click();
 await page.getByText(/Recalled from graph memory/).waitFor();
 await page.screenshot({path:'test-results/04-memory.png'});
 await page.reload({waitUntil:'networkidle'});
 await page.getByRole('button',{name:'Memory',exact:true}).first().click();
 await page.getByRole('complementary',{name:'Investigation memory',exact:true}).locator('.investigation-list button').first().click();
 await page.getByText(/Recalled from graph memory/).waitFor();
 assert.deepEqual(errors,[]);
 console.log('BROWSER_VERIFIED');
} finally {await browser.close();}
