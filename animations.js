(function () {
  const anime = window.anime;
  if (!anime || typeof anime.animate !== 'function' || typeof anime.createTimeline !== 'function' || typeof anime.stagger !== 'function') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const { animate, createTimeline, stagger } = anime;

  const hero = document.querySelector('.hero');
  if (hero && createTimeline) {
    const tl = createTimeline({ defaults: { ease: 'inOutExpo' } });
    tl.add('.hero-badge', { opacity: [0, 1], translateY: [12, 0], duration: 500 })
      .add('.hero h1', { opacity: [0, 1], translateY: [26, 0], duration: 800 }, '-=350')
      .add('.hero-subtitle', { opacity: [0, 1], translateY: [18, 0], duration: 700 }, '-=600')
      .add('.hero-search', { opacity: [0, 1], translateY: [22, 0], duration: 700 }, '-=550');
  }

  function staggerReveal(gridSel, itemSel) {
    const grids = document.querySelectorAll(gridSel);
    grids.forEach((grid) => {
      let played = false;
      const play = () => {
        if (played) return;
        played = true;
        const items = grid.querySelectorAll(itemSel + ':not(.skeleton)');
        if (!items.length) return;
        animate(items, {
          opacity: [0, 1],
          translateY: [24, 0],
          ease: 'outCubic',
          duration: 650,
          delay: stagger(70)
        });
      };
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
          }
        });
      }, { threshold: 0.12 });
      io.observe(grid);
      const mo = new MutationObserver(() => {
        if (grid.querySelectorAll(itemSel + ':not(.skeleton)').length) {
          play();
          io.disconnect();
        }
      });
      mo.observe(grid, { childList: true });
    });
  }

  staggerReveal('.kategori-grid', '.kategori-card');
  staggerReveal('.kota-grid', '.kota-card');
  staggerReveal('.vendor-grid', '.vendor-card');
})();
