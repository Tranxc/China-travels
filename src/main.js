import { initAuthUI, setupAuthModalControls } from './modules/auth.js';
import { UIManager } from './modules/ui.js';

// 等待页面完全加载后再初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

async function init() {
  // 等待 include-html 加载完成
  await waitForAuthModal();

  // 设置模态框打开/关闭
  setupAuthModalControls();

  // 初始化 UI
  const ui = new UIManager();
  ui.init();

  // 初始化认证模块
  initAuthUI();
}

// 等待认证模态框加载完成
function waitForAuthModal() {
  return new Promise((resolve) => {
    const checkModal = () => {
      const modal = document.getElementById('auth-modal');
      if (modal) {
        resolve();
      } else {
        setTimeout(checkModal, 100);
      }
    };
    checkModal();
  });
}
