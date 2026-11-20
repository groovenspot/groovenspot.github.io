/* Two taps preserve user activation while fetching files for Web Share on mobile browsers. */
window.GrooveMediaShare = (() => {
  const icon = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m-4 4 4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/3gpp': '3gp', 'video/x-m4v': 'm4v' };

  async function fetchBlob(url, progress) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('media');
    const size = Number(response.headers.get('content-length'));
    if (!size || !response.body) return response.blob();
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      progress(Math.min(1, received / size));
    }
    return new Blob(chunks, { type: response.headers.get('content-type') || '' });
  }

  function save(files) {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  function bind(button, { items, url, labels, state = {} }) {
    function paint() {
      const label = state.pending ? labels.progress(state.percent || 0) :
        state.mode === 'save' && state.files ? labels.save :
        state.files || state.mode === 'link' ? labels.ready : labels.share;
      button.innerHTML = icon + '<span></span>';
      button.lastElementChild.textContent = label;
      button.setAttribute('aria-busy', String(Boolean(state.pending)));
      button.disabled = Boolean(state.pending);
    }
    state.paint = paint;
    paint();

    const supportsLink = () => {
      if (state.noLink || !url || typeof navigator.share !== 'function') return false;
      try { return !navigator.canShare || navigator.canShare({ url }); } catch { return false; }
    };
    const supportsFiles = () => {
      if (!state.files || typeof navigator.share !== 'function' || !navigator.canShare) return false;
      try { return navigator.canShare({ files: state.files }); } catch { return false; }
    };

    async function prepare() {
      state.percent = 0;
      state.pending = true;
      state.paint();
      try {
        const files = [];
        for (const [i, item] of items.entries()) {
          const report = fraction => {
            state.percent = Math.floor((i + fraction) * 100 / items.length);
            state.paint();
          };
          const blob = await item.load(report);
          if (!blob?.size) throw new Error('media');
          const type = blob.type.split(';')[0] || (item.video ? 'video/mp4' : 'image/jpeg');
          const name = item.name + '.' + (extensions[type] || (item.video ? 'mp4' : 'jpg'));
          files.push(typeof File === 'function' ? new File([blob], name, { type }) : Object.assign(blob, { name }));
          report(1);
        }
        state.files = files;
        state.mode = supportsFiles() ? 'files' : supportsLink() ? 'link' : 'save';
      } catch {
        state.mode = supportsLink() ? 'link' : '';
        if (!state.mode) labels.error();
      } finally {
        state.pending = false;
        state.paint();
      }
    }

    button.onclick = async () => {
      if (state.pending) return;
      const data = state.mode === 'files' && supportsFiles() ? { files: state.files } :
        state.mode !== 'save' && supportsLink() &&
        (state.files || state.mode === 'link' || !navigator.canShare || typeof File !== 'function') ? { url } : null;
      if (data) {
        state.pending = true;
        state.paint();
        try {
          // No promise or network work precedes this call on the share tap.
          await navigator.share(data);
          state.mode = '';
          state.files = null;
        } catch (error) {
          if (error?.name !== 'AbortError') {
            if (data.url) state.noLink = true;
            state.mode = data.files && supportsLink() ? 'link' : 'save';
          }
        } finally {
          state.pending = false;
          state.paint();
        }
      } else if (state.files) {
        save(state.files);
        state.mode = '';
        state.files = null;
        state.paint();
      } else {
        await prepare();
      }
    };
  }
  return { bind, fetchBlob, icon };
})();
