import { addFavorite, ApiError, fetchFavorites, fetchScene, removeFavorite, submitSceneVote } from './api.js';
import { clearAuthSession, ensureAuthenticated, getAuthToken, showToast } from './auth.js';
import { resolveAssetUrl } from '../config/assets.js';
import { PROVINCE_METADATA } from '../data/provinces.js';
import { PROVINCE_TAGLINES, DEFAULT_PROVINCE_TAGLINE } from '../data/province-taglines.js';
import { PROVINCE_CAPITALS } from '../data/province-capitals.js';
import { SCENES as STATIC_SCENES } from '../../scripts/scenes-data.js';

const PROVINCE_CENTERS = {};
const PROVINCE_KEYWORD_MAP = {};
const PROVINCE_LABEL_DATA = [];

PROVINCE_METADATA.forEach((province) => {
  const { name, center, labelCenter, searchKeys = [] } = province;
  PROVINCE_CENTERS[name] = center;
  PROVINCE_LABEL_DATA.push({ name, center: labelCenter || center });
  const keywords = new Set([name, ...searchKeys]);
  keywords.forEach((keyword) => {
    PROVINCE_KEYWORD_MAP[keyword] = name;
  });
});

const ALL_SEARCH_KEYWORDS = Object.keys(PROVINCE_KEYWORD_MAP);
const SMALL_PROVINCES = new Set(['上海市', '北京市', '天津市', '香港特别行政区', '澳门特别行政区', '海南省']);

const STATIC_SCENE_LIST = Array.isArray(STATIC_SCENES) ? STATIC_SCENES : [];
const STATIC_SCENES_BY_PROVINCE = new Map();
const STATIC_SCENE_LOOKUP = new Map();
const STATIC_SCENE_KEYWORDS = {};

STATIC_SCENE_LIST.forEach((scene) => {
  if (!scene) return;
  const slug = String(scene.slug || scene.sceneSlug || scene.name || '').trim();
  const name = String(scene.name || slug || '').trim() || '未知景点';
  const province = String(scene.province || '').trim() || '未分类';
  const coverPath = scene.cover_url || scene.coverUrl || '';
  const entry = {
    ...scene,
    name,
    slug: slug || name,
    province,
    img: coverPath ? resolveAssetUrl(coverPath) : DEFAULT_SCENE_IMAGE,
  };

  if (!STATIC_SCENES_BY_PROVINCE.has(province)) {
    STATIC_SCENES_BY_PROVINCE.set(province, []);
  }
  STATIC_SCENES_BY_PROVINCE.get(province).push(entry);

  if (entry.slug) STATIC_SCENE_LOOKUP.set(entry.slug, entry);
  if (entry.name) STATIC_SCENE_LOOKUP.set(entry.name, entry);

  if (entry.name) STATIC_SCENE_KEYWORDS[entry.name] = province;
  if (entry.slug) STATIC_SCENE_KEYWORDS[entry.slug] = province;
});

export class MapManager {
  constructor() {
    this.map = null;
    this.geoJsonLayer = null;
    this.currentLayer = 'normal';
    this.hoverProvince = null;
    this.favorites = new Set();
    this.votes = new Map();
    this.spotToProvince = { ...PROVINCE_KEYWORD_MAP };
    this.provinceCenters = { ...PROVINCE_CENTERS };
    this.allSearchKeys = [...ALL_SEARCH_KEYWORDS];
    this._onSmartSearchEvent = this.onSmartSearchEvent.bind(this);
    this.favoriteSpots = new Map();
    this._favoritesLoaded = false;
    this.scenesByProvince = new Map(STATIC_SCENES_BY_PROVINCE);
    this.sceneLookup = new Map(STATIC_SCENE_LOOKUP);
    this.extendSceneKeywords(STATIC_SCENE_KEYWORDS);
    this._carouselTimer = null;
    this._detailDrawerTimer = null;
  }

  /** 初始化地图 */
  async initMap() {
    await this.waitForAMap();

    this.map = new AMap.Map('map-container', {
      zoom: 5.2,
      center: [104.1954, 35.8617],
      viewMode: '3D',
      dragEnable: true,
      zoomEnable: true,
      rotateEnable: false,
      pitchEnable: false,
      limitBounds: new AMap.Bounds([73.5, 1.0], [135.0, 53.6]),
      zooms: [4, 11]
    });

    const baseLayer = new AMap.TileLayer({
      zIndex: 1,
      opacity: 1,
    });
    this.map.setLayers([baseLayer]);
    this.map.setFeatures(['bg', 'water', 'road']);
    this.map.setMapStyle('amap://styles/whitesmoke');
    this.applyChinaMask();

    this.bindDetailPanelEvents();
    this.bindInfoPanelEvents();
    this.loadPlugins();
    this.bindToolbarEvents();
    this.loadChinaProvinces(); 

    await this.syncFavorites();
  }

