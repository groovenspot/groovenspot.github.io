'use strict';

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const text = (value) => Array.isArray(value) ? value.filter(Boolean).join('\n') : (value == null ? '' : String(value));
const display = (value) => esc(text(value)).replace(/\n/g, '<br>');
const defaultBenefit = '해당 업장 영수증 지참 시 그루브앤스팟 무료입장';
const state = { data: null, query: '', category: 'all', status: 'all', savedOnly: false, saved: new Set(), activeId: null, galleryIndex: 0 };
let lastTrigger = null;
let detailReturnHash = '#directory';
let toastTimer;

const icons = {
  bookmark: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 3h10v14l-5-3-5 3V3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>',
  pin: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16 8c0 4.5-6 9-6 9S4 12.5 4 8a6 6 0 1 1 12 0Z" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="8" r="2" stroke="currentColor" stroke-width="1.5"/></svg>',
  ticket: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M3 5h14v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4V5Z" stroke="currentColor" stroke-width="1.3"/><path d="M12.5 6v2m0 1v2m0 1v2" stroke="currentColor" stroke-width="1.3"/></svg>',
  arrow: '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15 15 5M5 5h10v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

function httpUrl(value) {
  if (!value || typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

function assetUrl(value) {
  if (!value || typeof value !== 'string') return null;
  if (httpUrl(value)) return httpUrl(value);
  if (/^(?:\.\.\/|javascript:|data:|file:|\/\/)/i.test(value)) return null;
  return value;
}

function galleryPhotos(partner) {
  const photos = [];
  const byPath = new Map();
  function append(items, branchName) {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const full = assetUrl(item.path || item.thumbnail);
      const thumbnail = assetUrl(item.thumbnail || item.path);
      if (!full) continue;
      const key = new URL(full, 'https://gallery.invalid/').href.split('#')[0];
      const name = text(item.branchName).trim() || text(branchName).trim();
      if (byPath.has(key)) {
        const existing = byPath.get(key);
        if (!existing.branchName && name) existing.branchName = name;
        continue;
      }
      const photo = { ...item, path: full, thumbnail: thumbnail || full, branchName: name };
      photos.push(photo);
      byPath.set(key, photo);
    }
  }
  append(partner.gallery, '');
  for (const branch of branchesOf(partner)) append(branch.gallery, branch.name);
  if (branchesOf(partner).length > 1) {
    for (const photo of photos) if (!photo.branchName) photo.branchName = '지점 확인 중';
  }
  return photos;
}

function galleryNeedsCheck(partner, count) {
  return count < 3 || partner.galleryStatus === 'partial' || partner.galleryStatus === 'unavailable';
}

function galleryCountLabel(partner, count) {
  return '사진 ' + count + '장' + (galleryNeedsCheck(partner, count) ? ' · 확인 중' : '');
}

function partnerMedia(partner, thumbnail = false) {
  const photos = galleryPhotos(partner);
  const photo = photos[0];
  return {
    url: photo ? (thumbnail ? photo.thumbnail : photo.path) : null,
    kind: photo ? 'gallery' : null,
    label: galleryCountLabel(partner, photos.length),
    alt: photo ? text(photo.alt).trim() || partner.name + ' ' + (photo.branchName ? photo.branchName + ' ' : '') + '매장 사진' : '',
    photoCount: photos.length
  };
}

function photoCreditMarkup(image) {
  if (!image) return '';
  const page = httpUrl(image.sourceUrl);
  const publisher = text(image.credit).trim() || text(image.sourceTitle).trim() || (page ? new URL(page).hostname.replace(/^www\./, '') : '출처 확인 중');
  const attribution = page
    ? '<a href="' + esc(page) + '" target="_blank" rel="noopener noreferrer">사진 출처 · ' + esc(publisher) + ' <span aria-hidden="true">↗</span></a>'
    : '<span>사진 출처 · ' + esc(publisher) + '</span>';
  const original = httpUrl(image.originalUrl);
  return '<div class="photo-credit">' + attribution + (original ? '<a class="photo-original-link" href="' + esc(original) + '" target="_blank" rel="noopener noreferrer">사진 원본 ↗</a>' : '') + '<p>공개된 매장정보에서 확인한 참고 사진입니다.</p>' +
    (image.verifiedAt ? '<small>사진 확인일 · ' + esc(sourceDate(image.verifiedAt)) + '</small>' : '') + '</div>';
}

function galleryMarkup(partner) {
  const photos = galleryPhotos(partner);
  const heading = '<div class="gallery-heading"><h3>' + esc(text(partner.galleryLabel).trim() || '매장 사진') + '</h3><span>' + galleryCountLabel(partner, photos.length) + '</span></div>' +
    (text(partner.galleryNotes).trim() ? '<p class="gallery-context">' + display(partner.galleryNotes) + '</p>' : '');
  if (!photos.length) {
    return '<section class="store-gallery gallery-empty" data-gallery aria-label="' + esc(partner.name) + ' 매장 사진">' + heading +
      placeholderVisual(partner, true) + '<p class="gallery-pending">확인된 매장 사진이 없습니다.<br>제휴 안내물과 다른 출처의 사진은 이 갤러리에 포함하지 않았습니다.</p></section>';
  }
  const photo = photos[0];
  const alt = text(photo.alt).trim() || partner.name + ' ' + (photo.branchName ? photo.branchName + ' ' : '') + '매장 사진';
  const disabled = photos.length < 2 ? ' disabled' : '';
  const thumbs = photos.map((item, index) =>
    '<button type="button" class="gallery-thumbnail' + (index === 0 ? ' is-active' : '') + '" data-gallery-index="' + index + '" aria-pressed="' + (index === 0) + '" aria-label="' + esc((item.branchName ? item.branchName + ' ' : '') + '사진 ' + (index + 1) + ' 보기') + '">' +
      '<img src="' + esc(item.thumbnail) + '" alt="" loading="lazy" decoding="async">' +
      '<span>' + esc(item.branchName || String(index + 1).padStart(2, '0')) + '</span>' +
    '</button>'
  ).join('');
  return '<section class="store-gallery" data-gallery aria-label="' + esc(partner.name) + ' 매장 사진">' + heading +
    '<div class="gallery-frame"><a class="gallery-main-link" data-gallery-main-link href="' + esc(photo.path) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(partner.name + ' ' + (photo.branchName ? photo.branchName + ' ' : '') + '매장 사진 1 크게 보기') + '">' +
      '<img data-gallery-main-image src="' + esc(photo.path) + '" alt="' + esc(alt) + '" data-media-kind="gallery">' +
    '</a><span class="gallery-branch" data-gallery-branch' + (photo.branchName ? '' : ' hidden') + '>' + esc(photo.branchName) + '</span>' +
    '<div class="gallery-image-error" data-gallery-error hidden>사진을 불러오지 못했습니다.<br>아래 사진 출처에서 원본을 확인해 주세요.</div></div>' +
    '<div class="gallery-controls"><button type="button" class="gallery-step" data-gallery-step="-1" aria-label="이전 매장 사진"' + disabled + '><span aria-hidden="true">←</span></button>' +
      '<span class="gallery-counter" data-gallery-counter aria-label="' + esc((photo.branchName ? photo.branchName + ' ' : '') + '사진 1 / ' + photos.length) + '" aria-live="polite" aria-atomic="true">사진 1 / ' + photos.length + '</span>' +
      '<button type="button" class="gallery-step" data-gallery-step="1" aria-label="다음 매장 사진"' + disabled + '><span aria-hidden="true">→</span></button></div>' +
    '<div class="gallery-thumbnails" role="group" aria-label="매장 사진 선택">' + thumbs + '</div>' +
    '<p class="gallery-help">사진을 누르면 크게 볼 수 있어요. ← → 키로도 넘길 수 있습니다.</p>' +
    (galleryNeedsCheck(partner, photos.length) ? '<p class="gallery-pending">확인된 사진 ' + photos.length + '장입니다. 추가 사진은 확인 중입니다.</p>' : '') +
    '<div data-gallery-credit>' + photoCreditMarkup(photo) + '</div></section>';
}

function posterDetailsMarkup(partner) {
  const poster = assetUrl(partner.poster?.path || partner.poster?.thumbnail);
  if (!poster) return '';
  const thumbnail = assetUrl(partner.poster?.thumbnail || partner.poster?.path);
  const original = httpUrl(partner.poster?.sourceUrl);
  return '<details class="affiliate-poster"><summary>제휴 안내물 보기 <span aria-hidden="true">＋</span></summary>' +
    '<a href="' + esc(poster) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(partner.name) + ' 제휴 안내물 크게 보기"><img src="' + esc(thumbnail) + '" alt="' + esc(partner.name) + ' 제휴 안내물" loading="lazy" decoding="async"></a>' +
    '<p>제휴 혜택을 안내하는 홍보물이며 매장 사진 수에는 포함하지 않습니다.</p>' +
    (original ? '<a class="affiliate-poster-source" href="' + esc(original) + '" target="_blank" rel="noopener noreferrer">제휴 안내물 출처 ↗</a>' : '') + '</details>';
}

function mapUrl(partner) {
  const address = text(partner.address).trim();
  const query = address ? text(partner.name).trim() + ' ' + address : '부산 ' + partner.name;
  return 'https://map.naver.com/p/search/' + encodeURIComponent(query);
}

function googleMapUrl(partner) {
  const address = text(partner.address).trim();
  const query = address ? text(partner.name).trim() + ' ' + address : '부산 ' + partner.name;
  return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query);
}

function sourceDate(value) {
  if (!value) return '';
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? match.slice(1).join('.') : String(value);
}

function fieldUrls(value) {
  const values = Array.isArray(value) ? value : [value];
  return [...new Set(values.map(httpUrl).filter(Boolean))];
}

function fieldSourceMarkup(label, value) {
  const urls = fieldUrls(value);
  if (!urls.length) return '';
  return '<span class="field-sources">' + urls.map((url, index) =>
    '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(label + ' 정보 출처 ' + (index + 1) + ' · ' + new URL(url).hostname) + '">출처' + (urls.length > 1 ? ' ' + (index + 1) : '') + ' ↗</a>'
  ).join('') + '</span>';
}

function categoryOf(partner) {
  return text(partner.category).trim() || '분류 확인 중';
}

function isPoster(partner) {
  return partner.verificationStatus === 'poster';
}

function branchesOf(partner) {
  return Array.isArray(partner.branches) ? partner.branches.filter((branch) => branch && typeof branch === 'object') : [];
}

function csvBusinessValue(partner, field) {
  if (text(partner[field]).trim()) return partner[field];
  return branchesOf(partner).filter((branch) => text(branch[field]).trim()).map((branch, index) =>
    (text(branch.name).trim() || '지점 ' + (index + 1)) + ': ' + text(branch[field])
  ).join('\n');
}

function initials(name) {
  return Array.from(String(name).replace(/\s+/g, '')).slice(0, 2).join('');
}

function readSaved() {
  try {
    const values = JSON.parse(localStorage.getItem('groove-partner-bookmarks') || '[]');
    state.saved = new Set(Array.isArray(values) ? values : []);
  } catch {
    state.saved = new Set();
  }
}

function notify(message) {
  const toast = $('#toast');
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
}

function persistSaved() {
  try {
    localStorage.setItem('groove-partner-bookmarks', JSON.stringify([...state.saved]));
    return true;
  } catch {
    return false;
  }
}

function toggleSaved(id) {
  const partner = state.data?.partners.find((item) => item.id === id);
  if (!partner) return;
  const returnFocusToCard = document.activeElement?.dataset?.save === id;
  const saved = state.saved.has(id);
  if (saved) state.saved.delete(id);
  else state.saved.add(id);
  const persisted = persistSaved();
  renderCards();
  renderStats();
  if (state.activeId === id) updateDetailSave(partner);
  if (returnFocusToCard) {
    const replacement = [...$('#partner-grid').querySelectorAll('[data-save]')].find((button) => button.dataset.save === id);
    (replacement || $('#search')).focus({ preventScroll: true });
  }
  notify(persisted
    ? (saved ? '저장한 매장에서 해제했습니다.' : '매장을 저장했습니다. 이 브라우저에서 다시 볼 수 있어요.')
    : (saved ? '현재 페이지에서만 저장을 해제했습니다. 새로고침하면 다시 표시될 수 있습니다.' : '현재 페이지에서만 저장했습니다. 새로고침하면 유지되지 않습니다.'));
}

function setExternalLink(element, url) {
  const checked = httpUrl(url);
  if (!checked) {
    element.hidden = true;
    return;
  }
  element.href = checked;
  element.target = '_blank';
  element.rel = 'noopener noreferrer';
  element.hidden = false;
}

function normalizeData(input) {
  if (!input || !Array.isArray(input.partners)) throw new Error('Invalid partner data');
  const seen = new Set();
  const partners = input.partners.map((partner, index) => {
    if (!partner || !text(partner.name).trim()) throw new Error('Missing partner name');
    const id = text(partner.id).trim() || 'partner-' + (index + 1);
    if (seen.has(id)) throw new Error('Duplicate partner identifier');
    seen.add(id);
    return { ...partner, id, name: text(partner.name).trim() };
  });
  return { ...input, partners };
}

async function loadData() {
  $('#loading-state').hidden = false;
  $('#error-state').hidden = true;
  $('#empty-state').hidden = true;
  $('#partner-grid').innerHTML = '';
  $('#result-count').textContent = '자료를 불러오고 있습니다.';
  $('#download-csv').disabled = true;
  try {
    const response = await fetch('./partners.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Unable to load partner data');
    state.data = normalizeData(await response.json());
    window.GrooveCourseMap?.setData(state.data);
    const validIds = new Set(state.data.partners.map((partner) => partner.id));
    state.saved = new Set([...state.saved].filter((id) => validIds.has(id)));
    $('#common-benefit').textContent = text(state.data.commonBenefit) || defaultBenefit;
    setExternalLink($('#header-source'), state.data.sourceFolderUrl);
    setExternalLink($('#folder-source'), state.data.sourceFolderUrl);
    setExternalLink($('#hero-source'), state.data.overviewSourceUrl || state.data.sourceFolderUrl);
    $('#updated-at').textContent = state.data.updatedAt ? '자료 정리 · ' + sourceDate(state.data.updatedAt) : '';
    $('#download-csv').disabled = false;
    $('#loading-state').hidden = true;
    renderCategories();
    renderStats();
    renderCards();
    openFromHash();
  } catch {
    $('#loading-state').hidden = true;
    $('#error-state').hidden = false;
    $('#result-count').textContent = '자료를 불러오지 못했습니다.';
  }
}

function renderStats() {
  if (!state.data) return;
  const total = state.data.partners.length;
  $('#total-count').textContent = total;
  $('#nav-count').textContent = total;
  $('#ticket-count').textContent = total;
  $('#verified-count').textContent = state.data.partners.filter(isPoster).length;
  $('#saved-count').textContent = state.saved.size;
}

function renderCategories() {
  if (!state.data) return;
  const counts = new Map();
  for (const partner of state.data.partners) {
    const category = categoryOf(partner);
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  const names = [...counts.keys()].sort((a, b) => {
    if (a === '분류 확인 중') return 1;
    if (b === '분류 확인 중') return -1;
    return a.localeCompare(b, 'ko');
  });
  const items = [['all', '전체', state.data.partners.length], ...names.map((name) => [name, name, counts.get(name)])];
  $('#category-filters').innerHTML = items.map(([value, label, count]) =>
    '<button type="button" class="category-chip' + (state.category === value ? ' active' : '') + '" data-category="' + esc(value) + '" aria-pressed="' + (state.category === value) + '">' + esc(label) + '<small>' + count + '</small></button>'
  ).join('');
}

function filteredPartners() {
  const query = state.query.normalize('NFKC').toLocaleLowerCase('ko').trim();
  const terms = query.split(/\s+/).filter(Boolean);
  return state.data.partners.filter((partner) => {
    if (state.category !== 'all' && categoryOf(partner) !== state.category) return false;
    if (state.status !== 'all' && (isPoster(partner) ? 'poster' : 'lineup-only') !== state.status) return false;
    if (state.savedOnly && !state.saved.has(partner.id)) return false;
    if (!terms.length) return true;
    const haystack = [
      partner.name, partner.category, partner.summary, partner.address, partner.hours,
      partner.phone, partner.instagram, partner.partnerBenefit, partner.grooveBenefit, partner.benefitNotes,
      ...(Array.isArray(partner.branches) ? partner.branches.flatMap((branch) => [branch.name, branch.address, branch.hours, branch.phone]) : [])
    ].map(text).join(' ').normalize('NFKC').toLocaleLowerCase('ko');
    return terms.every((term) => haystack.includes(term));
  });
}

function placeholderVisual(partner, detail = false) {
  if (detail) return '<div class="detail-no-poster"><span class="no-poster-initial">' + esc(initials(partner.name)) + '</span><span>GROOVE & SPOT PARTNERS</span></div>';
  return '<div class="initial-visual"><span class="initial">' + esc(initials(partner.name)) + '</span><span class="initial-caption">GROOVE & SPOT PARTNER</span></div>';
}

function cardHtml(partner, index) {
  const saved = state.saved.has(partner.id);
  const media = partnerMedia(partner, true);
  const image = media.url;
  const visual = image
    ? '<img src="' + esc(image) + '" alt="' + esc(media.alt) + '" data-media-kind="' + media.kind + '" loading="lazy" decoding="async">'
    : placeholderVisual(partner);
  const summary = text(partner.summary) || (isPoster(partner) ? '매장별 제휴 안내물을 확인해 보세요.' : '제휴 라인업에서 확인한 매장입니다.');
  const sourceLabel = isPoster(partner) ? '개별 제휴 안내물 확인' : '제휴 라인업만 확인';
  const ordinal = String(state.data.partners.indexOf(partner) + 1).padStart(2, '0');
  const offer = text(partner.partnerBenefit).trim() || text(partner.grooveBenefit).trim() || text(state.data.commonBenefit) || defaultBenefit;
  const offerLabel = text(partner.partnerBenefit).trim() ? '매장에서 받는 혜택' : text(partner.grooveBenefit).trim() ? '그루브에서 받는 혜택' : '라인업 공통 혜택';
  const branches = branchesOf(partner);
  const location = text(partner.address).trim() || (branches.length ? branches.length + '개 지점 정보' : '');
  return '<article class="partner-card tone-' + (index % 4) + '" data-id="' + esc(partner.id) + '">' +
    '<div class="card-visual">' +
      '<button class="card-image-button" type="button" data-open="' + esc(partner.id) + '" aria-label="' + esc(partner.name) + ' 상세정보 보기">' + visual + '</button>' +
      '<span class="card-visual-kind' + (galleryNeedsCheck(partner, media.photoCount) ? ' is-pending' : '') + '">' + media.label + '</span>' +
      '<span class="card-category">' + esc(categoryOf(partner)) + '</span>' +
      '<button type="button" class="save-button" data-save="' + esc(partner.id) + '" aria-pressed="' + saved + '" aria-label="' + esc(partner.name) + (saved ? ' 저장 해제' : ' 저장하기') + '">' + icons.bookmark + '</button>' +
    '</div><div class="card-body">' +
      '<div class="card-heading-row"><button type="button" class="card-title-button" data-open="' + esc(partner.id) + '">' + esc(partner.name) + '</button><span class="card-ordinal">' + ordinal + '</span></div>' +
      '<p class="card-summary">' + esc(summary) + '</p>' +
      '<div class="card-offer"><span>' + offerLabel + '</span><p>' + esc(offer) + '</p></div>' +
      '<div class="card-location' + (location ? '' : ' missing') + '">' + icons.pin + '<span>' + esc(location || '주소 확인 중') + '</span></div>' +
      '<div class="card-source-state' + (isPoster(partner) ? '' : ' is-pending') + '"><span></span>' + sourceLabel + '</div>' +
      '<div class="card-bottom"><span class="card-benefit">' + icons.ticket + '제휴 안내</span><button type="button" class="card-detail-link" data-open="' + esc(partner.id) + '">자세히<span aria-hidden="true">↗</span></button></div>' +
    '</div></article>';
}

function renderCards() {
  if (!state.data) return;
  const partners = filteredPartners();
  $('#partner-grid').innerHTML = partners.map(cardHtml).join('');
  $('#empty-state').hidden = partners.length > 0;
  $('#result-count').innerHTML = '전체 ' + state.data.partners.length + '곳 중 <strong>' + partners.length + '곳</strong>';
  for (const img of $('#partner-grid').querySelectorAll('img')) {
    img.addEventListener('error', () => {
      const id = img.closest('[data-id]')?.dataset.id;
      const partner = state.data.partners.find((item) => item.id === id);
      if (partner) {
        const visual = img.closest('.card-visual');
        img.parentElement.innerHTML = placeholderVisual(partner);
        const count = galleryPhotos(partner).length;
        const badge = visual?.querySelector('.card-visual-kind');
        if (badge) {
          badge.textContent = '사진 ' + count + '장 · 불러오기 실패';
          badge.classList.add('is-pending');
        }
      }
    }, { once: true });
  }
}

function detailField(label, value, kind, sources) {
  const content = text(value).trim();
  let html = content ? display(content) : '<span class="missing">자료 확인 중</span>';
  if (content && kind === 'phone') {
    const telephone = content.replace(/[^\d+]/g, '');
    if (telephone && /^\+?[\d\s().-]{7,24}$/.test(content)) html = '<a href="tel:' + esc(telephone) + '">' + esc(content) + '</a>';
  }
  if (content && kind === 'link') {
    const url = httpUrl(content);
    if (url) html = '<a href="' + esc(url) + '" target="_blank" rel="noopener noreferrer">' + esc(content.replace(/^https?:\/\//, '').replace(/\/$/, '')) + ' ↗</a>';
  }
  return '<div><dt>' + label + '</dt><dd>' + html + fieldSourceMarkup(label, sources) + '</dd></div>';
}

function branchesMarkup(partner) {
  const branches = branchesOf(partner);
  if (!branches.length) return '';
  return '<section class="detail-branches"><h3>지점별 매장 정보</h3><div class="branch-list">' + branches.map((branch, index) => {
    const name = text(branch.name).trim() || '지점 ' + (index + 1);
    const fields = branch.fieldSources || {};
    const links = fieldUrls(branch.sourceUrl);
    return '<article class="branch-card"><div class="branch-heading"><h4>' + esc(name) + '</h4>' +
      (branch.address ? '<div class="branch-map-links"><a href="' + esc(mapUrl({ name, address: branch.address })) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(name) + ' 네이버지도에서 검색">네이버지도 ↗</a><a href="' + esc(googleMapUrl({ name, address: branch.address })) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(name) + ' 구글지도에서 검색">구글지도 ↗</a></div>' : '') +
      '</div><dl class="branch-specs">' +
      (branch.address ? detailField('주소', branch.address, null, fields.address) : '') +
      (branch.hours ? detailField('영업시간', branch.hours, null, fields.hours) : '') +
      (branch.phone ? detailField('전화', branch.phone, 'phone', fields.phone) : '') +
      (branch.instagram ? detailField('인스타그램', branch.instagram, 'link', fields.instagram) : '') +
      '</dl>' +
      (text(branch.detailsNotes || branch.notes).trim() ? '<p class="branch-note">' + display(branch.detailsNotes || branch.notes) + '</p>' : '') +
      (links.length ? '<div class="branch-sources">' + fieldSourceMarkup(name, links) + '</div>' : '') +
      '</article>';
  }).join('') + '</div></section>';
}

function detailHtml(partner) {
  const imageMarkup = galleryMarkup(partner);
  const summary = text(partner.summary) || '제휴 라인업에 기재된 매장입니다. 상세정보는 확인한 자료를 기준으로 표시합니다.';
  const sourceLabel = isPoster(partner) ? '개별 제휴 안내물 확인' : '제휴 라인업만 확인';
  const sources = (Array.isArray(partner.sources) ? partner.sources : []).filter((source) => httpUrl(source.url));
  const sourceMarkup = sources.map((source) => {
    const photoSource = galleryPhotos(partner).some((photo) => httpUrl(source.url) === httpUrl(photo.sourceUrl)) || (partner.image && httpUrl(source.url) === httpUrl(partner.image.sourceUrl));
    const datedPoster = !photoSource && ['lineup', 'poster'].includes(source.kind) && source.sourceDate;
    return '<li><a href="' + esc(httpUrl(source.url)) + '" target="_blank" rel="noopener noreferrer"><span>' + esc(source.title || '매장 정보 원문') + '</span><span aria-hidden="true">↗</span></a>' +
      (datedPoster ? '<small>원문 수정일 · ' + esc(sourceDate(source.sourceDate)) + '</small>' : '') + '</li>';
  }).join('');
  const common = text(state.data.commonBenefit) || defaultBenefit;
  const groove = text(partner.grooveBenefit).trim();
  const partnerBenefit = text(partner.partnerBenefit).trim();
  const fieldSources = partner.fieldSources || {};
  const branches = branchesOf(partner);
  const address = partner.address || (branches.some((branch) => text(branch.address).trim()) ? '아래 지점별 주소를 확인해 주세요.' : null);
  const hours = partner.hours || (branches.some((branch) => text(branch.hours).trim()) ? '아래 지점별 영업시간을 확인해 주세요.' : null);
  const phone = partner.phone || (branches.some((branch) => text(branch.phone).trim()) ? '아래 지점별 연락처를 확인해 주세요.' : null);
  const instagram = partner.instagram || (branches.some((branch) => text(branch.instagram).trim()) ? '아래 지점별 인스타그램을 확인해 주세요.' : null);
  const checkedDetails = partner.detailsCheckedAt
    ? '<p class="details-checked">영업정보 확인일 <time datetime="' + esc(partner.detailsCheckedAt) + '">' + esc(sourceDate(partner.detailsCheckedAt)) + '</time></p>'
    : '';
  const detailsNote = text(partner.detailsNotes).trim()
    ? '<p class="details-note">' + display(partner.detailsNotes) + '</p>'
    : '';
  const specificGroove = groove
    ? '<section class="detail-benefit"><span class="eyebrow">AT GROOVE & SPOT · 매장별 안내</span><h3>' + display(groove) + '</h3><p>이 매장 개별 홍보물에 기재된 그루브앤스팟 혜택입니다. 적용 조건은 원문을 확인해 주세요.</p></section>'
    : '';
  const benefitAtPartner = partnerBenefit
    ? '<section class="detail-benefit detail-partner-benefit"><span class="eyebrow">AT THE PARTNER · 제휴 매장에서</span><h3>' + display(partnerBenefit) + '</h3><p>그루브 입장 혜택과 별도로, 해당 제휴 매장에서 제공하는 안내입니다.</p></section>'
    : '<section class="detail-benefit detail-partner-benefit"><span class="eyebrow">AT THE PARTNER · 제휴 매장에서</span><h3>매장 자체 혜택은 확인 중입니다.</h3><p>할인·서비스 조건은 자료에서 확인한 내용이 있을 때 표시합니다.</p></section>';
  return '<div class="detail-layout"><div class="detail-poster">' + imageMarkup + '</div><div class="detail-info">' +
    '<div class="detail-kicker"><span class="detail-category">' + esc(categoryOf(partner)) + '</span><span class="detail-source-label">' + sourceLabel + '</span></div>' +
    '<h2 id="detail-title">' + esc(partner.name) + '</h2><p class="detail-summary">' + esc(summary) + '</p>' +
    '<div class="detail-actions"><a class="button button-primary" href="' + esc(mapUrl(partner)) + '" target="_blank" rel="noopener noreferrer">' + icons.pin + '네이버지도</a><a class="button button-outline" href="' + esc(googleMapUrl(partner)) + '" target="_blank" rel="noopener noreferrer" aria-label="' + esc(partner.name) + ' 구글지도에서 검색">' + icons.pin + '구글지도</a><button id="detail-save" type="button" class="button button-outline detail-save"></button></div>' +
    '<div class="details-meta">' + checkedDetails + detailsNote + '</div>' +
    '<dl class="detail-specs">' + detailField('주소', address, null, fieldSources.address) + detailField('영업시간', hours, null, fieldSources.hours) + detailField('전화', phone, 'phone', fieldSources.phone) +
      detailField('인스타그램', instagram, 'link', fieldSources.instagram) + (partner.website ? detailField('매장 웹정보', partner.website, 'link', fieldSources.website) : '') + '</dl>' +
    branchesMarkup(partner) +
    '<section class="detail-benefit"><span class="eyebrow">RECEIPT BENEFIT · 라인업 공통 안내</span><h3>' + display(common) + '</h3><p>전체 제휴 라인업에 기재된 공통 안내입니다. 당일 영수증 여부 등 추가 조건은 원문에 명시된 범위에서 확인해 주세요.</p></section>' +
    specificGroove + benefitAtPartner +
    (text(partner.benefitNotes).trim() ? '<p class="detail-notice"><strong>추가 확인 사항</strong><br>' + display(partner.benefitNotes) + '</p>' : '') +
    (sources.length || partner.poster ? '<section class="detail-sources"><h3>정보·사진 출처</h3><ul>' + sourceMarkup + '</ul>' + posterDetailsMarkup(partner) + '</section>' : '') +
    '<p class="detail-notice">제휴 혜택은 안내물, 영업정보는 공개된 매장정보를 기준으로 정리했습니다. <strong>현재 영업 여부·시간·제휴 적용 조건은 방문 전 매장에 확인해 주세요.</strong> 지도 링크는 매장명 또는 주소 검색이며, 개별 장소를 확인한 링크는 아닙니다.</p>' +
    '</div></div>';
}

function updateDetailSave(partner) {
  const button = $('#detail-save');
  if (!button) return;
  const saved = state.saved.has(partner.id);
  button.innerHTML = icons.bookmark + (saved ? '저장한 매장' : '매장 저장');
  button.classList.toggle('is-saved', saved);
  button.setAttribute('aria-pressed', String(saved));
  button.setAttribute('aria-label', partner.name + (saved ? ' 저장 해제' : ' 저장하기'));
}

function showGalleryPhoto(index, focusThumbnail = false) {
  const partner = state.data?.partners.find((item) => item.id === state.activeId);
  if (!partner) return;
  const photos = galleryPhotos(partner);
  const gallery = $('#detail-content').querySelector('[data-gallery]');
  if (!photos.length || !gallery) return;
  const next = ((Math.trunc(Number(index)) || 0) % photos.length + photos.length) % photos.length;
  state.galleryIndex = next;
  const photo = photos[next];
  const image = gallery.querySelector('[data-gallery-main-image]');
  const link = gallery.querySelector('[data-gallery-main-link]');
  const error = gallery.querySelector('[data-gallery-error]');
  if (!image || !link) return;
  error.hidden = true;
  image.hidden = false;
  image.alt = text(photo.alt).trim() || partner.name + ' ' + (photo.branchName ? photo.branchName + ' ' : '') + '매장 사진';
  image.src = photo.path;
  link.href = photo.path;
  link.setAttribute('aria-label', partner.name + ' ' + (photo.branchName ? photo.branchName + ' ' : '') + '매장 사진 ' + (next + 1) + ' 크게 보기');
  const branch = gallery.querySelector('[data-gallery-branch]');
  branch.textContent = photo.branchName;
  branch.hidden = !photo.branchName;
  const counter = gallery.querySelector('[data-gallery-counter]');
  counter.textContent = '사진 ' + (next + 1) + ' / ' + photos.length;
  counter.setAttribute('aria-label', (photo.branchName ? photo.branchName + ' ' : '') + '사진 ' + (next + 1) + ' / ' + photos.length);
  gallery.querySelector('[data-gallery-credit]').innerHTML = photoCreditMarkup(photo);
  let selected = null;
  for (const button of gallery.querySelectorAll('[data-gallery-index]')) {
    const active = Number(button.dataset.galleryIndex) === next;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
    if (active) selected = button;
  }
  if (selected) {
    if (focusThumbnail) selected.focus({ preventScroll: true });
    selected.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
}

function bindDetailGallery(partner) {
  const gallery = $('#detail-content').querySelector('[data-gallery]');
  if (!gallery || !galleryPhotos(partner).length) return;
  gallery.addEventListener('click', (event) => {
    const step = event.target.closest('[data-gallery-step]');
    if (step && !step.disabled) {
      showGalleryPhoto(state.galleryIndex + Number(step.dataset.galleryStep));
      return;
    }
    const thumbnail = event.target.closest('[data-gallery-index]');
    if (thumbnail) showGalleryPhoto(Number(thumbnail.dataset.galleryIndex), true);
  });
  const image = gallery.querySelector('[data-gallery-main-image]');
  image.addEventListener('error', () => {
    image.hidden = true;
    gallery.querySelector('[data-gallery-error]').hidden = false;
  });
  for (const thumbnail of gallery.querySelectorAll('.gallery-thumbnail img')) {
    thumbnail.addEventListener('error', () => { thumbnail.hidden = true; }, { once: true });
  }
}

function openDetail(id, trigger, syncHash = true) {
  const partner = state.data?.partners.find((item) => item.id === id);
  if (!partner) return;
  lastTrigger = trigger || document.activeElement;
  detailReturnHash = trigger?.closest('section[id]')?.id === 'course-map' ? '#course-map' : '#directory';
  state.activeId = id;
  state.galleryIndex = 0;
  $('#detail-content').innerHTML = detailHtml(partner);
  $('#detail-content').scrollTop = 0;
  updateDetailSave(partner);
  $('#detail-save').addEventListener('click', () => toggleSaved(id));
  bindDetailGallery(partner);
  const dialog = $('#detail-dialog');
  if (!dialog.open) dialog.showModal();
  document.body.style.overflow = 'hidden';
  if (syncHash) history.replaceState(null, '', '#store/' + encodeURIComponent(id));
}

function closeDetail() {
  $('#detail-dialog').close();
}

function onDetailClosed() {
  document.body.style.overflow = '';
  state.activeId = null;
  state.galleryIndex = 0;
  if (location.hash.startsWith('#store/')) history.replaceState(null, '', detailReturnHash);
  if (lastTrigger?.isConnected) lastTrigger.focus({ preventScroll: true });
  else if (detailReturnHash === '#course-map') $('#course-search')?.focus({ preventScroll: true });
  else {
    const id = lastTrigger?.dataset?.open;
    const replacement = id && [...$('#partner-grid').querySelectorAll('[data-open]')].find((button) => button.dataset.open === id);
    (replacement || $('#search')).focus({ preventScroll: true });
  }
}

function openFromHash() {
  if (!location.hash.startsWith('#store/')) return;
  try {
    openDetail(decodeURIComponent(location.hash.slice(7)), null, false);
  } catch {
    // Invalid fragments simply leave the directory open.
  }
}

function resetFilters() {
  state.query = '';
  state.category = 'all';
  state.status = 'all';
  state.savedOnly = false;
  $('#search').value = '';
  $('#status-filter').value = 'all';
  $('#saved-filter').setAttribute('aria-pressed', 'false');
  renderCategories();
  renderCards();
}

function exportCsv() {
  if (!state.data) return;
  const anchor = document.createElement('a');
  anchor.href = './partners.csv';
  anchor.download = 'groove-partner-guide-' + (state.data.updatedAt || 'preview') + '.csv';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  notify('제휴 매장 목록을 CSV로 저장했습니다.');
}

$('#brand-image').addEventListener('error', () => {
  $('#brand-image').hidden = true;
  $('#brand-fallback').hidden = false;
});
$('#search-form').addEventListener('submit', (event) => event.preventDefault());
$('#search').addEventListener('input', (event) => { state.query = event.target.value; renderCards(); });
$('#status-filter').addEventListener('change', (event) => { state.status = event.target.value; renderCards(); });
$('#saved-filter').addEventListener('click', () => {
  state.savedOnly = !state.savedOnly;
  $('#saved-filter').setAttribute('aria-pressed', String(state.savedOnly));
  renderCards();
});
$('#category-filters').addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderCards();
});
$('#partner-grid').addEventListener('click', (event) => {
  const save = event.target.closest('[data-save]');
  if (save) { toggleSaved(save.dataset.save); return; }
  const open = event.target.closest('[data-open]');
  if (open) openDetail(open.dataset.open, open);
});
$('#reset-filters').addEventListener('click', resetFilters);
$('#retry-load').addEventListener('click', loadData);
$('#download-csv').addEventListener('click', exportCsv);
$('#close-detail').addEventListener('click', closeDetail);
$('#detail-dialog').addEventListener('close', onDetailClosed);
$('#detail-dialog').addEventListener('click', (event) => {
  if (event.target !== $('#detail-dialog')) return;
  const bounds = $('#detail-dialog').getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) closeDetail();
});
document.addEventListener('keydown', (event) => {
  if ($('#detail-dialog').open && ['ArrowLeft', 'ArrowRight'].includes(event.key) &&
      !event.metaKey && !event.ctrlKey && !event.altKey &&
      !event.target.closest('input,textarea,select,[contenteditable="true"]')) {
    const partner = state.data?.partners.find((item) => item.id === state.activeId);
    if (partner && galleryPhotos(partner).length > 1) {
      event.preventDefault();
      showGalleryPhoto(state.galleryIndex + (event.key === 'ArrowLeft' ? -1 : 1), Boolean(event.target.closest('[data-gallery-index]')));
    }
    return;
  }
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k' && !$('#detail-dialog').open) {
    event.preventDefault();
    $('#search').focus();
    $('#search').scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
});
window.addEventListener('hashchange', openFromHash);
readSaved();
loadData();
