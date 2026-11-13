#!/usr/bin/env python3
"""DJ 녹음 파일에서 비트·마디·에너지·빌드업·드롭 위치를 뽑아 가상 클럽 조명용 '비트 맵'을 만든다.

가상 클럽(club/)은 유튜브로 소리를 틀기 때문에 웹페이지가 소리를 직접 읽을 수 없다.
그래서 영상의 원본 녹음을 여기서 미리 분석해 두고, 클럽은 유튜브 재생 시간만 보고 조명·드롭 게임을 맞춘다.

필요한 것: python3, numpy, ffmpeg

  # 1) 녹음 분석 → club/beats/rec/<이름>.json (+ club/beats/index.json 목록 갱신)
  python3 tools/beatmap.py analyze 녹음.mp3 --id 20261103-taro --name 타로 --date 2026-11-03

  # 2) 이 녹음으로 만든 유튜브 영상에 연결 → club/beats/videos.json
  #    영상 최종본(또는 그 소리)으로 녹음과 영상 사이의 시간 차이를 자동으로 찾는다.
  python3 tools/beatmap.py link club/beats/rec/20261103-taro.json --youtube suaSXr4VAOs --video 최종본.mp4
  #    시간 차이를 이미 알면(영상이 녹음보다 12.5초 늦게 시작하면 12.5)
  python3 tools/beatmap.py link club/beats/rec/20261103-taro.json --youtube suaSXr4VAOs --offset 12.5

맵 형식 (JSON, v1)
  dur    녹음 길이(초)          bpm  대표 템포
  seg    [[첫 비트 번호, 그 비트 시각(초), 비트 간격(초)], ...]  — 구간마다 일정한 템포로 비트를 이어 붙인다
  nb     비트 수                db   첫 마디 시작(다운비트) 비트 번호 (0~3)
  e      마디마다 에너지 0~9 문자열
  drops  드롭이 터지는 비트 번호들          builds  [[빌드업 시작 비트, 드롭 비트], ...]
"""
import argparse
import json
import math
import os
import subprocess
import sys

import numpy as np

SR = 11025          # 분석용 샘플레이트
NFFT = 1024
HOP = 256           # 23.2 ms
FPS = SR / HOP
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
BEATS_DIR = os.path.join(ROOT, 'club', 'beats')


