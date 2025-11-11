import {
    ApiError,
    createComment,
    deleteComment,
    fetchComments,
    likeComment,
    reportComment,
    unlikeComment,
} from './api.js';
import {
    clearAuthSession,
    ensureAuthenticated,
    initAuthUI,
    setupAuthModalControls,
    showToast,
} from './auth.js';
import { resolveAssetUrl } from '../config/assets.js';

const DEFAULT_SCENIC_IMAGE = resolveAssetUrl('assets/spots/Beijing_Gugong.avif');

function resolveSceneImages(list) {
    const resolved = (Array.isArray(list) ? list : [])
        .map((entry) => {
            if (typeof entry !== 'string' || !entry.trim()) return null;
            return resolveAssetUrl(entry);
        })
        .filter(Boolean);

    if (resolved.length === 0 && DEFAULT_SCENIC_IMAGE) {
        return [DEFAULT_SCENIC_IMAGE];
    }
    return resolved;
}

const scenicData = {
    '故宫': {
        desc: '故宫是明清两代的皇家宫殿，见证了中国数百年的历史变迁。',
        images: ['assets/spots/Beijing_Gugong.avif'],
    },
    '长城': {
        desc: '长城是中国古代伟大的防御工程，蜿蜒于群山之间，气势磅礴。',
        images: ['assets/spots/Beijing_Badaling.avif'],
    },
    '颐和园': {
        desc: '颐和园以其精美的园林设计和丰富的历史文化闻名于世。',
        images: ['assets/spots/Beijing-summer-palace.avif'],
    },
    '天津之眼': {
        desc: '天津之眼是世界上唯一一座建在桥上的摩天轮，俯瞰海河美景。',
        images: ['assets/spots/Tianjin-the-ferris-wheel.avif'],
    },
    '意大利风情区': {
        desc: '天津意大利风情区融合了欧洲建筑风格，展现独特的历史魅力。',
        images: ['assets/spots/Tianjin-Italian.avif'],
    },
    '避暑山庄': {
        desc: '避暑山庄是清代皇帝的夏季行宫，以其宏伟的建筑和优美的自然景观著称。',
        images: ['assets/spots/Hebei-bishushanzhuang.avif'],
    },
    '赵州桥': {
        desc: '赵州桥是世界上现存最古老的敞肩石拱桥，体现了古代中国高超的建筑技艺。',
        images: ['assets/spots/Hebei-ZhaozhouBridge.avif'],
    },
    '外滩': {
        desc: '外滩坐落于上海黄浦江畔，是最具代表性的城市风景线之一。',
        images: ['assets/spots/Shanghai-waitan.avif'],
    },
    '东方明珠': {
        desc: '东方明珠塔是上海的标志性建筑，融合了现代科技与传统文化元素。',
        images: ['assets/spots/Shanghai-dongfangmingzhu.avif'],
    },
    '豫园': {
        desc: '豫园是典型的江南古典园林，以其精致的布局和丰富的文化内涵著称。',
        images: ['assets/spots/Shanghai-yuyuan.avif'],
    },
    '广州塔': {
        desc: '广州塔，又称“小蛮腰”，是中国最高的电视塔之一。',
        images: ['assets/spots/Beijing_Gugong.avif'],
    },
    默认: {
        desc: '这是一处美丽的风景，等待你探索更多故事。',
        images: ['assets/spots/Beijing_Gugong.avif'],
    },
};

const state = {
    sceneName: '未知景点',
    comments: [],
    carousel: {
        images: [],
        current: 0,
    },
};

const elements = {};

document.addEventListener('DOMContentLoaded', initPage);

async function initPage() {
    await loadIncludes();
    setupAuthModalControls();
    initAuthUI();
    cacheElements();
    setupSceneInfo();
    setupCarousel();
    setupImageOverlay();
    bindCommentEvents();
    await refreshComments();
}

async function loadIncludes() {
    const hosts = document.querySelectorAll('[include-html]');
    const tasks = Array.from(hosts).map(async (el) => {
        const file = el.getAttribute('include-html');
        if (!file) return;
        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`无法加载 ${file}`);
            el.innerHTML = await response.text();
        } catch (error) {
            console.error('[Include] 加载失败:', file, error);
            el.innerHTML = `<!-- 加载失败：${file} -->`;
        }
    });
    await Promise.all(tasks);
}

function cacheElements() {
    elements.title = document.getElementById('spot-title');
    elements.name = document.getElementById('spot-name');
    elements.desc = document.getElementById('spot-desc');
    elements.track = document.getElementById('carousel-track');
    elements.prev = document.getElementById('prev');
    elements.next = document.getElementById('next');
    elements.commentList = document.getElementById('comment-list');
    elements.commentInput = document.getElementById('comment-text');
    elements.submitComment = document.getElementById('submit-comment');
}

