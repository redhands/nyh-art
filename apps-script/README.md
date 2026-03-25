# NYH Artwork Drive Sync for Apps Script

Google Drive의 작품 폴더를 읽어 Cloudflare R2와 `gallery.json`을 갱신하는 Apps Script 초안입니다.

## 파일 구성

- `config.gs`: Script Properties 읽기
- `parser.gs`: `artworks.txt` / 작품 `.txt` 파싱
- `drive.gs`: Drive 폴더와 파일 읽기
- `r2.gs`: Cloudflare R2 업로드/삭제
- `build-json.gs`: 사이트용 JSON 생성
- `main.gs`: 동기화 메인 함수
- `appsscript.json`: Apps Script 매니페스트 예시

## Script Properties

다음 값을 Apps Script의 Script Properties에 넣습니다.

- `DRIVE_ROOT_FOLDER_ID`
- `R2_ACCOUNT_ID`
- `R2_BUCKET_NAME`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_PUBLIC_BASE_URL`
- `R2_GALLERY_JSON_PATH`
- `LAST_SYNC_AT`
- `SYNC_MANIFEST_JSON`

권장 기본값:

- `R2_GALLERY_JSON_PATH`: `site-data/gallery.json`
- `SYNC_MANIFEST_JSON`: `[]`

## Drive 구조

- `NYH Artwork/10x10/...`
- `NYH Artwork/instagram/...`
- `NYH Artwork/digital/...`

각 폴더 안:

- `artworks.txt`
- 이미지 파일
- 같은 이름의 `.txt`

## 실행

수동 실행:

- `runSyncNow`

자동 실행:

- 시간 기반 트리거로 `runSyncNow`를 5분 또는 10분 간격 등록

## 출력

- 이미지: `https://img.nyh-art.com/<gallery>/<filename>`
- JSON: `site-data/gallery.json`

## 참고

이 초안은 현재 repo의 `same-name image + txt` 규칙과 맞춰져 있습니다.
