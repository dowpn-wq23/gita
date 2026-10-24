# 별빛 대륙 (Starlight Realm)

모바일 MMORPG의 조작감·전투 템포·HUD 배치를 싱글플레이로 재현한 2D 픽셀아트 액션 RPG.
그래픽·사운드·지명·몬스터/NPC/아이템 이름은 모두 오리지널이며, 완전 오프라인으로 동작한다.

## 실행

- **더블클릭**: `index.html` 을 브라우저로 열면 바로 실행된다 (Phaser·폰트 모두 로컬 포함).
- **로컬 서버** (JSON 수정 즉시 반영): `python3 -m http.server` → `http://localhost:8000`
- WebGL 이 불안정한 기기: `index.html?renderer=canvas`

> `file://` 로 열면 브라우저가 로컬 JSON 읽기를 막기 때문에 `data/bundle.js` 를 쓴다.
> JSON 을 고친 뒤 더블클릭 실행에도 반영하려면 `node tools/build-data.js` 를 한 번 실행한다.

## 조작

| 동작 | PC | 모바일 |
| --- | --- | --- |
| 이동 (8방향) | WASD / 방향키 | 좌하단 십자 패드 |
| 기본공격 (자동 타겟 연타) | Space · J 누르고 있기 | 우하단 큰 주먹 버튼 누르고 있기 |
| 스킬 5개 | 1 ~ 5 | 공격 버튼 둘레의 호 배치 버튼 |
| 회피 (짧은 무적 대시) | Shift · L | 회피 버튼 |
| HP 물약 | Q | 물약 버튼 |
| NPC 대화 | E / Enter | NPC 근처에서 공격 버튼이 "대화"로 바뀜 |
| 가방 · 스킬 · 지도 · 메뉴 | I · K · M · Esc | 우상단 아이콘 |

## 구성

```
index.html        진입점 (스크립트 로드 순서 정의)
main.js           Phaser 설정 (1280x576, FIT 스케일)
data/             게임 데이터 JSON — 수치 조정은 여기서
  config.json     전역 설정 (경험치 곡선, 회피, 저장 주기 등)
  classes.json    직업 (무도가 구현, 전사·레인저·마법사는 implemented:false 로 구조만)
  skills.json     스킬 (type: melee / aoe / cone / buff / finisher)
  monsters.json   몬스터 (정예는 elite:true + special 강공격)
  items.json      아이템 (소비 / 장비 / 재료)
  npcs.json       NPC 와 상점 목록
  maps.json       맵 (문자 레이아웃 + 장식 + 포탈 + 스폰)
  buffs.json      버프
  bundle.js       위 JSON 묶음 (tools/build-data.js 가 생성)
systems/          데이터·저장·전투·스킬·맵 생성·입력·사운드·이펙트
  AssetManifest.js  ★ 에셋 로딩 단일 지점 (실제 스프라이트로 교체할 때 여기만 수정)
  PlaceholderArt.js 코드로 그린 플레이스홀더 픽셀아트
entities/         플레이어, 펫, 몬스터, NPC, 드롭, 장식
ui/               HUD, 터치 컨트롤, 메시지 로그, 각종 창
scenes/           Boot → Title → Game(월드) + UI(HUD)
tools/build-data.js
```

### 스프라이트 교체

`systems/AssetManifest.js` 의 `manifest` 에 같은 키로 파일을 등록하면 해당 플레이스홀더 대신 파일을 쓴다.
프레임 배치 규칙(플레이어 3행x11열 등)은 파일 상단 주석에 있다. 효과음도 `sounds` 에 등록하면 합성음 대신 재생된다.

### 맵 편집

`maps.json` 의 `layout` 은 한 글자가 한 타일이다.

| 문자 | 의미 | 문자 | 의미 |
| --- | --- | --- | --- |
| `~` | 물 (통행 불가) | `^` | 높은 석단 (2층) |
| `,` | 풀 | `\|` | 석단 앞면 벽 (통행 불가) |
| `.` | 석판 | `=` | 계단 (1층↔2층) |
| `:` | 흙길 | `#` | 바위 |
| `_` | 자갈 광장 | `T P p t y b x l` | 나무 · 기둥(1/2층) · 횃불(1/2층) · 부서진 기둥 · 상자 · 가로등 |

1층과 2층은 계단으로만 오갈 수 있다. 집·분수 같은 큰 장식은 `decor` 배열에 좌표로 넣는다.

## 저장

localStorage(`starlight_realm_save_v1`)에 10초마다, 그리고 레벨업·맵 이동·상점 거래·탭 닫기 시 자동 저장한다.
저장 항목: 직업, 레벨/경험치, 골드, HP/MP, 기(氣), 스킬 레벨·포인트, 인벤토리, 장비, 버프, 위치(맵+좌표).
메뉴 > 데이터 초기화로 지울 수 있다.

## 1단계 콘텐츠

- 마을 「바람결 마을」: 잡화상(상점), 치유사(무료 회복), 경비대장(안내)
- 사냥터 「이끼 낀 수로 유적」: 물방울 젤리, 가시등 거북, 정예 **늪지기 바르곤** (HP 6,500, 범위 강타)
- 사냥터 「가라앉은 성소」: 그림자 박쥐, 룬석 파수병, 정예 **성소 수호자 카르논** (HP 7,000)
- 무도가 스킬 5종: 연환권 · 선풍각 · 열화각 · 투기해방 · 천붕격(기 소모)
- 펫 「꼬마 별빛」 (따라다니기)

## 라이선스

- Phaser 3.80.1 — MIT (`lib/PHASER_LICENSE.md`)
- Galmuri11 폰트 — SIL OFL 1.1 (`fonts/GALMURI_OFL.md`)