  waitForAMap() {
    return new Promise(resolve => {
      const check = () => window.AMap ? resolve() : setTimeout(check, 100);
      check();
    });
  }

  loadPlugins() {
    AMap.plugin(['AMap.ToolBar', 'AMap.Scale', 'AMap.ControlBar'], () => {
      this.map.addControl(new AMap.ToolBar());
      this.map.addControl(new AMap.Scale());
      this.map.addControl(new AMap.ControlBar());
    });
  }

  extendSceneKeywords(keywordMap = {}) {
    const entries = Object.entries(keywordMap || {});
    if (!entries.length) return;
    entries.forEach(([keyword, province]) => {
      if (!keyword) return;
      this.spotToProvince[keyword] = province;
    });
    this.allSearchKeys = Array.from(new Set([...this.allSearchKeys, ...entries.map(([keyword]) => keyword)]));
  }

  getScenesForProvince(name) {
    if (!name) return [];
    if (this.scenesByProvince && this.scenesByProvince.has(name)) {
      return this.scenesByProvince.get(name);
    }
    return STATIC_SCENES_BY_PROVINCE.get(name) || [];
  }

  getProvinceTagline(name) {
    if (!name) return DEFAULT_PROVINCE_TAGLINE;
    return PROVINCE_TAGLINES[name] || `${name} ${DEFAULT_PROVINCE_TAGLINE}`;
  }

  /** 统一处理搜索事件的监听器 */
  onSmartSearchEvent(e) {
    const kw = (e && e.detail && e.detail.keyword || '').trim();
    if (!kw) {
      showToast('请输入景点或省份名称', { type: 'warning' });
      return;
    }
    this.handleSmartSearch(kw);
  }

  /** 绑定工具栏事件 */
  bindToolbarEvents() {
    document.getElementById('layer-btn').onclick = () => this.toggleLayer();

    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    if (!this._smartSearchListenerAdded) {
      window.addEventListener('poemmap:search', this._onSmartSearchEvent);
      this._smartSearchListenerAdded = true;
    }

    searchBtn.addEventListener('click', () => {
      const keyword = searchInput.value.trim();
      window.dispatchEvent(new CustomEvent('poemmap:search', {
        detail: { keyword }
      }));
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const keyword = searchInput.value.trim();
        window.dispatchEvent(new CustomEvent('poemmap:search', {
          detail: { keyword }
        }));
      }
    });

    const suggestBox = document.createElement('ul');
    suggestBox.id = 'suggest-list';
    suggestBox.className = 'suggest-list hidden';
    searchInput.parentElement.appendChild(suggestBox);
    const helpBtn = document.getElementById('help-btn');
    const helpModal = document.getElementById('help-modal');
    const closeHelpBtn = document.getElementById('close-help-btn');

