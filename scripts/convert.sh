#!/usr/bin/env bash
# convert.sh — Convert doublecheck for use with various AI coding agents
# Usage: bash scripts/convert.sh <platform>
# Supported: claude, cursor, antigravity, windsurf, codex, all

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SKILL_DIR="$PROJECT_DIR/skills/doublecheck"
OUTPUT_DIR="$PROJECT_DIR/dist/platforms"

usage() {
    cat <<'USAGE'
Usage: bash scripts/convert.sh <platform>

Supported platforms:
  claude       — Claude Code (~/.claude/skills/ format)
  cursor       — Cursor IDE (.cursor/rules/ format)
  antigravity  — Google Antigravity (~/.gemini/antigravity/skills/ format)
  windsurf     — Windsurf (.windsurfrules format)
  codex        — OpenAI Codex (AGENTS.md format)
  all          — Build distribution packages for all platforms

Output is written to dist/platforms/<platform>/
USAGE
    exit 1
}

if [[ $# -lt 1 ]]; then
    usage
fi

PLATFORM="$1"

stream_references() {
    for ref in "$SKILL_DIR"/references/*.md; do
        cat "$ref"
        printf "\n\n---\n\n"
    done
}

stream_skill_body() {
    local skill_file="$SKILL_DIR/SKILL.md"
    if head -n 1 "$skill_file" | grep -q "^---$"; then
        sed '1,/^---$/d' "$skill_file" | sed '1,/^---$/d'
    else
        cat "$skill_file"
    fi
}

build_consolidated() {
    stream_skill_body
    printf "\n---\n\n# Reference Manuals\n\n"
    stream_references
}

convert_claude() {
    local out="$OUTPUT_DIR/claude"
    mkdir -p "$out"
    echo "Converting for Claude Code..."
    cp -r "$SKILL_DIR"/* "$out/"
    echo "Output: $out/"
    echo "Install: cp -r $out ~/.claude/skills/doublecheck"
}

convert_antigravity() {
    local out="$OUTPUT_DIR/antigravity"
    mkdir -p "$out"
    echo "Converting for Google Antigravity..."
    cp -r "$SKILL_DIR"/* "$out/"
    echo "Output: $out/"
    echo "Install: cp -r $out ~/.gemini/antigravity/skills/doublecheck"
}

convert_cursor() {
    local out="$OUTPUT_DIR/cursor/rules"
    mkdir -p "$out"
    echo "Converting for Cursor..."
    stream_skill_body > "$out/doublecheck.md"
    for ref in "$SKILL_DIR"/references/*.md; do
        cp "$ref" "$out/doublecheck-$(basename "$ref")"
    done
    echo "Output: $out/"
    echo "Install: Copy contents of $out/ into your project's .cursor/rules/"
}

convert_windsurf() {
    local out="$OUTPUT_DIR/windsurf"
    mkdir -p "$out"
    echo "Converting for Windsurf..."
    build_consolidated > "$out/.windsurfrules"
    echo "Output: $out/.windsurfrules"
}

convert_codex() {
    local out="$OUTPUT_DIR/codex"
    mkdir -p "$out"
    echo "Converting for Codex..."
    build_consolidated > "$out/AGENTS.md"
    echo "Output: $out/AGENTS.md"
}

case "$PLATFORM" in
    claude)       convert_claude ;;
    antigravity)  convert_antigravity ;;
    cursor)       convert_cursor ;;
    windsurf)     convert_windsurf ;;
    codex)        convert_codex ;;
    all)
        convert_claude
        convert_antigravity
        convert_cursor
        convert_windsurf
        convert_codex
        ;;
    *)
        echo "Error: Unknown platform '$PLATFORM'"
        usage
        ;;
esac

echo ""
echo "Done. Converted doublecheck for $PLATFORM."
