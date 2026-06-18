#!/bin/bash
set -euo pipefail

REPO="jesse-tzx/customer-service-plugin"
RAW_BASE="https://raw.githubusercontent.com/$REPO/main"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

error() { echo -e "${RED}✗ $1${NC}" >&2; exit 1; }
ok()    { echo -e "${GREEN}✓ $1${NC}"; }
info()  { echo -e "${YELLOW}→ $1${NC}"; }

# ── 前置检查 ──────────────────────────────────────────────

if [ ! -d "src" ] || [ ! -f "src/manifest.json" ]; then
  error "src/manifest.json 不存在，请把插件源码放到 src/ 目录"
fi

# ── 版本号 ────────────────────────────────────────────────

VERSION="${1:-}"
if [ -z "$VERSION" ]; then
  if command -v python3 >/dev/null 2>&1; then
    VERSION=$(python3 -c "import json; print(json.load(open('src/manifest.json'))['version'])")
  elif command -v node >/dev/null 2>&1; then
    VERSION=$(node -e "console.log(require('./src/manifest.json').version)")
  else
    error "请传入版本号: ./publish.sh 5.4"
  fi
  info "从 manifest.json 读取版本: $VERSION"
fi

# ── 打包 .crx ─────────────────────────────────────────────

CHROME_PATH=""
for p in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary" \
  "/usr/bin/google-chrome" \
  "/usr/bin/google-chrome-stable"; do
  [ -x "$p" ] && CHROME_PATH="$p" && break
done

mkdir -p build

if [ -n "$CHROME_PATH" ]; then
  info "使用 Chrome 打包: $CHROME_PATH"
  "$CHROME_PATH" --pack-extension=src --pack-extension-key=key.pem 2>/dev/null || true
  if [ -f "src.crx" ]; then
    mv src.crx build/extension.crx
    ok "打包完成: build/extension.crx"
  else
    info "Chrome 打包失败，使用 zip 方式..."
    (cd src && zip -r "../build/extension.crx" . -x '*.DS_Store' '*.git*')
    ok "zip 打包完成: build/extension.crx"
  fi
else
  info "未找到 Chrome，使用 zip 打包..."
  (cd src && zip -r "../build/extension.crx" . -x '*.DS_Store' '*.git*')
  ok "zip 打包完成: build/extension.crx"
fi

# ── 更新 updates.xml ──────────────────────────────────────

# .crx 直接提交到仓库，URL 固定为 raw.githubusercontent.com
CODEBASE_URL="$RAW_BASE/extension.crx"

if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s|version='[0-9][0-9.]*'|version='$VERSION'|" updates.xml
  sed -i '' "s|codebase='[^']*'|codebase='$CODEBASE_URL'|" updates.xml
else
  sed -i "s|version='[0-9][0-9.]*'|version='$VERSION'|" updates.xml
  sed -i "s|codebase='[^']*'|codebase='$CODEBASE_URL'|" updates.xml
fi
ok "updates.xml 已更新 → version=$VERSION"

# ── 提交推送 ──────────────────────────────────────────────

cp build/extension.crx extension.crx

git add updates.xml extension.crx
git commit -m "chore: bump to v$VERSION" 2>/dev/null || true
git push origin main
ok "已推送到 GitHub"

echo ""
echo -e "${GREEN}════════════════════════════════════════${NC}"
echo -e "${GREEN}  v$VERSION 发布完成！${NC}"
echo -e "${GREEN}  同事的 Chrome 会在下次检查更新时自动升级${NC}"
echo -e "${GREEN}  手动触发: chrome://extensions → 刷新按钮${NC}"
echo -e "${GREEN}════════════════════════════════════════${NC}"
