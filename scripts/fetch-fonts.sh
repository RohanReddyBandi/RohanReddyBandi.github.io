#!/bin/sh
# Clash Display, General Sans and Tanker come from Fontshare under the ITF Free Font
# License. It allows self-hosting them on this site but not redistributing them
# through a public repository, so they stay out of git: this script pulls the
# official files from Fontshare into public/fonts/ before dev and build.
# (JetBrains Mono is OFL and is committed.)
set -eu

dest="public/fonts"
mkdir -p "$dest"

fetch() {
  slug="$1"   # Fontshare slug, e.g. clash-display
  file="$2"   # file inside the zip's WEB/fonts folder
  [ -f "$dest/$file" ] && return 0
  tmp="$(mktemp -d)"
  curl -fsSL "https://api.fontshare.com/v2/fonts/download/$slug" -o "$tmp/font.zip"
  unzip -q -j "$tmp/font.zip" "*/Fonts/WEB/fonts/$file" -d "$dest"
  rm -rf "$tmp"
  echo "fonts: fetched $file"
}

fetch clash-display ClashDisplay-Variable.woff2
fetch general-sans GeneralSans-Variable.woff2
fetch tanker Tanker-Regular.woff2
