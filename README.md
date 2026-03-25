# NYH Artwork 운영 매뉴얼

이 사이트는 `Google Drive -> Apps Script -> Cloudflare R2 -> 홈페이지` 흐름으로 운영합니다.

작가는 Google Drive에 작품을 올리고, 설명 `.txt`를 같은 이름으로 함께 올리기만 하면 됩니다.

## 한눈에 보기

1. 작가가 Google Drive에 이미지 업로드
2. 작가가 같은 이름의 `.txt` 설명 파일 업로드
3. Apps Script가 Drive를 읽음
4. 이미지와 `gallery.json`을 Cloudflare R2에 업로드
5. 사이트가 R2의 `gallery.json`을 읽어 자동 반영

## 작가가 하는 일

### 1. 시리즈 폴더에 이미지 넣기

Google Drive의 루트 폴더 안에 시리즈 폴더가 있습니다.

예:

- `NYH Artwork/10x10`
- `NYH Artwork/instagram`
- `NYH Artwork/digital`

이 안에 작품 이미지를 넣습니다.

예:

- `2025-10-16.jpg`

### 2. 같은 이름의 설명 파일 넣기

이미지와 같은 이름으로 `.txt` 파일을 만듭니다.

예:

- `2025-10-16.jpg`
- `2025-10-16.txt`

설명 파일 예시:

```txt
title: 별빛 장면
subtitle: 인스타그램 기록 2025.10.16
medium: 디지털 드로잉
size: 인스타그램 원본
year: 2025

별빛이 번지는 바다를 떠올리며 그린 장면.
```

### 3. 시리즈 설정 바꾸기

시리즈 폴더 안의 `artworks.txt`를 수정하면 시리즈 이름과 옵션을 바꿀 수 있습니다.

예:

```txt
gallery: 인스타그램 아카이브
order: 3
thumbnailSize: icon

인스타그램에 공개한 작업을 모아두는 시리즈입니다.
```

## 운영자가 하는 일

### 1. Apps Script 실행

Apps Script에서 `runSyncNow`를 실행하면 Drive 내용을 읽어서 R2에 반영합니다.

처음에는 수동 실행:

- Apps Script 열기
- `runSyncNow` 선택
- `Run`

이후에는 시간 기반 트리거를 설정합니다.

권장:

- 5분 또는 10분 간격

### 2. 반영 확인

다음 두 가지를 확인합니다.

- 이미지 URL
  - 예: `https://img.nyh-art.com/instagram/2025-10-16.jpg`
- 데이터 URL
  - `https://img.nyh-art.com/site-data/gallery.json`

## 파일 규칙

### 작품 파일

- 이미지와 설명은 같은 basename

예:

- `2025-04-15.jpg`
- `2025-04-15.txt`

같은 날짜에 여러 장이면:

- `2025-04-15.jpg`
- `2025-04-15-02.jpg`

### 설명 파일 형식

- 빈 줄 전까지는 `key: value`
- 빈 줄 아래는 본문 설명

지원 항목:

- `title`
- `subtitle`
- `medium`
- `size`
- `year`

## 현재 사이트가 읽는 데이터

사이트는 아래 URL을 기본으로 읽습니다.

- `https://img.nyh-art.com/site-data/gallery.json`

이미지는 JSON 안의 `imageUrl`을 사용합니다.

## 문제 생겼을 때 체크리스트

### 작품이 안 보일 때

1. Drive에 이미지가 있는지
2. 같은 이름의 `.txt`가 있는지
3. Apps Script `runSyncNow` 실행이 성공했는지
4. `gallery.json` URL이 열리는지
5. 이미지 URL이 열리는지

### 로컬 개발에서 안 보일 때

R2 버킷에 CORS 설정이 필요합니다.

허용 도메인 예:

- `http://localhost:3000`
- `https://nyh-art.com`
- `https://www.nyh-art.com`

## 중요한 위치

### 사이트

- [index.html](/Users/redhands/Devel/nyh-art/index.html)
- [gallery.html](/Users/redhands/Devel/nyh-art/gallery.html)
- [script.js](/Users/redhands/Devel/nyh-art/script.js)

### 설계 문서

- [drive-r2-architecture.md](/Users/redhands/Devel/nyh-art/drive-r2-architecture.md)
- [apps-script-sync-spec.md](/Users/redhands/Devel/nyh-art/apps-script-sync-spec.md)

### Apps Script 초안

- [apps-script/README.md](/Users/redhands/Devel/nyh-art/apps-script/README.md)
- [apps-script/main.gs](/Users/redhands/Devel/nyh-art/apps-script/main.gs)
- [apps-script/r2.gs](/Users/redhands/Devel/nyh-art/apps-script/r2.gs)

## 운영 요약

한 줄로 정리하면:

`작가는 Drive에 이미지와 txt를 올리고, Apps Script가 R2와 gallery.json을 갱신하고, 사이트는 그 JSON을 읽어 자동 반영합니다.`
