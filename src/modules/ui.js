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

    // 初始化弹窗与抽屉的事件
    this.bindAuthButtons();
    this.bindDrawerClose();
  }

  /* 页面切换 */
  navigateTo(page) {
    Object.values(this.pages).forEach(p => p.classList.remove('active'));
    this.pages[page].classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ========== 登录注册弹窗 ========== */

  bindAuthButtons() {
    const loginBtns = document.querySelectorAll('.btn-open-auth');
    loginBtns.forEach(btn => {
      btn.addEventListener('click', () => this.openAuthModal('login'));
    });

    // 切换 tab 或关闭
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-open-auth]');
      if (t) {
        const tab = t.getAttribute('data-open-auth');
        this.switchAuthTab(tab);
      }

      const close = e.target.closest('[data-close-auth]');
      if (close) this.closeAuthModal();
    });
  }

  openAuthModal(tab = 'login') {
    const modal = document.querySelector('#auth-modal');
    const backdrop = document.querySelector('.backdrop');
    if (!modal || !backdrop) return;

    modal.classList.add('show');
    backdrop.classList.remove('hidden');
    this.switchAuthTab(tab);
  }

  closeAuthModal() {
    const modal = document.querySelector('#auth-modal');
    const backdrop = document.querySelector('.backdrop');
    if (!modal || !backdrop) return;

    modal.classList.remove('show');
    backdrop.classList.add('hidden');
  }

  switchAuthTab(tab) {
    const tabs = document.querySelectorAll('.auth-tabs button');
    const panes = document.querySelectorAll('.auth-pane');

    tabs.forEach(b => b.classList.remove('active'));
    panes.forEach(p => p.classList.add('hidden'));

    const activeBtn = document.querySelector(`.auth-tabs button[data-tab="${tab}"]`);
    const activePane = document.querySelector(`.auth-pane[data-pane="${tab}"]`);

    if (activeBtn) activeBtn.classList.add('active');
    if (activePane) activePane.classList.remove('hidden');
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
