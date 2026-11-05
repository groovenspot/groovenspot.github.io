// 신청곡 검색이 막혔을 때 쓰는 곡 목록(data/songs.json)을 만든다.
// Deezer 공개 플레이리스트·차트에서 힙합·R&B·K-pop·EDM 인기곡을 모아 중복을 뺀다.
// 실행: node tools/build-songs.mjs   (몇 달에 한 번 다시 돌려 최신 곡으로 바꾸면 된다)
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
// [플레이리스트 id, 장르] — Deezer 에디터 플레이리스트 위주
const LISTS = [
  [4096400722, 'K-POP'], [12244134951, 'K-POP'], [11012274682, 'K-POP'], [10738561582, 'K-POP'], [11235448504, 'K-POP'],
  [15118477423, 'K-HIPHOP'], [7331266784, 'K-HIPHOP'], [15780065621, 'K-HIPHOP'], [7634953002, 'K-R&B'],
  [1677006641, 'HIPHOP'], [892361401, 'HIPHOP'], [13241781803, 'HIPHOP'], [7846286162, 'HIPHOP'],
  [1999466402, 'R&B'], [5014738124, 'R&B'], [2021626162, 'R&B'],
  [1495242491, 'EDM'], [2113355604, 'EDM'], [740966875, 'EDM'], [8970644442, 'EDM'],
];
const PER_LIST = 120;
// 한국 가수 한글 이름 (손님이 한글로 쳐도 찾히게)
const KO = {"DPR LIVE": "디피알 라이브", "Jay Park": "박재범", "Sik-K": "식케이", "BTS": "방탄소년단", "TWICE": "트와이스", "aespa": "에스파", "KAI": "카이", "BIBI": "비비", "Crush": "크러쉬", "ZICO": "지코", "ATEEZ": "에이티즈", "Got7": "갓세븐", "DEAN": "딘", "Red Velvet": "레드벨벳", "pH-1": "피에이치원", "Colde": "콜드", "BLACKPINK": "블랙핑크", "BABYMONSTER": "베이비몬스터", "TOMORROW X TOGETHER": "투모로우바이투게더", "KATSEYE": "캣츠아이", "ILLIT": "아일릿", "LE SSERAFIM": "르세라핌", "CORTIS": "코르티스", "BIGBANG": "빅뱅", "PENOMECO": "페노메코", "Hyolyn": "효린", "Hyukoh": "혁오", "JUSTHIS": "저스디스", "punchnello": "펀치넬로", "LISA": "리사", "ENHYPEN": "엔하이픈", "IVE": "아이브", "NMIXX": "엔믹스", "LEEHI": "이하이", "SEVENTEEN": "세븐틴", "CHUNG HA": "청하", "Girls' Generation": "소녀시대", "JISOO": "지수", "JENNIE": "제니", "j-hope": "제이홉", "MAMAMOO": "마마무", "NCT 127": "엔시티", "ITZY": "있지", "MONSTA X": "몬스타엑스", "KISS OF LIFE": "키스오브라이프", "SHINee": "샤이니", "SUPER JUNIOR": "슈퍼주니어", "(G)I-DLE": "여자아이들", "NCT DREAM": "엔시티 드림", "Highlight": "하이라이트", "T-Ara": "티아라", "T-ara": "티아라", "Loco": "로꼬", "SURAN": "수란", "CHANGMO": "창모", "MINO": "송민호", "GIRIBOY": "기리보이", "sokodomo": "소코도모", "Hash Swan": "해쉬스완", "Jung In": "정인", "Loopy": "루피", "Wonder Girls": "원더걸스", "Hoody": "후디", "EXO": "엑소", "Jin": "진", "STAYC": "스테이씨", "CHUU": "츄", "Block B": "블락비", "Taeyong": "태용", "RIIZE": "라이즈", "Jackson Wang": "잭슨", "WINNER": "위너", "Girl's Day": "걸스데이", "BAEKHYUN": "백현", "IU": "아이유", "ASTRO": "아스트로", "KARA": "카라", "TVXQ!": "동방신기", "Apink": "에이핑크", "TEEN TOP": "틴탑", "Sistar": "씨스타", "4Minute": "포미닛", "SE SO NEON": "새소년", "2NE1": "투애니원", "After School": "애프터스쿨", "Ailee": "에일리", "Demian": "데미안", "Stella Jang": "스텔라장", "Code Kunst": "코드쿤스트", "GRAY": "그레이", "NO:EL": "노엘", "B-Free": "비프리", "Zion.T": "자이언티", "Gaeko": "개코", "VINXEN": "빈첸", "CNBLUE": "씨엔블루", "FTIsland": "에프티아일랜드", "nafla": "나플라", "Heize": "헤이즈", "Brown Eyed Girls": "브라운아이드걸스", "Woodie Gochild": "우디고차일드", "Agust D": "슈가", "WOODZ": "우즈", "ROSÉ": "로제", "JUNG KOOK": "정국", "Jimin": "지민", "FIFTY FIFTY": "피프티피프티", "NewJeans": "뉴진스", "B.I": "비아이", "iKON": "아이콘", "Momoland": "모모랜드", "SEULGI": "슬기", "JIHYO": "지효", "SUNMI": "선미", "NAYEON": "나연", "TWS": "투어스", "IRENE": "아이린", "WANNA ONE": "워너원", "BTOB": "비투비", "NU'EST": "뉴이스트", "WINTER": "윈터", "HyunA": "현아", "TAEYANG": "태양", "fromis_9": "프로미스나인", "YENA": "최예나", "EXID": "이엑스아이디", "CL": "씨엘", "INFINITE": "인피니트", "HWASA": "화사", "VIXX": "빅스", "TAEYEON": "태연", "Kang Daniel": "강다니엘", "MeloMance": "멜로망스", "BIG Naughty": "빅나티", "Davichi": "다비치", "Kep1er": "케플러", "BOYNEXTDOOR": "보이넥스트도어", "ALLDAY PROJECT": "올데이 프로젝트", "MEOVV": "미야오", "Hearts2Hearts": "하츠투하츠", "KiiiKiii": "키키", "XG": "엑스지", "Yves": "이브", "WayV": "웨이션브이", "P1Harmony": "피원하모니", "Stray Kids": "스트레이 키즈", "EVAN": "에반", "Ra.D": "라디", "Junoflo": "주노플로", "Hangzoo": "한주", "Tabber": "태버", "VVS": "브이브이에스", "DPR IAN": "디피알 이안", "SOLE": "쏠", "UNCHILD": "언차일드", "qwer": "큐더블유이알", "tripleS": "트리플에스", "Epik High": "에픽하이", "Dynamic Duo": "다이나믹 듀오", "Paul Kim": "폴킴", "AKMU": "악뮤", "Sam Kim": "샘김", "Primary": "프라이머리", "Jessi": "제시", "PSY": "싸이", "Simon Dominic": "사이먼 도미닉", "The Quiett": "더콰이엇", "Changmo": "창모", "HAON": "하온", "Ash Island": "애쉬 아일랜드", "ASH ISLAND": "애쉬 아일랜드", "lIlBOI": "릴보이", "BE'O": "비오", "Lee Young Ji": "이영지", "JAEHYUN": "재현", "HUH YUNJIN": "허윤진", "Mark Lee": "마크"};


