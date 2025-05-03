const API_KEY = 'a1e72fd93ed59f56e6332813b9f8dcae';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;
let currentSeasons = [];

async function fetchTrending(type) {
  const res = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  const data = await res.json();
  return data.results;
}

async function fetchTrendingAnime() {
  let allResults = [];
  for (let page = 1; page <= 3; page++) {
    const res = await fetch(`${BASE_URL}/trending/tv/week?api_key=${API_KEY}&page=${page}`);
    const data = await res.json();
    const filtered = data.results.filter(item =>
      item.original_language === 'ja' && item.genre_ids.includes(16)
    );
    allResults = allResults.concat(filtered);
  }
  return allResults;
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => {
    if (!item.poster_path) return;
    if (!item.media_type) {
      item.media_type = containerId.includes('tv') ? 'tv' : 'movie';
    }
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.classList.add('fade-in');
    img.style.cursor = 'pointer';
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

async function showDetails(item) {
  currentItem = item;
  const history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  const saved = history.find(h => h.id === item.id);
  if (saved) {
    item.season = saved.season;
    item.episode = saved.episode;
  }
  addToHistory(item);

  function addToHistory(item) {
    let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    history = history.filter(i => i.id !== item.id);
    history.unshift({
      id: item.id,
      title: item.title || item.name,
      poster_path: item.poster_path,
      media_type: item.media_type,
      season: item.season || null,
      episode: item.episode || null
    });
    history = history.slice(0, 20);
    localStorage.setItem('watchHistory', JSON.stringify(history));
    renderHistory();
  }

  if (!currentItem.media_type) currentItem.media_type = 'tv';
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2)) || 'N/A';
  document.getElementById('episode-selector').style.display = 'block';
  document.getElementById('season-selector').style.display = 'block';

  if (item.media_type === 'tv') {
    await loadSeasons(item);
  }
  displayEpisodes(item);
  changeServer();
  document.getElementById('modal').style.display = 'flex';
}

function changeServer() {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
  let embedURL = '';

  if (server === 'vidsrc.cc') {
    if (currentItem.season && currentItem.episode) {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}/${currentItem.season}/${currentItem.episode}`;
    } else {
      embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
    }
  } else if (server === 'vidsrc.me') {
    embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
  } else if (server === 'player.videasy.net') {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  } else if (server === 'apimocine-movie') {
    embedURL = `https://apimocine.vercel.app/movie/${currentItem.id}`;
  } else if (server === 'apimocine-tv') {
    embedURL = `https://apimocine.vercel.app/tv/${currentItem.id}`;
  } else if (server === 'gdriveplayer') {
    embedURL = `https://gdriveplayer.to/embed2.php?tmdb=${currentItem.id}`;
  } else if (server === '2embed') {
    embedURL = `https://www.2embed.cc/embed${type === 'movie' ? '' : 'tv'}/${currentItem.id}`;
  } else if (server === '2anime.xyz') {
    const titleSlug = (currentItem.name || currentItem.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    embedURL = `https://2anime.xyz/embed/{ANIME-TITLE}-{EPISODE-NUMBER}`;
  }

  document.getElementById('modal-video').src = embedURL;
}


async function loadSeasons(item) {
  const res = await fetch(`${BASE_URL}/tv/${item.id}?api_key=${API_KEY}`);
  const data = await res.json();
  currentSeasons = (data.seasons || []).filter(season => season.season_number >= 0);

  const seasonSelector = document.getElementById('season-select');
  const wrapper = document.getElementById('season-selector');
  if (!seasonSelector || !wrapper) return;

  seasonSelector.innerHTML = '';
  wrapper.style.display = 'block';

  currentSeasons.forEach(season => {
    const option = document.createElement('option');
    option.value = season.season_number;
    option.textContent = season.name || `Season ${season.season_number}`;
    seasonSelector.appendChild(option);
  });

  let initialSeason = item.season != null ? item.season : (currentSeasons[0]?.season_number || 1);
seasonSelector.value = initialSeason;

seasonSelector.onchange = () => {
  // ✅ Save new season in history
  currentItem.season = parseInt(seasonSelector.value);
  currentItem.episode = null; // Reset episode when changing season

  let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
  history = history.map(h => {
    if (h.id === currentItem.id) {
      return {
        ...h,
        season: currentItem.season,
        episode: null
      };
    }
    return h;
  });
  localStorage.setItem('watchHistory', JSON.stringify(history));

  // ✅ Load new season
  displayEpisodes(currentItem);
};
}

async function displayEpisodes(item) {
  const episodeSelector = document.getElementById('episode-selector');
  const episodeList = document.getElementById('episode-list');
  const episodePagination = document.getElementById('episode-pagination');

  if (item.media_type !== 'tv') {
    episodeSelector.style.display = 'none';
    return;
  }

  let selectedSeason = parseInt(document.getElementById('season-select').value || 1);
  if (item.season != null) {
    selectedSeason = item.season;
    document.getElementById('season-select').value = selectedSeason;
  }

  const res = await fetch(`${BASE_URL}/tv/${item.id}/season/${selectedSeason}?api_key=${API_KEY}`);
  const data = await res.json();
  const episodes = (data.episodes || []).filter(ep => ep.season_number === selectedSeason);

  episodeSelector.style.display = 'block';
  episodeList.innerHTML = '';
  episodePagination.innerHTML = '';

  if (episodes.length === 0) {
    episodeList.innerHTML = '<p style="color: #ccc;">No episodes available for this season.</p>';
    return;
  }

  let currentPage = 1;
  const episodesPerPage = 10;

  function renderEpisodes(page) {
    episodeList.innerHTML = '';
    const start = (page - 1) * episodesPerPage;
    const paginated = episodes.slice(start, start + episodesPerPage);
    paginated.forEach(ep => {
  const btn = document.createElement('button');
  btn.textContent = `E${ep.episode_number}: ${ep.name}`;
  btn.onclick = () => {
    // Update the video player
    document.getElementById('modal-video').src = `https://vidsrc.cc/v2/embed/tv/${item.id}/${selectedSeason}/${ep.episode_number}`;

    // 🔹 Highlight this episode
    document.querySelectorAll('#episode-list button').forEach(b => b.classList.remove('active-episode'));
    btn.classList.add('active-episode');

    // 🔹 Update history with the season and episode info
    let history = JSON.parse(localStorage.getItem('watchHistory')) || [];
    history = history.map(h => {
      if (h.id === item.id) {
        return {
          ...h,
          season: selectedSeason,
          episode: ep.episode_number
        };
      }
      return h;
    });
    localStorage.setItem('watchHistory', JSON.stringify(history));
  };

  // 🔹 Highlight saved episode
  if (item.episode === ep.episode_number && selectedSeason === item.season) {
    btn.classList.add('active-episode');
  }

  episodeList.appendChild(btn);
});
  }

  function renderPagination() {
    episodePagination.innerHTML = '';
    const totalPages = Math.ceil(episodes.length / episodesPerPage);
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      if (i === currentPage) pageBtn.classList.add('active');
      pageBtn.onclick = () => {
        currentPage = i;
        renderEpisodes(currentPage);
        renderPagination();
      };
      episodePagination.appendChild(pageBtn);
    }
  }

  renderEpisodes(currentPage);
  renderPagination();
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
}

