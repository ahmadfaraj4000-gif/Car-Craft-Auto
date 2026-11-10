// Run: NODE_PATH=./-admin-carcraft/node_modules node --test tests/inventory-gallery.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const script = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/inventory-gallery.js'), 'utf8');
function setup(photos) {
  const dom = new JSDOM('<div id="a"></div><div id="b"></div>', { runScripts: 'outside-only', url: 'https://carcraftautobodytowing.com/' });
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
test('single photo has no controls; missing or PDF photos get fallback', () => {
  assert.equal(setup([photos[0]]).gallery.querySelectorAll('button').length, 0);
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
