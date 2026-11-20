/* Two taps preserve user activation while fetching files for Web Share on mobile browsers. */
window.GrooveMediaShare = (() => {
  const icon = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3m-4 4 4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>';
  const extensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif',
    'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov', 'video/3gpp': '3gp', 'video/x-m4v': 'm4v' };

  function diagnose(stage, detail) {
    console.warn('[media-share]', stage, detail);
  }

  async function fetchBlob(url, progress) {
    const options = { credentials: 'omit', redirect: 'error' };
    let response;
    try {
      response = await fetch(url, options);
    } catch (error) {
      const source = new URL(url, location.href);
      const asset = /^\/lounge-media\/([a-f0-9]{12}\/(?:cf|cv)[a-z0-9]+)$/.exec(source.pathname);
      if (!(error instanceof TypeError) || source.origin === location.origin || !asset) throw error;
      diagnose('public-media-fetch', 'network-or-cors; retrying through Staff Worker');
      response = await fetch('https://groove-staff-api.groovenspotbusan.workers.dev/lounge-share/' + asset[1], options);
    }
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
      const url = URL.createObjectURL(file.blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  }

  function bind(button, { items, labels, state = {} }) {
    function paint() {
      const label = state.pending ? labels.progress(state.percent || 0) :
        state.mode === 'save' && state.files ? labels.save :
        state.files ? labels.ready : labels.share;
      button.innerHTML = icon + '<span></span>';
      button.lastElementChild.textContent = label;
      button.setAttribute('aria-busy', String(Boolean(state.pending)));
      button.disabled = Boolean(state.pending);
    }
    state.paint = paint;
    paint();

    const supportsFiles = () => {
      if (!state.files || typeof navigator.share !== 'function' || !navigator.canShare) return false;
      try { return navigator.canShare({ files: state.files }); } catch { return false; }
    };
    function offerSave(stage, detail) {
      diagnose(stage, detail);
      state.mode = 'save';
      labels.unsupported();
    }

    async function prepare() {
      state.percent = 0;
      state.pending = true;
      state.paint();
      try {
        const files = [], originals = [];
        for (const [i, item] of items.entries()) {
          const report = fraction => {
            state.percent = Math.floor((i + fraction) * 100 / items.length);
            state.paint();
          };
          const blob = await item.load(report);
          if (!blob?.size) throw new Error('media');
          const originalType = blob.type.split(';')[0].toLowerCase() || (item.video ? 'video/mp4' : 'image/jpeg');
          const type = item.video ? 'video/mp4' : /^image\/(?:heic|heif)(?:-sequence)?$/.test(originalType) ? 'image/jpeg' : originalType;
          const name = item.name + '.' + (extensions[type] || (item.video ? 'mp4' : 'jpg'));
          files.push(typeof File === 'function' ? new File([blob], name, { type }) : blob);
          originals.push({ blob, name: item.name + '.' + (extensions[originalType] || (item.video ? 'mp4' : 'jpg')) });
          report(1);
        }
        state.files = files;
        state.originals = originals;
        if (supportsFiles()) state.mode = 'files';
        else offerSave('canShare', files.map(file => file.type));
      } catch (error) {
        diagnose('download', error instanceof TypeError ? 'network-or-cors' : 'media-unavailable');
        labels.error();
      } finally {
        state.pending = false;
        state.paint();
      }
    }

    button.onclick = async () => {
      if (state.pending) return;
      if (!state.files) { await prepare(); return; }
      if (state.mode === 'files') {
        if (!supportsFiles()) {
          offerSave('canShare', state.files.map(file => file.type));
          state.paint();
          return;
        }
        state.pending = true;
        state.paint();
        try {
          // No promise or network work precedes this call on the share tap.
          await navigator.share({ files: state.files });
          state.mode = '';
          state.files = state.originals = null;
        } catch (error) {
          if (error?.name !== 'AbortError') offerSave('share', error?.name || 'rejected');
        } finally {
          state.pending = false;
          state.paint();
        }
      } else {
        save(state.originals);
        state.mode = '';
        state.files = state.originals = null;
        state.paint();
      }
    };
  }
  return { bind, fetchBlob, icon };
})();
