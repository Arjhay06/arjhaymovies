const API_KEY = 'a1e72fd93ed59f56e6332813b9f8dcae';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/original';
let currentItem;

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
    img.onclick = () => showDetails(item);
    container.appendChild(img);
  });
}

function showDetails(item) {
  currentItem = item;
  document.getElementById('modal-title').textContent = item.title || item.name;
  document.getElementById('modal-description').textContent = item.overview || 'No description available.';
  document.getElementById('modal-image').src = `${IMG_URL}${item.poster_path}`;
  document.getElementById('modal-rating').innerHTML = '★'.repeat(Math.round(item.vote_average / 2)) || 'N/A';
  changeServer();
  displayEpisodes(item);
  document.getElementById('modal').style.display = 'flex';
}

function changeServer() {
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
  let embedURL = '';

  if (server === 'vidsrc.cc') {
    embedURL = `https://vidsrc.cc/v2/embed/${type}/${currentItem.id}`;
  } else if (server === 'vidsrc.me') {
    embedURL = `https://vidsrc.net/embed/${type}/?tmdb=${currentItem.id}`;
  } else if (server === 'player.videasy.net') {
    embedURL = `https://player.videasy.net/${type}/${currentItem.id}`;
  }

  document.getElementById('modal-video').src = embedURL;
}

function displayEpisodes(item) {
  const episodeSelector = document.getElementById('episode-selector');
  const episodeList = document.getElementById('episode-list');
  if (item.media_type !== 'tv') {
    episodeSelector.style.display = 'none';
    return;
  }
  episodeSelector.style.display = 'block';
  episodeList.innerHTML = '';
  for (let i = 1; i <= 10; i++) {
    const btn = document.createElement('button');
    btn.textContent = `Episode ${i}`;
    btn.onclick = () => {
      document.getElementById('modal-video').src = `https://vidsrc.cc/v2/embed/tv/${item.id}/${i}`;
    };
    episodeList.appendChild(btn);
  }
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.getElementById('modal-video').src = '';
  document.getElementById('episode-selector').style.display = 'none';
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
    if (!item.media_type) {
      item.media_type = 'movie';
    }
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
  slideItems = movies.slice(0, 5);
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
  const scrollAmount = container.clientWidth * 0.8; // scroll by 80% of container width
  container.scrollBy({
    left: direction * scrollAmount,
    behavior: 'smooth'
  });
}


init();
