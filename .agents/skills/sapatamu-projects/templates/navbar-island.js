const island = document.getElementById('navIsland');
const navScroll = document.getElementById('navScroll');
let collapseTimer = null;
function expandIsland(){ island.classList.add('di-expanded'); clearTimeout(collapseTimer); }
function scheduleCollapse(ms=3000){ clearTimeout(collapseTimer); collapseTimer = setTimeout(()=> island.classList.remove('di-expanded'), ms); }
island.addEventListener('mouseenter', expandIsland);
island.addEventListener('mouseleave', ()=> scheduleCollapse(3000));
island.addEventListener('click', (e)=>{ if(!island.classList.contains('di-expanded')){ expandIsland(); scheduleCollapse(4000); e.preventDefault(); }});
document.querySelector('.nav-arrow--left').onclick = ()=> navScroll.scrollBy({left:-120, behavior:'smooth'});
document.querySelector('.nav-arrow--right').onclick = ()=> navScroll.scrollBy({left:120, behavior:'smooth'});
window.addEventListener('scroll', ()=>{ document.getElementById('navbar').classList.toggle('scrolled', window.scrollY>10); }, {passive:true});