function setupSceneInfo() {
    const params = new URLSearchParams(window.location.search);
    const rawName = params.get('spot') || '未知景点';
    state.sceneName = rawName;

    const info = scenicData[rawName] || scenicData.默认;
    const resolvedImages = resolveSceneImages(info.images);
    state.carousel.images = resolvedImages.length
        ? resolvedImages
        : resolveSceneImages(scenicData.默认.images);
    state.carousel.current = 0;

    if (elements.title) elements.title.textContent = rawName;
    if (elements.name) elements.name.textContent = rawName;
    if (elements.desc) elements.desc.textContent = info.desc;
}

function setupCarousel() {
    if (!elements.track) return;

    elements.track.innerHTML = state.carousel.images
        .map((src) => `<div class="carousel-item"><img src="${src}" alt="${state.sceneName}"></div>`)
        .join('');

    updateCarousel();

    if (elements.prev) {
        elements.prev.onclick = () => {
            const max = state.carousel.images.length;
            if (!max) return;
            state.carousel.current = (state.carousel.current - 1 + max) % max;
            updateCarousel();
        };
    }

    if (elements.next) {
        elements.next.onclick = () => {
            const max = state.carousel.images.length;
            if (!max) return;
            state.carousel.current = (state.carousel.current + 1) % max;
            updateCarousel();
        };
    }

    if (state.carousel.images.length <= 1) {
        if (elements.prev) elements.prev.style.display = 'none';
        if (elements.next) elements.next.style.display = 'none';
    }
}

function updateCarousel() {
    if (!elements.track) return;
    elements.track.style.transform = `translateX(-${state.carousel.current * 100}%)`;
}

function setupImageOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'image-overlay';
    const bigImg = document.createElement('img');
    overlay.appendChild(bigImg);
    document.body.appendChild(overlay);

    document.addEventListener('click', (event) => {
        const target = event.target;
        if (target instanceof HTMLImageElement && target.closest('.carousel-item')) {
            bigImg.src = target.src;
            overlay.style.display = 'flex';
        }
    });

    overlay.addEventListener('click', () => {
        overlay.style.display = 'none';
    });
}

function bindCommentEvents() {
    if (elements.submitComment) {
        elements.submitComment.addEventListener('click', handleSubmitComment);
    }

    if (elements.commentList) {
        elements.commentList.addEventListener('click', handleCommentAction);
    }
}

async function refreshComments() {
    if (!elements.commentList) return;
    try {
        const comments = await fetchComments({ sceneSlug: state.sceneName });
        state.comments = Array.isArray(comments) ? comments : [];
        renderComments();
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
            elements.commentList.innerHTML = '<div class="no-comments">暂未收录该景点的评论。</div>';
            return;
        }
        handleApiError(error, '评论获取失败，请稍后重试', { suppressAlert: true });
        elements.commentList.innerHTML = '<div class="no-comments">评论加载失败，请稍后再试。</div>';
    }
}

function renderComments() {
    if (!elements.commentList) return;
    if (!state.comments.length) {
        elements.commentList.innerHTML = '<div class="no-comments">暂无评论，快来抢沙发吧！</div>';
        return;
    }

    const html = state.comments.map(renderCommentNode).join('');
    elements.commentList.innerHTML = html;
}

function renderCommentNode(node) {
    if (!node) return '';
    const nickname = escapeHtml(node.user?.nickname || '游客');
    const content = escapeHtml(node.content || '').replace(/\n/g, '<br>');
    const createdAt = formatDate(node.createdAt);
    const liked = node.liked ? 'true' : 'false';
    const likeLabel = node.liked ? '❤ 已赞' : '❤ 点赞';
    const ownComment = isOwnComment(node);
    const replies = Array.isArray(node.replies) && node.replies.length > 0
        ? `<div class="reply-list">${node.replies.map(renderCommentNode).join('')}</div>`
        : '';

    return `
    <div class="comment" data-id="${node.id}">
      <div class="comment-header">
        <span>${nickname}</span>
        <span>${createdAt}</span>
      </div>
      <p>${content}</p>
      <div class="comment-actions">
        <button class="comment-action" data-action="like" data-id="${node.id}" data-liked="${liked}">${likeLabel} ${node.likes ?? 0}</button>
        <button class="comment-action" data-action="reply" data-id="${node.id}">回复</button>
        <button class="comment-action" data-action="report" data-id="${node.id}">举报</button>
        ${ownComment ? `<button class="comment-action" data-action="delete" data-id="${node.id}">删除</button>` : ''}
      </div>
      <div class="reply-box hidden" data-reply-for="${node.id}">
        <textarea class="reply-input" data-reply-input="${node.id}" placeholder="回复..."></textarea>
        <button class="submit-reply" data-action="submit-reply" data-id="${node.id}">发布回复</button>
      </div>
      ${replies}
    </div>
  `;
}

async function handleSubmitComment() {
    if (!elements.commentInput) return;
    const content = elements.commentInput.value.trim();
    if (!content) {
        showToast('请输入评论内容', { type: 'warning' });
        return;
    }

    if (!ensureAuthenticated({ message: '请先登录以发表评论' })) return;

    try {
        await createComment({ sceneSlug: state.sceneName }, content);
        elements.commentInput.value = '';
        await refreshComments();
        showToast('评论已发布', { type: 'success' });
    } catch (error) {
        handleApiError(error, '发表评论失败，请稍后再试');
    }
}

