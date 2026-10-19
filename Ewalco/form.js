/* Ewalco inquiry form — uploads are sent through the site's backend, never exposed in a mailto URL. */
(() => {
  const form = document.querySelector('#enquiry-form');
  if (!form) return;
  const input = document.querySelector('#attachments');
  const list = document.querySelector('#file-list');
  const drop = document.querySelector('#drop-zone');
  const status = document.querySelector('#form-status');
  const submit = form.querySelector('[type="submit"]');
  const maxFiles = 10;
  const maxBytes = 18 * 1024 * 1024;
  let files = [];

  const setStatus = (message, type = '') => {
    status.textContent = message;
    status.className = `form-status${type ? ` is-${type}` : ''}`;
  };
  const formatSize = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  function renderFiles() {
    list.replaceChildren();
    files.forEach((file, index) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      const remove = document.createElement('button');
      name.textContent = `${file.name} · ${formatSize(file.size)}`;
      remove.type = 'button'; remove.textContent = '×';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.addEventListener('click', () => { files.splice(index, 1); renderFiles(); setStatus(`${files.length} file(s) selected.`); });
      item.append(name, remove); list.append(item);
    });
  }
  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    const combined = [...files];
    incoming.forEach(file => {
      if (!combined.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) combined.push(file);
    });
    if (combined.length > maxFiles) return setStatus(`Choose up to ${maxFiles} files.`, 'error');
    if (combined.some(file => file.size > maxBytes)) return setStatus('Each file must be 18 MB or smaller.', 'error');
    if (combined.reduce((sum, file) => sum + file.size, 0) > maxBytes) return setStatus('Total attachments must be 18 MB or less so they can be emailed reliably.', 'error');
    files = combined; renderFiles(); setStatus(`${files.length} file(s) selected. Any file type is accepted.`);
  }
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
  ['dragenter', 'dragover'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.add('is-dragging'); }));
  ['dragleave', 'drop'].forEach(name => drop.addEventListener(name, event => { event.preventDefault(); drop.classList.remove('is-dragging'); }));
  drop.addEventListener('drop', event => addFiles(event.dataTransfer.files));

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const payload = new FormData(form);
    files.forEach(file => payload.append('attachments', file, file.name));
    submit.disabled = true; submit.classList.add('is-loading');
    const original = submit.innerHTML; submit.innerHTML = 'Sending securely <span aria-hidden="true">…</span>';
    setStatus('Sending your inquiry and attachments securely…');
    try {
      const response = await fetch('/api/inquiry', { method: 'POST', body: payload });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'We could not send your inquiry. Please try again.');
      setStatus('Thank you! Your inquiry and files have been sent to Ewalco.', 'success');
      form.reset(); files = []; renderFiles();
    } catch (error) {
      setStatus(`${error.message} If the site is running locally, start the server and configure SMTP in .env.`, 'error');
    } finally {
      submit.disabled = false; submit.classList.remove('is-loading'); submit.innerHTML = original;
    }
  });
})();
