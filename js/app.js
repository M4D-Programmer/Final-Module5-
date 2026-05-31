const dataUrl = './data/cars.json'

const q = document.getElementById('q')
const makeFilter = document.getElementById('makeFilter')
const transFilter = document.getElementById('transFilter')
const grid = document.getElementById('grid')
const cardTpl = document.getElementById('cardTpl')
const modal = document.getElementById('modal')
const modalContent = document.getElementById('modalContent')
const closeModal = document.getElementById('closeModal')
const rangeMin = document.getElementById('rangeMin')
const rangeMax = document.getElementById('rangeMax')
const priceRangeLabel = document.getElementById('priceRangeLabel')
const sortSelect = document.getElementById('sort')
const suggestionList = document.getElementById('suggestionList')

let cars = []

async function init(){
  const res = await fetch(dataUrl)
  cars = await res.json()
  setupPriceRanges()
  populateMakes()
  populateSuggestions()
  render(cars)
}

function setupPriceRanges(){
  const prices = cars.map(c=>c.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  rangeMin.min = min; rangeMin.max = max; rangeMin.value = min
  rangeMax.min = min; rangeMax.max = 50000; rangeMax.value = max
  updatePriceLabel()
}

function updatePriceLabel(){
  const a = Number(rangeMin.value)
  const b = Number(rangeMax.value)
  priceRangeLabel.textContent = `$${a.toLocaleString()} — $${b.toLocaleString()}`
}

function populateMakes(){
  const makes = Array.from(new Set(cars.map(c=>c.make))).sort()
  for(const m of makes){
    const o = document.createElement('option')
    o.value = m; o.textContent = m
    makeFilter.appendChild(o)
  }
}

function populateSuggestions(){
  const items = Array.from(new Set(cars.flatMap(c=>[c.make,c.model,c.location]))).slice(0,200)
  suggestionItems = items
}

function render(list){
  grid.innerHTML = ''
  for(const car of list){
    const node = cardTpl.content.cloneNode(true)
    node.querySelector('.thumb').src = car.img
    node.querySelector('.thumb').alt = `${car.make} ${car.model}`
    node.querySelector('.title').textContent = `${car.year} ${car.make} ${car.model}`
    node.querySelector('.meta').textContent = `${car.mileage.toLocaleString()} mi — ${car.location}`
    const specs = node.querySelector('.specs')
    if(specs) specs.innerHTML = `\
      <span class="spec">${iconMileage()} ${car.mileage.toLocaleString()} mi</span>\
      <span class="spec">${iconBody()} ${car.body}</span>\
      <span class="spec">${iconTrans()} ${car.transmission}</span>`
    node.querySelector('.price').textContent = `$${car.price.toLocaleString()}`
    node.querySelector('.details').addEventListener('click', ()=>openModal(car))
    grid.appendChild(node)
  }
}

// Autocomplete suggestions
let suggestionItems = []
let activeSuggestion = -1

q.addEventListener('input', ()=>{
  const v = q.value.trim().toLowerCase()
  if(!v){ suggestionList.innerHTML=''; suggestionList.style.display='none'; return }
  const matches = suggestionItems.filter(s=>s.toLowerCase().includes(v)).slice(0,8)
  suggestionList.innerHTML = matches.map((m,i)=>`<div class="item" role="option" data-index="${i}">${m}</div>`).join('')
  suggestionList.style.display = matches.length? 'block':'none'
  activeSuggestion = -1
})

suggestionList.addEventListener('click', (e)=>{
  const it = e.target.closest('.item')
  if(!it) return
  q.value = it.textContent
  suggestionList.innerHTML = ''
  suggestionList.style.display='none'
  applyFilters()
})

q.addEventListener('keydown', (e)=>{
  const items = Array.from(suggestionList.querySelectorAll('.item'))
  if(!items.length) return
  if(e.key==='ArrowDown'){ e.preventDefault(); activeSuggestion = Math.min(activeSuggestion+1, items.length-1); updateActive(items) }
  else if(e.key==='ArrowUp'){ e.preventDefault(); activeSuggestion = Math.max(activeSuggestion-1, 0); updateActive(items) }
  else if(e.key==='Enter'){ if(activeSuggestion>=0){ e.preventDefault(); q.value = items[activeSuggestion].textContent; suggestionList.innerHTML=''; suggestionList.style.display='none'; applyFilters() } }
})

function updateActive(items){ items.forEach(it=>it.classList.remove('active')); if(activeSuggestion>=0) items[activeSuggestion].classList.add('active') }

function iconMileage(){return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 7v5l3 3" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
function iconBody(){return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="7" width="18" height="9" rx="2" stroke="#9CA3AF" stroke-width="1.5"/></svg>`}
function iconTrans(){return `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 7v10" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round"/><path d="M16 7v10" stroke="#9CA3AF" stroke-width="1.5" stroke-linecap="round"/></svg>`}

function openModal(car){
  modalContent.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <img src="${car.img}" style="width:100%;height:250px;object-fit:cover;border-radius:6px" alt="${car.make} ${car.model}">
      <div>
        <h3 style="margin-top:0">${car.year} ${car.make} ${car.model}</h3>
        <p style="color:var(--muted)">${car.mileage.toLocaleString()} mi • ${car.location}</p>
        <p style="font-weight:700;color:var(--accent);font-size:1.1rem">$${car.price.toLocaleString()}</p>
        <p>${car.description}</p>
        <ul>${car.features.map(f=>`<li>${f}</li>`).join('')}</ul>
      </div>
    </div>
  `
  modal.setAttribute('aria-hidden','false')
}

closeModal.addEventListener('click', ()=> modal.setAttribute('aria-hidden','true'))
modal.addEventListener('click', (e)=>{ if(e.target===modal) modal.setAttribute('aria-hidden','true') })

function applyFilters(){
  const qv = q.value.trim().toLowerCase()
  const make = makeFilter.value
  const trans = transFilter.value
  const minP = Number(rangeMin.value)
  const maxP = Number(rangeMax.value)
  let result = cars.slice()
  if(qv) result = result.filter(c=>`${c.make} ${c.model} ${c.location}`.toLowerCase().includes(qv))
  if(make) result = result.filter(c=>c.make===make)
  if(trans) result = result.filter(c=>c.transmission===trans)
  result = result.filter(c=>c.price>=minP && c.price<=maxP)
  // sorting
  const s = sortSelect.value
  if(s==='price-asc') result.sort((a,b)=>a.price-b.price)
  if(s==='a-to-z') result.sort((a,b)=>a.make.localeCompare(b.make) || a.model.localeCompare(b.model))
  if(s==='z-to-a') result.sort((a,b)=>b.make.localeCompare(a.make) || b.model.localeCompare(a.model))
  if(s==='price-desc') result.sort((a,b)=>b.price-a.price)
  if(s==='newest') result.sort((a,b)=>b.year-a.year)
  render(result)
}

q.addEventListener('input', debounce(applyFilters,200))
makeFilter.addEventListener('change', applyFilters)
transFilter.addEventListener('change', applyFilters)
rangeMin.addEventListener('input', ()=>{ if(Number(rangeMin.value)>Number(rangeMax.value)){rangeMin.value=rangeMax.value} updatePriceLabel(); applyFilters() })
rangeMax.addEventListener('input', ()=>{ if(Number(rangeMax.value)<Number(rangeMin.value)){rangeMax.value=rangeMin.value} updatePriceLabel(); applyFilters() })
sortSelect.addEventListener('change', applyFilters)

function debounce(fn,ms=200){let t;return(...a)=>{clearTimeout(t);t=setTimeout(()=>fn(...a),ms)}}

init().catch(err=>{console.error(err);grid.innerHTML='<p style="color:var(--muted)">Failed to load inventory.</p>'})
