const API_KEY = 'a1e72fd93ed59f56e6332813b9f8dcae';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

let currentItem = {};
let currentSeasons = [];
let heroItems = [];
let heroIndex = 0;
let heroTimer = null;

function truncateText(str, maxLength = 28) {
  if (typeof str !== 'string') return '';
  return str.length > maxLength ? `${str.slice(0, maxLength - 1).trim()}…` : str;
}

function isWatchPage() {
  const page = window.location.pathname.split('/').pop();
  return page === 'watch.html' || page === 'watch';
}

function openSearchModal() {
  const modal = document.getElementById('search-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  const input = document.getElementById('search-input');
  if (input) {
    input.value = '';
    input.focus();
  }
  const results = document.getElementById('search-results');
  if (results) results.innerHTML = '';
}

function closeSearchModal() {
  const modal = document.getElementById('search-modal');
  if (!modal) return;
  modal.style.display = 'none';
  const results = document.getElementById('search-results');
  if (results) results.innerHTML = '';
}

window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;

async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results || [];
}

async function fetchTopRatedTV() {
  const res = await fetch(`${BASE_URL}/tv/top_rated?api_key=${API_KEY}`);
  const data = await res.json();
  return (data.results || []).map(item => ({ ...item, media_type: 'tv' }));
}

async function fetchTrendingAnime() {
  let all = [];
  for (let page = 1; page <= 3; page += 1) {
    const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const data = await res.json();
    const filtered = (data.results || []).filter(
      item => item.original_language === 'ja' &&
      Array.isArray(item.genre_ids) &&
      item.genre_ids.includes(16)
    );
    all = all.concat(filtered.map(item => ({ ...item, media_type: 'tv' })));
  }
  return all;
}

function getYear(item) {
  const raw = item.release_date || item.first_air_date || '';
  return raw ? raw.slice(0, 4) : '';
}

function goToWatch(item) {
  const params = new URLSearchParams({
    id: item.id,
    media_type: item.media_type || 'movie',
    title: item.title || item.name || '',
    poster: item.poster_path || '',
    season: item.season || '',
    episode: item.episode || '',
    server: item.server || localStorage.getItem('lastServer') || 'vidsrc.cc'
  });

  window.location.href = `watch.html?${params.toString()}`;
}