async function get(url) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch (e) { /* 다시 시도 */ }
    await new Promise((ok) => setTimeout(ok, 800 * (i + 1)));
  }
  return null;
}

const seen = new Map();
function add(t, a, g, rank) {
  if (!t || !a) return;
  const k = (t + '|' + a).toLowerCase().replace(/\s+/g, ' ').trim();
  const cur = seen.get(k);
  if (!cur || (rank || 0) > cur.r) seen.set(k, { t: t.slice(0, 80), a: a.slice(0, 60), g, r: rank || 0 });
}

for (const [id, g] of LISTS) {
  let url = `https://api.deezer.com/playlist/${id}/tracks?limit=100`, n = 0;
  while (url && n < PER_LIST) {
    const d = await get(url); if (!d || !d.data) break;
    for (const x of d.data) { add(x.title_short || x.title, x.artist && x.artist.name, g, x.rank); n++; }
    url = d.next;
  }
  console.log(g, id, n);
}
const chart = await get('https://api.deezer.com/chart/0/tracks?limit=100');
(chart && chart.data || []).forEach((x) => add(x.title_short || x.title, x.artist && x.artist.name, 'CHART', x.rank));

const ko = (a) => a.split(/\s*(?:,|&| x | X |feat\.?|Feat\.?)\s*/).map((p) => KO[p.trim()]).filter(Boolean).join(' ');
const out = [...seen.values()].sort((a, b) => b.r - a.r).map(({ t, a, g }) => { const k = KO[a] || ko(a); return k ? [t, a, g, k] : [t, a, g]; });
writeFileSync(join(ROOT, 'data/songs.json'), JSON.stringify({ updated: new Date().toISOString().slice(0, 10), songs: out }));
console.log('total', out.length);
