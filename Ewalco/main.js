(() => {
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  const menuToggle = document.querySelector('.menu-toggle');
  const siteNav = document.querySelector('#site-nav');
  if (menuToggle && siteNav) {
    menuToggle.addEventListener('click', () => {
      const open = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!open));
      menuToggle.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
      siteNav.classList.toggle('is-open', !open);
    });
    siteNav.addEventListener('click', event => {
      if (event.target.closest('a')) {
        menuToggle.setAttribute('aria-expanded', 'false');
        menuToggle.setAttribute('aria-label', 'Open navigation');
        siteNav.classList.remove('is-open');
      }
    });
  }

  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    const items = document.querySelectorAll('.section-heading, .service-item, .profile-text, .enquiry-intro, .enquiry-form, .gallery-card');
    items.forEach(item => item.classList.add('reveal-ready'));
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: 0.12 });
    items.forEach(item => observer.observe(item));
  }

  (async () => {
    const grid = document.querySelector('#gallery-grid');
    if (!grid) return;
    try {
      const response = await fetch('/api/gallery');
      if (!response.ok) return;
      const entries = await response.json();
      entries.forEach(entry => {
        const card = document.createElement('article'); card.className = 'gallery-card';
        const link = document.createElement('a'); link.className = 'gallery-photo'; link.href = entry.url; link.download = entry.filename || 'ewalco-gallery-image';
        const image = document.createElement('img'); image.src = entry.url; image.alt = entry.caption; image.loading = 'lazy';
        const download = document.createElement('span'); download.className = 'image-download'; download.textContent = '↓ Download';
        link.append(image, download);
        const copy = document.createElement('div'); copy.className = 'gallery-card-copy';
        const title = document.createElement('h3'); title.textContent = entry.caption;
        const description = document.createElement('p'); description.textContent = entry.description || '';
        copy.append(title, description); card.append(link, copy); grid.prepend(card);
      });
    } catch (_) { /* Built-in gallery remains available on static hosting. */ }
  })();

  const galleryForm = document.querySelector('#gallery-upload-form');
  if (galleryForm) galleryForm.addEventListener('submit', async event => {
    event.preventDefault();
    const status = document.querySelector('#gallery-status');
    const data = new FormData(galleryForm);
    const key = data.get('adminKey'); data.delete('adminKey');
    status.textContent = 'Uploading image…'; status.className = 'form-status';
    try {
      const response = await fetch('/api/gallery', { method: 'POST', headers: { 'x-gallery-admin-key': key }, body: data });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Upload failed.');
      status.textContent = 'Image added to the gallery.'; status.className = 'form-status is-success';
      galleryForm.reset(); window.location.reload();
    } catch (error) { status.textContent = `${error.message} Ensure the server is running and the admin key is correct.`; status.className = 'form-status is-error'; }
  });

  document.addEventListener('click', async event => {
    const link = event.target.closest('a.downloadable-image, a.gallery-photo');
    if (!link || !link.href.startsWith('https://images.unsplash.com/')) return;
    event.preventDefault();
    const label = link.querySelector('.image-download');
    const previous = label?.textContent;
    if (label) label.textContent = 'Preparing download…';
    try {
      const response = await fetch(link.href, { mode: 'cors' });
      if (!response.ok) throw new Error('Download unavailable');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = objectUrl;
      anchor.download = link.getAttribute('download') || 'ewalco-image.jpg';
      document.body.append(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(objectUrl);
      if (label) label.textContent = 'Downloaded ✓';
    } catch (_) {
      window.open(link.href, '_blank', 'noopener');
      if (label) label.textContent = 'Open image to save';
    } finally {
      window.setTimeout(() => { if (label && label.textContent !== 'Open image to save') label.textContent = previous || '↓ Download'; }, 2200);
    }
  });
})();
