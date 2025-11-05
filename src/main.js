import { UIManager } from './modules/ui.js';

window.addEventListener('DOMContentLoaded', async () => {
  await mountComponents();
  const ui = new UIManager();
  ui.init();
  initAuthModalEvents();
});

async function mountComponents() {
  const container = document.querySelector('#modals');
  if (container) {
    const html = await fetch('./src/components/auth-modal.html').then(r => r.text());
    container.innerHTML = html;
  }
}

function initAuthModalEvents() {
  const modal = document.getElementById('auth-modal');
  const backdrop = document.querySelector('.backdrop');

  const showModal = () => {
    modal.classList.remove('hidden');
    backdrop.classList.remove('hidden');
  };

  const hideModal = () => {
    modal.classList.add('hidden');
    backdrop.classList.add('hidden');
  };

  document.addEventListener('click', (e) => {
    if (e.target.id === 'login-btn') showModal();
    if (e.target.closest('[data-close-auth]') || e.target === backdrop) hideModal();

    const tab = e.target.closest('.auth-tabs button');
    if (tab && modal) {
      modal.querySelectorAll('.auth-tabs button').forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      modal.querySelectorAll('.auth-pane').forEach(pane => {
        pane.classList.toggle('hidden', pane.dataset.pane !== tab.dataset.tab);
      });
    }
  });

  document.addEventListener('submit', (e) => {
    if (e.target.id === 'login-form' || e.target.id === 'register-form') {
      e.preventDefault();
      const type = e.target.id === 'login-form' ? '登录' : '注册';
      alert(`${type}成功！（示例逻辑）`);
      hideModal();
    }
  });
}
