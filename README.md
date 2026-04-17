# NYH Artwork 운영 매뉴얼

이 사이트는 `Google Drive -> Apps Script -> Cloudflare R2 -> 홈페이지` 흐름으로 운영합니다.

작가는 Google Drive에 작품 이미지와 같은 이름의 `.txt` 파일만 올리면 되고, Apps Script가 이를 읽어 R2의 이미지와 `gallery.json`을 갱신합니다. 홈페이지는 그 데이터를 기준으로 자동 반영됩니다.

## 한눈에 보기

1. 작가가 Google Drive의 시리즈 폴더에 이미지 업로드
2. 같은 이름의 `.txt` 설명 파일 업로드
3. Apps Script `runSyncNow`가 Drive 내용을 읽음
4. 이미지와 `site-data/gallery.json`을 Cloudflare R2에 업로드
5. 사이트가 R2 데이터를 읽어 자동 반영

## 현재 사이트 구조

사이트는 정적 빌드 결과를 배포합니다.

- 홈: `/ko/`, `/en/`, `/ja/`, `/zh/`
- 갤러리: `/ko/gallery/`, `/en/gallery/`, `/ja/gallery/`, `/zh/gallery/`
- 시리즈: `/ko/series/<slug>/`, `/en/series/<slug>/`, `/ja/series/<slug>/`, `/zh/series/<slug>/`

기본 루트 `/`는 브라우저 언어와 저장된 언어 설정을 보고 적절한 언어 경로로 이동합니다.

## 작가가 하는 일

### 1. 시리즈 폴더에 이미지 넣기

Google Drive 루트 폴더 아래에 시리즈 폴더가 있습니다.

예:

- `nyh-art/ocean`
- `nyh-art/cat`
- `nyh-art/etc`
- `nyh-art/10x10`

이 안에 작품 이미지를 넣습니다.

예:

- `2025-10-16.jpg`

### 2. 같은 이름의 설명 파일 넣기

이미지와 같은 이름으로 `.txt` 파일을 만듭니다.

예:

- `2025-10-16.jpg`
- `2025-10-16.txt`

최소 형식 예시:

```txt
title.ko: 별빛 장면
title.en: Starlit Scene
title.ja: 星明かりの場面
title.zh: 星光場景

subtitle.ko: 인스타그램 기록 2025.10.16
subtitle.en: Instagram Archive 2025.10.16

medium.ko: 디지털 드로잉
medium.en: Digital Drawing
size: 인스타그램 원본
year: 2025

description.ko:
별빛이 번지는 바다를 떠올리며 그린 장면.

description.en:
A scene inspired by the sea glowing with starlight.
```

### 3. 시리즈 설정 바꾸기

시리즈 폴더 안의 `artworks.txt`를 수정하면 시리즈 이름, 설명, 노출 옵션을 바꿀 수 있습니다.

예:

```txt
gallery.ko: 꿈을 꾸는 바다
gallery.en: Dreaming Sea
gallery.ja: 夢を見る海
gallery.zh: 夢之海

description.ko:
바다를 중심으로 한 장면들을 모아둔 시리즈입니다.

description.en:
A series of scenes centered around the sea.

order: 1
thumbnailSize: default
showInArchive: true
```

## 다국어 텍스트 규칙

### 작품 파일 (`파일명.txt`)

지원 키 예시:

- `title.ko`, `title.en`, `title.ja`, `title.zh`
- `subtitle.ko`, `subtitle.en`, `subtitle.ja`, `subtitle.zh`
- `description.ko`, `description.en`, `description.ja`, `description.zh`
- `medium.ko`, `medium.en`, `medium.ja`, `medium.zh`
- `size`
- `year`

### 시리즈 파일 (`artworks.txt`)

지원 키 예시:

- `gallery.ko`, `gallery.en`, `gallery.ja`, `gallery.zh`
- `description.ko`, `description.en`, `description.ja`, `description.zh`
- `order`
- `thumbnailSize`
- `showInArchive`

### fallback 규칙

- 현재 언어 값이 있으면 그 값을 사용
- 없으면 `ko`
- 그것도 없으면 기존 기본값 사용

## 운영자가 하는 일

### 1. Apps Script 코드 반영

Apps Script 프로젝트 코드가 바뀌었으면 먼저 푸시합니다.

```bash
cd /Users/redhands/Devel/nyh-art/apps-script
clasp push
```

### 2. Apps Script 실행

Apps Script에서 `runSyncNow`를 실행하면 Drive 내용을 읽어서 R2에 반영합니다.

처음에는 수동 실행:

1. Apps Script 프로젝트 열기
2. `runSyncNow` 선택
3. `Run`

이후에는 시간 기반 트리거를 설정합니다.

권장:

- 5분 또는 10분 간격

### 3. 반영 확인

다음 두 가지를 확인합니다.

- 이미지 URL
  - 예: `https://img.nyh-art.com/ocean/2025-10-16.jpg`
- 데이터 URL
  - `https://img.nyh-art.com/site-data/gallery.json`

## 사이트가 실제로 읽는 데이터

사이트는 아래 URL을 기본 데이터 소스로 사용합니다.

