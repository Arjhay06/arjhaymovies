const API_KEY = 'a1e72fd93ed59f56e6332813b9f8dcae';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';

let currentItem = {};
let currentSeasons = [];
let currentSlideIndex = 0;
let slideItems = [];

/** Truncate long titles */
function truncateTitle(str, maxLength = 25) {
  if (typeof str !== 'string') return '';
  return str.length > maxLength
    ? str.slice(0, maxLength - 1).trim() + '…'
    : str;
}

function isWatchPage() {
  return window.location.pathname.includes('watch');
}

/*─── Modal Search ─────────────────────────────────────────────────────────────*/
function openSearchModal() {
  const m = document.getElementById('search-modal');
  if (!m) return;
  m.style.display = 'flex';
}
function closeSearchModal() {
  const m = document.getElementById('search-modal');
  if (!m) return;
  m.style.display = 'none';
}

/*─── Slider Controls ──────────────────────────────────────────────────────────*/
function nextSlide() {
  currentSlideIndex = (currentSlideIndex + 1) % slideItems.length;
  updateSlidePosition();
}
function prevSlide() {
  currentSlideIndex = (currentSlideIndex - 1 + slideItems.length) % slideItems.length;
  updateSlidePosition();
}
function updateSlidePosition() {
  const slides = document.getElementById('slides');
  const shift = (currentSlideIndex * 100) / slideItems.length;
  slides.style.transform = `translateX(-${shift}%)`;
}

/*─── Horizontal Scrolling ─────────────────────────────────────────────────────*/
function scrollList(id, dir) {
  const c = document.getElementById(id);
  if (!c) return;
  c.scrollBy({ left: dir * c.clientWidth, behavior: 'smooth' });
}

/*─── Search TMDB ──────────────────────────────────────────────────────────────*/
async function searchTMDB() {
  const q = document.getElementById('search-input').value.trim();
  const cont = document.getElementById('search-results');
  cont.innerHTML = '';
  if (!q) return;

  const res = await fetch(
    `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}`
  );
  const data = await res.json();

  data.results.forEach(item => {
    if (!item.poster_path) return;
    const wrap = document.createElement('div');
    wrap.className = 'search-result-item';

    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => {
      const p = new URLSearchParams({
        id: item.id,
        media_type: item.media_type,
        title: item.title || item.name,
        poster: item.poster_path
      });
      window.location.href = `/watch.html?${p}`;
    };

    const cap = document.createElement('p');
    cap.textContent = truncateTitle(item.title || item.name, 20);

    wrap.appendChild(img);
    wrap.appendChild(cap);
    cont.appendChild(wrap);
  });
}

/*─── INIT ────────────────────────────────────────────────────────────────────*/
async function init() {
  window.openSearchModal = openSearchModal;
  window.closeSearchModal = closeSearchModal;
  window.searchTMDB = searchTMDB;
  window.nextSlide = nextSlide;
  window.prevSlide = prevSlide;
  window.scrollList = scrollList;

  // Header-bar “Enter” → open search
  const hs = document.querySelector('.search-bar');
  if (hs) hs.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      openSearchModal();
      document.getElementById('search-input').value = hs.value.trim();
      searchTMDB();
    }
  });

  if (isWatchPage()) {
    const p = new URLSearchParams(window.location.search);
    currentItem = {
      id: parseInt(p.get('id')),
      media_type: p.get('media_type'),
      title: p.get('title'),
      poster_path: p.get('poster'),
      season: p.get('season') ? parseInt(p.get('season')) : null,
      episode: p.get('episode') ? parseInt(p.get('episode')) : null
    };
    addToHistory(currentItem);
    if (currentItem.media_type === 'tv') {
      await loadSeasons(currentItem);
      await displayEpisodes(currentItem);
    }
    changeServer();
  } else {
    await setupSlider();
    const movies = await fetchTrending('movie');
    const tvs = await fetchTrending('tv');
    const anime = await fetchTrendingAnime();
    displayList(movies, 'movies-list');
    displayList(tvs, 'tvshows-list');
    displayList(anime, 'anime-list');
    renderHistory();
  }
}

// Fetch trending data
async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  return (await res.json()).results;
}

