#!/bin/bash
# 飞猪客服工具箱 - Mac 安装脚本
# 用法: 下载后在终端运行 bash install-mac.sh

POLICY_DIR="$HOME/Library/Application Support/Google/Chrome/Default/policies"
POLICY_FILE="$POLICY_DIR/managed/extension_install.json"

echo "正在配置 Chrome 策略..."

mkdir -p "$POLICY_DIR/managed"

cat > "$POLICY_FILE" << 'EOF'
{
  "ExtensionInstallForcelist": [
    "cmibplmpbmaocmjmmpbjnocmecboiffj;https://raw.githubusercontent.com/jesse-tzx/customer-service-plugin/main/updates.xml"
  ]
}
EOF

echo "✅ 配置完成！"
echo "请完全退出 Chrome（⌘Q），然后重新打开。"
echo "打开 chrome://extensions/ 确认插件已安装。"