function openSearchModal() {
  document.getElementById('search-modal').style.display = 'flex';
  document.getElementById('search-input').focus();
}

function closeSearchModal() {
  document.getElementById('search-modal').style.display = 'none';
  document.getElementById('search-results').innerHTML = '';
}

async function searchTMDB() {
  const query = document.getElementById('search-input').value.trim();
  if (!query) {
    document.getElementById('search-results').innerHTML = '';
    return;
  }
  const res = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&query=${encodeURIComponent(query)}`);
  const data = await res.json();
  const container = document.getElementById('search-results');
  container.innerHTML = '';
  data.results.forEach(item => {
    if (!item.poster_path) return;
    if (!item.media_type) item.media_type = 'movie';
    const img = document.createElement('img');
    img.src = `${IMG_URL}${item.poster_path}`;
    img.alt = item.title || item.name;
    img.onclick = () => {
      closeSearchModal();
      showDetails(item);
    };
    container.appendChild(img);
  });
}

let currentSlideIndex = 0;
let slideItems = [];

async function setupSlider() {
  const movies = await fetchTrending('movie');
  slideItems = await Promise.all(movies.slice(0, 5).map(async (item) => {
    const details = await fetch(`${BASE_URL}/movie/${item.id}?api_key=${API_KEY}`);
    const full = await details.json();
    item.runtime = full.runtime || 'N/A';
    return item;
  }));
  const slidesContainer = document.getElementById('slides');
  slidesContainer.innerHTML = '';
  slideItems.forEach((item, index) => {
    item.media_type = 'movie';
    const slide = document.createElement('div');
    slide.className = 'slide';
    slide.style.backgroundImage = `url(${IMG_URL}${item.backdrop_path})`;
    slide.innerHTML = `
      <div class="slide-overlay">
        <div class="meta">
          <span>🎬 ${item.media_type}</span> • ⭐ ${Math.round(item.vote_average)} • 🕒 ${item.runtime || 'N/A'} mins
        </div>
        <h1>${item.title || item.name}</h1>
        <p>${item.overview?.slice(0, 160) || 'No overview available.'}...</p>
        <div class="buttons">
          <button class="details" onclick="showDetailsFromIndex(${index})">DETAILS</button>
          <button class="watch" onclick="showDetailsFromIndex(${index})">WATCH NOW</button>
        </div>
      </div>
    `;
    slidesContainer.appendChild(slide);
  });
  updateSlidePosition();
  setInterval(nextSlide, 7000);
}

function updateSlidePosition() {
  const slides = document.getElementById('slides');
  slides.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
}

function nextSlide() {
  currentSlideIndex = (currentSlideIndex + 1) % slideItems.length;
  updateSlidePosition();
}

function prevSlide() {
  currentSlideIndex = (currentSlideIndex - 1 + slideItems.length) % slideItems.length;
  updateSlidePosition();
}

function showDetailsFromIndex(index) {
  showDetails(slideItems[index]);
}

async function init() {
  await setupSlider();
  const movies = await fetchTrending('movie');
  const tvShows = await fetchTrending('tv');
  const anime = await fetchTrendingAnime();
  displayList(movies, 'movies-list');
  displayList(tvShows, 'tvshows-list');
  displayList(anime, 'anime-list');
}

function scrollList(id, direction) {
  const container = document.getElementById(id);
  const scrollAmount = container.clientWidth * 0.8;
  container.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}

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
    img.onclick = () => showDetails(item);

    const btn = document.createElement('button');
    btn.textContent = '✕';
    btn.className = 'remove-btn';
    btn.onclick = (e) => {
      e.stopPropagation();
      const updated = history.filter(h => h.id !== item.id);
      localStorage.setItem('watchHistory', JSON.stringify(updated));
      renderHistory();
    };

    wrapper.appendChild(img);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  });
}

init();
renderHistory(); // 👈 This will show history on refresh
window.searchTMDB = searchTMDB;
