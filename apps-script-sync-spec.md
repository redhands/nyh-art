# Apps Script 동기화 스펙

## 목적

Google Drive의 작품 폴더를 읽어 Cloudflare R2와 사이트 데이터(JSON)를 자동 갱신한다.

## 스크립트 책임

- Drive 폴더 탐색
- 시리즈 정보 파싱
- 작품 설명 파싱
- R2 업로드
- 공개 JSON 생성
- 마지막 동기화 시점 기록

## 권장 Apps Script 파일 구성

- `config.gs`
- `drive.gs`
- `parser.gs`
- `r2.gs`
- `build-json.gs`
- `main.gs`

## Script Properties

다음 값을 저장한다.

- `DRIVE_ROOT_FOLDER_ID`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`
- `LAST_SYNC_AT`

## 주요 함수 설계

### `runSync()`

메인 엔트리 함수.

동작:

1. Drive 루트 폴더 조회
2. 시리즈 폴더 목록 조회
3. 각 시리즈별 이미지와 `.txt` 수집
4. 변경분 판단
5. 이미지 업로드/삭제
6. JSON 생성
7. 마지막 동기화 시각 저장

### `listGalleryFolders(rootFolderId)`

반환값:

- 시리즈 폴더 배열

필드 예:

- `name`
- `id`

### `readGalleryMetadata(folder)`

입력:

- 시리즈 폴더

출력:

- `gallery`
- `order`
- `thumbnailSize`
- `description`

대상 파일:

- `artworks.txt`

### `listArtworkPairs(folder)`

입력:

- 시리즈 폴더

출력:

- 이미지 파일과 같은 basename의 `.txt`를 매칭한 배열

예:

```js
[
  {
    basename: "2025-10-16",
    imageFile: {...},
    textFile: {...}
  }
]
```

### `parseTextMetadata(content)`

규칙:

- 빈 줄 전까지 `key: value`
- 빈 줄 아래는 본문 설명

출력 예:

```js
{
  attributes: {
    title: "별빛 장면",
    subtitle: "인스타그램 기록 2025.10.16",
    medium: "디지털 드로잉",
    size: "인스타그램 원본",
    year: "2025"
  },
  body: "별빛이 번지는 바다를 떠올리며 그린 장면."
}
```

### `uploadImageToR2(path, blob, contentType)`

입력:

- `path`: `instagram/2025-10-16.jpg`
- `blob`
- `contentType`

출력:

- 공개 URL

주의:

- 같은 경로가 있으면 덮어쓰기

### `deleteImageFromR2(path)`

Drive에서 이미지가 사라졌을 때 R2 오브젝트 삭제.

### `buildGalleryJson(galleries)`

사이트가 바로 읽을 수 있는 최종 JSON 생성.

## JSON 저장 전략

권장 방식은 2가지다.

### 방식 A

Apps Script가 JSON을 별도 공개 엔드포인트로 제공한다.

장점:

- Git 없이 완전 분리 가능

단점:

- 사이트에서 외부 JSON fetch 필요

### 방식 B

Apps Script가 별도 저장 위치에 `gallery.json`을 업로드하고, 사이트는 그 파일을 읽는다.

장점:

- 현재 구조와 가장 비슷함

단점:

- JSON 배포 위치 설계가 필요

현재 사이트에는 방식 B가 더 잘 맞는다.

## 동기화 주기

권장:

- 5분 또는 10분 간격의 time-driven trigger

추가로 수동 함수:

- `runSyncNow()`

## 오류 처리

- 이미지 있는데 `.txt` 없으면 기본값으로 등록
- `.txt` 파싱 실패 시 로그에 남기고 기본값 사용
- R2 업로드 실패 시 해당 작품만 스킵하고 다음 항목 진행
- 마지막에 성공/실패 개수 요약 기록

## 로그 권장 항목

- 시작 시각
- 시리즈 개수
- 새 이미지 수
- 수정 이미지 수
- 삭제 이미지 수
- 업로드 실패 수
- 최종 JSON 작품 수

## 사이트 연동 변경 포인트

현재 사이트는 `imagePath`를 기준으로 로컬 `artworks/...`를 읽는다.

이후에는 다음 우선순위로 바꾸는 것이 좋다.

1. `imageUrl`이 있으면 사용
2. 없으면 기존 `artworks/${imagePath}` 사용

이렇게 하면 이전 구조와의 호환도 유지된다.
