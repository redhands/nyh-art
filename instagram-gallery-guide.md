# Instagram Gallery Workflow

인스타그램 게시물을 홈페이지 갤러리로 옮길 때는 다음 구조를 사용합니다.

## 폴더 구조

```text
artworks/
  instagram/
    artworks.md
    post-2026-03-25-01.jpg
    post-2026-03-25-01.md
```

## 시리즈 정보

`artworks/instagram/artworks.md`는 시리즈 제목과 설명을 정의합니다.

```md
---
gallery: 인스타그램 아카이브
order: 3
---

인스타그램에 포스팅한 작업 중 홈페이지에 함께 소개할 작품을 모아두는 시리즈입니다.
```

## 작품 정보

이미지와 같은 이름의 `.md` 파일을 만들고 frontmatter + 본문을 작성합니다.

```md
---
title: 작품 제목
subtitle: 인스타그램 기록 01
size: 디지털
medium: Procreate
year: 2026
description: 짧은 요약 설명
---

홈페이지에서 보여줄 작품 설명 본문.
```

## 반영 방법

루트 폴더에서 아래 명령을 실행하면 갤러리 데이터가 갱신됩니다.

```bash
npm run build:data
```

작품이 없는 하위 폴더는 사이트에서 자동으로 숨겨집니다.

## 인스타그램 다운로드 스크립트

최근 1년치 게시물을 `artworks/instagram` 폴더로 내려받으려면 아래처럼 실행합니다.

```bash
python3 -m pip install instaloader
```

`python3 -m instaloader --load-cookies chrome nyh_doodles` 가 이미 성공했다면, 보통 세션 파일이 저장되어 있으므로 아래처럼 세션 사용자명만 넘겨서 실행하는 쪽이 더 안정적입니다.

```bash
python3 scripts/download_instagram_last_year.py --username nyh_doodles --session-user YOUR_INSTAGRAM_ID
```

세션 파일 경로를 직접 지정하고 싶다면 이렇게 실행합니다.

```bash
python3 scripts/download_instagram_last_year.py --username nyh_doodles --sessionfile ~/.config/instaloader/session-YOUR_INSTAGRAM_ID --session-user YOUR_INSTAGRAM_ID
```

브라우저 쿠키를 직접 읽는 방식도 사용할 수 있습니다.

```bash
python3 scripts/download_instagram_last_year.py --username nyh_doodles --days 365 --load-cookies chrome
```

다운로드가 끝나면 아래 명령으로 갤러리 데이터를 다시 만듭니다.

```bash
npm run build:data
```
