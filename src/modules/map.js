import { addFavorite, ApiError, fetchFavorites, fetchScene, removeFavorite, submitSceneVote } from './api.js';
import { clearAuthSession, ensureAuthenticated, getAuthToken, showToast } from './auth.js';

const PROVINCE_METADATA = [
  {
    name: '北京市',
    center: [116.4, 39.9],
    labelCenter: [116.4, 40.2],
    searchKeys: ['北京', '帝都', '故宫', '长城', '颐和园', '天坛'],
  },
  {
    name: '天津市',
    center: [117.2, 39.12],
    labelCenter: [117.3, 38.9],
    searchKeys: ['天津', '津门', '古文化街', '意式风情区', '海河'],
  },
  {
    name: '河北省',
    center: [114.48, 38.03],
    labelCenter: [114.5, 38.5],
    searchKeys: ['河北', '冀', '避暑山庄', '山海关', '赵州桥'],
  },
  {
    name: '山西省',
    center: [112.55, 37.87],
    labelCenter: [112.5, 37.9],
    searchKeys: ['山西', '晋', '平遥古城', '云冈石窟', '悬空寺'],
  },
  {
    name: '内蒙古自治区',
    center: [111.3, 42.0],
    searchKeys: ['内蒙古', '草原', '呼伦贝尔', '额济纳', '成吉思汗陵'],
  },
  {
    name: '辽宁省',
    center: [123.3, 41.5],
    searchKeys: ['辽宁', '辽', '沈阳故宫', '大连星海广场', '本溪水洞'],
  },
  {
    name: '吉林省',
    center: [125.0, 43.6],
    searchKeys: ['吉林', '吉', '长白山', '雾凇岛', '净月潭'],
  },
  {
    name: '黑龙江省',
    center: [127.0, 46.0],
    searchKeys: ['黑龙江', '龙江', '哈尔滨冰雪大世界', '雪乡', '五大连池'],
  },
  {
    name: '上海市',
    center: [121.47, 31.23],
    labelCenter: [121.6, 31.3],
    searchKeys: ['上海', '申城', '魔都', '外滩', '东方明珠', '豫园', '迪士尼'],
  },
  {
    name: '江苏省',
    center: [118.7, 32.3],
    searchKeys: ['江苏', '苏', '苏州园林', '拙政园', '夫子庙', '中山陵'],
  },
  {
    name: '浙江省',
    center: [120.4, 29.8],
    searchKeys: ['浙江', '浙', '西湖', '乌镇', '普陀山', '千岛湖'],
  },
  {
    name: '安徽省',
    center: [117.0, 31.6],
    searchKeys: ['安徽', '皖', '黄山', '宏村', '九华山'],
  },
  {
    name: '福建省',
    center: [118.9, 26.4],
    searchKeys: ['福建', '闽', '鼓浪屿', '武夷山', '土楼'],
  },
  {
    name: '江西省',
    center: [115.9, 28.9],
    searchKeys: ['江西', '赣', '庐山', '景德镇', '婺源'],
  },
  {
    name: '山东省',
    center: [118.5, 36.7],
    searchKeys: ['山东', '鲁', '泰山', '曲阜', '崂山'],
  },
  {
    name: '河南省',
    center: [113.5, 34.9],
    searchKeys: ['河南', '豫', '少林寺', '龙门石窟', '云台山'],
  },
  {
    name: '湖北省',
    center: [112.5, 30.8],
    searchKeys: ['湖北', '鄂', '黄鹤楼', '三峡大坝', '神农架'],
  },
  {
    name: '湖南省',
    center: [112.7, 28.3],
    searchKeys: ['湖南', '湘', '张家界', '岳阳楼', '凤凰古城'],
  },
  {
    name: '广东省',
    center: [113.27, 23.13],
    labelCenter: [113.2, 23.9],
    searchKeys: ['广东', '粤', '广州塔', '丹霞山', '白云山'],
  },
  {
    name: '广西壮族自治区',
    center: [108.3, 23.4],
    searchKeys: ['广西', '壮乡', '桂林山水', '阳朔西街', '德天瀑布'],
  },
  {
    name: '海南省',
    center: [110.2, 19.8],
    searchKeys: ['海南', '琼', '三亚', '亚龙湾', '蜈支洲岛'],
  },
  {
    name: '重庆市',
    center: [106.55, 29.56],
    labelCenter: [106.4, 29.7],
    searchKeys: ['重庆', '山城', '洪崖洞', '磁器口', '长江索道'],
  },
  {
    name: '四川省',
    center: [104.07, 30.67],
    labelCenter: [103.8, 30.6],
    searchKeys: ['四川', '蜀', '成都', '宽窄巷子', '九寨沟', '峨眉山', '都江堰'],
  },
  {
    name: '贵州省',
    center: [106.6, 26.7],
    searchKeys: ['贵州', '黔', '黄果树瀑布', '西江千户苗寨', '梵净山'],
  },
  {
    name: '云南省',
    center: [101.5, 25.3],
    searchKeys: ['云南', '滇', '丽江古城', '洱海', '玉龙雪山', '西双版纳'],
  },
  {
    name: '西藏自治区',
    center: [91.0, 30.3],
    searchKeys: ['西藏', '藏', '布达拉宫', '纳木错', '珠峰大本营'],
  },
  {
    name: '陕西省',
    center: [108.7, 34.0],
    searchKeys: ['陕西', '陕', '西安', '兵马俑', '华清池', '大雁塔', '华山'],
  },
  {
    name: '甘肃省',
    center: [103.2, 36.1],
    searchKeys: ['甘肃', '甘', '敦煌', '莫高窟', '嘉峪关', '张掖丹霞'],
  },
  {
    name: '青海省',
    center: [97.0, 36.2],
    searchKeys: ['青海', '青', '青海湖', '茶卡盐湖', '塔尔寺'],
  },
  {
    name: '宁夏回族自治区',
    center: [106.3, 38.6],
    searchKeys: ['宁夏', '宁', '沙坡头', '沙湖', '镇北堡'],
  },
  {
    name: '新疆维吾尔自治区',
    center: [87.4, 43.9],
    searchKeys: ['新疆', '新', '喀纳斯', '天山天池', '赛里木湖', '火焰山'],
  },
  {
    name: '台湾省',
    center: [121.2, 24.1],
    searchKeys: ['台湾', '台', '台北', '日月潭', '阿里山', '垦丁'],
  },
  {
    name: '香港特别行政区',
    center: [114.15, 22.4],
    searchKeys: ['香港', '港', '维多利亚港', '太平山顶', '迪士尼'],
  },
  {
    name: '澳门特别行政区',
    center: [113.55, 22.2],
    searchKeys: ['澳门', '澳', '大三巴牌坊', '官也街', '新葡京'],
  },
];

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
  }

  /** 初始化地图 */
  async initMap() {
    await this.waitForAMap();

    this.map = new AMap.Map('map-container', {
      zoom: 4.5,
      center: [104.1954, 35.8617],
      viewMode: '3D',
      dragEnable: true,
      zoomEnable: true,
      rotateEnable: false,
      pitchEnable: false,
      limitBounds: new AMap.Bounds([73.5, 1.0], [135.0, 53.6]),
      zooms: [4, 6]
    });
    // ✅✅✅ 在这里插入 👇
    // === 添加一个底层黄系世界地图 ===
    const baseLayer = new AMap.TileLayer({
      zIndex: 1,
      opacity: 1,
    });
    this.map.setLayers([baseLayer]);

    // 加一层半透明淡黄色蒙版，让非中国部分也暖色调
    const maskDiv = document.createElement('div');
    maskDiv.style.cssText = `
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 100%;
    background: rgba(247, 238, 203, 0.65); /* 柔和黄系滤镜 */
    pointer-events: none;
    z-index: 5;
  `;
    this.map.getContainer().appendChild(maskDiv);
    // ✅✅✅ 到这里为止

    this.bindDetailPanelEvents();
    this.bindInfoPanelEvents();
    this.loadPlugins();
    this.bindToolbarEvents();
    this.loadChinaProvinces(); // 加载全国省界

    await this.syncFavorites();
  }

  /** 等待 AMap SDK 加载完毕 */
  waitForAMap() {
    return new Promise(resolve => {
      const check = () => window.AMap ? resolve() : setTimeout(check, 100);
      check();
    });
  }

  /** 加载基础插件 */
  loadPlugins() {
    AMap.plugin(['AMap.ToolBar', 'AMap.Scale', 'AMap.ControlBar'], () => {
      this.map.addControl(new AMap.ToolBar());

      // 其他控件保持不变（比例尺默认左下、指南针默认左上）
      this.map.addControl(new AMap.Scale());
      this.map.addControl(new AMap.ControlBar());
    });
  }

  /** 统一处理搜索事件的监听器 */
  onSmartSearchEvent(e) {
    const kw = (e && e.detail && e.detail.keyword || '').trim();
    if (!kw) {
      showToast('请输入景点或省份名称', { type: 'warning' });
      return;
    }
    // ✅ 调用你已有的智能搜索逻辑
    this.handleSmartSearch(kw);
  }

  /** 绑定工具栏事件 */
  bindToolbarEvents() {
    document.getElementById('layer-btn').onclick = () => this.toggleLayer();

    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-input');

    // ✅ 只注册一次全局事件监听器
    if (!this._smartSearchListenerAdded) {
      window.addEventListener('poemmap:search', this._onSmartSearchEvent);
      this._smartSearchListenerAdded = true;
    }

    // ✅ 统一派发自定义事件（按钮点击）
    searchBtn.addEventListener('click', () => {
      const keyword = searchInput.value.trim();
      window.dispatchEvent(new CustomEvent('poemmap:search', {
        detail: { keyword }
      }));
    });

    // ✅ 统一派发自定义事件（Enter）
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const keyword = searchInput.value.trim();
        window.dispatchEvent(new CustomEvent('poemmap:search', {
          detail: { keyword }
        }));
      }
    });

    // ===== 自动补全建议（保留你原有代码，但改为派发事件） =====
    const suggestBox = document.createElement('ul');
    suggestBox.id = 'suggest-list';
    suggestBox.className = 'suggest-list hidden';
    searchInput.parentElement.appendChild(suggestBox);
    // === 搜索帮助弹窗逻辑 ===
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

      // 点击遮罩层空白处关闭
      helpModal.addEventListener('click', (e) => {
        if (e.target === helpModal) helpModal.classList.add('hidden');
      });
    }

    // 输入时刷新建议
    searchInput.addEventListener('input', (e) => {
      const value = e.target.value.trim();
      this.showSuggestions(value, suggestBox);
    });

    // 点击建议 -> 统一派发自定义事件
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
      // ✅ 点击按钮才打开弹窗
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

      // ✅ 点击关闭按钮隐藏弹窗
      closeFavoritesBtn.addEventListener('click', () => {
        favoritesModal.classList.add('hidden');
      });

      // ✅ 点击收藏项自动跳转到对应省份
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



  /** 加载全国行政区图层并实现 hover 效果 */
  loadChinaProvinces() {
    AMap.plugin('AMap.DistrictLayer', () => {
      // 创建全国行政区层
      const layer = new AMap.DistrictLayer.Country({
        zIndex: 10,
        SOC: 'CHN',
        depth: 1,
        styles: {
          fill: () => '#f8e8a6', // ✅ 柔和淡黄色填充
          'province-stroke': (props) => {
            if (this.favorites.has(props.NAME_CHN)) return '#d77f1f'; // 收藏省橙红描边
            if (this.hoverProvince === props.NAME_CHN) return '#c59b34 '; // 悬停淡紫
            return '#bcae6e'; // 默认边界淡棕
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
            // 修正：直接调用 setStyles 并传入当前样式对象
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

    // 添加示例标记点
    // this.addSampleMarkers();

    // 绑定地图双击放大事件
    this.map.on('dblclick', (e) => {
      const zoom = this.map.getZoom();
      this.map.setZoom(zoom + 1);
    });
    this.addProvinceLabels();
  }

  /** 添加示例标记点 */
  addSampleMarkers() {
    // 模拟从数据库读取的数据
    const sampleData = [
      { name: '北京市', position: [116.4074, 39.9042], info: '中国的首都，政治与文化中心。' },
      { name: '天津市', position: [117.2000, 39.1333], info: '重要的港口城市，历史悠久。' },
      { name: '上海市', position: [121.4737, 31.2304], info: '中国的经济与金融中心。' },
      { name: '河北省', position: [114.5025, 38.0455], info: '环绕北京与天津，历史文化丰富。' }
    ];

    this.markers = sampleData.map(item => {
      const marker = new AMap.Marker({
        position: item.position,
        title: item.name,
        map: this.map
      });

      // 单击显示信息窗口
      marker.on('click', () => {
        const panel = document.getElementById('marker-info-panel');
        document.getElementById('info-title').textContent = item.name;
        document.getElementById('info-desc').textContent = item.info;

        const detailBtn = document.getElementById('detail-btn');
        detailBtn.onclick = () => this.showDetailPanel(item);

        panel.classList.remove('hidden');
        panel.classList.add('show');
      });


      return marker;
    });
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

  async showDetailPanel(item) {
    const panel = document.getElementById('detail-panel');
    document.getElementById('detail-title').textContent = item.name;

    const cityDetails = {
      '北京市': '北京是中华人民共和国的首都，政治文化中心，拥有长城、故宫等历史遗迹。',
      '天津市': '天津是中国北方重要的港口城市，以其独特的欧陆建筑风格闻名。',
      '上海市': '上海是中国经济中心，以金融、航运和现代化城市景观著称。',
      '河北省': '河北省环绕北京与天津，拥有避暑山庄、赵州桥等世界文化遗产。',
    };

    // 模拟每个省市的景点
    const scenicSpots = {
      '河北省': [
        { name: '避暑山庄', img: '../../assets/spots/Hebei-bishushanzhuang.avif' },
        { name: '赵州桥', img: '../../assets/spots/Hebei-ZhaozhouBridge.avif' }
      ],
      '天津市': [
        { name: '意大利风情区', img: '../../assets/spots/Tianjin-Italian.avif' },
        { name: '天津之眼', img: '../../assets/spots/Tianjin-the-ferris-wheel.avif' }
      ],
      '北京市': [
        { name: '故宫', img: '../../assets/spots/Beijing_one.avif' },
        { name: '长城', img: '../../assets/spots//Beijing_Badaling.avif' },
        { name: '颐和园', img: '../../assets/spots/Beijing-summer-palace.avif' }
      ],
      '上海市': [
        { name: '外滩', img: '../../assets/spots/Shanghai-waitan.avif' },
        { name: '东方明珠', img: '../../assets/spots/Shanghai-dongfangmingzhu.avif' },
        { name: '豫园', img: '../../assets/spots/Shanghai-yuyuan.avif' }
      ],
    };

    const spots = scenicSpots[item.name] || [];
    const track = document.getElementById('carousel-track');
    const caption = document.getElementById('carousel-caption');

    if (spots.length === 0) {
      track.innerHTML = '<div class="carousel-item"><p>暂无景点数据</p></div>';
      caption.textContent = '';
      return;
    }

    // 填充图片项
    track.innerHTML = spots.map(s => `
  <div class="carousel-item" data-name="${s.name}">
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
    // ✅ 自动播放轮播
    let autoPlayInterval = setInterval(() => {
      currentIndex = (currentIndex + 1) % spots.length;
      updateCarousel();
    }, 4000); // 每 4 秒自动切换

    // 当用户点击左右箭头时，重置自动播放计时（防止太快跳两次）
    [prevBtn, nextBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        clearInterval(autoPlayInterval);
        autoPlayInterval = setInterval(() => {
          currentIndex = (currentIndex + 1) % spots.length;
          updateCarousel();
        }, 4000);
      });
    });

    // 当详情页关闭时清理定时器
    const closeBtn = document.getElementById('close-detail-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        clearInterval(autoPlayInterval);
        const panel = document.getElementById('detail-panel');
        panel.classList.remove('show');
        panel.classList.add('hidden');
      };
    }

    // ===== 收藏按钮（跟随当前景点）=====
    const favBtn = document.getElementById('favorite-spot-btn');

    // 用于根据 currentIndex 同步按钮文案
    const syncFavBtn = () => {
      const spotName = spots[currentIndex]?.name;    // 当前轮播图对应景点名
      if (!spotName) {
        favBtn.style.display = 'none';
        return;
      }
      favBtn.style.display = 'inline-block';
      const isFav = this.favoriteSpots.has(spotName);
      favBtn.textContent = isFav ? '取消收藏' : '收藏景点';
      favBtn.dataset.favorite = isFav ? 'true' : 'false';
    };

    // 点击切换收藏状态
    favBtn.onclick = async () => {
      const spotName = spots[currentIndex]?.name;
      if (!spotName) return;
      if (!ensureAuthenticated({ message: '请先登录以收藏景点' })) return;
      const wasFavorite = this.favoriteSpots.has(spotName);
      try {
        const nowFavorite = await this.toggleFavoriteSpot(spotName);
        favBtn.textContent = nowFavorite ? '取消收藏' : '收藏景点';
        showToast(nowFavorite ? `已收藏「${spotName}」` : `已取消收藏「${spotName}」`, {
          type: nowFavorite ? 'success' : 'info'
        });
      } catch (error) {
        this.handleRequestError(error, wasFavorite ? '取消收藏失败，请稍后重试' : '收藏失败，请稍后重试');
      }
      syncFavBtn();
    };

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

    const bindVoteButtons = async (spotName) => {
      if (!spotName) return;

      let data = this.votes.get(spotName);

      if (!data || !data.synced) {
        try {
          const scene = await fetchScene(this.getSceneIdentifier(spotName));
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

        this.votes.set(spotName, data);
      }

      updateVoteUI(data);

      const sendVote = async (action) => {
        if (!ensureAuthenticated({ message: '请先登录以评价景点' })) return;

        const previousVote = data.vote;
        try {
          const payload = await submitSceneVote(this.getSceneIdentifier(spotName), action);
          const scene = payload?.scene;
          const currentVote = payload?.currentVote || null;
          data = {
            vote: currentVote,
            likes: scene?.likes_count ?? data.likes,
            dislikes: scene?.dislikes_count ?? data.dislikes,
            synced: true,
          };
          this.votes.set(spotName, data);
          updateVoteUI(data);

          if (previousVote !== currentVote) {
            let toastMessage = '';
            let toastType = 'success';
            if (currentVote === 'like') {
              toastMessage = `已为「${spotName}」点了赞`;
              toastType = 'success';
            } else if (currentVote === 'dislike') {
              toastMessage = `已为「${spotName}」点了不喜欢`;
              toastType = 'warning';
            } else {
              toastMessage = `已撤销对「${spotName}」的评价`;
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
        const current = this.votes.get(spotName) || data;
        const action = current.vote === 'like' ? 'clear' : 'like';
        await sendVote(action);
      };

      newDislikeBtn.onclick = async () => {
        const current = this.votes.get(spotName) || data;
        const action = current.vote === 'dislike' ? 'clear' : 'dislike';
        await sendVote(action);
      };
    };

    // ✅ 初始化绑定当前景点
    let currentSpot = spots[currentIndex]?.name || item.name;
    await bindVoteButtons(currentSpot);

    // ✅ 每次切换轮播重新绑定
    [prevBtn, nextBtn].forEach(btn => {
      btn.addEventListener('click', () => {
        currentSpot = spots[currentIndex]?.name || item.name;
        bindVoteButtons(currentSpot);
      });
    });


    // 点击图片跳转到景点详情页
    track.querySelectorAll('.carousel-item').forEach((el, i) => {
      el.onclick = () => {
        const spotName = spots[i].name;
        window.location.href = `../../pages/scenic.html?spot=${encodeURIComponent(spotName)}`;
      };
    });

    panel.classList.remove('hidden');
    panel.classList.add('show');

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
  /** 在按钮附近显示 +1 / -1 浮动动画 */
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

  /** 美观的省份文字标签图层（带缩放控制与防重叠） */
  addProvinceLabels() {
    const provinces = PROVINCE_LABEL_DATA;

    // ✅ 创建文字标注图层，控制显示范围
    const labelLayer = new AMap.LabelsLayer({
      zIndex: 120,
      collision: true,
    });
    this.map.add(labelLayer);

    provinces.forEach(p => {
      const labelMarker = new AMap.LabelMarker({
        position: p.center,
        text: {
          content: `${this.favorites.has(p.name) ? "⭐ " : ""}${p.name}`,
          direction: 'center',
          offset: [0, -10],
          style: {
            fontSize: 13,
            fontWeight: 600,
            fillColor: '#2c2c2c',
            strokeColor: '#fff',
            strokeWidth: 2,
            backgroundColor: 'rgba(255,255,255,0.75)',
            padding: [2, 6],
            borderRadius: 4,
            shadowColor: 'rgba(0,0,0,0.1)',
            shadowBlur: 2,
          }
        }
      });


      // 悬停变色（新版 API 用 setText）
      labelMarker.on('mouseover', () => {
        const text = labelMarker.getText();
        labelMarker.setText({
          content: text.content, // 保持原文字
          style: {
            ...text.style,
            fillColor: '#9b6bff',     // ✅ 悬停时紫色
            backgroundColor: 'rgba(255,255,255,0.9)',
            fontWeight: 700,
            strokeColor: '#fff5c0',
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
            fillColor: '#2c2c2c',      // ✅ 恢复原深灰
            backgroundColor: 'rgba(255,255,255,0.75)',
            fontWeight: 600,
            strokeColor: '#fff',
            strokeWidth: 2
          }
        });
      });

      labelMarker.on('click', () => {
         const cityDetails = {
           '北京市': '北京是中华人民共和国的首都，政治文化中心，拥有长城、故宫等历史遗迹。',
           '天津市': '天津是中国北方重要的港口城市，以其独特的欧陆建筑风格闻名。',
           '上海市': '上海是中国经济中心，以金融、航运和现代化城市景观著称。',
           '广州市': '广州是南中国重要的港口与商贸城市，岭南文化发源地。',
           '成都市': '成都以美食、休闲与历史文化闻名，被称为“天府之国”。',
           '河北省': '河北省环绕北京与天津，拥有避暑山庄、赵州桥等世界文化遗产。',
           '广东省': '中国改革开放前沿地区，以经济活力和岭南文化著称。',
           '四川省': '“天府之国”，自然与人文资源丰富，都江堰与宽窄巷子闻名中外。'
        };
        const item = {
          name: p.name,
          position: p.center,
          info: cityDetails[p.name] ||`${p.name} 是中国的重要省级行政区，拥有丰富的自然与人文景观。`
        };

        // 打开右侧信息窗
        const panel = document.getElementById('marker-info-panel');
        document.getElementById('info-title').textContent = item.name;
        document.getElementById('info-desc').textContent = item.info;

        // === 新增：感兴趣按钮逻辑 ===
        let interestBtn = document.getElementById('interest-btn');
        if (!interestBtn) {
          // 如果第一次创建，添加按钮
          interestBtn = document.createElement('button');
          interestBtn.id = 'interest-btn';
          interestBtn.className = 'interest-btn';
          panel.appendChild(interestBtn);
        }

        // 更新按钮文字
        interestBtn.textContent = this.favorites.has(p.name)
          ? '暂时不了'
          : '我感兴趣';

        interestBtn.onclick = () => {
          if (this.favorites.has(p.name)) {
            // 取消收藏
            this.favorites.delete(p.name);
            interestBtn.textContent = '我感兴趣';
            this.updateProvinceHighlight(p.name, false);
            this.updateProvinceLabel(p.name);  // ✅ 刷新星标
          } else {
            // 添加收藏
            this.favorites.add(p.name);
            interestBtn.textContent = '暂时不了';
            this.updateProvinceHighlight(p.name, true);
            this.updateProvinceLabel(p.name);  // ✅ 刷新星标
          }
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

    // 重新设置样式：根据收藏集合和 hover 状态实时计算颜色
    layer.setStyles({
      fill: () => '#f8e8a6', // 默认填充色
      'province-stroke': (props) => {
        // 只有收藏的省份才标记橙色
        if (this.favorites.has(props.NAME_CHN)) {
          return '#ff9b00'; // 收藏省份高亮色
        }
        // 鼠标悬停时紫色
        if (this.hoverProvince === props.NAME_CHN) {
          return '#c59b34 ';
        }
        // 默认颜色
        return '#999';
      },
      'city-stroke': '#f6efc2',
      'county-stroke': '#f6efc2'
    });
  }


  /** 更新省份文字标签（用于显示收藏星标） */
  updateProvinceLabel(name) {
    if (!this.provinceLabelLayer) return;

    this.provinceLabelLayer.getAllOverlays().forEach(marker => {
      const txt = marker.getText();
      if (txt && txt.content.includes(name)) {
        // 如果是收藏，显示星标
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

    // ✅ 获取该省份的中心坐标
    const center = this.provinceCenters?.[province];
    if (!center) {
      showToast(`暂未定义 ${province} 的中心坐标`, { type: 'warning' });
      return;
    }

    // ✅ 地图平滑移动并放大
    this.map.setZoomAndCenter(7, center);
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

    // ✅ 打开右侧信息窗
    const panel = document.getElementById('marker-info-panel');
    document.getElementById('info-title').textContent = province;
    document.getElementById('info-desc').textContent = `${province} 是中国的重要省份，拥有丰富的自然与人文景观。`;

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
    if (!keyword) {
      showToast('请输入景点或省份名称', { type: 'warning' });
      return;
    }

    let province = this.spotToProvince[keyword];
    if (!province) {
      province = Object.values(this.spotToProvince).includes(keyword) ? keyword : null;
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
    this.map.setZoomAndCenter(7, center);
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
    document.getElementById('info-title').textContent = province;
    document.getElementById('info-desc').textContent = `${province} 是中国的重要省份，拥有丰富的自然与人文景观。`;

    const detailBtn = document.getElementById('detail-btn');
    detailBtn.onclick = () => this.showDetailPanel({ name: province, position: center });

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
        const key = item?.name || item?.slug || item?.sceneSlug;
        if (key) {
          this.favoriteSpots.set(key, item);
        }
      });
      this._favoritesLoaded = true;
    } catch (error) {
      this.handleRequestError(error, null, { suppressAlert: true });
    }
  }

  async toggleFavoriteSpot(spotName) {
    const identifier = this.getSceneIdentifier(spotName);
    const isFavorite = this.favoriteSpots.has(spotName);

    if (isFavorite) {
      await removeFavorite(identifier);
      this.favoriteSpots.delete(spotName);
      return false;
    }

    const favorite = await addFavorite(identifier);
    if (favorite) {
      this.favoriteSpots.set(spotName, favorite);
    } else {
      // 如果服务器未返回详细信息，至少标记为已收藏
      this.favoriteSpots.set(spotName, { name: spotName, slug: spotName });
    }
    return true;
  }

  getSceneIdentifier(spotName) {
    if (!spotName) return {};
    return { sceneSlug: String(spotName).trim() };
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
