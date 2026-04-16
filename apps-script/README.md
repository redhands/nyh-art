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

`artworks.txt`에 아래 같은 시리즈 옵션을 넣을 수 있습니다.

```txt
gallery: instagram
order: 3
thumbnailSize: default
showInArchive: false
```

`showInArchive: false`로 두면 메인 화면 `작품 아카이브`의 랜덤 썸네일에는 노출되지 않고, 전체 갤러리와 시리즈 직접 링크에서는 그대로 접근할 수 있습니다.

## 실행

수동 실행:

- `runSyncNow`

자동 실행:

- 시간 기반 트리거로 `runSyncNow`를 5분 또는 10분 간격 등록

## 실행 로그 보기

- Apps Script 편집기에서 `Executions`를 열면 최근 실행 기록을 볼 수 있습니다.
- 각 실행을 클릭하면 아래 단계 로그가 보입니다.
- Drive 시리즈 폴더 로드
- 시리즈 메타데이터 읽기
- 작품 메타데이터 읽기
- 변경 파일 업로드 / 미변경 파일 건너뜀
- manifest에는 없지만 R2에 이미 있는 파일 재사용
- 갤러리 하나가 끝날 때마다 `gallery.json`과 manifest 중간 저장
- R2 삭제
- `gallery.json` 업로드
- 마지막 요약 통계

## 출력

- 이미지: `https://img.nyh-art.com/<gallery>/<filename>`
- JSON: `site-data/gallery.json`

## 참고

이 초안은 현재 repo의 `same-name image + txt` 규칙과 맞춰져 있습니다.
