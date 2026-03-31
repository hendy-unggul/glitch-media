// Supabase configuration - SAMA DENGAN PUBLIC.JS
const SUPABASE_URL = 'https://zfudjpclivegiapsbvfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmdWRqcGNsaXZlZ2lhcHNidmZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ5Nzk2MTIsImV4cCI6MjA5MDU1NTYxMn0.K_fH5UKX2wU0m2qLQTzMlNVa5DCWEoGkRrucHXF6buU';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Login
document.getElementById('login-btn').onclick = async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    alert('Login gagal: ' + error.message);
    return;
  }
  currentUser = data.user;
  document.getElementById('auth-section').style.display = 'none';
  document.getElementById('dashboard-content').style.display = 'block';
  loadMyArticles();
  loadMyClassifieds();
  loadRevenue();
};

// Submit new article
document.getElementById('article-form').onsubmit = async (e) => {
  e.preventDefault();
  const title = document.getElementById('title').value;
  let slug = document.getElementById('slug').value;
  if (!slug) slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const excerpt = document.getElementById('excerpt').value;
  const content = document.getElementById('content').value;
  const rubrik = document.getElementById('rubrik').value;
  const city = document.getElementById('city').value;
  const lat = parseFloat(document.getElementById('lat').value) || null;
  const lng = parseFloat(document.getElementById('lng').value) || null;

  const { error } = await supabase
    .from('articles')
    .insert([{
      title,
      slug,
      excerpt,
      content,
      rubrik,
      city,
      latitude: lat,
      longitude: lng,
      author_id: currentUser.id,
      status: 'draft'
    }]);
  if (error) {
    alert('Gagal menyimpan: ' + error.message);
  } else {
    alert('Artikel draft berhasil disimpan!');
    document.getElementById('article-form').reset();
    loadMyArticles();
  }
};

async function loadMyArticles() {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('author_id', currentUser.id)
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    return;
  }
  const listDiv = document.getElementById('article-list');
  listDiv.innerHTML = data.map(article => `
    <div class="article-item">
      <div>
        <strong>${article.title}</strong><br>
        <span class="status-badge status-${article.status}">${article.status}</span>
        <span style="font-size:0.7rem;"> · ${new Date(article.created_at).toLocaleDateString()}</span>
      </div>
      <div>
        <button onclick="editArticle('${article.id}')" style="background:#C45C2C; padding:4px 12px; margin-right:8px;">Edit</button>
        ${article.status === 'draft' ? `<button onclick="submitForReview('${article.id}')" style="background:#2E7D6E; padding:4px 12px;">Kirim ke Review</button>` : ''}
      </div>
    </div>
  `).join('');
}

// Untuk keperluan edit, kita bisa redirect ke form edit sederhana (opsional)
window.editArticle = (id) => {
  // Bisa implementasi modal atau halaman edit
  alert('Fitur edit akan segera hadir. Untuk sementara, silakan buat artikel baru.');
};

window.submitForReview = async (id) => {
  const { error } = await supabase
    .from('articles')
    .update({ status: 'review' })
    .eq('id', id);
  if (error) alert('Gagal mengirim ke review: ' + error.message);
  else {
    alert('Artikel dikirim ke redaksi pusat untuk review');
    loadMyArticles();
  }
};

// Classified ads management
async function loadMyClassifieds() {
  // Dapatkan city dari profile user
  const { data: profile } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', currentUser.id)
    .single();
  const city = profile?.city || '';
  if (!city) return;

  const { data, error } = await supabase
    .from('classifieds')
    .select('*')
    .eq('city', city)
    .order('created_at', { ascending: false });
  if (error) console.error(error);
  else {
    const classifiedDiv = document.getElementById('classified-list');
    classifiedDiv.innerHTML = data.map(ad => `
      <div class="article-item">
        <div><strong>${ad.title}</strong><br>${ad.price} · ${ad.days_remaining} hari tersisa</div>
        <div><button onclick="deleteClassified('${ad.id}')" style="background:#8B3A2A; padding:4px 12px;">Hapus</button></div>
      </div>
    `).join('');
  }
}

document.getElementById('new-classified-btn').onclick = () => {
  const title = prompt('Judul iklan:');
  if (!title) return;
  const category = prompt('Kategori (property/car/rent/service):');
  const description = prompt('Deskripsi:');
  const price = prompt('Harga:');
  const contact = prompt('Kontak (telp/WA):');
  if (!title || !category || !description || !price || !contact) return;

  // Dapatkan city user
  supabase.from('profiles').select('city').eq('id', currentUser.id).single().then(({ data: profile }) => {
    if (profile?.city) {
      supabase.from('classifieds').insert([{
        title,
        category,
        description,
        price,
        contact,
        city: profile.city,
        days_remaining: 7,
        status: 'active'
      }]).then(({ error }) => {
        if (error) alert('Gagal memasang iklan: ' + error.message);
        else {
          alert('Iklan terpasang!');
          loadMyClassifieds();
        }
      });
    } else {
      alert('Profil kota belum terisi, hubungi admin.');
    }
  });
};

window.deleteClassified = async (id) => {
  if (confirm('Hapus iklan ini?')) {
    const { error } = await supabase
      .from('classifieds')
      .update({ status: 'deleted' })
      .eq('id', id);
    if (error) alert('Gagal menghapus: ' + error.message);
    else loadMyClassifieds();
  }
};

async function loadRevenue() {
  // Dapatkan city user
  const { data: profile } = await supabase
    .from('profiles')
    .select('city')
    .eq('id', currentUser.id)
    .single();
  const city = profile?.city;
  if (!city) return;

  const { data, error } = await supabase
    .from('revenue')
    .select('*')
    .eq('city', city)
    .order('month', { ascending: false })
    .limit(1);
  if (error) console.error(error);
  else {
    const revDiv = document.getElementById('revenue-info');
    if (data.length) {
      revDiv.innerHTML = `<p>Pendapatan bersih bulan ini: <strong>Rp ${data[0].net_amount?.toLocaleString() || data[0].amount?.toLocaleString()}</strong><br>Sudah termasuk pajak ditangani pusat.</p>`;
    } else {
      revDiv.innerHTML = '<p>Belum ada data pendapatan.</p>';
    }
  }
}
