const API_KEY = 'a1e72fd93ed59f56e6332813b9f8dcae';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem = {};
let currentSeasons = [];
let currentSlideIndex = 0;
let slideItems = [];

/**
 * Truncate a string to `maxLength` characters,
 * appending “…” if it’s longer.
 */
function truncateTitle(str, maxLength = 25) {
  if (typeof str !== 'string') return '';
  return str.length > maxLength
    ? str.slice(0, maxLength - 1).trim() + '…'
    : str;
}

// Detect watch page
function isWatchPage() {
  const page = window.location.pathname.split('/').pop();
  return page === 'watch.html' || page === 'watch';
}

// Open/Close search modal
function openSearchModal() {
  const m = document.getElementById('search-modal');
  if (!m) return;
  m.style.display = 'flex';
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '';
  document.getElementById('search-input').focus();
}
function closeSearchModal() {
  const m = document.getElementById('search-modal');
  if (!m) return;
  m.style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}

// Persist watch history
function addToHistory(item) {
  const entry = {
    id: item.id,
    title: item.title || item.name || '',
    poster_path: item.poster_path || item.poster || '',
    media_type: item.media_type,
    season: item.season || null,
    episode: item.episode || null,
    server: document.getElementById('server').value
  };
  let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  history = history.filter(i => i.id !== entry.id);
  history.unshift(entry);
  localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 20)));
  renderHistory();
}

// Horizontal scroll
function scrollList(containerId, direction) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.scrollBy({ left: direction * c.clientWidth, behavior: 'smooth' });
}
window.scrollList = scrollList;

// Init on load
async function init() {
  window.openSearchModal = openSearchModal;
  window.closeSearchModal = closeSearchModal;
  window.searchTMDB = searchTMDB;
  window.nextSlide = nextSlide;
  window.prevSlide = prevSlide;

  if (isWatchPage()) {
    const params = new URLSearchParams(window.location.search);
    const urlServer = params.get('server');
    const savedServer = localStorage.getItem('lastServer');
    const sel = document.getElementById('server');

    // restore dropdown from URL or saved
    if (urlServer) sel.value = urlServer;
    else if (savedServer) sel.value = savedServer;

    // attach listener for manual changes
    sel.addEventListener('change', () => {
      localStorage.setItem('lastServer', sel.value);
      changeServer();
      // update history entry with new server
      currentItem.server = sel.value;
      addToHistory(currentItem);
    });

    const id = parseInt(params.get('id'));
    const media_type = params.get('media_type');
    const title = params.get('title');
    const poster = params.get('poster');
    const season = params.get('season') ? parseInt(params.get('season')) : null;
    const episode = params.get('episode') ? parseInt(params.get('episode')) : null;

    currentItem = { id, media_type, title, poster_path: poster, season, episode };
    addToHistory(currentItem);

    if (media_type === 'tv') {
      await loadSeasons(currentItem);
      await displayEpisodes(currentItem);
    }
    changeServer();

    const videoEl = document.getElementById('modal-video');
    videoEl.addEventListener('error', () => {
      const servers = Array.from(sel.options).map(o => o.value);
      const idx = servers.indexOf(sel.value);
      sel.value = servers[(idx + 1) % servers.length];
      changeServer();
    });
  } else {
    await setupSlider();
    const movies = await fetchTrending('movie');
    const tvShows = await fetchTrending('tv');
    const anime = await fetchTrendingAnime();
    displayList(movies, 'movies-list');
    displayList(tvShows, 'tvshows-list');
    displayList(anime, 'anime-list');
    renderHistory();
  }
}

// Fetch trending
async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return (await res.json()).results;
}
async function fetchTrendingAnime() {
  let all = [];
  for (let page = 1; page <= 7; page++) {
    const data = await (await fetch(
      `${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`
    )).json();
    all = all.concat(
      data.results.filter(i => i.original_language === 'ja' && i.genre_ids.includes(16))
    );
  }
  return all;
}

