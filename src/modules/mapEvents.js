import { showToast } from './auth.js';

export class MapEvents {
  constructor(mapManager) {
    this.map = mapManager.map;
    this.mapManager = mapManager;
  }

  bindEvents() {
    this.map.on('dblclick', this.onDoubleClick.bind(this));
    document.getElementById('search-btn').onclick = () => this.handleSearch();
    document.getElementById('locate-btn').onclick = () => this.handleLocate();
  }

  async onDoubleClick(e) {
    const { lnglat } = e;
    const url = `https://restapi.amap.com/v3/geocode/regeo?key=595cc2e85e16d0d4f287b56202647395&location=${lnglat.lng},${lnglat.lat}`;
    const res = await fetch(url);
    const data = await res.json();
    const addr = data.regeocode?.formatted_address || '未知位置';

    const infoPanel = document.getElementById('info-panel');
    document.getElementById('info-address').innerHTML = `
      <b>${addr}</b><br>
      经度: ${lnglat.lng.toFixed(5)}，纬度: ${lnglat.lat.toFixed(5)}
    `;
    infoPanel.style.transform = 'translateY(0)';
  }

  handleSearch() {
    const kw = document.getElementById('search-input').value;
    if (!kw) return;
    AMap.plugin('AMap.PlaceSearch', () => {
      const ps = new AMap.PlaceSearch({ map: this.map });
      ps.search(kw);
    });
  }

  handleLocate() {
    AMap.plugin('AMap.Geolocation', () => {
      const geo = new AMap.Geolocation({ showButton: true });
      this.map.addControl(geo);
      geo.getCurrentPosition((status, result) => {
        if (status === 'complete') {
          this.map.setCenter(result.position);
          showToast('已定位到当前位置', { type: 'success' });
        } else {
          showToast('定位失败，请检查定位设置后重试', { type: 'error' });
        }
      });
    });
  }
}