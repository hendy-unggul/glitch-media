// Supabase configuration - GANTI DENGAN MILIK ANDA
const SUPABASE_URL = 'https://zfudjpclivegiapsbvfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdWRqcGNsaXZlZ2lhcHNidmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzk2MTIsImV4cCI6MjA5MDU1NTYxMn0.K_fH5UKX2wU0m2qLQTzMlNVa5DCWEoGkRrucHXF6buU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentCity = 'Bandung';
let allCities = ['Bandung', 'Jakarta', 'Surabaya', 'Medan', 'Makassar', 'Jayapura', 'Kupang', 'Bireuen']; // nanti ambil dari database

// Detect location via IP
async function detectCity() {
  try {
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    // Mapping kota sederhana - bisa diperluas
    const cityMap = {
      'Bandung': 'Bandung',
      'Jakarta': 'Jakarta',
      'Surabaya': 'Surabaya',
      'Medan': 'Medan',
      'Makassar': 'Makassar'
    };
    currentCity = cityMap[data.city] || 'Bandung';
    updateCityUI();
    loadArticles();
    loadClassifieds();
    loadTrending();
    loadDataFakta();
  } catch(e) {
    console.error('IP detection failed', e);
    currentCity = 'Bandung';
    updateCityUI();
    loadArticles();
  }
}

function updateCityUI() {
  document.getElementById('city-name').innerText = currentCity;
  document.getElementById('city-logo').innerText = currentCity;
  // Update meta tags, etc.
}

async function loadArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('city', currentCity)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error(error);
    return;
  }
  renderArticles(data);
}

function renderArticles(articles) {
  const container = document.getElementById('articles-container');
  if (!articles.length) {
    container.innerHTML = '<div class="hero"><div class="hero-text"><h1>Belum ada artikel untuk kota ini.</h1><p>Jadilah yang pertama mengirimkan berita!</p></div></div>';
    return;
  }
  // Hero (first article)
  const hero = articles[0];
  let html = `
    <div class="hero">
      <div class="hero-img" style="background-image: url('${hero.featured_image || 'https://placehold.co/1200x600/D9C5B0/5E3A2A?text=Glitch'}');">
        <div class="hero-tag">${hero.rubrik}</div>
      </div>
      <div class="hero-text">
        <h1>${hero.title}</h1>
        <div class="meta"><i class="far fa-calendar-alt"></i> ${new Date(hero.published_at).toLocaleDateString('id-ID')} · Glitch ${hero.city}</div>
        <p>${hero.excerpt || hero.content.substring(0, 200)}</p>
        <button class="btn-primary" style="width: auto; margin-top: 20px; padding: 10px 24px;" onclick="location.href='article.html?id=${hero.id}'">Baca selengkapnya →</button>
      </div>
    </div>
    <div class="card-grid">
  `;
  // Cards for remaining articles
  for (let i = 1; i < articles.length; i++) {
    const a = articles[i];
    html += `
      <div class="card">
        <div class="card-img" style="background-image: url('${a.featured_image || 'https://placehold.co/600x400/BBA28C/2C1A12?text=Berita'}');"></div>
        <div class="card-content">
          <div class="rubrik">${a.rubrik}</div>
          <h3>${a.title}</h3>
          <div class="meta">${new Date(a.published_at).toLocaleDateString('id-ID')}</div>
          <p>${a.excerpt || a.content.substring(0, 100)}</p>
          <a href="article.html?id=${a.id}" style="color:#C45C2C; font-weight:500;">Baca →</a>
        </div>
      </div>
    `;
  }
  html += `</div>`;
  container.innerHTML = html;
}

async function loadClassifieds() {
  const { data, error } = await supabase
    .from('classifieds')
    .select('*')
    .eq('city', currentCity)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error(error);
    return;
  }
  renderClassifieds(data);
}

