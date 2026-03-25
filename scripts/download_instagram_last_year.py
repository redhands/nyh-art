#!/usr/bin/env python3

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path
from typing import Iterable
from urllib.parse import urlparse

try:
    import instaloader
except ImportError:
    print(
        "instaloader가 설치되어 있지 않습니다. `python3 -m pip install instaloader` 후 다시 실행해 주세요.",
        file=sys.stderr,
    )
    sys.exit(1)

from instaloader.exceptions import (
    ConnectionException,
    ProfileNotExistsException,
    QueryReturnedForbiddenException,
)


ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_OUTPUT_DIR = ROOT_DIR / "artworks" / "instagram"
DEFAULT_USERNAME = "nyh_doodles"
DEFAULT_SESSION_DIR = Path.home() / ".config" / "instaloader"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="인스타그램 공개 프로필에서 최근 1년치 게시물 이미지를 내려받습니다."
    )
    parser.add_argument(
        "--username",
        default=DEFAULT_USERNAME,
        help=f"인스타그램 사용자명 (기본값: {DEFAULT_USERNAME})",
    )
    parser.add_argument(
        "--output-dir",
        default=str(DEFAULT_OUTPUT_DIR),
        help=f"다운로드 폴더 (기본값: {DEFAULT_OUTPUT_DIR})",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=365,
        help="최근 며칠치 게시물을 가져올지 설정합니다. 기본값은 365일입니다.",
    )
    parser.add_argument(
        "--login-user",
        default="",
        help="로그인이 필요할 때 사용할 인스타그램 사용자명",
    )
    parser.add_argument(
        "--sessionfile",
        default="",
        help="instaloader 세션 파일 경로",
    )
    parser.add_argument(
        "--session-user",
        default="",
        help="이미 만들어진 instaloader 세션 파일을 찾을 사용자명",
    )
    parser.add_argument(
        "--load-cookies",
        default="",
        help="브라우저 쿠키를 사용할 브라우저 이름 (예: chrome, safari)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="실제 다운로드 없이 어떤 파일이 생성될지 미리 봅니다.",
    )
    return parser.parse_args()


