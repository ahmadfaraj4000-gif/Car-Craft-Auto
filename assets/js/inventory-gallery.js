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
    let updateViewer = null;
    let suppressOpenUntil = 0;
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
    const expand = document.createElement('button');
    expand.type = 'button';
    expand.className = 'vehicle-gallery-expand';
    expand.setAttribute('aria-haspopup', 'dialog');
    expand.setAttribute('aria-label', 'Enlarge photo of ' + title);
    expand.append(img);
    if (photos.length) {
      const hint = document.createElement('span');
      hint.className = 'vehicle-gallery-enlarge-hint';
      hint.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H3v6M15 3h6v6M3 15v6h6M21 15v6h-6"/></svg> View larger';
      expand.append(hint);
      expand.addEventListener('click', () => { if (Date.now() >= suppressOpenUntil) openViewer(); });
      frame.append(expand);
    } else {
      frame.append(img);
    }
    container.append(frame);
    let counter;
    const dots = [];
    function show(next) {
      index = (next + images.length) % images.length;
      img.src = images[index].url;
      img.alt = photos.length ? title + ' — photo ' + (index + 1) + ' of ' + images.length : title + ' — photo coming soon';
      if (counter) counter.textContent = (index + 1) + ' / ' + images.length;
      dots.forEach((dot, i) => dot.setAttribute('aria-current', String(i === index)));
      if (updateViewer) updateViewer();
    }
    function navigateByKey(event) {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      show(event.key === 'Home' ? 0 : event.key === 'End' ? images.length - 1 : index + (event.key === 'ArrowLeft' ? -1 : 1));
    }
    function addSwipe(target) {
      let start = null;
      target.addEventListener('pointerdown', event => {
        if (event.pointerType !== 'mouse') start = { x: event.clientX, y: event.clientY };
      });
      target.addEventListener('pointercancel', () => { start = null; });
      target.addEventListener('pointerup', event => {
        if (!start) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) {
          suppressOpenUntil = Date.now() + 500;
          show(index + (dx < 0 ? 1 : -1));
        }
        start = null;
      });
    }
    function openViewer() {
      if (updateViewer) return;
      const dialog = document.createElement('dialog');
      dialog.className = 'vehicle-photo-viewer';
      dialog.setAttribute('aria-label', title + ' enlarged photos');
      const panel = document.createElement('div');
      panel.className = 'vehicle-photo-panel';
      const header = document.createElement('div');
      header.className = 'vehicle-photo-header';
      const heading = document.createElement('h2');
      heading.textContent = title;
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'vehicle-photo-close';
      close.textContent = 'Close ×';
      close.setAttribute('aria-label', 'Close enlarged photos');
      close.addEventListener('click', () => dialog.close());
      header.append(heading, close);
      const stage = document.createElement('div');
      stage.className = 'vehicle-photo-stage';
      const largeImage = document.createElement('img');
      largeImage.draggable = false;
      largeImage.decoding = 'async';
      stage.append(largeImage);
      if (images.length > 1) {
        [-1, 1].forEach(direction => {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'vehicle-gallery-arrow ' + (direction < 0 ? 'previous' : 'next');
          button.setAttribute('aria-label', direction < 0 ? 'Previous enlarged photo' : 'Next enlarged photo');
          button.innerHTML = direction < 0 ? '&#8249;' : '&#8250;';
          button.addEventListener('click', () => show(index + direction));
          stage.append(button);
        });
        addSwipe(stage);
      }
      const footer = document.createElement('div');
      footer.className = 'vehicle-photo-footer';
      const position = document.createElement('span');
      position.setAttribute('aria-live', 'polite');
      position.setAttribute('aria-atomic', 'true');
      const original = document.createElement('a');
      original.target = '_blank';
      original.rel = 'noopener';
      original.textContent = 'Open full-resolution photo ↗';
      footer.append(position, original);
      const help = document.createElement('p');
      help.className = 'vehicle-photo-help';
      help.textContent = images.length > 1 ? 'Use the arrows or swipe to browse. Press Esc to close.' : 'Press Esc or Close to return to inventory.';
      panel.append(header, stage, footer, help);
      dialog.append(panel);
      const previousOverflow = document.body.style.overflow;
      const returnFocus = document.activeElement;
      function cleanup() {
        updateViewer = null;
        document.body.style.overflow = previousOverflow;
        dialog.remove();
        if (returnFocus && returnFocus.isConnected && returnFocus !== document.body) returnFocus.focus();
        else expand.focus();
      }
      dialog.addEventListener('close', cleanup, { once: true });
      dialog.addEventListener('cancel', event => { event.preventDefault(); dialog.close(); });
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog.addEventListener('keydown', navigateByKey);
      updateViewer = () => {
        largeImage.src = images[index].url;
        largeImage.alt = title + ' — photo ' + (index + 1) + ' of ' + images.length;
        position.textContent = 'Photo ' + (index + 1) + ' of ' + images.length;
        original.href = images[index].url;
      };
      largeImage.addEventListener('error', () => {
        position.textContent = 'This photo could not load. Try another photo or the full-resolution link.';
      });
      document.body.append(dialog);
      updateViewer();
      dialog.showModal();
      document.body.style.overflow = 'hidden';
      close.focus();
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
      container.addEventListener('keydown', navigateByKey);
      addSwipe(frame);
    }
    show(0);
  }
  window.CarCraftGallery = { mount, photosFor };
})();
