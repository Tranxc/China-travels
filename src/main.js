import { initAuthUI } from './modules/auth.js';
import { UIManager } from './modules/ui.js';

window.addEventListener('DOMContentLoaded', async () => {
  await mountComponents();
  const ui = new UIManager();
  ui.init();

  // 初始化认证模块
  initAuthUI();
});

async function mountComponents() {
  const container = document.querySelector('#modals');
  if (container) {
    const html = await fetch('./src/components/auth-modal.html').then(r => r.text());
    container.innerHTML = html;

    // 组件加载后,再次初始化认证UI
    setTimeout(() => initAuthUI(), 100);
  }
}