// Display list
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    if (!item.poster_path) return;
    if (!item.media_type) item.media_type = containerId.includes('tv') ? 'tv' : 'movie';

    const serverValue =
      document.getElementById('server').value ||
      localStorage.getItem('lastServer') ||
      'vidsrc.cc';

    const card = document.createElement('div');
    card.classList.add('card');

    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.style.cursor = 'pointer';
    img.onclick = () => {
      const p = new URLSearchParams({
        id: item.id,
        media_type: item.media_type,
        title: item.title || item.name || '',
        poster: item.poster_path,
        season: item.season || '',
        episode: item.episode || '',
        server: serverValue
      });
      window.location.href = `watch.html?${p}`;
    };
    card.appendChild(img);

    const hd = document.createElement('span');
    hd.classList.add('badge', 'quality');
    hd.innerText = 'HD';
    card.appendChild(hd);

    const info = document.createElement('span');
    info.classList.add('badge', 'info');
    const dt = item.release_date || item.first_air_date || '';
    const yr = dt ? new Date(dt).getFullYear() : '';
    const lbl = item.media_type === 'tv' ? 'TV' : 'Movie';
    info.innerText = yr ? `${lbl} · ${yr}` : lbl;
    card.appendChild(info);

    const titleOv = document.createElement('div');
    titleOv.classList.add('title-overlay');
    titleOv.innerText = truncateTitle(item.title || item.name, 30);
    card.appendChild(titleOv);

    container.appendChild(card);
  });
}

// Slider setup
async function setupSlider() {
  const movies = await fetchTrending('movie');
  slideItems = await Promise.all(
    movies.slice(0, 5).map(async it => {
      const full = await (await fetch(`${BASE_URL}/movie/${it.id}?api_key=${API_KEY}`)).json();
      return { ...it, runtime: full.runtime, media_type: 'movie' };
    })
  );

  const slides = document.getElementById('slides');
  slides.innerHTML = '';

  slideItems.forEach((it, idx) => {
    // calculate star rating out of 5
    const stars = Math.round(it.vote_average / 2);
    const starHtml =
      '<i class="fa fa-star"></i>'.repeat(stars) +
      '<i class="fa fa-star-o"></i>'.repeat(5 - stars);

    const div = document.createElement('div');
    div.className = 'slide';
    div.style.backgroundImage = `url(${IMG_URL}${it.backdrop_path})`;
    div.innerHTML = `
      <div class="slide-overlay">
        <h1>${it.title || it.name}</h1>
        <div class="rating">${starHtml}</div>
        <p>${truncateTitle(it.overview, 150)}</p>
        <button class="play-btn" onclick="redirectFromSlider(${idx})">
          <i class="fa fa-play"></i> Play
        </button>
      </div>
    `;
    slides.appendChild(div);
  });

  updateSlidePosition();
  setInterval(nextSlide, 7000);
}

function redirectFromSlider(idx) {
  const it = slideItems[idx];
  const serverValue = document.getElementById('server').value || localStorage.getItem('lastServer') || 'vidsrc.cc';
  const p = new URLSearchParams({
    id: it.id,
    media_type: it.media_type,
    title: it.title,
    poster: it.backdrop_path || it.poster_path,
    season: it.season || '',
    episode: it.episode || '',
    server: serverValue
  });
  window.location.href = `watch.html?${p}`;
}

function updateSlidePosition() {
  document.getElementById('slides').style.transform = `translateX(-${currentSlideIndex * 100}%)`;
}
function nextSlide() { currentSlideIndex = (currentSlideIndex + 1) % slideItems.length; updateSlidePosition(); }
function prevSlide() { currentSlideIndex = (currentSlideIndex - 1 + slideItems.length) % slideItems.length; updateSlidePosition(); }

// Change server
function changeServer() {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
  let url = '';
  switch (server) {
    case 'vidsrc.cc':
      url = currentItem.episode ? `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}` : `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;
    case 'vidsrc.in':
      url = currentItem.episode ? `https://vidsrc.in/embed/tv/${currentItem.id}/${currentItem.season}-${currentItem.episode}` : `https://vidsrc.in/embed/movie/${currentItem.id}`;
      break;
    case 'player.videasy.net':
      url = `https://player.videasy.net/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}`;
      break;
    case '2embed':
      url = currentItem.episode ? `https://www.2embed.cc/embedtv/${currentItem.id}&s=${currentItem.season}&e=${currentItem.episode}` : `https://www.2embed.cc/embed/${currentItem.id}`;
      break;
    case '2embed RU':
      url = `https://www.2embed.ru/embed/tmdb/tv?id=${currentItem.id}&s=${currentItem.season}&e=${currentItem.episode}`;
      break;
    case '2Anime': {
      let slug = (currentItem.title || currentItem.name || '').toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');
      const ep = currentItem.episode || 1;
      url = `https://2anime.xyz/embed/${slug}-episode-${ep}`;
      break;
    }
    case 'multiembed.mov':
      url = `https://multiembed.mov/?video_id=${currentItem.id}&tmdb=1${currentItem.episode ? `&s=${currentItem.season}&e=${currentItem.episode}` : ''}`;
      break;
    case 'moviesapi.club animetv':
      url = `https://moviesapi.club/tv/${currentItem.id}/${currentItem.season}/${currentItem.episode}`;
      break;
    case 'moviesapi.club movie':
      url = `https://moviesapi.club/movie/${currentItem.id}`;
      break;
    case 'apimocine-tv':
      url = `https://apimocine.vercel.app/tv/${currentItem.id}/${currentItem.season}/${currentItem.episode}`;
      break;
    case 'apimocine-movie':
      url = `https://apimocine.vercel.app/movie/${currentItem.id}`;
      break;
    default:
      url = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  }
  document.getElementById('modal-video').src = url;
}