function handleCommentAction(event) {
    const button = event.target.closest('button[data-action]');
    if (!button) return;

    const action = button.dataset.action;
    const commentId = Number(button.dataset.id);
    if (!commentId) return;

    switch (action) {
        case 'like':
            toggleCommentLike(commentId);
            break;
        case 'reply':
            toggleReplyBox(commentId);
            break;
        case 'submit-reply':
            submitReply(commentId);
            break;
        case 'report':
            reportCommentHandler(commentId);
            break;
        case 'delete':
            deleteCommentHandler(commentId);
            break;
        default:
            break;
    }
}

async function toggleCommentLike(commentId) {
    const node = findCommentById(commentId);
    if (!node) return;

    if (!ensureAuthenticated({ message: '请先登录以点赞评论' })) return;

    try {
        if (node.liked) {
            const response = await unlikeComment(commentId);
            node.liked = false;
            if (typeof response?.likes === 'number') {
                node.likes = response.likes;
            } else {
                node.likes = Math.max(0, (node.likes ?? 0) - 1);
            }
        } else {
            const response = await likeComment(commentId);
            node.liked = true;
            if (typeof response?.likes === 'number') {
                node.likes = response.likes;
            } else {
                node.likes = (node.likes ?? 0) + 1;
            }
        }
        renderComments();
    } catch (error) {
        handleApiError(error, '操作失败，请稍后重试');
    }
}

function toggleReplyBox(commentId) {
    const box = document.querySelector(`.reply-box[data-reply-for="${commentId}"]`);
    if (!box) return;
    box.classList.toggle('hidden');
}

async function submitReply(commentId) {
    const box = document.querySelector(`.reply-box[data-reply-for="${commentId}"]`);
    if (!box) return;
    const textarea = box.querySelector('textarea');
    const content = textarea?.value.trim();
    if (!content) {
        showToast('请输入回复内容', { type: 'warning' });
        return;
    }

    if (!ensureAuthenticated({ message: '请先登录以回复评论' })) return;

    try {
        await createComment({ sceneSlug: state.sceneName }, content, commentId);
        textarea.value = '';
        box.classList.add('hidden');
        await refreshComments();
        showToast('回复已发布', { type: 'success' });
    } catch (error) {
        handleApiError(error, '回复失败，请稍后再试');
    }
}

async function reportCommentHandler(commentId) {
    if (!ensureAuthenticated({ message: '请先登录以举报评论' })) return;

    const reason = prompt('请输入举报理由（可选）：') || undefined;
    try {
        await reportComment(commentId, reason);
        showToast('感谢您的反馈，我们会尽快处理', { type: 'success' });
    } catch (error) {
        handleApiError(error, '举报失败，请稍后再试');
    }
}

async function deleteCommentHandler(commentId) {
    const node = findCommentById(commentId);
    if (!node) return;
    if (!isOwnComment(node)) {
        showToast('只能删除自己发表的评论', { type: 'warning' });
        return;
    }

    if (!ensureAuthenticated({ message: '请先登录以删除评论' })) return;

    const confirmed = confirm('确定删除这条评论吗？');
    if (!confirmed) return;

    try {
        await deleteComment(commentId);
        await refreshComments();
        showToast('评论已删除', { type: 'info' });
    } catch (error) {
        handleApiError(error, '删除失败，请稍后再试');
    }
}

function findCommentById(id, list = state.comments) {
    for (const comment of list) {
        if (comment.id === id) return comment;
        if (Array.isArray(comment.replies) && comment.replies.length) {
            const found = findCommentById(id, comment.replies);
            if (found) return found;
        }
    }
    return null;
}

function getCurrentUser() {
    try {
        const raw = localStorage.getItem('user');
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        console.warn('解析用户信息失败:', error);
        return null;
    }
}

function isOwnComment(node) {
    const user = getCurrentUser();
    if (!user || !node?.user) return false;
    return Number(user.id) === Number(node.user.id);
}

function escapeHtml(str) {
    return String(str ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(input) {
    if (!input) return '';
    const date = new Date(input);
    if (Number.isNaN(date.getTime())) return String(input);
    return date.toLocaleString('zh-CN', { hour12: false });
}

function handleApiError(error, fallbackMessage, options = {}) {
    const { suppressAlert = false } = options;
    if (!error) return;

    const isAuthError = (error instanceof ApiError && error.code === 'AUTH_REQUIRED') || error?.status === 401;
    if (isAuthError) {
        clearAuthSession();
        if (!suppressAlert) {
            ensureAuthenticated({ message: '请先登录以继续...' });
        }
        return;
    }

    console.warn('API 请求失败:', error);
    if (suppressAlert) return;

    const message = (fallbackMessage && String(fallbackMessage).trim())
        || (error?.message && String(error.message).trim())
        || '操作失败，请稍后再试';
    if (message) {
        showToast(message, { type: 'error' });
    }
}
