(function () {
  'use strict';
  const fallback = 'assets/images/branding/carcraft-storefront.png';

  function photosFor(car) {
    return (Array.isArray(car.photos) ? car.photos : [])
      .filter(photo => photo && typeof photo.url === 'string' && /^https?:\/\//i.test(photo.url) && !/\.pdf(?:$|[?#])/i.test(photo.name || photo.url))
      .slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  function mount(container, car, title) {
    const photos = photosFor(car);
    const images = photos.length ? photos : [{ url: fallback }];
    let index = 0;
    container.classList.add('vehicle-gallery');
    container.setAttribute('role', 'region');
    container.setAttribute('aria-roledescription', 'carousel');
    container.setAttribute('aria-label', title + ' photos');
    const frame = document.createElement('div');
    frame.className = 'vehicle-gallery-frame';
    const img = document.createElement('img');
    img.decoding = 'async';
    img.loading = 'lazy';
    img.draggable = false;
    frame.append(img);
    container.append(frame);
    let counter;
    const dots = [];
    function show(next) {
      index = (next + images.length) % images.length;
      img.src = images[index].url;
      img.alt = photos.length ? title + ' — photo ' + (index + 1) + ' of ' + images.length : title + ' — photo coming soon';
      if (counter) counter.textContent = (index + 1) + ' / ' + images.length;
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
    }
    img.addEventListener('error', function () {
      if (img.getAttribute('src') !== fallback) {
        img.src = fallback;
        img.alt = title + ' — photo unavailable';
      }
    });
    if (images.length > 1) {
      const controls = document.createElement('div');
      controls.className = 'vehicle-gallery-dots';
      controls.setAttribute('role', 'group');
      controls.setAttribute('aria-label', 'Choose a photo of ' + title);
      [-1, 1].forEach(direction => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'vehicle-gallery-arrow ' + (direction < 0 ? 'previous' : 'next');
        button.setAttribute('aria-label', (direction < 0 ? 'Previous' : 'Next') + ' photo of ' + title);
        button.innerHTML = direction < 0 ? '&#8249;' : '&#8250;';
        button.addEventListener('click', () => show(index + direction));
        frame.append(button);
      });
      counter = document.createElement('span');
      counter.className = 'vehicle-gallery-counter';
      counter.setAttribute('aria-live', 'polite');
      counter.setAttribute('aria-atomic', 'true');
      frame.append(counter);
      images.forEach((photo, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'vehicle-gallery-dot';
        dot.setAttribute('aria-label', 'Show photo ' + (i + 1) + ' of ' + images.length + ' of ' + title);
        dot.addEventListener('click', () => show(i));
        dots.push(dot);
        controls.append(dot);
      });
      container.append(controls);
      container.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        show(event.key === 'Home' ? 0 : event.key === 'End' ? images.length - 1 : index + (event.key === 'ArrowLeft' ? -1 : 1));
      });
      let start = null;
      frame.addEventListener('pointerdown', event => { if (event.pointerType !== 'mouse') start = { x: event.clientX, y: event.clientY }; });
      frame.addEventListener('pointercancel', () => { start = null; });
      frame.addEventListener('pointerup', event => {
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) show(index + (dx < 0 ? 1 : -1));
        start = null;
      });
    }
    show(0);
  }
  window.CarCraftGallery = { mount, photosFor };
})();