/* ---------- HERO ---------- */
function renderHero() {
  const item = heroItems[heroIndex];
  if (!item) return;

  const backdrop = document.getElementById('hero-backdrop');
  const title = document.getElementById('hero-title');
  const overview = document.getElementById('hero-overview');
  const rating = document.getElementById('hero-rating');
  const watchBtn = document.getElementById('hero-watch-btn');

  if (!backdrop || !title || !overview || !rating || !watchBtn) return;

  backdrop.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path || item.poster_path})`;
  title.textContent = item.title || item.name || 'Untitled';
  overview.textContent = truncateText(item.overview || 'No description available.', 220);
  rating.textContent = item.vote_average ? `${item.vote_average.toFixed(1)} Rating` : '7.0 Rating';

  watchBtn.onclick = () => goToWatch(item);
}

function nextHero() {
  if (!heroItems.length) return;
  heroIndex = (heroIndex + 1) % heroItems.length;
  renderHero();
}

function prevHero() {
  if (!heroItems.length) return;
  heroIndex = (heroIndex - 1 + heroItems.length) % heroItems.length;
  renderHero();
}

window.nextHero = nextHero;
window.prevHero = prevHero;

function startHeroAuto() {
  if (heroTimer) clearInterval(heroTimer);
  heroTimer = setInterval(() => {
    nextHero();
  }, 6000);
}

/* ---------- POSTER ROWS ---------- */
function buildProgressLabel(item) {
  if (item.media_type === 'tv' && item.season && item.episode) {
    return `Continue S${item.season} • E${item.episode}`;
  }
  if (item.media_type === 'movie') {
    return 'Continue movie';
  }
  return '';
}

function createPosterCard(item, isHistory = false) {
  const card = document.createElement('article');
  card.className = 'poster-card';

  const year = getYear(item);
  const subText = isHistory ? buildProgressLabel(item) || year : year;

  card.innerHTML = `
    <div class="poster-thumb">
      <img src="${IMG_URL}${item.poster_path || item.backdrop_path}" alt="${item.title || item.name || ''}">
      <div class="poster-body">
        <div class="poster-title">${truncateText(item.title || item.name || '', 20)}</div>
        <div class="poster-sub">${subText || ''}</div>
        <div class="poster-actions">
          <button class="mini-watch-btn" type="button">${isHistory ? 'Continue' : 'Watch now'}</button>
          <button class="mini-plus-btn" type="button">+</button>
        </div>
      </div>
    </div>
  `;

  if (isHistory) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', event => {
      event.stopPropagation();
      let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
      history = history.filter(entry => !(entry.id === item.id && entry.media_type === item.media_type));
      localStorage.setItem('watchHistory', JSON.stringify(history));
      renderHistory();
    });
    card.appendChild(removeBtn);
  }

  card.addEventListener('click', () => {
    goToWatch(item);
  });

  return card;
}

function renderPosterRow(items, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  items.slice(0, 10).forEach(item => {
    if (!item.poster_path && !item.backdrop_path) return;
    container.appendChild(createPosterCard(item, false));
  });
}

function addToHistory(item) {
  const entry = {
    id: item.id,
    title: item.title || item.name || '',
    poster_path: item.poster_path || item.poster || '',
    media_type: item.media_type || 'movie',
    season: item.season || null,
    episode: item.episode || null,
    server: document.getElementById('server')?.value || item.server || localStorage.getItem('lastServer') || 'vidsrc.cc',
    updatedAt: Date.now()
  };

  let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  history = history.filter(h => !(h.id === entry.id && h.media_type === entry.media_type));
  history.unshift(entry);

  localStorage.setItem('watchHistory', JSON.stringify(history.slice(0, 20)));
}

function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;

  let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  history = history.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  container.innerHTML = '';

  history.forEach(item => {
    if (!item.poster_path) return;
    container.appendChild(createPosterCard(item, true));
  });
}

/* ---------- WATCH PAGE ---------- */
function changeServer() {
  const frame = document.getElementById('modal-video');
  const serverSelect = document.getElementById('server');

  if (!frame || !serverSelect || !currentItem.id) return;

  const server = serverSelect.value;
  localStorage.setItem('lastServer', server);

  const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
  let url = '';

  switch (server) {
    case 'vidsrc.cc':
      url = currentItem.episode
        ? `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}`
        : `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;

    case 'vidsrc.in':
      url = currentItem.episode
        ? `https://vidsrc.in/embed/tv/${currentItem.id}/${currentItem.season}-${currentItem.episode}`
        : `https://vidsrc.in/embed/movie/${currentItem.id}`;
      break;

    case 'player.videasy.net':
      url = currentItem.episode
        ? `https://player.videasy.net/tv/${currentItem.id}/${currentItem.season}/${currentItem.episode}`
        : `https://player.videasy.net/movie/${currentItem.id}`;
      break;

    case '2embed':
      url = currentItem.episode
        ? `https://www.2embed.cc/embedtv/${currentItem.id}&s=${currentItem.season}&e=${currentItem.episode}`
        : `https://www.2embed.cc/embed/${currentItem.id}`;
      break;

    case '2embed RU':
      url = currentItem.episode
        ? `https://www.2embed.ru/embed/tmdb/tv?id=${currentItem.id}&s=${currentItem.season}&e=${currentItem.episode}`
        : `https://www.2embed.ru/embed/tmdb/movie?id=${currentItem.id}`;
      break;

    case '2Anime': {
      const slug = (currentItem.title || currentItem.name || '')
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
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
      url = currentItem.episode
        ? `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}`
        : `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;
  }

  frame.src = url;
}

window.changeServer = changeServer;

async function loadSeasons(item) {
  const seasonSelect = document.getElementById('season-select');
  if (!seasonSelect) return;

  const res = await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}`);
  const data = await res.json();

  currentSeasons = (data.seasons || []).filter(season => season.season_number >= 0);

  seasonSelect.innerHTML = '';

  currentSeasons.forEach(season => {
    const option = document.createElement('option');
    option.value = season.season_number;
    option.textContent = season.name || `Season ${season.season_number}`;
    seasonSelect.appendChild(option);
  });

  const initialSeason = item.season || (currentSeasons[0] ? currentSeasons[0].season_number : 1);
  item.season = initialSeason;
  seasonSelect.value = initialSeason;

  seasonSelect.onchange = () => {
    item.season = Number(seasonSelect.value);
    item.episode = null;
    addToHistory(item);
    displayEpisodes(item);
  };
}