    if (helpBtn && helpModal && closeHelpBtn) {
      helpBtn.addEventListener('click', () => {
        helpModal.classList.remove('hidden');
      });

      closeHelpBtn.addEventListener('click', () => {
        helpModal.classList.add('hidden');
      });

      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) helpModal.classList.add('hidden');
      });
    }

    searchInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      this.showSuggestions(value, suggestBox);
    });

    suggestBox.addEventListener('click', (ev) => {
      const li = ev.target.closest('li');
      if (!li) return;
      const value = li.textContent.trim();
      searchInput.value = value;
      suggestBox.classList.add('hidden');
      window.dispatchEvent(new CustomEvent('poemmap:search', {
        detail: { keyword: value }
      }));
    });

    const favoritesBtn = document.getElementById('favorites-btn');
    const favoritesModal = document.getElementById('favorites-modal');
    const favoritesList = document.getElementById('favorites-list');
    const closeFavoritesBtn = document.getElementById('close-favorites-btn');

    if (favoritesBtn && favoritesModal && favoritesList && closeFavoritesBtn) {
      favoritesBtn.addEventListener('click', async () => {
        if (!ensureAuthenticated({ message: '请先登录以查看收藏列表' })) return;
        await this.syncFavorites();
        if (!getAuthToken()) return;
        const list = [...this.favoriteSpots.keys()];
        favoritesList.innerHTML = list.length
          ? list.map(n => `<li class="fav-item" data-spot="${n}">${n}</li>`).join('')
          : '<li style="color:#b58929;">暂无收藏，去详情页点“收藏景点”吧～</li>';
        favoritesModal.classList.remove('hidden');
      });

      closeFavoritesBtn.addEventListener('click', () => {
        favoritesModal.classList.add('hidden');
      });

      favoritesList.addEventListener('click', (e) => {
        const li = e.target.closest('.fav-item');
        if (!li) return;
        const spot = li.dataset.spot;
        const province = this.spotToProvince[spot];
        if (province) {
          this.handleSmartSearch(province);
        } else {
          showToast(`未找到 ${spot} 对应的省份映射`, { type: 'warning' });
        }
        favoritesModal.classList.add('hidden');
      });
    }
  }

  /** 图层切换（卫星/普通） */
  toggleLayer() {
    const next = this.currentLayer === 'normal' ? 'satellite' : 'normal';
    this.map.setLayers(next === 'satellite'
      ? [new AMap.TileLayer.Satellite()]
      : [new AMap.TileLayer()]);
    this.currentLayer = next;
  }



  /** 加载全国行政区图层 */
  loadChinaProvinces() {
    AMap.plugin('AMap.DistrictLayer', () => {
      // 创建全国行政区层
      const layer = new AMap.DistrictLayer.Country({
        zIndex: 10,
        SOC: 'CHN',
        depth: 1,
        styles: {
          fill: () => '#f8e8a6',
          'province-stroke': (props) => {
            if (this.favorites.has(props.NAME_CHN)) return '#d77f1f';
            if (this.hoverProvince === props.NAME_CHN) return '#c59b34 '; 
            return '#bcae6e'; 
          },
          'city-stroke': '#f6efc2',
          'county-stroke': '#f6efc2'
        }
      });


      layer.setMap(this.map);
      this.geoJsonLayer = layer;

      // 鼠标移动时捕获 hover 省份
      this.map.on('mousemove', (e) => {
        const feature = layer.getDistrictByContainer?.(e.pixel);
        if (!feature || !feature.length) {
          if (this.hoverProvince) {
            this.hoverProvince = null;
            layer.setStyles({
              fill: () => '#f8e8a6',
              'province-stroke': (props) => {
                if (this.favorites.has(props.NAME_CHN)) return '#d77f1f';
                if (this.hoverProvince === props.NAME_CHN) return '#c59b34  ';
                return '#bcae6e';
              },
              'city-stroke': '#f6efc2',
              'county-stroke': '#f6efc2'
            });
          }
          return;
        }
        const provinceName = feature[0].properties.NAME_CHN;
        if (provinceName !== this.hoverProvince) {
          this.hoverProvince = provinceName;
          layer.setStyles({
            fill: () => '#f8e8a6',
            'province-stroke': (props) => {
              if (this.favorites.has(props.NAME_CHN)) return '#d77f1f';
              if (this.hoverProvince === props.NAME_CHN) return '#c59b34 ';
              return '#bcae6e';
            },
            'city-stroke': '#f6efc2',
            'county-stroke': '#f6efc2'
          });
        }
      });

      // 鼠标移出地图时恢复默认
      this.map.on('mouseout', () => {
        if (this.hoverProvince) {
          this.hoverProvince = null;
          layer.setStyles({
            fill: () => '#f8e8a6',
            'province-stroke': (props) => {
              if (this.favorites.has(props.NAME_CHN)) return '#d77f1f';
              return '#bcae6e';
            },
            'city-stroke': '#f6efc2',
            'county-stroke': '#f6efc2'
          });
        }
      });
    });

    // 绑定地图双击放大事件
    this.map.on('dblclick', (e) => {
      const zoom = this.map.getZoom();
      this.map.setZoom(zoom + 1);
    });
    this.addProvinceLabels();
    this.addCapitalLabels();
  }


  /** 绑定信息窗关闭按钮事件 */
  bindInfoPanelEvents() {
    const panel = document.getElementById('marker-info-panel');
    const closeBtn = document.getElementById('close-info-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        panel.classList.remove('show');
        panel.classList.add('hidden');
      };
    }
  }

  async showDetailPanel(item = {}) {
    const panel = document.getElementById('detail-panel');
    if (!panel) return;

    const focusScene = item?.scene || null;
    const shouldDelayDrawer = this.hideMarkerInfoPanel();
    const drawerDelay = shouldDelayDrawer ? 200 : 60;
    this.queueDetailDrawer(panel, drawerDelay);

    const titleEl = document.getElementById('detail-title');
    if (titleEl) {
      titleEl.textContent = focusScene?.name || item.name;
    }

    const normalizeScene = (scene) => {
      if (!scene) return null;
      const name = scene.name || scene.slug || item.name;
      const slug = scene.slug || scene.name;
      const img = scene.img || resolveAssetUrl(scene.cover_url || scene.coverUrl || '');
      if (!name && !img) return null;
      return {
        ...scene,
        name,
        slug,
        img,
      };
    };

    const sourceScenes = focusScene ? [focusScene] : this.getScenesForProvince(item.name);
    const spots = (Array.isArray(sourceScenes) ? sourceScenes : [])
      .map(normalizeScene)
      .filter(Boolean);
    const track = document.getElementById('carousel-track');
    const caption = document.getElementById('carousel-caption');
    this.clearCarouselAutoPlay();

    if (spots.length === 0) {
      track.innerHTML = '<div class="carousel-item"><p>暂无景点数据</p></div>';
      caption.textContent = '';
      return;
    }

    // 填充图片项
    track.innerHTML = spots.map(s => `
  <div class="carousel-item" data-name="${s.name}" data-slug="${s.slug || ''}">
    <img src="${s.img}" alt="${s.name}">
  </div>
`).join('');

    let currentIndex = 0;
    caption.textContent = spots[currentIndex].name;

    // 绑定切换按钮
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');

    function updateCarousel() {
      track.style.transform = `translateX(-${currentIndex * 100}%)`;
      caption.textContent = spots[currentIndex].name;
    }

    // 左右切换
    prevBtn.onclick = () => {
      currentIndex = (currentIndex - 1 + spots.length) % spots.length;
      updateCarousel();
    };
    nextBtn.onclick = () => {
      currentIndex = (currentIndex + 1) % spots.length;
      updateCarousel();
    };

    const restartAutoPlay = () => {
      this.clearCarouselAutoPlay();
      if (spots.length <= 1) return;
      this._carouselTimer = setInterval(() => {
        currentIndex = (currentIndex + 1) % spots.length;
        updateCarousel();
      }, 4000);
    };
    restartAutoPlay();

    [prevBtn, nextBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        restartAutoPlay();
      });
    });

    // 当详情页关闭时清理定时器
    const closeBtn = document.getElementById('close-detail-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        this.cancelDetailDrawerTimer();
        this.clearCarouselAutoPlay();
        const panel = document.getElementById('detail-panel');
        panel.classList.remove('show');
        panel.classList.add('hidden');
      };
    }
    // ===== 收藏按钮 =====
    const favBtn = document.getElementById('favorite-spot-btn');

    // 用于根据 currentIndex 同步按钮文案
    const syncFavBtn = () => {
      if (!favBtn) return;
      const currentSpot = spots[currentIndex];
      const identifier = currentSpot?.slug || currentSpot?.name;
      if (!identifier) {
        favBtn.style.display = 'none';
        return;
      }
      favBtn.style.display = 'inline-block';
      const isFav = this.favoriteSpots.has(identifier);
      favBtn.textContent = isFav ? '取消收藏' : '收藏景点';
      favBtn.dataset.favorite = isFav ? 'true' : 'false';
    };

    // 点击切换收藏状态
    if (favBtn) {
      favBtn.onclick = async () => {
        const currentSpot = spots[currentIndex];
        const identifier = currentSpot?.slug || currentSpot?.name;
        const label = currentSpot?.name || identifier;
        if (!identifier) return;
        if (!ensureAuthenticated({ message: '请先登录以收藏景点' })) return;
        const wasFavorite = this.favoriteSpots.has(identifier);
        try {
          const nowFavorite = await this.toggleFavoriteSpot(identifier);
          favBtn.textContent = nowFavorite ? '取消收藏' : '收藏景点';
          showToast(nowFavorite ? `已收藏「${label}」` : `已取消收藏「${label}」`, {
            type: nowFavorite ? 'success' : 'info'
          });
        } catch (error) {
          this.handleRequestError(error, wasFavorite ? '取消收藏失败，请稍后重试' : '收藏失败，请稍后重试');
        }
        syncFavBtn();
      };
    }

    // 初始化 & 每次切换都刷新收藏文案
    syncFavBtn();
    prevBtn.addEventListener('click', syncFavBtn);
    nextBtn.addEventListener('click', syncFavBtn);

    // ====== 点赞/点踩逻辑（同步服务器统计） ======
    const likeBtn = document.getElementById('like-btn');
    const dislikeBtn = document.getElementById('dislike-btn');
    const likeCountEl = document.getElementById('like-count');
    const dislikeCountEl = document.getElementById('dislike-count');

    likeBtn.replaceWith(likeBtn);
    dislikeBtn.replaceWith(dislikeBtn);

    const newLikeBtn = document.getElementById('like-btn');
    const newDislikeBtn = document.getElementById('dislike-btn');

    const updateVoteUI = (state) => {
      likeCountEl.textContent = state.likes ?? 0;
      dislikeCountEl.textContent = state.dislikes ?? 0;
      newLikeBtn.classList.toggle('active', state.vote === 'like');
      newDislikeBtn.classList.toggle('active', state.vote === 'dislike');
    };

    const bindVoteButtons = async (spot) => {
      const identifier = spot?.slug || spot?.name;
      const label = spot?.name || identifier;
      if (!identifier) return;

      let data = this.votes.get(identifier);

      if (!data || !data.synced) {
        try {
          const scene = await fetchScene(this.getSceneIdentifier(identifier));
          if (scene) {
            data = {
              vote: data?.vote ?? null,
              likes: scene.likes_count ?? 0,
              dislikes: scene.dislikes_count ?? 0,
              synced: true,
            };
          }
        } catch (error) {
          this.handleRequestError(error, null, { suppressAlert: true });
        }

        if (!data) {
          data = { vote: null, likes: 0, dislikes: 0, synced: false };
        }

        this.votes.set(identifier, data);
      }

      updateVoteUI(data);

      const sendVote = async (action) => {
        if (!ensureAuthenticated({ message: '请先登录以评价景点' })) return;

        const previousVote = data.vote;
        try {
          const payload = await submitSceneVote(this.getSceneIdentifier(identifier), action);
          const scene = payload?.scene;
          const currentVote = payload?.currentVote || null;
          data = {
            vote: currentVote,
            likes: scene?.likes_count ?? data.likes,
            dislikes: scene?.dislikes_count ?? data.dislikes,
            synced: true,
          };
          this.votes.set(identifier, data);
          updateVoteUI(data);

          if (previousVote !== currentVote) {
            let toastMessage = '';
            let toastType = 'success';
            if (currentVote === 'like') {
              toastMessage = `已为「${label}」点了赞`;
              toastType = 'success';
            } else if (currentVote === 'dislike') {
              toastMessage = `已为「${label}」点了不喜欢`;
              toastType = 'warning';
            } else {
              toastMessage = `已撤销对「${label}」的评价`;
              toastType = 'info';
            }
            showToast(toastMessage, { type: toastType });
          }

          if (currentVote === 'like' && previousVote !== 'like') {
            this.showFloatingFeedback(newLikeBtn, '+1', '#c59b34 ');
          } else if (previousVote === 'like' && currentVote !== 'like') {
            this.showFloatingFeedback(newLikeBtn, '-1', '#999');
          }

          if (currentVote === 'dislike' && previousVote !== 'dislike') {
            this.showFloatingFeedback(newDislikeBtn, '+1', '#d96b6b');
          } else if (previousVote === 'dislike' && currentVote !== 'dislike') {
            this.showFloatingFeedback(newDislikeBtn, '-1', '#999');
          }
        } catch (error) {
          this.handleRequestError(error, '提交评价失败，请稍后重试');
        }
      };

      newLikeBtn.onclick = async () => {
        const current = this.votes.get(identifier) || data;
        const action = current.vote === 'like' ? 'clear' : 'like';
        await sendVote(action);
      };

      newDislikeBtn.onclick = async () => {
        const current = this.votes.get(identifier) || data;
        const action = current.vote === 'dislike' ? 'clear' : 'dislike';
        await sendVote(action);
      };
    };

    let currentSpot = spots[currentIndex] || { name: item.name };
    await bindVoteButtons(currentSpot);

    [prevBtn, nextBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        currentSpot = spots[currentIndex] || { name: item.name };
        bindVoteButtons(currentSpot);
      });
    });


    // 点击图片跳转到景点详情页
    track.querySelectorAll('.carousel-item').forEach((el, i) => {
      el.onclick = () => {
        const spot = spots[i];
        const identifier = spot?.slug || spot?.name;
        if (!identifier) return;
        window.location.href = `../../pages/scenic.html?spot=${encodeURIComponent(identifier)}`;
      };
    });

    const openDrawer = () => {
      this._detailDrawerTimer = null;
      this.openDetailDrawer(panel);
    };

    if (this._detailDrawerTimer) {
      clearTimeout(this._detailDrawerTimer);
      this._detailDrawerTimer = null;
    }

    if (shouldDelayDrawer) {
      this._detailDrawerTimer = setTimeout(openDrawer, 250);
    } else {
      openDrawer();
    }
  }

  clearCarouselAutoPlay() {
    if (this._carouselTimer) {
      clearInterval(this._carouselTimer);
      this._carouselTimer = null;
    }
  }

  hideMarkerInfoPanel(panel = document.getElementById('marker-info-panel')) {
    if (!panel) return false;
    const wasVisible = panel.classList.contains('show') && !panel.classList.contains('hidden');
    panel.classList.remove('show');
    panel.classList.add('hidden');
    return wasVisible;
  }

  openDetailDrawer(panel = document.getElementById('detail-panel')) {
    if (!panel) return;
    panel.classList.remove('show');
    panel.classList.remove('hidden');
    void panel.offsetWidth;
    panel.classList.add('show');
  }

  cancelDetailDrawerTimer() {
    if (this._detailDrawerTimer) {
      clearTimeout(this._detailDrawerTimer);
      this._detailDrawerTimer = null;
    }
  }

  queueDetailDrawer(panel, delay = 0) {
    if (!panel) return;
    this.cancelDetailDrawerTimer();
    const wait = Math.max(delay, 0);
    this._detailDrawerTimer = setTimeout(() => {
      this._detailDrawerTimer = null;
      this.openDetailDrawer(panel);
    }, wait);
  }

  bindDetailPanelEvents() {
    const panel = document.getElementById('detail-panel');
    const closeBtn = document.getElementById('close-detail-btn');
    const helpBtn = document.getElementById('detail-help-btn');
    const helpModal = document.getElementById('detail-help-modal');
    const closeHelpBtn = document.getElementById('close-detail-help-btn');

    if (closeBtn) {
      closeBtn.onclick = () => {
        panel.classList.remove('show');
        panel.classList.add('hidden');
      };
    }

    if (helpBtn && helpModal && closeHelpBtn) {
      helpBtn.onclick = () => helpModal.classList.remove('hidden');
      closeHelpBtn.onclick = () => helpModal.classList.add('hidden');
      helpModal.onclick = (e) => {
        if (e.target === helpModal) helpModal.classList.add('hidden');
      };
    }
  }

  showFloatingFeedback(element, text, color = '#c59b34 ') {
    const span = document.createElement('span');
    span.className = 'floating-feedback';
    span.textContent = text;
    span.style.left = element.offsetLeft + element.offsetWidth / 2 + 'px';
    span.style.top = element.offsetTop - 10 + 'px';
    span.style.color = color;
    element.parentElement.appendChild(span);
    setTimeout(() => span.remove(), 800);
  }

  addProvinceLabels() {
    const provinces = PROVINCE_LABEL_DATA;
    const labelLayer = new AMap.LabelsLayer({
      zIndex: 120,
      collision: true,
      zooms: [4.5, 20],
    });
    this.map.add(labelLayer);

    provinces.forEach(p => {
      const isSmall = SMALL_PROVINCES.has(p.name);
      const baseStyle = {
        fontSize: isSmall ? 11 : 13,
        fontWeight: 600,
        fillColor: '#2c2c2c',
        strokeColor: '#f8e8a6',
        strokeWidth: 2,
        backgroundColor: 'rgba(255,255,255,0.35)',
        padding: isSmall ? [1, 4] : [2, 6],
        borderRadius: 4,
        shadowColor: 'rgba(0,0,0,0.1)',
        shadowBlur: 2,
      };
      const labelMarker = new AMap.LabelMarker({
        position: p.center,
        text: {
          content: `${this.favorites.has(p.name) ? '⭐ ' : ''}${p.name}`,
          direction: 'center',
          offset: [0, isSmall ? -6 : -10],
          style: baseStyle,
        }
      });

      labelMarker.on('mouseover', () => {
        const text = labelMarker.getText();
        labelMarker.setText({
          content: text.content, 
          style: {
            ...text.style,
            fillColor: '#9b6bff',
            backgroundColor: 'rgba(255,255,255,0.55)',
            fontWeight: 700,
            strokeColor: '#fdf1d0',
            strokeWidth: 2
          }
        });
      });

      labelMarker.on('mouseout', () => {
        const text = labelMarker.getText();
        labelMarker.setText({
          content: text.content,
          style: {
            ...text.style,
            fillColor: '#2c2c2c',
            backgroundColor: 'rgba(255,255,255,0.35)',
            fontWeight: 600,
            strokeColor: '#f8e8a6',
            strokeWidth: 2
          }
        });
      });

      labelMarker.on('click', () => {
        const item = {
          name: p.name,
          position: p.center,
          info: this.getProvinceTagline(p.name)
        };

        const panel = document.getElementById('marker-info-panel');
        document.getElementById('info-title').textContent = item.name;
        document.getElementById('info-desc').textContent = item.info;

        let interestBtn = document.getElementById('interest-btn');
        if (!interestBtn) {
          interestBtn = document.createElement('button');
          interestBtn.id = 'interest-btn';
          interestBtn.className = 'interest-btn';
          panel.appendChild(interestBtn);
        }

        const syncInterestBtn = () => {
          interestBtn.textContent = this.favorites.has(p.name) ? '暂时不了' : '我感兴趣';
        };
        syncInterestBtn();

        interestBtn.onclick = () => {
          if (this.favorites.has(p.name)) {
            this.favorites.delete(p.name);
            this.updateProvinceHighlight(p.name, false);
            this.updateProvinceLabel(p.name);
          } else {
            this.favorites.add(p.name);
            this.updateProvinceHighlight(p.name, true);
            this.updateProvinceLabel(p.name);
          }
          syncInterestBtn();
        };

        // “查看详情”按钮逻辑
        const detailBtn = document.getElementById('detail-btn');
        detailBtn.onclick = () => this.showDetailPanel(item);

        panel.classList.remove('hidden');
        panel.classList.add('show');
      });


      labelLayer.add(labelMarker);
    });

    this.provinceLabelLayer = labelLayer;
  }

  updateProvinceHighlight(provinceName, highlight) {
    if (!this.geoJsonLayer) return;
    const layer = this.geoJsonLayer;

    layer.setStyles({
      fill: () => '#f8e8a6', 
      'province-stroke': (props) => {
        if (this.favorites.has(props.NAME_CHN)) {
          return '#ff9b00';
        }
        if (this.hoverProvince === props.NAME_CHN) {
          return '#c59b34 ';
        }
        return '#999';
      },
      'city-stroke': '#f6efc2',
      'county-stroke': '#f6efc2'
    });
  }

  addCapitalLabels() {
    if (!this.map) return;
    const layer = new AMap.LabelsLayer({
      zIndex: 140,
      collision: true,
      zooms: [6, 20],
    });
    this.map.add(layer);
    this.capitalLabelLayer = layer;

    const markers = PROVINCE_CAPITALS.map((cap) => new AMap.LabelMarker({
      position: cap.position,
      text: {
        content: cap.name,
        direction: 'center',
        offset: [0, -6],
        style: {
          fontSize: 11,
          fontWeight: 600,
          fillColor: '#5b3d0d',
          strokeColor: '#fdf1d0',
          strokeWidth: 2,
          backgroundColor: 'rgba(255,255,255,0.35)',
          padding: [1, 4],
          borderRadius: 3,
          shadowColor: 'rgba(0,0,0,0.12)',
          shadowBlur: 2,
        }
      }
    }));

    layer.add(markers);

    const syncVisibility = () => {
      const zoom = this.map.getZoom();
      if (zoom >= 6.5) {
        layer.show();
      } else {
        layer.hide();
      }
    };

    syncVisibility();
    this.map.on('zoomend', syncVisibility);
  }

  applyChinaMask() {
    AMap.plugin('AMap.DistrictSearch', () => {
      const search = new AMap.DistrictSearch({
        level: 'country',
        extensions: 'all',
        subdistrict: 0,
      });
      search.search('中国', (status, result) => {
        if (status !== 'complete') return;
        const boundaries = result.districtList?.[0]?.boundaries;
        if (!Array.isArray(boundaries) || !boundaries.length) return;
        this.map.setMask(boundaries);
        if (!this.outerMaskLayer) {
          this.outerMaskLayer = new AMap.TileLayer({
            zIndex: 2,
            opacity: 1,
          });
          this.outerMaskLayer.setMap(this.map);
        }
      });
    });
  }


  /** 更新省份文字标签（用于显示收藏星标） */
  updateProvinceLabel(name) {
    if (!this.provinceLabelLayer) return;

    this.provinceLabelLayer.getAllOverlays().forEach(marker => {
      const txt = marker.getText();
      if (txt && txt.content.includes(name)) {
        marker.setText({
          content: `${this.favorites.has(name) ? "⭐ " : ""}${name}`,
        });
      }
    });

  }

  handleSmartSearch(keyword) {
    if (!keyword) {
      showToast('请输入景点或省份名称', { type: 'warning' });
      return;
    }

    // 先尝试匹配景点所属省份
    let province = this.spotToProvince[keyword];
    if (!province) {
      // 若用户输入的是省份名本身
      province = Object.values(this.spotToProvince).find(p => p === keyword)
        ? keyword : null;
    }

    if (!province) {
      showToast('未找到相关景点或省份，请重新输入', { type: 'warning' });
      return;
    }

    const center = this.provinceCenters?.[province];
    if (!center) {
      showToast(`暂未定义 ${province} 的中心坐标`, { type: 'warning' });
      return;
    }

    this.map.setZoomAndCenter(8.5, center);
    this.hoverProvince = province;
    if (this.geoJsonLayer) {
      this.geoJsonLayer.setStyles({
        fill: () => '#f8e8a6',
        'province-stroke': (props) => {
          if (this.favorites?.has(props.NAME_CHN)) return '#d77f1f';
          if (this.hoverProvince === props.NAME_CHN) return '#c59b34 ';
          return '#bcae6e';
        },
        'city-stroke': '#f6efc2',
        'county-stroke': '#f6efc2'
      });
    }

    const panel = document.getElementById('marker-info-panel');
    document.getElementById('info-title').textContent = province;
    document.getElementById('info-desc').textContent = this.getProvinceTagline(province);

    const detailBtn = document.getElementById('detail-btn');
    detailBtn.onclick = () => this.showDetailPanel({ name: province, position: center });

    panel.classList.remove('hidden');
    panel.classList.add('show');
  }

  /** 自动补全功能 */
  showSuggestions(keyword, listEl) {
    if (!keyword) {
      listEl.classList.add('hidden');
      return;
    }

    // 获取所有关键词（景点 + 省份）
    const keywordPool = this.allSearchKeys?.length ? this.allSearchKeys : Object.keys(this.spotToProvince || {});
    const provinceNames = Object.keys(this.provinceCenters || {});
    const allKeys = Array.from(new Set([...keywordPool, ...provinceNames]));

    // 模糊匹配前 8 个
    const results = allKeys.filter(k => k.includes(keyword)).slice(0, 8);

    if (results.length === 0) {
      listEl.classList.add('hidden');
      return;
    }

    // 渲染建议列表
    listEl.innerHTML = results.map(k => `<li>${k}</li>`).join('');
    listEl.classList.remove('hidden');

    // 点击建议项执行搜索
    listEl.querySelectorAll('li').forEach(li => {
      li.onclick = () => {
        const value = li.textContent.trim();
        document.getElementById('search-input').value = value;
        listEl.classList.add('hidden');
        window.dispatchEvent(new CustomEvent('poemmap:search', {
          detail: { keyword: value }
        }));
      };
    });
  }

  /** 执行搜索 */
  handleSearch(keyword) {
    const term = (keyword || '').trim();
    if (!term) {
      showToast('请输入景点或省份名称', { type: 'warning' });
      return;
    }

    const matchedScene = this.sceneLookup.get(term) || null;

    let province = this.spotToProvince[term];
    if (!province) {
      province = Object.values(this.spotToProvince).includes(term) ? term : null;
    }

    if (!province && matchedScene?.province) {
      province = matchedScene.province;
    }

    if (!province) {
      showToast('未找到相关景点或省份', { type: 'warning' });
      return;
    }

    const center = this.provinceCenters?.[province];
    if (!center) {
      showToast(`暂未定义 ${province} 的坐标`, { type: 'warning' });
      return;
    }

    // 地图移动并放大
    this.map.setZoomAndCenter(8.5, center);
    this.hoverProvince = province;
    if (this.geoJsonLayer) {
      this.geoJsonLayer.setStyles({
        fill: () => '#f8e8a6',
        'province-stroke': (props) => {
          if (this.favorites?.has(props.NAME_CHN)) return '#d77f1f';
          if (this.hoverProvince === props.NAME_CHN) return '#c59b34 ';
          return '#bcae6e';
        },
        'city-stroke': '#f6efc2',
        'county-stroke': '#f6efc2'
      });
    }

    // 打开右侧信息面板
    const panel = document.getElementById('marker-info-panel');
    const infoTitle = document.getElementById('info-title');
    const infoDesc = document.getElementById('info-desc');
    if (matchedScene && infoTitle && infoDesc) {
      infoTitle.textContent = matchedScene.name || province;
      infoDesc.textContent = matchedScene.summary || this.getProvinceTagline(province);
    } else {
      if (infoTitle) infoTitle.textContent = province;
      if (infoDesc) infoDesc.textContent = this.getProvinceTagline(province);
    }

    const detailBtn = document.getElementById('detail-btn');
    detailBtn.onclick = () => this.showDetailPanel({ name: province, position: center, scene: matchedScene || null });

    panel.classList.remove('hidden');
    panel.classList.add('show');
  }
  async syncFavorites() {
    const token = getAuthToken();
    if (!token) {
      if (this.favoriteSpots.size > 0) {
        this.favoriteSpots.clear();
      }
      this._favoritesLoaded = true;
      return;
    }

    try {
      const favorites = await fetchFavorites();
      this.favoriteSpots.clear();
      favorites.forEach(item => {
        const key = (item?.sceneSlug || item?.slug || item?.name || '').trim();
        if (!key) return;
        this.favoriteSpots.set(key, item);
      });
      this._favoritesLoaded = true;
    } catch (error) {
      this.handleRequestError(error, null, { suppressAlert: true });
    }
  }

  async toggleFavoriteSpot(scene) {
    const key = this.getSceneKey(scene);
    if (!key) return false;
    const identifier = this.getSceneIdentifier(key);
    const isFavorite = this.favoriteSpots.has(key);

    if (isFavorite) {
      await removeFavorite(identifier);
      this.favoriteSpots.delete(key);
      return false;
    }

    const favorite = await addFavorite(identifier);
    if (favorite) {
      this.favoriteSpots.set(key, favorite);
    } else {
      this.favoriteSpots.set(key, { name: key, slug: key });
    }
    return true;
  }

  getSceneIdentifier(scene) {
    const slug = this.getSceneKey(scene);
    if (!slug) return {};
    return { sceneSlug: slug };
  }

  getSceneKey(scene) {
    if (!scene) return '';
    if (typeof scene === 'string') return scene.trim();
    if (typeof scene === 'object') {
      return String(scene.slug || scene.sceneSlug || scene.name || '').trim();
    }
    return '';
  }

  handleRequestError(error, fallbackMessage, options = {}) {
    const { suppressAlert = false } = options || {};
    if (!error) return;

    const isAuthError = (error instanceof ApiError && error.code === 'AUTH_REQUIRED') || error?.status === 401;
    if (isAuthError) {
      clearAuthSession();
      if (!suppressAlert) {
        ensureAuthenticated({ message: '请先登录以继续...' });
      }
      return;
    }

    console.warn('API request error:', error);
    if (suppressAlert) return;

    const message = (fallbackMessage && String(fallbackMessage).trim()) || (error?.message && String(error.message).trim()) || '操作失败，请稍后再试';
    if (message) {
      showToast(message, { type: 'error' });
    }
  }
}