function renderClassifieds(ads) {
  const container = document.getElementById('sidebar-container');
  if (!container) return;
  let html = `<div class="widget"><h3><i class="fas fa-list-ul"></i> Iklan Baris · Ekonomi Lokal</h3><p style="font-size: 0.75rem;">Pasang iklan properti, mobil, kos, jasa — mulai Rp50.000/7 hari. 90% untuk redaksi Glitch ${currentCity}.</p>`;
  if (ads.length) {
    ads.forEach(ad => {
      let icon = 'fa-tag';
      if (ad.category === 'property') icon = 'fa-home';
      else if (ad.category === 'car') icon = 'fa-car';
      else if (ad.category === 'rent') icon = 'fa-bed';
      html += `
        <div class="classified-item">
          <i class="fas ${icon}"></i>
          <div>
            <strong>${ad.title}</strong> ${ad.description}<br>
            <span style="font-size:0.7rem;">${ad.price} · Hub: ${ad.contact} · Tampil ${ad.days_remaining} hari lagi</span>
          </div>
        </div>
      `;
    });
  } else {
    html += `<p style="font-size:0.8rem;">Belum ada iklan baris. Pasang sekarang!</p>`;
  }
  html += `<button class="btn-primary" onclick="location.href='dashboard.html'"><i class="fas fa-plus-circle"></i> Pasang Iklan Baris</button><div class="editorial-note"><i class="fas fa-check-circle"></i> Iklan ini dikelola langsung oleh meja redaksi Glitch ${currentCity}</div></div>`;
  container.innerHTML = html;
}

async function loadTrending() {
  // Contoh trending dari artikel dengan view terbanyak dalam 7 hari terakhir
  const { data, error } = await supabase
    .from('articles')
    .select('title, slug, views')
    .eq('city', currentCity)
    .eq('status', 'published')
    .order('views', { ascending: false })
    .limit(5);
  if (error) return;
  const trendingHtml = `
    <div class="widget">
      <h3><i class="fas fa-fire"></i> Trending lokal</h3>
      <ul class="trending-list">
        ${data.map((a, idx) => `<li><span>${idx+1}</span> <a href="article.html?slug=${a.slug}">${a.title}</a></li>`).join('')}
      </ul>
    </div>
  `;
  // Insert after classifieds? For simplicity, append to sidebar container
  const container = document.getElementById('sidebar-container');
  if (container) container.insertAdjacentHTML('beforeend', trendingHtml);
}

async function loadDataFakta() {
  // Statistik kota (contoh statis, nanti bisa dari database)
  const dataFaktaHtml = `
    <div class="widget">
      <h3><i class="fas fa-chart-simple"></i> Data & Fakta</h3>
      <div class="data-item"><span>🏨 Hotel di ${currentCity} Utara:</span> <strong>124 unit</strong></div>
      <div class="data-item"><span>💧 Debit Cikapundung 2026:</span> <strong>2.3 m³/dtk (turun 12%)</strong></div>
      <div class="data-item"><span>📈 Harga tanah Dago:</span> <strong>Rp 18 jt/m²</strong></div>
      <a href="#" style="color:#C45C2C; font-size:0.8rem;">Lihat dataset lengkap →</a>
    </div>
  `;
  const container = document.getElementById('sidebar-container');
  if (container) container.insertAdjacentHTML('beforeend', dataFaktaHtml);
}

// Handle city change dropdown
document.getElementById('change-city').addEventListener('click', (e) => {
  e.preventDefault();
  const selector = document.getElementById('city-selector');
  // Populate with all cities
  selector.innerHTML = allCities.map(c => `<option value="${c}">Glitch ${c}</option>`).join('');
  selector.style.display = 'block';
  selector.addEventListener('change', () => {
    currentCity = selector.value;
    updateCityUI();
    selector.style.display = 'none';
    loadArticles();
    loadClassifieds();
    // Reload sidebar widgets
    document.getElementById('sidebar-container').innerHTML = '';
    loadClassifieds();
    loadTrending();
    loadDataFakta();
  });
});

detectCity();
