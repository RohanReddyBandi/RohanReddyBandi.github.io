#!/bin/sh
# General Sans comes from Fontshare under the ITF Free Font License. It allows
# self-hosting it on this site but not redistributing it through a public
# repository, so it stays out of git: this script pulls the official file from
# Fontshare into public/fonts/ before dev and build.
# (Caveat is OFL and is committed.)
set -eu

dest="public/fonts"
mkdir -p "$dest"

fetch() {
  slug="$1"   # Fontshare slug, e.g. general-sans
  file="$2"   # file inside the zip's WEB/fonts folder
  [ -f "$dest/$file" ] && return 0
  tmp="$(mktemp -d)"
  curl -fsSL "https://api.fontshare.com/v2/fonts/download/$slug" -o "$tmp/font.zip"
  unzip -q -j "$tmp/font.zip" "*/Fonts/WEB/fonts/$file" -d "$dest"
  rm -rf "$tmp"
  echo "fonts: fetched $file"
}

fetch general-sans GeneralSans-Variable.woff2
