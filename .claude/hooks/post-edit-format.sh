#!/usr/bin/env bash
# PostToolUse hook (Edit|MultiEdit|Write). Advisory: formats the edited file with the repo's
# Prettier (prettier.config.js, .prettierignore). Never blocks: always exits 0.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

command -v jq >/dev/null 2>&1 || exit 0

file_path="$(jq -r '.tool_input.file_path // empty' 2>/dev/null)"
[ -z "$file_path" ] && exit 0
[ -f "$file_path" ] || exit 0

# Only files inside this repo; skip deps and generated code.
case "$file_path" in
  "$PROJECT_DIR"/*) ;;
  /*) exit 0 ;;
  *) file_path="$PROJECT_DIR/$file_path" ;;
esac
case "$file_path" in
  */node_modules/*|*/convex/_generated/*|*/dist/*) exit 0 ;;
esac

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|*.json|*.css|*.html|*.md|*.yml|*.yaml) ;;
  *) exit 0 ;;
esac

prettier="$PROJECT_DIR/node_modules/.bin/prettier"
if [ ! -x "$prettier" ]; then
  echo "post-edit-format: Prettier not installed (run pnpm install); skipped $file_path" >&2
  exit 0
fi

if ! out="$(cd "$PROJECT_DIR" && "$prettier" --write --ignore-unknown --log-level warn -- "$file_path" 2>&1)"; then
  echo "post-edit-format: prettier failed on ${file_path#"$PROJECT_DIR"/} (advisory):" >&2
  printf '%s\n' "$out" | tail -n 20 >&2
fi

exit 0