def sanitize_filename(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-_.") or "instagram-post"


def infer_extension_from_url(url: str) -> str:
    suffix = Path(urlparse(url).path).suffix.lower()
    return suffix if suffix else ".jpg"


def build_stem(post_date: dt.datetime, shortcode: str, index: int | None = None) -> str:
    stamp = post_date.strftime("%Y-%m-%d")
    if index is None:
        return sanitize_filename(f"{stamp}-{shortcode}")
    return sanitize_filename(f"{stamp}-{shortcode}-{index:02d}")


def write_markdown_template(image_path: Path, caption: str, post_date: dt.datetime) -> None:
    md_path = image_path.with_suffix(".md")
    if md_path.exists():
        return

    caption_lines = [line.strip() for line in caption.splitlines() if line.strip()]
    first_line = caption_lines[0] if caption_lines else ""

    title = first_line[:60] if first_line else image_path.stem
    subtitle = f"인스타그램 기록 {post_date.strftime('%Y.%m.%d')}"
    body = first_line if first_line else "인스타그램에 공개한 작업입니다."

    md_path.write_text(
        "\n".join(
            [
                "---",
                f"title: {title}",
                f"subtitle: {subtitle}",
                "size: 인스타그램 원본",
                "medium: 미정",
                f"year: {post_date.year}",
                "description: 인스타그램에 공개한 작업입니다.",
                "---",
                "",
                body,
                "",
            ]
        ),
        encoding="utf-8",
    )


def iter_post_image_urls(post: instaloader.Post) -> Iterable[str]:
    if post.typename == "GraphSidecar":
        for node in post.get_sidecar_nodes():
            if node.is_video:
                continue
            yield node.display_url
        return

    if getattr(post, "is_video", False):
        return

    yield post.url


def ensure_gallery_markdown(output_dir: Path) -> None:
    gallery_md = output_dir / "artworks.md"
    if gallery_md.exists():
        return

    gallery_md.write_text(
        "\n".join(
            [
                "---",
                "gallery: 인스타그램 아카이브",
                "order: 3",
                "---",
                "",
                "인스타그램에 포스팅한 작업 중 홈페이지에 함께 소개할 작품을 모아두는 시리즈입니다.",
                "",
            ]
        ),
        encoding="utf-8",
    )


def find_default_sessionfile(username: str) -> Path:
    return DEFAULT_SESSION_DIR / f"session-{username}"


def main() -> int:
    args = parse_args()
    output_dir = Path(args.output_dir).expanduser().resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    ensure_gallery_markdown(output_dir)

    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=args.days)

    loader = instaloader.Instaloader(
        download_comments=False,
        download_geotags=False,
        download_video_thumbnails=False,
        save_metadata=False,
        compress_json=False,
        dirname_pattern=str(output_dir),
        filename_pattern="{date_utc}_UTC",
    )

    session_username = args.session_user or args.login_user

    if args.load_cookies:
        try:
            loader.load_session_from_browser(args.load_cookies)
        except Exception as error:
            print(
                f"브라우저 쿠키를 불러오지 못했습니다: {args.load_cookies}",
                file=sys.stderr,
            )
            print(
                "브라우저에서 해당 인스타그램 계정으로 로그인되어 있는지 확인해 주세요.",
                file=sys.stderr,
            )
            print(f"원본 오류: {error}", file=sys.stderr)
            return 1
    elif args.sessionfile:
        try:
            loader.load_session_from_file(session_username or args.username, args.sessionfile)
        except Exception as error:
            print(
                f"세션 파일을 불러오지 못했습니다: {args.sessionfile}",
                file=sys.stderr,
            )
            print(f"원본 오류: {error}", file=sys.stderr)
            return 1
    elif session_username:
        default_sessionfile = find_default_sessionfile(session_username)
        if default_sessionfile.exists():
            try:
                loader.load_session_from_file(session_username, str(default_sessionfile))
            except Exception as error:
                print(
                    f"기본 세션 파일을 불러오지 못했습니다: {default_sessionfile}",
                    file=sys.stderr,
                )
                print(f"원본 오류: {error}", file=sys.stderr)
                return 1
        else:
            loader.interactive_login(session_username)
    try:
        profile = instaloader.Profile.from_username(loader.context, args.username)
    except QueryReturnedForbiddenException as error:
        print(
            "Instagram이 요청을 차단했습니다. "
            "`--load-cookies chrome` 또는 `--load-cookies safari`로 다시 시도해 주세요.",
            file=sys.stderr,
        )
        print(f"대상 계정: {args.username}", file=sys.stderr)
        print(
            "예시: python3 scripts/download_instagram_last_year.py "
            f"--username {args.username} --load-cookies chrome",
            file=sys.stderr,
        )
        print(f"원본 오류: {error}", file=sys.stderr)
        return 1
    except ProfileNotExistsException as error:
        print(
            "Instagram이 프로필 정보를 확인하지 못했습니다. "
            "계정이 실제로 존재하더라도 비로그인 차단이나 일시적 제한일 수 있습니다.",
            file=sys.stderr,
        )
        print(f"대상 계정: {args.username}", file=sys.stderr)
        print(
            "브라우저에서 프로필이 열리는지 확인하고, 가능하면 "
            "`--load-cookies chrome` 또는 `--load-cookies safari`와 함께 다시 시도해 주세요.",
            file=sys.stderr,
        )
        print(f"원본 오류: {error}", file=sys.stderr)
        return 1
    except ConnectionException as error:
        print(
            "Instagram 연결 중 오류가 발생했습니다. "
            "잠시 후 다시 시도하거나 로그인 세션을 사용해 주세요.",
            file=sys.stderr,
        )
        print(f"원본 오류: {error}", file=sys.stderr)
        return 1

    downloaded = 0
    skipped_existing = 0
    considered_posts = 0

    for post in profile.get_posts():
        post_date = post.date_utc.replace(tzinfo=dt.timezone.utc)
        if post_date < cutoff:
            break

        considered_posts += 1
        image_urls = list(iter_post_image_urls(post))
        if not image_urls:
            continue

        for index, image_url in enumerate(image_urls, start=1):
            stem = build_stem(post_date, post.shortcode, None if len(image_urls) == 1 else index)
            extension = infer_extension_from_url(image_url)
            image_path = output_dir / f"{stem}{extension}"

            if image_path.exists():
                skipped_existing += 1
                write_markdown_template(image_path, post.caption or "", post.date_utc)
                continue

            if args.dry_run:
                print(f"[dry-run] {image_path.name}")
                continue

            loader.download_pic(str(image_path), image_url, post.date_utc)
            write_markdown_template(image_path, post.caption or "", post.date_utc)
            downloaded += 1
            print(f"downloaded: {image_path.name}")

    print(
        f"완료: 최근 {args.days}일 기준 게시물 {considered_posts}개 확인, 이미지 {downloaded}개 다운로드, 기존 파일 {skipped_existing}개 건너뜀."
    )
    print(f"저장 위치: {output_dir}")
    print("다운로드 후 `npm run build:data`를 실행하면 사이트 갤러리에 반영됩니다.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