async function displayEpisodes(item) {
  const episodeList = document.getElementById('episode-list');
  if (!episodeList) return;

  episodeList.innerHTML = '';

  const seasonNumber = item.season || Number(document.getElementById('season-select')?.value || 1);
  item.season = seasonNumber;

  const res = await fetch(`${BASE_URL}/tv/${item.id}/season/${seasonNumber}?api_key=${API_KEY}`);
  const data = await res.json();

  (data.episodes || []).forEach(ep => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = `E${ep.episode_number}: ${ep.name}`;

    if (item.episode === ep.episode_number) {
      button.classList.add('active-episode');
    }

    button.addEventListener('click', () => {
      item.episode = ep.episode_number;
      addToHistory(item);
      changeServer();

      episodeList.querySelectorAll('button').forEach(btn => btn.classList.remove('active-episode'));
      button.classList.add('active-episode');
    });

    episodeList.appendChild(button);
  });
}

/* ---------- SEARCH ---------- */
async function searchTMDB() {
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');

  if (!input || !results) return;

  const query = input.value.trim();
  results.innerHTML = '';

  if (!query) return;

  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  const data = await res.json();

  (data.results || []).forEach(item => {
    if (!item.poster_path) return;
    if (item.media_type !== 'movie' && item.media_type !== 'tv') return;

    const card = document.createElement('div');
    card.className = 'search-card';
    card.innerHTML = `
      <img src="${IMG_URL}${item.poster_path}" alt="${item.title || item.name || ''}">
      <p>${truncateText(item.title || item.name || '', 24)}</p>
    `;

    card.addEventListener('click', () => {
      goToWatch({
        ...item,
        media_type: item.media_type
      });
    });

    results.appendChild(card);
  });
}

window.searchTMDB = searchTMDB;

/* ---------- INIT ---------- */
async function initHomePage() {
  const movies = (await fetchTrending('movie')).map(item => ({ ...item, media_type: 'movie' }));
  const topRatedTV = await fetchTopRatedTV();
  const anime = await fetchTrendingAnime();

  heroItems = movies.slice(0, 5);
  heroIndex = 0;
  renderHero();
  startHeroAuto();

  renderPosterRow(movies, 'movies-list');
  renderPosterRow(topRatedTV, 'tvshows-list');
  renderPosterRow(anime, 'anime-list');
  renderHistory();
}

async function initWatchPage() {
  const params = new URLSearchParams(window.location.search);
  const id = Number(params.get('id'));
  const mediaType = params.get('media_type');
  const title = params.get('title') || '';
  const poster = params.get('poster') || '';
  const season = params.get('season') ? Number(params.get('season')) : null;
  const episode = params.get('episode') ? Number(params.get('episode')) : null;
  const server = params.get('server') || localStorage.getItem('lastServer') || 'vidsrc.cc';

  currentItem = {
    id,
    media_type: mediaType,
    title,
    poster_path: poster,
    season,
    episode,
    server
  };

  const serverSelect = document.getElementById('server');
  if (serverSelect) {
    serverSelect.value = server;
    serverSelect.addEventListener('change', () => {
      currentItem.server = serverSelect.value;
      addToHistory(currentItem);
      changeServer();
    });
  }

  addToHistory(currentItem);

  if (mediaType === 'tv') {
    await loadSeasons(currentItem);
    await displayEpisodes(currentItem);
  }

  changeServer();
}

async function init() {
  try {
    if (isWatchPage()) {
      await initWatchPage();
    } else {
      await initHomePage();
    }
  } catch (error) {
    console.error('Init error:', error);
  }
}

init();
