// 게임 데이터(JSON) 로더.
// - http(s)로 실행하면 data/*.json 을 직접 읽는다 → JSON 수정 후 새로고침만 하면 반영.
// - index.html 을 더블클릭(file://)으로 열면 브라우저가 로컬 JSON 읽기를 막으므로
//   data/bundle.js (tools/build-data.js 로 생성한 JSON 묶음)를 사용한다.
SR.Data = {
  FILES: ['config', 'classes', 'skills', 'monsters', 'items', 'npcs', 'maps', 'buffs'],
  source: null,

  async load() {
    if (location.protocol === 'http:' || location.protocol === 'https:') {
      try {
        const results = await Promise.all(this.FILES.map(name =>
          fetch('data/' + name + '.json', { cache: 'no-store' }).then(r => {
            if (!r.ok) throw new Error(name + ' ' + r.status);
            return r.json();
          })));
        this.FILES.forEach((name, i) => { this[name] = results[i]; });
        this.source = 'json';
        return;
      } catch (e) {
        console.warn('[Data] JSON 로드 실패, bundle.js 사용:', e);
      }
    }
    const bundle = window.SR_DATA_BUNDLE;
    if (!bundle) throw new Error('data/bundle.js 가 없습니다. `node tools/build-data.js` 를 실행하세요.');
    this.FILES.forEach(name => { this[name] = SR.util.deepClone(bundle[name]); });
    this.source = 'bundle';
  },

  item(id) { return this.items[id]; },
  monster(id) { return this.monsters[id]; },
  skill(id) { return this.skills[id]; },
  cls(id) { return this.classes[id]; },
  map(id) { return this.maps[id]; }
};