def decode(path, sr=SR, start=None, dur=None):
    cmd = ['ffmpeg', '-v', 'error', '-nostdin']
    if start is not None:
        cmd += ['-ss', str(start)]
    if dur is not None:
        cmd += ['-t', str(dur)]
    cmd += ['-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-']
    raw = subprocess.run(cmd, check=True, stdout=subprocess.PIPE).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def spectra(x):
    """프레임마다 스펙트럼 플럭스(온셋), 저음·중음·고음 에너지."""
    n = 1 + max(0, (len(x) - NFFT) // HOP)
    win = np.hanning(NFFT).astype(np.float32)
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    low = (freqs >= 35) & (freqs < 160)
    mid = (freqs >= 160) & (freqs < 2500)
    high = (freqs >= 2500) & (freqs < 5400)
    flux = np.zeros(n, np.float32)
    lowflux = np.zeros(n, np.float32)
    midflux = np.zeros(n, np.float32)
    el = np.zeros(n, np.float32)
    em = np.zeros(n, np.float32)
    eh = np.zeros(n, np.float32)
    prev = None
    CH = 4096
    for s in range(0, n, CH):
        e = min(n, s + CH)
        idx = (np.arange(s, e)[:, None] * HOP + np.arange(NFFT)[None, :])
        fr = x[idx] * win
        mag = np.abs(np.fft.rfft(fr, axis=1)).astype(np.float32)
        lm = np.log1p(30 * mag)
        if prev is None:
            prev = lm[:1]
        d = np.diff(np.vstack([prev, lm]), axis=0)
        d[d < 0] = 0
        flux[s:e] = d.sum(axis=1)
        lowflux[s:e] = d[:, low].sum(axis=1)
        midflux[s:e] = d[:, mid].sum(axis=1)
        p = mag ** 2
        el[s:e] = p[:, low].sum(axis=1)
        em[s:e] = p[:, mid].sum(axis=1)
        eh[s:e] = p[:, high].sum(axis=1)
        prev = lm[-1:]
    return flux, lowflux, midflux, el, em, eh


def smooth(a, w):
    w = max(1, int(w))
    if w <= 1:
        return a.astype(np.float64)
    k = np.ones(w) / w
    return np.convolve(a, k, mode='same')


def norm95(a):
    return a / (np.percentile(a, 95) + 1e-9)


def kickness(lowflux, midflux):
    """킥 드럼: 저음과 중음이 동시에 튀는 순간 (베이스만·하이햇만인 소리는 약하게)."""
    k = np.sqrt(norm95(lowflux) * norm95(midflux))
    k = k - smooth(k, FPS * 0.5)
    k[k < 0] = 0
    return k


def onset_env(flux, lowflux, midflux):
    o = 0.6 * norm95(flux) + 0.8 * norm95(lowflux) + 2.0 * norm95(kickness(lowflux, midflux))
    o = o - smooth(o, FPS * 1.0)          # 느린 변화 제거
    o[o < 0] = 0
    return o / (o.std() + 1e-9)


def local_tempo(o, win_s=16.0, hop_s=4.0, lo=68.0, hi=190.0):
    """창마다 자기상관으로 비트 간격(프레임)을 고른다. 120 BPM 근처를 조금 더 선호."""
    W = int(win_s * FPS)
    H = int(hop_s * FPS)
    lags = np.arange(int(60 / hi * FPS), int(60 / lo * FPS) + 2)
    bpm_of = 60 * FPS / lags
    prior = np.exp(-0.5 * (np.log2(bpm_of / 122.0) / 0.9) ** 2)
    centers, periods, strength = [], [], []
    for s in range(0, max(1, len(o) - W), H):
        seg = o[s:s + W] - o[s:s + W].mean()
        if seg.std() < 1e-6:
            continue
        f = np.fft.rfft(seg, 2 * W)
        ac = np.fft.irfft(f * np.conj(f))[:W]
        ac = ac / (ac[0] + 1e-9)
        sc = ac[lags]
        # 두 배·절반 간격도 함께 맞으면 점수를 더 준다(박자 계층)
        sc2 = sc + 0.5 * np.interp(lags * 2, np.arange(W), ac) + 0.25 * np.interp(lags / 2, np.arange(W), ac)
        k = int(np.argmax(sc2 * prior))
        # 포물선 보간으로 프레임보다 세밀하게
        lag = float(lags[k])
        if 0 < k < len(lags) - 1:
            a, b, c = sc[k - 1], sc[k], sc[k + 1]
            den = a - 2 * b + c
            if abs(den) > 1e-9:
                lag += 0.5 * (a - c) / den
        centers.append(s + W / 2)
        periods.append(lag)
        strength.append(float(sc[k]))
    if not periods:
        return np.full(len(o), 60 / 120 * FPS)
    centers = np.array(centers)
    periods = np.array(periods)
    # 갑자기 두 배·절반으로 튀는 값은 주변 값에 맞춘다
    med = np.median(periods)
    for i in range(len(periods)):
        for f in (2.0, 0.5, 1.5, 2 / 3):
            if abs(periods[i] * f - med) < abs(periods[i] - med) * 0.5:
                periods[i] *= f
    # 중앙값 필터
    pm = periods.copy()
    for i in range(len(periods)):
        a, b = max(0, i - 2), min(len(periods), i + 3)
        pm[i] = np.median(periods[a:b])
    return np.interp(np.arange(len(o)), centers, pm)


def track_beats(o, period, tight=120.0):
    """Ellis 동적 계획법 비트 추적 (프레임마다 그 자리의 비트 간격 사용)."""
    n = len(o)
    score = o.astype(np.float64).copy()
    back = np.full(n, -1, np.int64)
    for t in range(n):
        P = period[t]
        a = int(t - 2 * P)
        b = int(t - 0.5 * P)
        if b <= 0:
            continue
        a = max(0, a)
        taus = t - np.arange(a, b)
        pen = -tight * np.log(taus / P) ** 2
        cand = score[a:b] + pen
        k = int(np.argmax(cand))
        if cand[k] > 0:
            score[t] = o[t] + cand[k]
            back[t] = a + k
    # 끝 부근에서 가장 높은 점수에서 되짚어 간다
    tail = int(min(n, 4 * period[-1]))
    t = n - tail + int(np.argmax(score[n - tail:]))
    beats = []
    while t >= 0:
        beats.append(t)
        t = back[t]
    beats = np.array(beats[::-1], np.float64)
    # 프레임 안에서 온셋 무게중심으로 살짝 다듬기
    ref = []
    for b in beats.astype(int):
        a, c = max(0, b - 1), min(n, b + 2)
        w = o[a:c]
        ref.append((np.arange(a, c) * w).sum() / w.sum() if w.sum() > 0 else b)
    return np.array(ref) / FPS


LATENCY = NFFT * 0.75 / SR   # 온셋 곡선이 실제 소리보다 앞서는 만큼 (합성 곡으로 맞춤)


def fix_phase(beats, kick):
    """비트가 반 박 밀려(오프비트·베이스에) 붙은 구간을 킥 위치로 되돌린다."""
    n = len(beats)
    if n < 16:
        return beats
    half = np.empty(n)
    half[:-1] = (beats[:-1] + beats[1:]) / 2
    half[-1] = beats[-1] + (beats[-1] - beats[-2]) / 2

    def at(ts):
        f = np.clip(np.round(ts * FPS).astype(int), 1, len(kick) - 2)
        return np.maximum(kick[f], np.maximum(kick[f - 1], kick[f + 1]))
    on, off = at(beats), at(half)
    W = 16
    flip = np.zeros(n, bool)
    for i in range(0, n, W // 2):
        a, b = i, min(n, i + W)
        k_on, k_off = on[a:b].mean(), off[a:b].mean()
        if k_off > 1.35 * k_on and k_off > 0.15:
            flip[a:b] = True
    out = beats.copy()
    out[flip] = half[flip]
    out = np.sort(out)
    # 킥이 없는 구간(브레이크·빌드업)은 앞 구간의 박자를 그대로 이어서 맞춘다
    kon = at(out)
    thr = max(0.1, np.percentile(kon, 60) * 0.35)
    conf = kon > thr
    i = 0
    while i < n:
        if conf[i]:
            i += 1
            continue
        j = i
        while j < n and not conf[j]:
            j += 1
        if i >= 8 and j - i >= 4:
            prev = out[max(0, i - 8):i]
            P = np.median(np.diff(prev))
            exp = out[i - 1] + P * np.arange(1, j - i + 1)
            d = out[i:j] - exp
            ph = np.median(((d + P / 2) % P) - P / 2)
            if abs(ph) > P * 0.2:
                out[i:j] -= ph
        i = j
    return np.sort(out)


def segments(beats, tol=0.014):
    """비트 시각을 '일정한 템포' 구간들로 묶는다 → [[첫 비트 번호, 시각, 간격]]."""
    segs = []
    i = 0
    n = len(beats)
    while i < n - 1:
        j = min(n, i + 8)
        best = None
        while j <= n:
            idx = np.arange(i, j)
            A = np.vstack([np.ones(len(idx)), idx - i]).T
            coef, *_ = np.linalg.lstsq(A, beats[i:j], rcond=None)
            res = np.abs(A @ coef - beats[i:j]).max()
            if res > tol and j > i + 8:
                break
            best = (j, coef)
            j += 4 if j + 4 <= n else (n - j if n > j else 1)
            if j == n + 1:
                break
        if best is None:
            best = (min(n, i + 2), np.array([beats[i], beats[min(n - 1, i + 1)] - beats[i]]))
        j, coef = best
        segs.append([int(i), round(float(coef[0]), 4), round(float(coef[1]), 5)])
        i = j if j > i + 1 else i + 1
    return segs


def beat_time(segs, k):
    s = segs[0]
    for x in segs:
        if x[0] <= k:
            s = x
        else:
            break
    return s[1] + (k - s[0]) * s[2]


CENTER = NFFT / 2 / SR   # 프레임 창의 가운데까지 걸리는 시간


def span_db(arr, t0, t1):
    """t0~t1 사이(창 가운데 기준) 프레임들의 dB 평균 — 경계 너머의 큰 소리가 섞이지 않게."""
    a = int(math.ceil((t0 - CENTER) * FPS))
    b = int(math.floor((t1 - CENTER) * FPS))
    a = max(0, min(len(arr) - 1, a))
    b = max(a + 1, min(len(arr), b))
    return float(np.mean(10 * np.log10(arr[a:b] + 1e-12)))


def analyze(path, meta):
    x = decode(path)
    dur = len(x) / SR
    flux, lowflux, midflux, el, em, eh = spectra(x)
    o = onset_env(flux, lowflux, midflux)
    period = local_tempo(o)
    beats = track_beats(o, period)
    if len(beats) < 16:
        raise SystemExit('비트를 찾지 못했어요: ' + path)
    beats = fix_phase(beats, kickness(lowflux, midflux))
    beats = beats + LATENCY
    ibi = np.diff(beats)
    bpm = 60 / np.median(ibi)
    segs = segments(beats)
    nb = len(beats)
    fb = np.clip((beats * FPS).astype(int), 0, len(o) - 1)

    # 다운비트: 4박 중 저음 온셋이 가장 센 자리(64박 창마다 고르고 다수결)
    # 큰 변화(브레이크·드롭)는 마디 첫 박에서 일어난다 + 힙합은 1박 킥이 세다
    lowo = norm95(lowflux)
    nxt = np.append(beats[1:], beats[-1] + (beats[-1] - beats[-2]))
    bl = np.array([span_db(el, beats[i], nxt[i]) for i in range(nb)])
    nov = np.abs(np.diff(bl, prepend=bl[0]))
    nov = nov * (nov > np.percentile(nov, 90))
    acc = np.zeros(4)
    for ph in range(4):
        acc[ph] = nov[ph::4].sum() / (nov.sum() + 1e-9) + 0.3 * lowo[fb[ph::4]].mean() / (lowo[fb].mean() + 1e-9)
    db = int(np.argmax(acc))

    # 마디별 에너지 (전체 RMS dB, 저음 비율)
    tot = el + em + eh
    bars = list(range(db, nb - 4, 4))
    E, L, Hh = [], [], []
    for b in bars:
        t0, t1 = beats[b], nxt[min(nb - 1, b + 3)]
        E.append(span_db(tot, t0, t1))
        L.append(span_db(el, t0, t1))
        Hh.append(span_db(eh, t0, t1))
    E, L, Hh = np.array(E), np.array(L), np.array(Hh)
    lo, hi = np.percentile(E, 5), np.percentile(E, 98)
    e_digits = ''.join(str(int(np.clip(round((v - lo) / max(1e-6, hi - lo) * 9), 0, 9))) for v in E)

    # 드롭: 저음이 빠져 있던(빌드업·브레이크) 뒤 다시 크게 들어오는 마디
    Ls = smooth(L, 2)
    Lmax = np.percentile(L, 90)
    drops, builds = [], []
    last = -999
    cands = []
    for k in range(6, len(bars) - 4):
        before = L[max(0, k - 8):k]
        after = L[k:k + 4]
        if len(before) < 4:
            continue
        rise = after.mean() - before.min()
        dip = Lmax - before.min()
        quiet = int((before < after.mean() - 7).sum())   # 저음이 확실히 빠진 마디 수
        if rise >= 9 and quiet >= 4 and after.mean() >= np.percentile(L, 55) and dip >= 8 and L[k] >= after.mean() - 3:
            cands.append((rise + quiet, k))
    # 센 것부터 고르고, 서로 32마디 이상 떨어지게, 평균 90초에 하나 정도까지만
    keep = []
    limit = max(1, int(dur / 90))
    for sc, k in sorted(cands, reverse=True):
        if len(keep) >= limit:
            break
        if all(abs(k - q) >= 32 for q in keep):
            keep.append(k)
    for k in sorted(keep):
        after = L[k:k + 4]
        if True:
            # 바로 다음 마디가 더 크면 그쪽으로 (드롭은 마디 첫 박)
            kk = k
            if k + 1 < len(L) and L[k + 1] - L[k] > 4:
                kk = k + 1
            # 빌드업 시작: 저음이 낮아진 첫 마디 (최대 16마디 앞)
            s = kk - 1
            while s > kk - 16 and s > 0 and L[s - 1] < after.mean() - 6:
                s -= 1
            if kk - s < 2:
                s = kk - 2
            drops.append(bars[kk])
            builds.append([bars[max(0, s)], bars[kk]])
            last = kk
    # 드롭을 비트 단위로 다듬기: 저음이 가장 크게 다시 들어오는 비트
    if drops:
        ref_d, ref_b = [], []
        for d0, (b0, _) in zip(drops, builds):
            best, bi = -1e9, d0
            for i in range(max(4, d0 - 4), min(nb - 2, d0 + 5)):
                j = bl[i:i + 2].mean() - bl[i - 4:i].mean()
                if j > best:
                    best, bi = j, i
            ref_d.append(bi)
            ref_b.append([max(0, b0 + (bi - d0)), bi])
        drops, builds = ref_d, ref_b
        if len(drops) >= 2:
            ph = np.bincount(np.array(drops) % 4, minlength=4)
            if ph.max() >= max(2, len(drops) * 0.5):
                db = int(np.argmax(ph))
        if len(drops) == 1:
            db = drops[0] % 4
        bars = list(range(db, nb - 4, 4))
        E = []
        for b in bars:
            E.append(span_db(tot, beats[b], nxt[min(nb - 1, b + 3)]))
        E = np.array(E)
        lo, hi = np.percentile(E, 5), np.percentile(E, 98)
        e_digits = ''.join(str(int(np.clip(round((v - lo) / max(1e-6, hi - lo) * 9), 0, 9))) for v in E)
    out = {
        'v': 1,
        'id': meta.get('id', ''),
        'name': meta.get('name', ''),
        'date': meta.get('date', ''),
        'src': os.path.basename(path),
        'dur': round(dur, 2),
        'bpm': round(float(bpm), 2),
        'nb': int(nb),
        'db': db,
        'seg': segs,
        'e': e_digits,
        'drops': [int(d) for d in drops],
        'builds': [[int(a), int(b)] for a, b in builds],
    }
    return out


def save_json(path, obj):
    if os.path.dirname(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')


def load_json(path, default):
    try:
        with open(path, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return default


def cmd_analyze(a):
    rid = a.id or os.path.splitext(os.path.basename(a.audio))[0]
    out = a.out or os.path.join(BEATS_DIR, 'rec', rid + '.json')
    m = analyze(a.audio, {'id': rid, 'name': a.name or rid, 'date': a.date or ''})
    save_json(out, m)
    if not os.path.abspath(out).startswith(os.path.join(BEATS_DIR, 'rec') + os.sep):
        print(json.dumps({'ok': True, 'id': rid, 'map': out, 'dur': m['dur'], 'bpm': m['bpm'], 'beats': m['nb'], 'segments': len(m['seg']), 'drops': len(m['drops'])}, ensure_ascii=False))
        return
    idx_path = os.path.join(BEATS_DIR, 'index.json')
    idx = load_json(idx_path, {'recordings': []})
    rel = os.path.relpath(out, BEATS_DIR).replace(os.sep, '/')
    idx['recordings'] = [r for r in idx.get('recordings', []) if r.get('id') != rid]
    idx['recordings'].append({'id': rid, 'name': m['name'], 'date': m['date'], 'dur': m['dur'], 'bpm': m['bpm'], 'drops': len(m['drops']), 'map': rel})
    idx['recordings'].sort(key=lambda r: (r.get('date', ''), r.get('id', '')))
    save_json(idx_path, idx)
    print(json.dumps({'ok': True, 'id': rid, 'map': rel, 'dur': m['dur'], 'bpm': m['bpm'], 'beats': m['nb'], 'segments': len(m['seg']), 'drops': len(m['drops'])}, ensure_ascii=False))


def env_for_align(path, start=None, dur=None, sr=4000, hop=40):
    """정렬용 온셋 곡선 (100 fps)."""
    x = decode(path, sr=sr, start=start, dur=dur)
    n = 1 + max(0, (len(x) - 256) // hop)
    idx = np.arange(n)[:, None] * hop + np.arange(256)[None, :]
    mag = np.abs(np.fft.rfft(x[idx] * np.hanning(256), axis=1))
    lm = np.log1p(30 * mag)
    d = np.diff(lm, axis=0, prepend=lm[:1])
    d[d < 0] = 0
    o = d.sum(axis=1)
    o = o - smooth(o, 50)
    return (o - o.mean()) / (o.std() + 1e-9), sr / hop


def xcorr_offset(a, b):
    """b 안에서 a가 시작하는 위치(샘플)와 상관 정도."""
    n = 1
    while n < len(a) + len(b):
        n *= 2
    fa = np.fft.rfft(a, n)
    fb = np.fft.rfft(b, n)
    c = np.fft.irfft(fb * np.conj(fa), n)
    lag = int(np.argmax(c[:len(b)]))
    return lag, float(c[lag] / (np.sqrt((a ** 2).sum() * (b[lag:lag + len(a)] ** 2).sum()) + 1e-9))


def cmd_link(a):
    m = load_json(a.map, None)
    if not m:
        raise SystemExit('맵 파일을 읽지 못했어요: ' + a.map)
    if a.offset is not None:
        off, conf = float(a.offset), None
    else:
        if not a.video:
            raise SystemExit('--video 또는 --offset 이 필요해요')
        rec_src = a.recording
        if not rec_src:
            raise SystemExit('자동 정렬에는 --recording 원본 녹음 파일도 필요해요')
        # 녹음 앞부분 3분이 영상 안 어디에 있는지 찾는다 (영상 앞 15분 안에서)
        r_env, fps = env_for_align(rec_src, start=60, dur=180)
        v_env, _ = env_for_align(a.video, start=0, dur=15 * 60)
        lag, conf = xcorr_offset(r_env, v_env)
        off = lag / fps - 60.0
        # 뒷부분으로 한 번 더 확인 (영상 중간 편집 여부)
        mid = max(120.0, m['dur'] * 0.6)
        r2, _ = env_for_align(rec_src, start=mid, dur=120)
        v2, _ = env_for_align(a.video, start=max(0, mid + off - 60), dur=240)
        lag2, conf2 = xcorr_offset(r2, v2)
        off2 = max(0, mid + off - 60) + lag2 / fps - mid
        if abs(off2 - off) > 0.25:
            print(json.dumps({'ok': False, 'why': '영상 중간에 편집이 있어 시간 차이가 일정하지 않아요', 'offset_start': round(off, 3), 'offset_mid': round(off2, 3)}, ensure_ascii=False))
            sys.exit(2)
        conf = round(min(conf, conf2), 3)
    vpath = os.path.join(BEATS_DIR, 'videos.json')
    vids = load_json(vpath, {})
    rel = os.path.relpath(os.path.abspath(a.map), BEATS_DIR).replace(os.sep, '/')
    vids[a.youtube] = {'map': rel, 'off': round(off, 3)}
    save_json(vpath, vids)
    print(json.dumps({'ok': True, 'youtube': a.youtube, 'map': rel, 'offset': round(off, 3), 'confidence': conf}, ensure_ascii=False))


def main():
    p = argparse.ArgumentParser(description='가상 클럽 비트 맵 만들기')
    sub = p.add_subparsers(dest='cmd', required=True)
    pa = sub.add_parser('analyze', help='녹음 파일 분석')
    pa.add_argument('audio')
    pa.add_argument('--id', help='맵 파일 이름 (영문·숫자·-), 예: 20261103-taro')
    pa.add_argument('--name', help='표시 이름, 예: 타로')
    pa.add_argument('--date', help='녹음 날짜 YYYY-MM-DD')
    pa.add_argument('--out')
    pa.set_defaults(f=cmd_analyze)
    pl = sub.add_parser('link', help='유튜브 영상에 맵 연결')
    pl.add_argument('map')
    pl.add_argument('--youtube', required=True)
    pl.add_argument('--video', help='영상 최종본 파일(또는 그 소리)')
    pl.add_argument('--recording', help='맵을 만든 원본 녹음 파일 (자동 정렬용)')
    pl.add_argument('--offset', type=float, help='영상 시간 = 녹음 시간 + offset (초)')
    pl.set_defaults(f=cmd_link)
    a = p.parse_args()
    a.f(a)


if __name__ == '__main__':
    main()
