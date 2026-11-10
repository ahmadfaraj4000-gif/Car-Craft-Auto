// Run: NODE_PATH=./-admin-carcraft/node_modules node --test tests/inventory-gallery.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const script = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/inventory-gallery.js'), 'utf8');
function setup(photos) {
  const dom = new JSDOM('<div id="a"></div><div id="b"></div>', { runScripts: 'outside-only', url: 'https://carcraftautobodytowing.com/' });
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); this.dispatchEvent(new dom.window.Event('close')); };
  dom.window.eval(script);
  const gallery = dom.window.document.getElementById('a');
  dom.window.CarCraftGallery.mount(gallery, { photos }, '2013 Hyundai Veloster');
  return { dom, gallery };
}
const photos = [0,1,2].map(i => ({ url: 'https://example.com/' + i + '.jpg', order: i }));
test('arrows wrap, dots select and keyboard navigation updates counter and current photo', () => {
  const { dom, gallery } = setup(photos);
  const count = () => gallery.querySelector('.vehicle-gallery-counter').textContent;
  assert.equal(count(), '1 / 3');
  gallery.querySelector('.previous').click();
  assert.equal(count(), '3 / 3');
  gallery.querySelector('.next').click();
  assert.equal(count(), '1 / 3');
  gallery.querySelectorAll('.vehicle-gallery-dot')[1].click();
  assert.equal(count(), '2 / 3');
  assert.equal(gallery.querySelector('img').src, photos[1].url);
  assert.equal(gallery.querySelectorAll('[aria-current="true"]').length, 1);
  gallery.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
  assert.equal(count(), '3 / 3');
  gallery.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(count(), '1 / 3');
});
test('two cars keep independent gallery state, with stored photo ordering', () => {
  const { dom, gallery } = setup([...photos].reverse());
  const second = dom.window.document.getElementById('b');
  dom.window.CarCraftGallery.mount(second, { photos }, 'Second car');
  gallery.querySelector('.next').click();
  assert.equal(gallery.querySelector('img').src, photos[1].url);
  assert.equal(second.querySelector('img').src, photos[0].url);
  assert.equal(second.querySelector('.vehicle-gallery-counter').textContent, '1 / 3');
});
test('single photo can enlarge without arrows; missing or PDF photos get fallback', () => {
  const single = setup([photos[0]]).gallery;
  assert.equal(single.querySelectorAll('.vehicle-gallery-arrow').length, 0);
  assert.equal(single.querySelectorAll('.vehicle-gallery-expand').length, 1);
  const { gallery } = setup([{name:'car.pdf',url:'https://example.com/storage/123'}]);
  assert.match(gallery.querySelector('img').src, /carcraft-storefront.png$/);
  assert.equal(gallery.querySelectorAll('button').length,0);
});
test('failed photo falls back and next photo still loads', () => {
  const { dom, gallery } = setup(photos);
  gallery.querySelector('img').dispatchEvent(new dom.window.Event('error'));
  assert.match(gallery.querySelector('img').src, /carcraft-storefront.png$/);
  gallery.querySelector('.next').click();
  assert.equal(gallery.querySelector('img').src, photos[1].url);
});
test('horizontal touch swipe advances; vertical gesture does not', () => {
  const { dom, gallery } = setup(photos);
  const frame = gallery.querySelector('.vehicle-gallery-frame');
  function pointer(type,x,y) {
    const event = new dom.window.Event(type);
    Object.assign(event, { pointerType: 'touch', clientX:x, clientY:y });
    frame.dispatchEvent(event);
  }
  pointer('pointerdown',200,20); pointer('pointerup',90,24);
  assert.equal(gallery.querySelector('img').src, photos[1].url);
  pointer('pointerdown',200,20); pointer('pointerup',180,200);
  assert.equal(gallery.querySelector('img').src, photos[1].url);
});

test('enlarging opens the selected photo, syncs navigation and restores focus and scroll', () => {
  const {dom, gallery}=setup(photos);
  const doc=dom.window.document;
  doc.body.style.overflow='auto';
  gallery.querySelector('.next').click();
  const trigger=gallery.querySelector('.vehicle-gallery-expand');
  assert.match(trigger.textContent,/View larger/);
  trigger.focus(); trigger.click();
  const dialog=doc.querySelector('dialog');
  assert.ok(dialog.open);
  assert.equal(dialog.querySelector('img').src,photos[1].url);
  assert.equal(doc.body.style.overflow,'hidden');
  assert.equal(doc.activeElement,dialog.querySelector('.vehicle-photo-close'));
  dialog.querySelector('.next').click();
  assert.equal(dialog.querySelector('img').src,photos[2].url);
  assert.equal(dialog.querySelector('a').href,photos[2].url);
  assert.equal(gallery.querySelector('img').src,photos[2].url);
  dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}));
  assert.equal(dialog.querySelector('img').src,photos[0].url);
  dialog.querySelector('.vehicle-photo-close').click();
  assert.equal(doc.querySelector('dialog'),null);
  assert.equal(doc.activeElement,trigger);
  assert.equal(doc.body.style.overflow,'auto');
});
test('Escape and backdrop close cleanly and a second car opens its own photos', () => {
  const {dom,gallery}=setup(photos);
  const doc=dom.window.document;
  const trigger=gallery.querySelector('.vehicle-gallery-expand');
  trigger.click();
  doc.querySelector('dialog').dispatchEvent(new dom.window.Event('cancel',{cancelable:true}));
  assert.equal(doc.querySelector('dialog'),null);
  trigger.click();
  doc.querySelector('dialog').click();
  assert.equal(doc.querySelector('dialog'),null);
  const second=doc.getElementById('b');
  dom.window.CarCraftGallery.mount(second,{photos:[{url:'https://example.com/second-car.jpg'}]},'Second car');
  second.querySelector('.vehicle-gallery-expand').click();
  assert.equal(doc.querySelector('dialog img').src,'https://example.com/second-car.jpg');
  assert.equal(doc.querySelectorAll('dialog .vehicle-gallery-arrow').length,0);
});
test('swiping a card does not accidentally open enlarged view', () => {
  const {dom,gallery}=setup(photos);
  const frame=gallery.querySelector('.vehicle-gallery-frame');
  for (const [type,x] of [['pointerdown',200],['pointerup',90]]) {
    const e=new dom.window.Event(type);Object.assign(e,{pointerType:'touch',clientX:x,clientY:20});frame.dispatchEvent(e);
  }
  gallery.querySelector('.vehicle-gallery-expand').click();
  assert.equal(dom.window.document.querySelector('dialog'),null);
  assert.equal(gallery.querySelector('img').src,photos[1].url);
});
