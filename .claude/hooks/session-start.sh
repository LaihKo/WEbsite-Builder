#!/bin/bash
set -euo pipefail

# Only run in remote Claude Code environments
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install dependencies when package.json is present
if [ -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  npm install
fi

# Install Python dependencies when requirements.txt is present
if [ -f "$CLAUDE_PROJECT_DIR/requirements.txt" ]; then
  pip install -r "$CLAUDE_PROJECT_DIR/requirements.txt"
fi

# Install Python dependencies via pyproject.toml / Poetry
if [ -f "$CLAUDE_PROJECT_DIR/pyproject.toml" ]; then
  cd "$CLAUDE_PROJECT_DIR"
  if command -v poetry &>/dev/null; then
    poetry install --no-interaction
  else
    pip install -e .
  fi
fi
