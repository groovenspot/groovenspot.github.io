(function () {
  'use strict';

  const select = (value) => document.querySelector(value);
  const escape = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const clean = (value) => value == null ? '' : String(value).trim();
  const normalize = (value) => clean(value).toLocaleLowerCase('ko').replace(/\s+/g, '');
  const model = { data: null, locations: [], destination: null, visible: [], query: '', benefit: 'all', selectedId: null, map: null, group: null, markers: new Map(), destinationMarker: null, bound: false };

  function httpUrl(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) ? url.href : null;
    } catch { return null; }
  }

  function assetUrl(value) {
    if (!value || typeof value !== 'string') return null;
    if (/^(?:\.\.\/|javascript:|data:|file:|\/\/)/i.test(value)) return null;
    return httpUrl(value) || (/^(?:\.\/)?assets\//.test(value) ? value : null);
  }

  function coordinates(value) {
    return value && typeof value.lat === 'number' && typeof value.lng === 'number' && Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180;
  }

  function benefitFor(partner, data) {
    const specific = clean(partner.grooveBenefit);
    return { text: specific || clean(data.commonBenefit) || '제휴 혜택은 매장 상세에서 확인해 주세요.', source: specific ? '개별 제휴 안내물' : '라인업 공통 안내', specific: Boolean(specific) };
  }

  function benefitTags(benefit) {
    const value = normalize(benefit);
    const tags = [];
    if (/무료입장/.test(value)) tags.push({ id: 'entry', text: '무료입장' });
    if (/바틀|bottle/.test(value)) tags.push({ id: 'bottle', text: '바틀 혜택' });
    if (/원드링크|원드링|1드링크/.test(value)) tags.push({ id: 'drink', text: '원드링크' });
    return tags.length ? tags : [{ id: 'other', text: '제휴 혜택' }];
  }

  function photoFor(partner, branchName) {
    const branch = (Array.isArray(partner.branches) ? partner.branches : []).find((item) => item.name === branchName);
    const photos = branch?.gallery || (Array.isArray(partner.gallery) ? partner.gallery.filter((item) => !branchName || item.branchName === branchName) : []);
    const photo = photos[0];
    return photo && assetUrl(photo.thumbnail || photo.path) ? { url: assetUrl(photo.thumbnail || photo.path), alt: clean(photo.alt) || partner.name + ' 매장 사진' } : null;
  }

  function locationsFor(data) {
    const partners = new Map((data.partners || []).map((partner) => [partner.id, partner]));
    const seen = new Set();
    return (Array.isArray(data.courseMap?.locations) ? data.courseMap.locations : []).flatMap((location, index) => {
      const partner = partners.get(location.partnerId);
      if (!partner || partner.category !== '주점·식당' || !coordinates(location)) return [];
      const branchName = clean(location.branchName);
      const id = clean(location.locationId || location.id) || location.partnerId + (branchName ? ':' + branchName : '');
      if (seen.has(id)) return [];
      seen.add(id);
      const benefit = benefitFor(partner, data);
      const name = clean(location.name) || branchName || partner.name;
      return [{ ...location, id, name, partner, branchName, number: index + 1, address: clean(location.address) || clean(partner.address), benefit, tags: benefitTags(benefit.text), photo: photoFor(partner, branchName) }];
    });
  }

  function naverSearch(name, address) {
    return 'https://map.naver.com/p/search/' + encodeURIComponent([name, address].filter(Boolean).join(' '));
  }

  function googleSearch(name, address) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([name, address].filter(Boolean).join(' '));
  }

  function directions(location, destination) {
    if (!coordinates(location) || !coordinates(destination)) return null;
    return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(location.lat + ',' + location.lng) + '&destination=' + encodeURIComponent(destination.lat + ',' + destination.lng) + '&travelmode=walking';
  }

  function tagsMarkup(location) {
    return location.tags.map((tag) => '<span class="course-benefit-tag course-benefit-' + tag.id + '">' + escape(tag.text) + '</span>').join('');
  }

  function listMarkup(location) {
    const selected = model.selectedId === location.id;
    return '<li><button type="button" class="course-place' + (selected ? ' is-selected' : '') + '" data-course-select="' + escape(location.id) + '" aria-pressed="' + selected + '">' +
      '<span class="course-place-number" aria-hidden="true">' + location.number + '</span><span class="course-place-copy"><span class="course-place-title">' + escape(location.name) + '</span>' +
      '<span class="course-place-address">' + escape(location.address) + '</span><span class="course-place-tags">' + tagsMarkup(location) + '</span>' +
      '<span class="course-place-benefit">' + escape(location.benefit.text) + '</span><span class="course-benefit-source">' + escape(location.benefit.source) + '</span></span>' +
      '<span class="course-place-arrow" aria-hidden="true">↗</span></button></li>';
  }

  function popupMarkup(location) {
    return '<div class="course-popup"><span class="course-popup-kicker">' + escape(location.benefit.source) + '</span><h3>' + escape(location.name) + '</h3><p class="course-popup-address">' + escape(location.address) + '</p>' +
      '<div class="course-place-tags">' + tagsMarkup(location) + '</div><p class="course-popup-benefit">' + escape(location.benefit.text) + '</p>' +
      '<button type="button" class="course-popup-detail" data-course-detail="' + escape(location.partner.id) + '">사진·혜택 상세 보기 →</button></div>';
  }

  function markerIcon(location, active) {
    return window.L.divIcon({ className: 'course-marker-wrap', html: '<span class="course-pin' + (active ? ' is-selected' : '') + '"><span>' + location.number + '</span></span>', iconSize: [34, 42], iconAnchor: [17, 42], popupAnchor: [0, -36] });
  }

  function setStatus(message, error) {
    const status = select('#course-map-status');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-error', Boolean(error));
    status.hidden = !message;
  }

  function showMapFallback(message) {
    setStatus(message, true);
    const fallback = select('#course-map-fallback');
    if (fallback) fallback.hidden = false;
  }

  function initializeMap() {
    if (model.map || !model.locations.length) return;
    if (!window.L) {
      showMapFallback('지도를 불러오지 못했습니다. 매장 목록과 외부 지도 링크로 위치와 혜택을 확인할 수 있습니다.');
      return;
    }
    try {
      const initial = coordinates(model.destination) ? model.destination : model.locations[0];
      const map = window.L.map('course-leaflet', { scrollWheelZoom: false, zoomControl: true, maxZoom: 19 }).setView([initial.lat, initial.lng], 16);
      model.map = map;
      setStatus('지도 배경을 불러오고 있습니다.');
      const tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors' });
      let failed = false;
      tiles.on('tileerror', () => { failed = true; setStatus('일부 지도 배경을 불러오지 못했습니다. 목록과 외부 지도 링크는 이용할 수 있습니다.', true); });
      tiles.on('tileload', () => { if (!failed) setStatus(''); });
      tiles.addTo(map);
      model.group = window.L.markerClusterGroup ? window.L.markerClusterGroup({ maxClusterRadius: 38, showCoverageOnHover: false, spiderfyOnMaxZoom: true, zoomToBoundsOnClick: true, iconCreateFunction: (cluster) => window.L.divIcon({ html: '<span>' + cluster.getChildCount() + '</span>', className: 'course-cluster', iconSize: [42, 42] }) }) : window.L.featureGroup();
      model.group.addTo(map);
      const destination = model.destination;
      if (coordinates(destination)) {
        model.destinationMarker = window.L.marker([destination.lat, destination.lng], { title: destination.name || '그루브앤스팟', keyboard: true, zIndexOffset: 1000, icon: window.L.divIcon({ className: 'course-destination-marker', html: '<span>G<span>GROOVE</span></span>', iconSize: [60, 53], iconAnchor: [30, 53], popupAnchor: [0, -44] }) }).addTo(map).bindPopup('<div class="course-popup"><span class="course-popup-kicker">코스의 다음 목적지</span><h3>' + escape(destination.name || '그루브앤스팟') + '</h3><p>' + escape(destination.address) + '</p><a href="' + escape(naverSearch(destination.name, destination.address)) + '" target="_blank" rel="noopener noreferrer">네이버에서 위치 보기 ↗</a></div>');
      }
      window.addEventListener('resize', () => { if (model.map) model.map.invalidateSize({ pan: false }); });
    } catch {
      showMapFallback('지도를 불러오지 못했습니다. 아래 목록에서 매장 혜택과 지도 링크를 확인해 주세요.');
    }
  }

  function updateMarkers() {
    if (!model.map || !model.group) return;
    model.group.clearLayers();
    model.markers.clear();
    for (const location of model.visible) {
      const marker = window.L.marker([location.lat, location.lng], { title: location.name + ' · ' + location.benefit.text, alt: location.name + ' · ' + location.benefit.text, keyboard: true, icon: markerIcon(location, location.id === model.selectedId) });
      marker.bindPopup(popupMarkup(location), { maxWidth: 280, minWidth: 210 });
      marker.on('click', () => selectLocation(location.id, { popup: false }));
      marker.on('add', () => {
        const element = marker.getElement();
        if (element) { element.setAttribute('role', 'button'); element.setAttribute('aria-label', location.name + ' · ' + location.benefit.text); }
      });
      model.group.addLayer(marker);
      model.markers.set(location.id, marker);
    }
  }

  function fitLocations() {
    if (!model.map) return;
    const coordinatesToFit = model.visible.map((location) => [location.lat, location.lng]);
    if (coordinates(model.destination)) coordinatesToFit.push([model.destination.lat, model.destination.lng]);
    if (coordinatesToFit.length) model.map.fitBounds(window.L.latLngBounds(coordinatesToFit), { padding: [45, 45], maxZoom: 17 });
  }

  function renderSelected() {
    const target = select('#course-selected');
    const location = model.visible.find((item) => item.id === model.selectedId);
    if (!location) {
      target.innerHTML = '<p class="course-selected-empty">조건에 맞는 매장을 선택하면 그루브 방문 혜택을 보여드릴게요.</p>';
      return;
    }
    const route = directions(location, model.destination);
    const source = httpUrl(location.sourceUrl);
    target.innerHTML = '<div class="course-selected-photo">' + (location.photo ? '<img src="' + escape(location.photo.url) + '" alt="' + escape(location.photo.alt) + '" loading="lazy" decoding="async">' : '<span aria-hidden="true">' + escape(location.name.slice(0, 2)) + '</span>') + '</div>' +
      '<div class="course-selected-copy"><span class="course-selected-label">선택한 1차 장소 · ' + escape(location.benefit.source) + '</span><h3>' + escape(location.name) + '</h3><p class="course-selected-address">' + escape(location.address) + '</p><p class="course-selected-benefit">' + escape(location.benefit.text) + '</p>' +
      '<p class="course-selected-note">이용 조건은 제휴 안내물 기준입니다. ' + (source ? '<a href="' + escape(source) + '" target="_blank" rel="noopener noreferrer">위치 출처 ↗</a>' : '') + '</p></div>' +
      '<div class="course-selected-actions"><button class="course-action course-action-primary" type="button" data-course-detail="' + escape(location.partner.id) + '">사진·혜택 상세 보기 ↗</button>' +
      (route ? '<a class="course-action" href="' + escape(route) + '" target="_blank" rel="noopener noreferrer">구글로 그루브 길찾기 ↗</a>' : '') +
      '<a class="course-location-link" href="' + escape(naverSearch(location.name, location.address)) + '" target="_blank" rel="noopener noreferrer">네이버에서 매장 위치 ↗</a></div>';
    const image = target.querySelector('img');
    if (image) image.addEventListener('error', () => { image.hidden = true; }, { once: true });
  }

  function selectLocation(id, options) {
    const location = model.visible.find((item) => item.id === id);
    if (!location) return;
    model.selectedId = id;
    for (const button of select('#course-place-list').querySelectorAll('[data-course-select]')) {
      const selected = button.dataset.courseSelect === id;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
    renderSelected();
    for (const item of model.visible) {
      const marker = model.markers.get(item.id);
      if (marker) marker.setIcon(markerIcon(item, item.id === id));
    }
    const marker = model.markers.get(id);
    if (marker && options?.popup !== false) {
      if (typeof model.group.zoomToShowLayer === 'function') model.group.zoomToShowLayer(marker, () => {
        if (model.selectedId === id && model.markers.get(id) === marker) marker.openPopup();
      });
      else { model.map.setView([location.lat, location.lng], 18); marker.openPopup(); }
    }
    select('#course-selection-status').textContent = location.name + ' 선택. ' + location.benefit.text;
  }

  function renderDestination() {
    const target = select('#course-destination');
    const destination = model.destination;
    if (!destination || !clean(destination.address)) {
      target.innerHTML = '<span class="course-destination-symbol" aria-hidden="true">G</span><div><span>다음 목적지</span><h3>그루브앤스팟</h3><p>목적지 위치를 확인하고 있습니다.</p></div>';
      return;
    }
    target.innerHTML = '<span class="course-destination-symbol" aria-hidden="true">G</span><div class="course-destination-copy"><span>다음 목적지 · GROOVE 2F / SPOT 3F</span><h3>' + escape(destination.name || '그루브앤스팟') + '</h3><p>' + escape(destination.address) + '</p></div>' +
      '<div class="course-destination-links"><a href="' + escape(naverSearch(destination.name, destination.address)) + '" target="_blank" rel="noopener noreferrer">네이버지도 ↗</a><a href="' + escape(googleSearch(destination.name, destination.address)) + '" target="_blank" rel="noopener noreferrer">구글지도 ↗</a></div>';
  }

  function render() {
    const query = normalize(model.query);
    model.visible = model.locations.filter((location) => (!query || normalize([location.name, location.partner.name, location.branchName, location.address, location.benefit.text, ...location.tags.map((tag) => tag.id + ' ' + tag.text)].join(' ')).includes(query)) && (model.benefit === 'all' || location.tags.some((tag) => tag.id === model.benefit)));
    if (!model.visible.some((item) => item.id === model.selectedId)) model.selectedId = model.visible[0]?.id || null;
    select('#course-place-list').innerHTML = model.visible.map(listMarkup).join('');
    select('#course-count').textContent = model.visible.length + '곳' + (model.visible.length !== model.locations.length ? ' / 전체 ' + model.locations.length + '곳' : '의 제휴 소주집');
    select('#course-empty').hidden = model.visible.length > 0;
    select('#course-loading').hidden = true;
    select('#course-map-total').textContent = model.locations.length;
    initializeMap();
    updateMarkers();
    fitLocations();
    renderSelected();
  }

  function bindEvents() {
    if (model.bound) return;
    model.bound = true;
    select('#course-search-form').addEventListener('submit', (event) => event.preventDefault());
    select('#course-search').addEventListener('input', (event) => { model.query = event.target.value; render(); });
    select('#course-benefit-filter').addEventListener('change', (event) => { model.benefit = event.target.value; render(); });
    select('#course-fit').addEventListener('click', fitLocations);
    select('#course-clear').addEventListener('click', () => { model.query = ''; model.benefit = 'all'; select('#course-search').value = ''; select('#course-benefit-filter').value = 'all'; render(); select('#course-search').focus(); });
    select('#course-map').addEventListener('click', (event) => {
      const detail = event.target.closest('[data-course-detail]');
      if (detail && typeof window.openDetail === 'function') { window.openDetail(detail.dataset.courseDetail, detail); return; }
      const button = event.target.closest('[data-course-select]');
      if (button) selectLocation(button.dataset.courseSelect, { popup: true });
    });
  }

  function setData(data) {
    if (!select('#course-map')) return;
    try {
      model.data = data;
      model.locations = locationsFor(data);
      model.destination = data.courseMap?.destination || null;
      bindEvents();
      renderDestination();
      render();
      select('#course-data-date').textContent = data.courseMap?.checkedAt ? '위치 확인 · ' + clean(data.courseMap.checkedAt).replace(/-/g, '.') : '';
      if (!model.locations.length) showMapFallback('확인된 매장 위치가 없습니다. 아래 전체 제휴 매장에서 주소와 혜택을 확인해 주세요.');
    } catch {
      showMapFallback('지도 정보를 불러오지 못했습니다. 아래 전체 제휴 매장에서 위치와 혜택을 확인해 주세요.');
    }
  }

  window.GrooveCourseMap = { setData };
}());
