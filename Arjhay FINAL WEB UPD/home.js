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

// Open search modal
function openSearchModal() {
  const modal = document.getElementById('search-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  const input = document.getElementById('search-input');
  input.value = '';
  document.getElementById('search-results').innerHTML = '';
  input.focus();
}

// Close search modal
function closeSearchModal() {
  const modal = document.getElementById('search-modal');
  if (!modal) return;
  modal.style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}

// Add or update watch history
function addToHistory(item) {
  const entry = {
    id:         item.id,
    title:      item.title || item.name || '',
    poster_path:item.poster_path || item.poster || '',
    media_type: item.media_type,
    season:     item.season   || null,
    episode:    item.episode  || null,
    server:     document.getElementById('server')
                  ? document.getElementById('server').value
                  : null
  };
  let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  history = history.filter(i => i.id !== entry.id);
  history.unshift(entry);
  history = history.slice(0, 20);
  localStorage.setItem('watchHistory', JSON.stringify(history));
  renderHistory();
}

// Scroll the given list container by one "page" width
function scrollList(containerId, direction) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const scrollAmount = container.clientWidth;
  container.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}
window.scrollList = scrollList;

// Initialize on page load
async function init() {
  window.openSearchModal = openSearchModal;
  window.closeSearchModal = closeSearchModal;
  window.searchTMDB = searchTMDB;
  window.nextSlide = nextSlide;
  window.prevSlide = prevSlide;

  if (isWatchPage()) {
    const params = new URLSearchParams(window.location.search);
    const id = parseInt(params.get('id'));
    const media_type = params.get('media_type');
    const title = params.get('title');
    const poster = params.get('poster');
    const season = params.get('season') ? parseInt(params.get('season')) : null;
    const episode = params.get('episode') ? parseInt(params.get('episode')) : null;
    const selectedServer = params.get('server');

    currentItem = { id, media_type, title, poster_path: poster, season, episode };
    // if history server exists, set dropdown
    if (selectedServer) {
      const sel = document.getElementById('server');
      if (sel) sel.value = selectedServer;
    }
    addToHistory(currentItem);

    if (media_type === 'tv') {
      await loadSeasons(currentItem);
      await displayEpisodes(currentItem);
    }

    // Build embed URL
    await changeServer();

    // Server fallback list
    const SERVER_LIST = [
      'vidsrc.cc',
      'vidsrc.net',
      'player.videasy.net',
      '2embed',
      '2anime.xyz',
      'multiembed.mov',
      'apimocine-movie',
      'apimocine-tv',
      'moviesapi.club'
    ];

    const videoEl = document.getElementById('modal-video');
    videoEl.addEventListener('error', () => {
      const select = document.getElementById('server');
      const current = SERVER_LIST.indexOf(select.value);
      const next = (current + 1) % SERVER_LIST.length;
      select.value = SERVER_LIST[next];
      changeServer();
      console.log(`Server failed, switched to ${SERVER_LIST[next]}`);
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


// Fetch trending data
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

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';

  items.forEach(item => {
    if (!item.poster_path) return;
    if (!item.media_type) 
      item.media_type = containerId.includes('tv') ? 'tv' : 'movie';

    // ── build card
    const card = document.createElement('div');
    card.classList.add('card');

    // poster image
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.classList.add('fade-in');
    img.style.cursor = 'pointer';
    img.onclick = () => {
      const p = new URLSearchParams({
        id:         item.id,
        media_type: item.media_type,
        title:      item.title  || item.name  || '',
        poster:     item.poster_path,
        season:     item.season  || '',
        episode:    item.episode || '',
        server:     document.getElementById('server').value
      });
      window.location.href = `watch.html?${p}`;
    };
    card.appendChild(img);

    // ── HD badge (always show; tweak logic if you only want it for high-rated)
    const hd = document.createElement('span');
    hd.classList.add('badge','quality');
    hd.innerText = 'HD';
    card.appendChild(hd);

    // ── type & year badge
    const info = document.createElement('span');
    info.classList.add('badge','info');
   

    // ── title overlay
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
    movies.slice(0, 5).map(async item => {
      const full = await (await fetch(
        `${BASE_URL}/movie/${item.id}?api_key=${API_KEY}`
      )).json();
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
        <div class="meta">🎬 ${item.media_type} • ⭐ ${Math.round(
        item.vote_average
      )} • 🕒 ${item.runtime} mins</div>
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

// Redirect from the movie slider (preserve selected server too)
function redirectFromSlider(idx) {
  const item = slideItems[idx];
  const serverValue = document.getElementById('server')
    ? document.getElementById('server').value
    : localStorage.getItem('lastServer') || 'vidsrc.cc';
    
  const p = new URLSearchParams({
    id:         item.id,
    media_type: item.media_type,
    title:      item.title,
    poster:     item.backdrop_path || item.poster_path || '',
    season:     item.season   || '',
    episode:    item.episode  || '',
    server:     document.getElementById('server')
                  ? document.getElementById('server').value
                  : ''
    
  });
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
  const type   = currentItem.media_type === 'movie' ? 'movie' : 'tv';
  let embedURL = '';

  switch (server) {
    case 'vidsrc.cc':
      embedURL = currentItem.episode
        ? `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}`
        : `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
      break;

    case 'vidsrc.in':
      embedURL = currentItem.episode
        ? `https:/vidsrc.in/embed/tv/${currentItem.id}/${currentItem.season}-${currentItem.episode}`
        : `https://vidsrc.in/embed/movie/${currentItem.id}`;
      
      break;

      case 'player.videasy.net':
        embedURL = `https://player.videasy.net/movie/${currentItem.id}/${currentItem.season}/${currentItem.episode}`;
           
    case '2embed':
      embedURL = embedURL = currentItem.episode
      ?`https://www.2embed.cc/embedtv/${currentItem.id}&s=${currentItem.season}&e=${currentItem.episode}`
      : `https://www.2embed.cc/embed/${currentItem.id}`;
       
      break;

      case '2embed RU':
        embedURL = `https://www.2embed.ru/embed/tmdb/tv?id=${currentItem.id}&s=${currentItem.season}&e=${currentItem.episode}`;  

      case '2Anime': {
        // 1. Build a clean slug from the title/name
        let slug = (currentItem.title || currentItem.name || '')
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')   // strip punctuation
          .trim()
          .replace(/\s+/g, '-');      // spaces → hyphens
      
        // 3. Which episode?
        const ep = currentItem.episode || 1;
      
        // 4. Build the final URL
        embedURL = `https://2anime.xyz/embed/${slug}-episode-${ep}`;
        break;
      }

    case 'moviesapi.club animetv':
      embedURL = `https://moviesapi.club/tv/${currentItem.id}/${currentItem.season}/${currentItem.episode}`;
      
      break;

      case 'moviesapi.club movie':
      embedURL = `https://moviesapi.club/movie/${currentItem.id}`;
      
      break;

    case 'multiembed.mov':
      embedURL = `https://multiembed.mov/?video_id=${currentItem.id}&tmdb=1${currentItem.episode ? `&s=${currentItem.season}&e=${currentItem.episode}` : ''}`;
      break;

    case 'apimocine tv':
      embedURL = `https://apimocine.vercel.app/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}`;
      
      break;

      case 'apimocine movie':
        embedURL = `https://apimocine.vercel.app/${type}/${currentItem.id}`;
        
        break;  

    default:
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  }

  document.getElementById('modal-video').src = embedURL;
  localStorage.setItem('lastServer', server);
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
  item.season = init;
  sel.value = init;
  sel.onchange = () => {
    currentItem.season = parseInt(sel.value);
    currentItem.episode = null;
    addToHistory(currentItem);
    displayEpisodes(currentItem);
  };
}

async function displayEpisodes(item) {
  const list      = document.getElementById('episode-list');
  const seasonNum = item.season || parseInt(document.getElementById('season-select').value);
  item.season = seasonNum;         // ← keep currentItem.season in sync
  const res       = await fetch(`${BASE_URL}/tv/${item.id}/season/${seasonNum}?api_key=${API_KEY}`);
  const data      = await res.json();
  const eps       = data.episodes || [];

  list.innerHTML    = '';
  list.style.maxHeight = '400px';
  list.style.overflowY = 'auto';

  eps.forEach(ep => {
    const btn = document.createElement('button');
    btn.textContent = `E${ep.episode_number}: ${ep.name}`;
    if (item.episode === ep.episode_number && seasonNum === item.season) {
      btn.classList.add('active-episode');
    }
    btn.onclick = () => {
      item.season = seasonNum;      // ← ensure the clicked‐in season is saved
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
// Search and style results
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
    wrapper.classList.add('search-result-item','card');

    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.style.cursor = 'pointer';
    img.onclick = () => {
      const p = new URLSearchParams({
        id: item.id,
        media_type: item.media_type,
        title: item.title || item.name || '',
        poster: item.poster_path
      });
      window.location.href = `watch.html?${p}`;
    };
    wrapper.appendChild(img);

    const caption = document.createElement('p');
    caption.textContent = truncateTitle(item.title || item.name || '', 20);
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
    wrapper.classList.add('history-item','card');

    // Poster click navigates with saved server
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title;
    img.style.cursor = 'pointer';
    img.onclick = () => {
      const p = new URLSearchParams({
        id:         item.id,
        media_type: item.media_type,
        title:      item.title,
        poster:     item.poster_path,
        season:     item.season   || '',
        episode:    item.episode  || '',
        server:     item.server   || ''    // use the saved server
      });
      window.location.href = `watch.html?${p}`;
    };

    // Remove button
    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.className   = 'remove-btn';
    btn.onclick = e => {
      e.stopPropagation();
      let hist = JSON.parse(localStorage.getItem('watchHistory')) || [];
      hist = hist.filter(h => h.id !== item.id);
      localStorage.setItem('watchHistory', JSON.stringify(hist));
      renderHistory();
    };

    // Title overlay for consistency
    const titleOv = document.createElement('div');
    titleOv.classList.add('title-overlay');
    titleOv.innerText = truncateTitle(item.title, 25);

    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    wrapper.appendChild(titleOv);
    container.appendChild(wrapper);
  });
}

init();
