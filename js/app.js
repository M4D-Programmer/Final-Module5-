const q = document.getElementById('q')
const grid = document.getElementById('grid')
const cardTpl = document.getElementById('cardTpl')
const modal = document.getElementById('modal')
const modalContent = document.getElementById('modalContent')
const closeModal = document.getElementById('closeModal')
const sortSelect = document.getElementById('sort')
const suggestionList = document.getElementById('suggestionList')
const searchBtn = document.getElementById('searchBtn')


//const API_BASE = 'https://www.omdbapi.com/?apikey=2f6b511a'
const DEFAULT_QUERY = 'star'
let movies = []
let suggestionItems = []
let activeSuggestion = -1

async function init(){
  await applyFilters() // initial render: uses default query
}

function populateSuggestions(){
  const items = new Set()
  for(const m of movies){ if(m.Title) items.add(m.Title) }
  suggestionItems = Array.from(items).slice(0,300)
}

function render(list){
  grid.innerHTML = ''
  if(!list.length){ grid.innerHTML = `<p style="color:var(--muted)">No results.</p>`; return }
  for(const m of list){
    const node = cardTpl.content.cloneNode(true)
    const img = (m.Poster && m.Poster !== 'N/A') ? m.Poster : ''
    node.querySelector('.thumb').src = img
    node.querySelector('.thumb').alt = m.Title
    node.querySelector('.title').textContent = `${m.Title} (${m.Year})`
    node.querySelector('.meta').textContent = `${m.Type || ''}`
    const specs = node.querySelector('.specs')
    if(specs) specs.innerHTML = ''
    node.querySelector('.price').textContent = ''
    node.querySelector('.details').addEventListener('click', ()=> openMovieModalById(m.imdbID))
    grid.appendChild(node)
  }
}

async function openMovieModalById(id){
  try{
    const res = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(id)}&apikey=2f6b511a`)
    const d = await res.json()
    if(!d || d.Response==='False'){
      modalContent.innerHTML = `<p style="color:var(--muted)">Details unavailable.</p>`
      modal.setAttribute('aria-hidden','false')
      return
    }
    modalContent.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
        <img src="${(d.Poster && d.Poster!=='N/A')?d.Poster:''}" style="width:100%;height:250px;object-fit:cover;border-radius:6px" alt="${d.Title}">
        <div>
          <h3 style="margin-top:0">${d.Title} (${d.Year})</h3>
          <p style="color:var(--muted)">Director: ${d.Director} • Actors: ${d.Actors}</p>
          <p style="font-weight:700;color:var(--accent);font-size:1.1rem">IMDB: ${d.imdbRating || 'N/A'}</p>
          <p>${d.Plot}</p>
        </div>
      </div>
    `
    modal.setAttribute('aria-hidden','false')
  }catch(err){
    console.error(err)
    modalContent.innerHTML = `<p style="color:var(--muted)">Failed to load details.</p>`
    modal.setAttribute('aria-hidden','false')
  }
}

closeModal.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true'))
modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.setAttribute('aria-hidden','true') })

async function fetchSearch(query){
  const qStr = (query || DEFAULT_QUERY).trim() || DEFAULT_QUERY
  try{
    const res = await fetch(`https://www.omdbapi.com/?s=${encodeURIComponent(qStr)}&apikey=2f6b511a`)
    const d = await res.json()
    if(d && d.Response==='True' && Array.isArray(d.Search)) return d.Search
    return []
  }catch(err){ console.error(err); return [] }
}

async function applyFilters(){
  const qv = (q.value || '').trim()
  movies = await fetchSearch(qv)
  populateSuggestions()
  const s = sortSelect.value
  if(s==='a-to-z') movies.sort((a,b)=> (a.Title||'').localeCompare(b.Title||''))
  else if(s==='z-to-a') movies.sort((a,b)=> (b.Title||'').localeCompare(a.Title||''))
  else if(s==='newest') movies.sort((a,b)=> Number(b.Year || 0) - Number(a.Year || 0))
  // relevance: keep API order
  render(movies)
}

searchBtn?.addEventListener('click', (e)=>{ e.preventDefault(); applyFilters() })
q.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); applyFilters() } })

q.addEventListener('input', debounce(()=>{
  const val = q.value.trim().toLowerCase()
  suggestionList.innerHTML = ''
  if(val.length<2){ suggestionList.style.display='none'; applyFilters(); return }
  const matches = suggestionItems.filter(it=>it.toLowerCase().includes(val)).slice(0,8)
  if(!matches.length){ suggestionList.style.display='none'; applyFilters(); return }
  suggestionList.style.display='block'
  for(const m of matches){
    const d = document.createElement('div')
    d.className = 'item'
    d.textContent = m
    suggestionList.appendChild(d)
  }
  activeSuggestion = -1
  applyFilters()
},200))

suggestionList.addEventListener('click', (e)=>{
  const it = e.target.closest('.item')
  if(!it) return
  q.value = it.textContent
  suggestionList.innerHTML = ''
  suggestionList.style.display='none'
  applyFilters()
})

// apply filters when sort changes
sortSelect?.addEventListener('change', applyFilters)

q.addEventListener('keydown', (e)=>{
  const items = Array.from(suggestionList.querySelectorAll('.item'))
  if(!items.length) return
  if(e.key==='ArrowDown'){ e.preventDefault(); activeSuggestion = Math.min(activeSuggestion+1, items.length-1); updateActive(items) }
  else if(e.key==='ArrowUp'){ e.preventDefault(); activeSuggestion = Math.max(activeSuggestion-1, 0); updateActive(items) }
  else if(e.key==='Enter'){ if(activeSuggestion>=0){ e.preventDefault(); q.value = items[activeSuggestion].textContent; suggestionList.innerHTML=''; suggestionList.style.display='none'; applyFilters() } }
})

function updateActive(items){ items.forEach(it=>it.classList.remove('active')); if(activeSuggestion>=0) items[activeSuggestion].classList.add('active') }

function debounce(fn,ms=200){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

function truncate(s,n){ if(!s) return ''; return s.length>n? s.slice(0,n).trim()+'…': s }

init().catch(err=>{console.error(err); grid.innerHTML='<p style="color:var(--muted)">Failed to load movies.</p>'})
