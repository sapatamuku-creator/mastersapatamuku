# 02 — Navbar Dynamic Island (Signature Pattern)

> Sumber: `index.html` (hero + search), `dashboard.html:1613`, `katalog_undangan.html`, `checkin.html` tablet island, `animations.css:9`

## Canon — jangan ganti dengan N1a generik

```css
/* Wrapper morph 180 → 960 */
.nav-outer-wrapper{
  width:180px;
  transition: width 0.55s cubic-bezier(0.34,1.2,0.64,1);
  cursor:pointer;
}
.nav-outer-wrapper.di-expanded{
  width: min(960px, 96vw);
  cursor: default;
}
/* Collapsed label — dot pulse */
.di-collapsed-label{
  position:absolute; inset:0; display:flex; align-items:center; justify-content:center;
  gap:8px; font-size:11px; font-weight:800; letter-spacing:0.08em; color:var(--text-main);
  transition: opacity 0.25s var(--ease-out);
}
.nav-outer-wrapper.di-expanded .di-collapsed-label{ opacity:0; pointer-events:none; }
.di-dot{ width:7px; height:7px; border-radius:50%; background:var(--gold); animation:diPulse 2s infinite; }
@keyframes diPulse{0%,100%{opacity:1; transform:scale(1)} 50%{opacity:0.5; transform:scale(0.7)}}

/* Scroll container — fades & arrows */
.nav-scroll-container{
  display:flex; gap:5px; padding:6px 15px; overflow-x:auto; scrollbar-width:none;
  scroll-behavior:smooth;
  mask: linear-gradient(90deg, transparent 0, black 20px, black calc(100% - 20px), transparent 100%);
}
.nav-scroll-container::-webkit-scrollbar{display:none}
.nav-outer-wrapper:not(.di-expanded) .nav-scroll-container{ opacity:0; pointer-events:none; }
.nav-arrow{ width:10px; opacity:0.5; cursor:pointer; user-select:none; }
```

```html
<nav class="nav-outer-wrapper" id="navIsland">
  <span class="di-collapsed-label"><span class="di-dot"></span> MENU</span>
  <div class="nav-scroll-container" id="navScroll">
    <a class="nav-link" href="/">Beranda</a>
    <a class="nav-link" href="/marketplace">Marketplace</a>
    <a class="nav-link" href="/guestbook">Guestbook</a>
    <a class="nav-link" href="/katalog_undangan.html">Katalog</a>
    <span class="nav-divider"></span>
    <a class="nav-link nav-link--primary" href="/login.html">Masuk</a>
  </div>
  <button class="nav-arrow nav-arrow--left" aria-label="Scroll left">‹</button>
  <button class="nav-arrow nav-arrow--right" aria-label="Scroll right">›</button>
</nav>
```

```css
.nav-link{ font-size:10.5px; font-weight:700; color:var(--text-muted); padding:10px 18px; border-radius:30px; white-space:nowrap; transition:all var(--duration-normal) var(--ease-out); }
.nav-link:hover{ background:var(--primary-soft); color:var(--text-main); }
.nav-link--active{ background:var(--primary); color:#fff; }
.nav-link--signout{ color:var(--primary); }
.nav-divider{ width:1px; height:18px; background:#EEE0D5; align-self:center; flex-shrink:0; }
```

```js
// JS canon — debounce + timers (jangan pakai hover CSS saja)
const island = document.getElementById('navIsland');
let collapseTimer = null;
function expand(){ island.classList.add('di-expanded'); clearTimeout(collapseTimer); }
function scheduleCollapse(ms=3000){
  clearTimeout(collapseTimer);
  collapseTimer = setTimeout(()=> island.classList.remove('di-expanded'), ms);
}
island.addEventListener('mouseenter', expand);
island.addEventListener('mouseleave', ()=> scheduleCollapse(3000));
island.addEventListener('click', (e)=>{
  if(!island.classList.contains('di-expanded')){ expand(); scheduleCollapse(4000); e.preventDefault(); }
});
// Touch: debounce 500ms open, close on outside tap
// Katalog & dashboard: default di-expanded (marketing) — tambah class di HTML
// Arrow scroll:
document.querySelector('.nav-arrow--left').onclick = ()=> navScroll.scrollBy({left:-120, behavior:'smooth'});
document.querySelector('.nav-arrow--right').onclick = ()=> navScroll.scrollBy({left:120, behavior:'smooth'});
```

## Varian

- **Marketing (katalog/dashboard)**: selalu `di-expanded` awal — `class="nav-outer-wrapper di-expanded"` di HTML, tanpa collapsed label.
- **Tablet operational (checkin/onsite)**: station selector jadi island capsule di `fixed 75px top 20px`, trigger pill `50px` dengan pulse dot, content hidden hingga `is-expanded` + `diDropIn 0.25s`.
- **Mobile `<768`**: Dynamic Island tetap tapi width `96vw`, nav-scroll jadi horizontal scroll pill.

## Fixed header

```css
.navbar{ position:fixed; top:0; inset-inline:0; z-index:10000; height:64px;
  background: rgba(255,251,249,0.95); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--border); display:flex; align-items:center; justify-content:space-between; padding:0 20px; }
.navbar.scrolled{ box-shadow: var(--shadow-sm); } /* toggle via JS on scrollY>10 */
```

## Fixed vs sticky note

- Marketing pages: `fixed` + `padding-top:64px` di `<main>` agar tidak ketutup.
- Dashboard: `sidebar sticky` + `top-bar flex between` di main — jangan fixed ganda.
