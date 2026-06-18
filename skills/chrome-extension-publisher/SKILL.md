---
name: chrome-extension-publisher
version: 1.0.0
description: 一键发布 Chrome 浏览器插件到 GitHub，自动打包并分发给所有用户
author: jesse-tzx
homepage: https://github.com/jesse-tzx/customer-service-plugin
---

# Chrome Extension Publisher

帮助维护者一键发布 Chrome 浏览器插件。只需提供新版本代码（文件夹或 zip 包），skill 会自动完成版本更新、推送和打包。

## 工作流程

当维护者说"发布新版本"或类似指令时，按以下步骤执行：

### 1. 初始化仓库（首次使用）

检查本地是否有 `customer-service-plugin` 仓库：

```bash
if [ ! -d "customer-service-plugin" ]; then
  git clone https://github.com/jesse-tsx/customer-service-plugin.git
  cd customer-service-plugin
fi
```

如果已存在，确保在仓库根目录。

### 2. 接收新版本代码

维护者会提供以下之一：
- **文件夹路径**：包含新版本插件代码的目录
- **zip 包路径**：包含新版本插件代码的 zip 文件

**处理文件夹：**
```bash
# 清空 src/ 目录（保留 manifest.json 的位置）
rm -rf src/*

# 复制新代码到 src/
cp -r "$NEW_CODE_PATH"/* src/
```

**处理 zip 包：**
```bash
# 创建临时目录
TEMP_DIR=$(mktemp -d)

# 解压 zip
unzip -q "$ZIP_PATH" -d "$TEMP_DIR"

# 清空并复制
rm -rf src/*
cp -r "$TEMP_DIR"/* src/

# 清理临时目录
rm -rf "$TEMP_DIR"
```

### 3. 确认版本号

读取 manifest.json 中的当前版本：

```bash
CURRENT_VERSION=$(grep -o '"version": "[^"]*"' src/manifest.json | cut -d'"' -f4)
```

询问维护者：
- 当前版本是 `X.Y.Z`
- 新版本号是什么？（或自动 +1，如 5.6 → 5.7）

### 4. 更新版本号

```bash
# macOS
sed -i '' 's/"version": "[^"]*"/"version": "'$NEW_VERSION'"/' src/manifest.json

# Linux
sed -i 's/"version": "[^"]*"/"version": "'$NEW_VERSION'"/' src/manifest.json
```

### 5. 提交并推送

```bash
git add src/
git commit -m "chore: bump version to $NEW_VERSION"
git push origin main
```

### 6. 等待 GitHub Actions

推送后，GitHub Actions 会自动：
- 打包 `extension.crx`
- 更新 `updates.xml` 版本号
- 提交并推送

等待约 1-2 分钟，然后验证：

```bash
# 检查远程 updates.xml
git fetch origin
git show origin/main:updates.xml | grep version
```

应该显示新版本号。

### 7. 确认成功

告诉维护者：
- ✅ 版本已更新到 X.Y.Z
- ✅ GitHub Actions 已完成打包
- ✅ 所有用户的 Chrome 会自动更新

## 示例对话

**维护者：** 帮我发布新版本，代码在 `~/Downloads/plugin-v5.7/`

**Claude：**
1. 检查仓库 → 存在
2. 清空 `src/` 并复制新代码
3. 读取当前版本：5.6
4. 询问新版本号 → 维护者说 5.7
5. 更新 `manifest.json` 版本号为 5.7
6. 提交并推送
7. 等待 GitHub Actions
8. 验证 `updates.xml` 显示版本 5.7
9. 告诉维护者发布成功

## 故障排查

### GitHub Actions 失败
- 检查 `EXTENSION_KEY` Secret 是否配置正确
- 查看 GitHub Actions 日志：https://github.com/jesse-tzx/customer-service-plugin/actions

### 推送失败
- 确认维护者已加入仓库 collaborators
- 检查 git 凭证是否有效：`git push --dry-run`

### 版本号冲突
- 如果 GitHub Actions 检测到版本未变化，会跳过提交
- 确保 `manifest.json` 中的版本号已正确更新

## 技术细节

- **仓库地址**：https://github.com/jesse-tsx/customer-service-plugin
- **GitHub Actions**：`.github/workflows/publish.yml`
- **自动打包**：使用 Chrome 的 `--pack-extension` 功能
- **分发机制**：Chrome Enterprise Policy + GitHub Raw URL
- **用户安装**：双击 `install-user.reg`（Windows）或 `install.mobileconfig`（Mac）
