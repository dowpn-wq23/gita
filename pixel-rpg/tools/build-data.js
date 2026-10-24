#!/usr/bin/env node
// data/*.json 을 하나로 묶어 data/bundle.js 를 생성한다.
// index.html 을 file:// 로 직접 열 때는 이 번들이 사용되므로, JSON 을 수정했다면 한 번 실행하자.
//   사용법: node tools/build-data.js
const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const files = ['config', 'classes', 'skills', 'monsters', 'items', 'npcs', 'maps', 'buffs'];
const bundle = {};
for (const name of files) {
  const file = path.join(dataDir, name + '.json');
  try {
    bundle[name] = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    console.error(`[build-data] ${name}.json 파싱 실패: ${e.message}`);
    process.exit(1);
  }
}
const out = '// 자동 생성 파일 — 직접 수정하지 말고 data/*.json 을 고친 뒤 `node tools/build-data.js` 를 실행하세요.\n' +
  'window.SR_DATA_BUNDLE = ' + JSON.stringify(bundle) + ';\n';
fs.writeFileSync(path.join(dataDir, 'bundle.js'), out);
console.log(`[build-data] data/bundle.js 생성 완료 (${files.length}개 파일, ${(out.length / 1024).toFixed(1)} KB)`);
