# 飞猪客服工具箱 - Chrome 内部分发

内部客服系统 Chrome 浏览器插件（飞猪客服工具箱 v5.6），基于 Chrome Enterprise Policy 自动分发。

## 仓库地址

`https://github.com/jesse-tzx/customer-service-plugin`

---

## 同事安装（一次性）

### Windows

1. 下载 [install-user.reg](./install-user.reg)（不需要管理员权限）
2. **双击运行** → 确认导入注册表
3. **重启 Chrome**（完全退出，包括托盘图标）
4. 打开 `chrome://extensions/` 确认插件已出现 ✅

### Mac

**方式一：双击描述文件（推荐）**

1. 下载 [install.mobileconfig](./install.mobileconfig)
2. **双击运行** → 系统设置会自动打开 → 点击「安装」
3. **重启 Chrome**（⌘Q 完全退出）
4. 打开 `chrome://extensions/` 确认插件已出现 ✅

**方式二：终端脚本**

```bash
# 下载并运行
curl -o install-mac.sh https://raw.githubusercontent.com/jesse-tzx/customer-service-plugin/main/install-mac.sh
bash install-mac.sh
```

然后重启 Chrome。

后续版本更新 Chrome 自动完成，不需要再操作。

---

## 开发者发布新版本

有两种方式发布：

### 方式一：本地脚本（原始方式）

```bash
# 指定版本号
./publish.sh 5.7

# 或自动读取 src/manifest.json 里的 version
./publish.sh
```

脚本自动完成：打包 .crx → 更新 updates.xml → git push。

### 方式二：Skill + GitHub Actions（推荐，适合非技术维护者）

安装 skill 后，只需对 Claude Code 说：

```
帮我发布新版本，代码在 ~/Downloads/plugin-v5.7/
```

Skill 会自动完成：
1. 复制新代码到 `src/`
2. 更新 `manifest.json` 版本号
3. 提交并推送到 GitHub
4. GitHub Actions 自动打包 `.crx` 并更新 `updates.xml`

**安装 Skill：**

```bash
# 克隆仓库
git clone https://github.com/jesse-tsx/customer-service-plugin.git
cd customer-service-plugin

# 安装 skill 到 Claude Code
claude skill install ./skills/chrome-extension-publisher
```

安装后，对 Claude Code 说"发布新版本"即可触发。详细用法见 [SKILL.md](./skills/chrome-extension-publisher/SKILL.md)。

**前提条件：**
- 已加入仓库 collaborators（联系 jesse-tzx）
- 已配置 GitHub 凭证（`gh auth login`）

同事的 Chrome 会在几小时内自动更新，也可手动触发：`chrome://extensions/` → 点击刷新按钮。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `src/` | 插件源码（飞猪客服工具箱） |
| `extension.crx` | 打包后的插件文件（由 publish.sh 生成并提交） |
| `updates.xml` | Chrome 更新清单，托管在 GitHub raw URL |
| `install-user.reg` | Windows 注册表文件（推荐，不需要管理员权限） |
| `install.reg` | Windows 注册表文件（需要管理员权限） |
| `publish.sh` | 一键发布脚本 |

---

## 首次配置（仅开发者，已完成）

### 1. 配置 Extension ID

`updates.xml`、`install-user.reg` 和 `install.reg` 中有 `__EXTENSION_ID__` 占位符，需要替换：

1. Chrome → `chrome://extensions/` → 开发者模式 → 加载已解压的扩展 → 选 `src/`
2. 记下插件 ID
3. 替换：

```bash
sed -i '' 's/__EXTENSION_ID__/你的真实ID/g' updates.xml install-user.reg install.reg
```

### 2. 生成 key.pem

第一次运行 `publish.sh` 时 Chrome 会自动生成 `key.pem`，后续发布必须用同一个 key 才能保持 Extension ID 不变。`.gitignore` 已排除 `*.pem`，**不要把 key.pem 提交到仓库**。

---

## 故障排查

| 问题 | 原因 | 解法 |
|------|------|------|
| 插件未出现 | 注册表未生效 | 完全退出 Chrome 后重开 |
| 更新不生效 | Chrome 缓存 | `chrome://extensions/` 手动点刷新 |
| `updates.xml` 404 | 仓库不是 public | 确认仓库可见性为 Public |
| 打包失败 | 没装 Chrome | publish.sh 会自动 fallback 到 zip 方式 |

---

## 分发原理

### 方式一：本地脚本发布

```
开发者: ./publish.sh 5.4
  → 打包 extension.crx
  → 更新 updates.xml 版本号
  → git push（extension.crx + updates.xml）

同事 Chrome:
  → 注册表策略 → 指向 updates.xml（GitHub raw URL，固定不变）
  → Chrome 定期检查 updates.xml
  → 发现新版本 → 下载 extension.crx → 自动安装
```

### 方式二：Skill + GitHub Actions 发布（推荐）

```
维护者: "帮我发布新版本，代码在 ~/Downloads/plugin/"
  ↓
Claude Code (Skill):
  → 复制新代码到 src/
  → 更新 manifest.json 版本号
  → git commit + push
  ↓
GitHub Actions (自动):
  → 读取 manifest.json 版本号
  → 使用 EXTENSION_KEY 打包 extension.crx
  → 更新 updates.xml 版本号
  → git commit + push
  ↓
同事 Chrome:
  → 检测到 updates.xml 版本变化
  → 自动下载并安装新版本
```

**优势：**
- 维护者不需要本地 Chrome 和 key.pem
- 所有打包在云端完成，环境一致
- 兼容 OpenClaw、QoderWork 等 Agent 平台
