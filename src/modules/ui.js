export class UIManager {
  constructor() {
    this.pages = {
      home: document.querySelector('#page-home'),
      culture: document.querySelector('#page-culture'),
    };
  }

  init() {
    const exploreBtn = document.querySelector('#explore-btn');
    const backBtn = document.querySelector('#back-home');
    const timelineItems = document.querySelectorAll('.timeline-item');
    const cultureCard = document.querySelector('#culture-card');

    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => this.navigateTo('culture'));
    }

    if (backBtn) {
      backBtn.addEventListener('click', () => this.navigateTo('home'));
    }

    // 时间轴点击展示文化详情
    timelineItems.forEach(item => {
      item.addEventListener('click', () => {
        const dynasty = item.dataset.dynasty;
        document.querySelector('#dynasty-title').textContent = dynasty + '文化';
        document.querySelector('#dynasty-desc').textContent =
          `${dynasty}时期是中华文化的重要篇章……`;
        cultureCard.classList.remove('hidden');
      });
    });

    // 初始化景点抽屉事件
    this.bindDrawerClose();
  }

  /* 页面切换 */
  navigateTo(page) {
    Object.values(this.pages).forEach(p => p.classList.remove('active'));
    this.pages[page].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ========== 景点详情抽屉 ========== */

  showSceneDrawer(scene) {
    const drawer = document.querySelector('#scene-drawer');
    const backdrop = document.querySelector('.backdrop');
    if (!drawer || !backdrop) return;

    drawer.classList.add('open');
    backdrop.classList.remove('hidden');

    drawer.querySelector('[data-scene-title]').textContent = scene.title || '未知景点';
    drawer.querySelector('[data-scene-desc]').textContent =
      scene.desc || '这里将展示该景点的文化信息与诗词';
    if (drawer.querySelector('[data-scene-img]'))
      drawer.querySelector('[data-scene-img]').src = scene.image || '';
  }

  closeSceneDrawer() {
    const drawer = document.querySelector('#scene-drawer');
    const backdrop = document.querySelector('.backdrop');
    if (!drawer || !backdrop) return;

    drawer.classList.remove('open');
    backdrop.classList.add('hidden');
  }

  bindDrawerClose() {
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-close-drawer]');
      if (c) this.closeSceneDrawer();
    });
  }
}