// Seasons & Episodes
async function loadSeasons(item) {
  const data = await (await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}`)).json();
  currentSeasons = data.seasons.filter(s => s.season_number >= 0);
  const sel = document.getElementById('season-select'); sel.innerHTML = '';
  currentSeasons.forEach(s => sel.append(new Option(s.name || `Season ${s.season_number}`, s.season_number)));
  const init = item.season || currentSeasons[0].season_number;
  item.season = init;
  sel.value = init;
  sel.onchange = () => { item.season = +sel.value; item.episode = null; addToHistory(item); displayEpisodes(item); };
}
async function displayEpisodes(item) {
  const list = document.getElementById('episode-list'); list.innerHTML = '';
  const sn = item.season || +document.getElementById('season-select').value;
  item.season = sn;
  const data = await (await fetch(`${BASE_URL}/tv/${item.id}/season/${sn}?api_key=${API_KEY}`)).json();
  (data.episodes || []).forEach(ep => {
    const btn = document.createElement('button');
    btn.textContent = `E${ep.episode_number}: ${ep.name}`;
    if (item.episode === ep.episode_number) btn.classList.add('active-episode');
    btn.onclick = () => {
      item.episode = ep.episode_number;
      changeServer();
      addToHistory(item);
      list.querySelectorAll('button').forEach(b => b.classList.remove('active-episode'));
      btn.classList.add('active-episode');
    };
    list.append(btn);
  });
}

// Search
async function searchTMDB() {
  const q = document.getElementById('search-input').value.trim(); if (!q) return;
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  const cont = document.getElementById('search-results'); cont.innerHTML = '';
  const serverValue = document.getElementById('server').value || localStorage.getItem('lastServer') || 'vidsrc.cc';
  data.results.forEach(it => { if (!it.poster_path) return; it.media_type = it.media_type || 'movie';
    const card = document.createElement('div'); card.classList.add('card');
    const img = document.createElement('img'); img.src = IMG_URL + it.poster_path; img.alt = it.title || it.name;
    img.onclick = () => { const p = new URLSearchParams({ id: it.id, media_type: it.media_type, title: it.title || it.name, poster: it.poster_path, server: serverValue }); window.location.href = `watch.html?${p}`; };
    card.append(img);
    const ov = document.createElement('div'); ov.classList.add('title-overlay'); ov.innerText = truncateTitle(it.title || it.name, 30);
    card.append(ov);
    cont.append(card);
  });
}

// Render history
function renderHistory() {
  const c = document.getElementById('history-list'); if (!c) return;
  const hist = JSON.parse(localStorage.getItem('watchHistory')) || [];
  c.innerHTML = '';
  hist.forEach(it => {
    const card = document.createElement('div'); card.classList.add('card', 'history-item');
    const img = document.createElement('img'); img.src = IMG_URL + it.poster_path; img.alt = it.title;
    img.onclick = () => { const p = new URLSearchParams({ id: it.id, media_type: it.media_type, title: it.title, poster: it.poster_path, season: it.season || '', episode: it.episode || '', server: it.server }); window.location.href = `watch.html?${p}`; };
    card.append(img);
    const btn = document.createElement('button'); btn.classList.add('remove-btn'); btn.textContent = '✕'; btn.onclick = e => { e.stopPropagation(); const h = JSON.parse(localStorage.getItem('watchHistory')) || []; localStorage.setItem('watchHistory', JSON.stringify(h.filter(x => x.id !== it.id))); renderHistory(); };
    card.append(btn);
    const ov = document.createElement('div'); ov.classList.add('title-overlay'); ov.innerText = truncateTitle(it.title, 25);
    card.append(ov);
    c.append(card);
  });
}

init();
