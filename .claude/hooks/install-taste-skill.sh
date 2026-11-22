#!/usr/bin/env bash
# Baixa a skill taste-skill (38 MB de assets) no início da sessão, se ainda não existir.
# Ela fica fora do git (.gitignore) para não inchar o repositório nem os deploys.
set -euo pipefail
DEST="${CLAUDE_PROJECT_DIR:-$(pwd)}/.claude/skills/taste-skill"
[ -f "$DEST/SKILL.md" ] && exit 0
TMP="$(mktemp -d)"
if git clone -q --depth 1 https://github.com/Leonxlnx/taste-skill.git "$TMP/repo" 2>/dev/null; then
  mkdir -p "$(dirname "$DEST")"
  cp -r "$TMP/repo/skills/taste-skill" "$DEST"
fi
rm -rf "$TMP"
exit 0