async function fetchTrendingAnime() {
  let all = [];
  for (let page = 1; page <= 3; page++) {
    const data = await (await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`)).json();
    all = all.concat(data.results.filter(i => i.original_language === 'ja' && i.genre_ids.includes(16)));
  }
  return all;
}

// Display list with redirection
function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    if (!item.poster_path) return;
    if (!item.media_type) item.media_type = containerId.includes('tv') ? 'tv' : 'movie';
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.classList.add('fade-in');
    img.style.cursor = 'pointer';
    img.onclick = () => {
      const p = new URLSearchParams({
        id: item.id,
        media_type: item.media_type,
        title: item.title || item.name || '',
        poster: item.poster_path,
        season: item.season || '',
        episode: item.episode || ''
      });
      window.location.href = `watch.html?${p}`;
    };
    container.appendChild(img);
  });
}

// Slider setup
async function setupSlider() {
  const movies = await fetchTrending('movie');
  slideItems = await Promise.all(
    movies.slice(0, 5).map(async item => {
      const full = await (await fetch(`${BASE_URL}/movie/${item.id}?api_key=${API_KEY}`)).json();
      return { ...item, runtime: full.runtime, media_type: 'movie' };
    })
  );
  const slides = document.getElementById('slides');
  slides.innerHTML = '';
  slideItems.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'slide';
    div.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    div.innerHTML = `
      <div class="slide-overlay">
        <div class="meta">🎬 ${item.media_type} • ⭐ ${Math.round(item.vote_average)} • 🕒 ${item.runtime} mins</div>
        <h1>${truncateTitle(item.title, 30)}</h1>
        <p>${item.overview?.slice(0, 160)}...</p>
        <div class="buttons">
          <button onclick="redirectFromSlider(${idx})">DETAILS</button>
          <button onclick="redirectFromSlider(${idx})">WATCH NOW</button>
        </div>
      </div>`;
    slides.appendChild(div);
  });
  updateSlidePosition();
  setInterval(nextSlide, 7000);
}

// Redirect from slider
function redirectFromSlider(idx) {
  const item = slideItems[idx];
  const p = new URLSearchParams({ id: item.id, media_type: item.media_type, title: item.title, poster: item.backdrop_path });
  window.location.href = `watch.html?${p}`;
}

function updateSlidePosition() {
  document.getElementById('slides').style.transform = `translateX(-${currentSlideIndex * 100}%)`;
}

function nextSlide() {
  currentSlideIndex = (currentSlideIndex + 1) % slideItems.length;
  updateSlidePosition();
}

function prevSlide() {
  currentSlideIndex = (currentSlideIndex - 1 + slideItems.length) % slideItems.length;
  updateSlidePosition();
}

// Change server embed URL
function changeServer() {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
  let embedURL = '';
  switch (server) {
    case 'vidsrc.cc':
      embedURL = currentItem.episode
        ? `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}`
        : `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;

    case 'vidsrc.me':
      embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
      break;

    case 'player.videasy.net':
      embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
      break;

    case '2embed':
      embedURL = `https://2embed.cc/embed${type === 'movie' ? '' : 'tv'}/${currentItem.id}`;
      break;

    case '2anime.xyz': {
      const raw = currentItem.title || currentItem.name || '';
      const slug = raw
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      const epNum = currentItem.episode || 1;
      embedURL = `https://2anime.xyz/embed/${slug}-episode-${epNum}`;
      break;
    }

    case 'multiembed.mov':
      embedURL = `https://multiembed.mov/?video_id=${currentItem.id}&tmdb=1`;
      break;

    case 'apimocine-movie':
      embedURL = `https://apimocine.vercel.app/movie/${currentItem.id}`;
      break;

    case 'apimocine-tv':
      embedURL = `https://apimocine.vercel.app/tv/${currentItem.id}`;
      break;

    default:
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  }

  document.getElementById('modal-video').src = embedURL;
}

async function loadSeasons(item) {
  const data = await (await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}`)).json();
  currentSeasons = data.seasons.filter(s => s.season_number >= 0);
  const sel = document.getElementById('season-select');
  sel.innerHTML = '';
  currentSeasons.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.season_number;
    opt.textContent = s.name || `Season ${s.season_number}`;
    sel.appendChild(opt);
  });
  const init = item.season || currentSeasons[0].season_number;
  sel.value = init;
  sel.onchange = () => {
    currentItem.season = parseInt(sel.value);
    currentItem.episode = null;
    addToHistory(currentItem);
    displayEpisodes(currentItem);
  };
}

async function displayEpisodes(item) {
  const list = document.getElementById('episode-list');
  const seasonNum = item.season || parseInt(document.getElementById('season-select').value);
  const res = await fetch(`${BASE_URL}/tv/${item.id}/season/${seasonNum}?api_key=${API_KEY}`);
  const data = await res.json();
  const eps = data.episodes || [];

  list.innerHTML = '';
  const pagination = document.getElementById('episode-pagination');
  if (pagination) pagination.style.display = 'none';

  list.style.maxHeight = '400px';
  list.style.overflowY = 'auto';

  eps.forEach(ep => {
    const btn = document.createElement('button');
    btn.textContent = `E${ep.episode_number}: ${ep.name}`;
    if (item.episode === ep.episode_number && seasonNum === item.season) {
      btn.classList.add('active-episode');
    }
    btn.onclick = () => {
      currentItem.episode = ep.episode_number;
      changeServer();
      addToHistory(currentItem);
      list.querySelectorAll('button').forEach(b => b.classList.remove('active-episode'));
      btn.classList.add('active-episode');
    };
    list.appendChild(btn);
  });
}

// Search redirect with titles
async function searchTMDB() {
  const q = document.getElementById('search-input').value.trim();
  if (!q) return;
  const data = await (await fetch(
    `${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(q)}`
  )).json();
  const cont = document.getElementById('search-results');
  cont.innerHTML = '';
  data.results.forEach(item => {
    if (!item.poster_path) return;
    item.media_type = item.media_type || 'movie';
    const wrapper = document.createElement('div');
    wrapper.className = 'search-result-item';
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => {
      const p = new URLSearchParams({ id: item.id, media_type: item.media_type, title: item.title || item.name || '', poster: item.poster_path });
      window.location.href = `watch.html?${p}`;
    };
    const caption = document.createElement('p');
    caption.textContent = truncateTitle(item.title || item.name || '', 20);
    wrapper.appendChild(img);
    wrapper.appendChild(caption);
    cont.appendChild(wrapper);
  });
}

// Render history items
function renderHistory() {
  const container = document.getElementById('history-list');
  if (!container) return;
  const history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  container.innerHTML = '';
  history.forEach(item => {
    const wrapper = document.createElement('div');
    wrapper.className = 'history-item';
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title;
    img.onclick = () => {
      const p = new URLSearchParams({ id: item.id, media_type: item.media_type, title: item.title, poster: item.poster_path, season: item.season || '', episode: item.episode || '' });
      window.location.href = `watch.html?${p}`;
    };
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.className = 'remove-btn';
    btn.onclick = e => {
      e.stopPropagation();
      let hist = JSON.parse(localStorage.getItem('watchHistory')) || [];
      hist = hist.filter(h => h.id !== item.id);
      localStorage.setItem('watchHistory', JSON.stringify(hist));
      renderHistory();
    };
    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  });
}

init();
