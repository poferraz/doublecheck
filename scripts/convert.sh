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
  review-md    — Claude Code Review (.github/REVIEW.md format)
  all          — Build distribution packages for all platforms

Output is written to dist/platforms/<platform>/
USAGE
    exit 1
}

if [[ $# -lt 1 ]]; then
    usage
fi

PLATFORM="$1"
shift
while [[ $# -gt 0 ]]; do
    case "$1" in
        --output-dir)
            [[ $# -ge 2 && -n "$2" ]] || usage
            OUTPUT_DIR="$2"
            shift 2
            ;;
        *) usage ;;
    esac
done

# Validate the full skill source before touching any destination.
if [[ "$PLATFORM" != "review-md" ]]; then
    [[ -r "$SKILL_DIR/SKILL.md" ]] || { echo "Error: skill source is missing or unreadable." >&2; exit 1; }
    reference_files=("$SKILL_DIR"/references/*.md)
    [[ ${#reference_files[@]} -gt 0 ]] || { echo "Error: reference manuals are missing." >&2; exit 1; }
    for source in "$SKILL_DIR/SKILL.md" "${reference_files[@]}"; do
        [[ -r "$source" ]] || { echo "Error: reference source is unreadable." >&2; exit 1; }
        while IFS= read -r reference; do
            [[ -r "$SKILL_DIR/$reference" ]] || { echo "Error: referenced manual is missing: $reference" >&2; exit 1; }
        done < <(grep -oE 'references/[A-Za-z0-9_-]+\.md' "$source" || true)
    done
fi

stream_references() {
    for ref in "$SKILL_DIR"/references/*.md; do
        printf '<a id="doublecheck-%s"></a>\n\n' "$(basename "$ref" .md)"
        cat "$ref" | sed -E 's@\]\(references/([A-Za-z0-9_-]+)\.md\)@](#doublecheck-\1)@g'
        printf "\n\n---\n\n"
    done
}

stream_skill_body() {
    local skill_file="$SKILL_DIR/SKILL.md"
    awk '
        NR == 1 && $0 == "---" { metadata = 1; next }
        metadata && $0 == "---" { metadata = 0; next }
        !metadata { print }
    ' "$skill_file"
}

build_consolidated() {
    stream_skill_body | sed -E 's@\]\(references/([A-Za-z0-9_-]+)\.md\)@](#doublecheck-\1)@g'
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
    stream_skill_body | sed -E 's@\]\(references/([A-Za-z0-9_-]+)\.md\)@](./doublecheck-\1.md)@g' > "$out/doublecheck.md"
    for ref in "$SKILL_DIR"/references/*.md; do
        sed -E 's@\]\(references/([A-Za-z0-9_-]+)\.md\)@](./doublecheck-\1.md)@g' "$ref" > "$out/doublecheck-$(basename "$ref")"
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

convert_review_md() {
    local out="$OUTPUT_DIR/review-md"
    mkdir -p "$out"
    echo "Converting for Claude Code Review (REVIEW.md)..."
    cat "$PROJECT_DIR/src/templates/REVIEW.md" > "$out/REVIEW.md"
    echo "Output: $out/REVIEW.md"
    echo "Install: cp $out/REVIEW.md REVIEW.md"
}

case "$PLATFORM" in
    claude)       convert_claude ;;
    antigravity)  convert_antigravity ;;
    cursor)       convert_cursor ;;
    windsurf)     convert_windsurf ;;
    codex)        convert_codex ;;
    review-md)    convert_review_md ;;
    all)
        convert_claude
        convert_antigravity
        convert_cursor
        convert_windsurf
        convert_codex
        convert_review_md
        ;;
    *)
        echo "Error: Unknown platform '$PLATFORM'"
        usage
        ;;
esac

echo ""
echo "Done. Converted doublecheck for $PLATFORM."
