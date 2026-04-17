# Instagram Gallery Workflow

현재 인스타그램 작업은 로컬 `artworks` 폴더가 아니라 `Google Drive -> Apps Script -> R2` 흐름으로 반영합니다.

## 기본 흐름

1. 인스타그램 게시물을 로컬로 수집
2. 이미지와 같은 이름의 `.txt` 설명 파일 확인
3. Google Drive의 `instagram` 시리즈 폴더에 업로드
4. Apps Script가 R2와 `gallery.json`에 자동 반영

## 수집 스크립트

최근 1년치 게시물을 로컬 준비 폴더로 내려받으려면 아래처럼 실행합니다.

```bash
python3 -m pip install instaloader
npm run instagram:collect
```

기본 저장 위치는 `imports/instagram`입니다.

생성 결과 예:

```text
imports/
  instagram/
    2026-03-25-CODE.jpg
    2026-03-25-CODE.txt
```

각 포스팅에서는 첫 번째 이미지 1장만 내려받습니다. 인스타그램 캡션 내용은 같은 이름의 `.txt` 본문 설명으로 그대로 들어갑니다.

`.txt` 파일 예:

```txt
title: 작품 제목
subtitle: 인스타그램 기록 2026.03.25
size: 인스타그램 원본
medium: 디지털
year: 2026

홈페이지에서 보여줄 작품 설명 본문.
```

## 로그인 세션 사용 예시

세션 파일을 재사용하려면:

```bash
python3 scripts/download_instagram_last_year.py --username nyh_doodles --session-user YOUR_INSTAGRAM_ID
```

세션 파일 경로를 직접 지정하려면:

```bash
python3 scripts/download_instagram_last_year.py --username nyh_doodles --sessionfile ~/.config/instaloader/session-YOUR_INSTAGRAM_ID --session-user YOUR_INSTAGRAM_ID
```

브라우저 쿠키를 직접 읽는 방식:

```bash
python3 scripts/download_instagram_last_year.py --username nyh_doodles --days 365 --load-cookies chrome
```

특정 연도만 받고 싶다면:

```bash
python3 scripts/download_instagram_last_year.py --username nyh_doodles --year 2025 --load-cookies chrome
```

## 업로드 이후

로컬에서 별도 빌드 명령은 필요하지 않습니다. 정리된 이미지와 `.txt`를 Google Drive의 `instagram` 폴더에 올리면, Apps Script 동기화 후 사이트에 반영됩니다.