- `https://img.nyh-art.com/site-data/gallery.json`

빌드된 페이지에는 초기 렌더링 속도를 위해 `gallery.json` 스냅샷이 HTML 안에 인라인으로 들어갑니다. 페이지는 이 데이터로 먼저 화면을 만들고, 이후 원격 `gallery.json`을 다시 읽어 더 최신 데이터가 있으면 한 번 더 갱신합니다.

즉:

- 첫 렌더는 빠르게
- 최신 다국어 메타는 원격 데이터로 보강

## 로컬 개발

### 빌드

```bash
npm run build
```

생성 결과:

- `dist/ko`
- `dist/en`
- `dist/ja`
- `dist/zh`

### 로컬 테스트

정적 서버로 `dist/`를 서빙해서 확인합니다.

예:

- `http://localhost:3000/ko/`
- `http://localhost:3000/en/gallery/`
- `http://localhost:3000/ja/series/ocean/`

### CORS

로컬에서 원격 `gallery.json`을 직접 읽을 때는 R2 버킷 CORS 설정이 필요합니다.

허용 도메인 예:

- `http://localhost:3000`
- `https://nyh-art.com`
- `https://www.nyh-art.com`

## 문제 생겼을 때 체크리스트

### 작품이 안 보일 때

1. Drive에 이미지가 있는지
2. 같은 이름의 `.txt`가 있는지
3. `runSyncNow` 실행이 성공했는지
4. `https://img.nyh-art.com/site-data/gallery.json`이 열리는지
5. 이미지 URL이 열리는지

### 다국어 제목이 안 바뀔 때

1. Drive의 `artworks.txt` 또는 작품 `.txt`에 `*.en`, `*.ja`, `*.zh` 키가 들어있는지
2. Apps Script `clasp push`를 했는지
3. `runSyncNow`를 다시 실행했는지
4. 원격 `gallery.json` 안에 `titleI18n`, `descriptionI18n` 등이 실제로 생겼는지

### 삭제가 반영되지 않을 때

1. Drive에서 파일이 휴지통으로 갔는지 확인
2. `runSyncNow`를 다시 실행
3. Apps Script 실행 로그에서 삭제/재사용 관련 로그 확인

### 로컬 빌드에서 언어별 시리즈 제목이 한국어로 남을 때

원인은 대개 로컬 `data/gallery.json`이 오래된 경우입니다.

현재 빌드는 원격 `gallery.json`을 읽는 데 성공하면 그 내용을 로컬 `data/gallery.json`에도 저장하므로, 온라인 상태에서 한 번 빌드하면 이후 fallback 데이터도 최신에 가까워집니다.

## 중요한 위치

### 사이트 코드

- [index.html](/Users/redhands/Devel/nyh-art/index.html)
- [gallery.html](/Users/redhands/Devel/nyh-art/gallery.html)
- [script.js](/Users/redhands/Devel/nyh-art/script.js)
- [js/app.js](/Users/redhands/Devel/nyh-art/js/app.js)
- [js/data.js](/Users/redhands/Devel/nyh-art/js/data.js)
- [js/i18n.js](/Users/redhands/Devel/nyh-art/js/i18n.js)
- [js/render.js](/Users/redhands/Devel/nyh-art/js/render.js)
- [js/ui.js](/Users/redhands/Devel/nyh-art/js/ui.js)
- [styles.css](/Users/redhands/Devel/nyh-art/styles.css)

### 빌드 / 배포

- [scripts/build-site.mjs](/Users/redhands/Devel/nyh-art/scripts/build-site.mjs)
- [package.json](/Users/redhands/Devel/nyh-art/package.json)

### Apps Script

- [apps-script/README.md](/Users/redhands/Devel/nyh-art/apps-script/README.md)
- [apps-script/main.gs](/Users/redhands/Devel/nyh-art/apps-script/main.gs)
- [apps-script/drive.gs](/Users/redhands/Devel/nyh-art/apps-script/drive.gs)
- [apps-script/parser.gs](/Users/redhands/Devel/nyh-art/apps-script/parser.gs)
- [apps-script/build-json.gs](/Users/redhands/Devel/nyh-art/apps-script/build-json.gs)
- [apps-script/r2.gs](/Users/redhands/Devel/nyh-art/apps-script/r2.gs)
- [apps-script/examples/artworks.sample.txt](/Users/redhands/Devel/nyh-art/apps-script/examples/artworks.sample.txt)
- [apps-script/examples/artwork.sample.txt](/Users/redhands/Devel/nyh-art/apps-script/examples/artwork.sample.txt)

### 설계 문서

- [drive-r2-architecture.md](/Users/redhands/Devel/nyh-art/drive-r2-architecture.md)
- [apps-script-sync-spec.md](/Users/redhands/Devel/nyh-art/apps-script-sync-spec.md)

## 운영 요약

한 줄로 정리하면:

`작가는 Drive에 이미지와 txt를 올리고, Apps Script가 R2와 gallery.json을 갱신하고, 사이트는 언어별 정적 페이지 + 원격 gallery.json으로 자동 반영됩니다.`
