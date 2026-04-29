# Google Drive -> Cloudflare R2 연동 설계

## 목표

작가는 파일 구조나 Git을 몰라도 Google Drive에 이미지를 올리고, 같은 이름의 `.txt` 설명 파일을 함께 올리기만 하면 홈페이지에 반영되는 구조를 만든다.

핵심 원칙:

- 작가의 입력 창구는 Google Drive 하나로 통일한다.
- 서비스용 이미지는 Git이 아니라 Cloudflare R2에 저장한다.
- 사이트는 R2 이미지 URL과 Cloudflare Worker가 만든 JSON API를 읽는다.
- 작품 파일명과 설명 파일명은 항상 같은 basename으로 묶는다.

예:

- `2025-10-16.jpg`
- `2025-10-16.txt`

## 전체 흐름

1. 작가가 Google Drive 시리즈 폴더에 이미지 업로드
2. 작가가 같은 이름의 `.txt` 설명 파일 업로드
3. Google Apps Script가 일정 주기로 Drive 폴더를 스캔
4. 새 이미지/수정 이미지/삭제 이미지를 감지
5. 이미지 파일을 Cloudflare R2에 업로드
6. `.txt`와 `artworks.txt`를 읽어서 사이트용 JSON 생성
7. Cloudflare Worker가 `gallery.json`을 페이지별 JSON API로 변환
8. 사이트는 Worker API와 R2 이미지 URL을 사용해 렌더링

## 권장 Drive 폴더 구조

루트 폴더:

- `NYH Artwork`

하위 폴더:

- `10x10`
- `instagram`
- `digital`

각 시리즈 폴더 안 구성:

- `artworks.txt`
- `2025-10-16.jpg`
- `2025-10-16.txt`
- `2025-10-25.jpg`
- `2025-10-25.txt`

## 텍스트 파일 규칙

### 시리즈 설정 파일

파일명:

- `artworks.txt`

예시:

```txt
gallery: 인스타그램 아카이브
order: 3
thumbnailSize: icon

인스타그램에 포스팅한 작업을 모아두는 시리즈입니다.
```

### 작품 설명 파일

파일명:

- 이미지와 같은 basename의 `.txt`

예시:

```txt
title: 별빛 장면
subtitle: 인스타그램 기록 2025.10.16
medium: 디지털 드로잉
size: 인스타그램 원본
year: 2025

별빛이 번지는 바다를 떠올리며 그린 장면.
```

## Cloudflare R2 구조

버킷:

- `nyh-art-assets`

오브젝트 경로:

- `10x10/DSC_0179.jpg`
- `instagram/2025-10-16.jpg`
- `digital/example-01.png`

권장 공개 도메인:

- `img.nyh-art.com`

최종 이미지 URL 예:

- `https://img.nyh-art.com/instagram/2025-10-16.jpg`

## 사이트 데이터 구조

Apps Script가 최종적으로 아래 형태의 JSON을 생성하는 것을 권장한다.

```json
{
  "generatedAt": "2026-03-25T10:00:00.000Z",
  "total": 2,
  "galleries": [
    {
      "slug": "instagram",
      "title": "인스타그램 아카이브",
      "description": "인스타그램에 공개한 작업을 모아둔 시리즈",
      "total": 2,
      "order": "3",
      "thumbnailSize": "icon",
      "artworks": [
        {
          "fileName": "2025-10-16.jpg",
          "imagePath": "instagram/2025-10-16.jpg",
          "imageUrl": "https://img.nyh-art.com/instagram/2025-10-16.jpg",
          "folder": "instagram",
          "title": "별빛 장면",
          "subtitle": "인스타그램 기록 2025.10.16",
          "description": "별빛이 번지는 바다를 떠올리며 그린 장면.",
          "medium": "디지털 드로잉",
          "size": "인스타그램 원본",
          "year": "2025"
        }
      ]
    }
  ]
}
```

## 사이트 데이터 제공 경로

원본 JSON은 R2에 저장합니다.

- `https://img.nyh-art.com/site-data/gallery.json`

운영 사이트는 이 원본을 직접 브라우저에서 읽지 않고 Cloudflare Worker API를 읽습니다.

- 홈: `/api/gallery/home.json`
- 전체 갤러리: `/api/gallery/index.json`
- 시리즈: `/api/gallery/series/<slug>.json`

Worker는 홈과 시리즈 페이지에 필요한 데이터만 골라 응답하므로 첫 화면 payload가 작고, 정적 파일과 동적 데이터 경로가 충돌하지 않습니다.

## 동기화 정책

### 새 파일

- 이미지와 `.txt`가 모두 존재하면 공개 데이터에 포함
- `.txt`가 없으면 기본값으로 임시 등록하거나 보류 처리

### 수정 파일

- Drive 수정 시간이 마지막 동기화 시점보다 최신이면 다시 업로드/재생성

### 삭제 파일

- Drive에서 이미지가 삭제되면 R2 오브젝트와 JSON 항목도 제거
- `.txt`만 삭제되면 기본값으로 대체하거나 비공개 처리

## 충돌 처리

같은 날짜 파일이 2개 이상이면 다음 규칙으로 basename을 유지한다.

- `2025-04-15.jpg`
- `2025-04-15-02.jpg`

이 규칙은 현재 `instagram` 시리즈에도 이미 적용 가능하다.

## 보안 권장

- Drive는 작가만 편집 가능
- Apps Script는 서비스 계정 역할 대신 Script 권한으로 Drive 접근
- R2 API 토큰은 Apps Script Properties에 저장
- 사이트는 공개 이미지 URL만 사용

## 장점

- Git에 큰 이미지 파일이 쌓이지 않음
- 작가는 Drive만 사용하면 됨
- 현재의 `same-name image + txt` 규칙을 유지 가능
- Cloudflare CDN을 바로 활용 가능

## 다음 구현 단계

1. R2 버킷 생성
2. `img.nyh-art.com` 연결
3. Apps Script에서 Drive 스캔 구현
4. Apps Script에서 R2 업로드 구현
5. Apps Script에서 JSON 생성 구현
6. 사이트가 `imageUrl`을 우선 사용하도록 수정
