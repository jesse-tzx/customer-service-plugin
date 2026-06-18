# Customer Service System Browser Plugin

内部客服系统 Chrome 浏览器插件 — 基于 Chrome Enterprise Policy 的自动分发方案。

## 快速开始（首次配置）

### 1. 初始化（仅开发者执行一次）

```bash
# 安装 gh CLI（GitHub 命令行工具）
brew install gh
gh auth login

# 在 GitHub 上创建公开仓库
gh repo create customer-service-plugin --public --source=. --push
```

### 2. 配置 Extension ID

1. 把你的插件源码放入 `src/` 目录
2. 打开 Chrome → `chrome://extensions/` → 开启「开发者模式」→ 「加载已解压的扩展」→ 选择 `src/`
3. 记下插件 ID（一串字母，如 `abcdefghijklmnop`）
4. 替换以下文件中的 `__EXTENSION_ID__`：
   - `updates.xml`
   - `install.reg`

```bash
# 替换命令（把 abcdefghijklmnop 换成你的真实 ID）
sed -i '' 's/__EXTENSION_ID__/abcdefghijklmnop/g' updates.xml install.reg
```

---

## 同事安装（一次性操作）

### Windows 同事

1. 下载 [install.reg](./install.reg)
2. **双击运行** → 确认导入注册表
3. **重启 Chrome**
4. 插件自动安装，后续自动更新 ✅

### 手动验证安装成功

打开 `chrome://extensions/`，确认插件出现在列表中。

---

## 开发者发布新版本

```bash
# 方式一：指定版本号
./publish.sh 1.0.1

# 方式二：自动读取 src/manifest.json 里的 version
./publish.sh
```

脚本会自动完成：打包 .crx → 创建 GitHub Release → 更新 updates.xml → 提交推送。

同事的 Chrome 会在下次检查更新时自动升级（通常几小时内），也可手动触发：`chrome://extensions/` → 点击刷新按钮。

---

## 文件说明

| 文件 | 用途 |
|------|------|
| `src/` | 插件源码目录（你放置代码的地方） |
| `updates.xml` | Chrome 更新清单，托管在 GitHub raw URL |
| `install.reg` | Windows 注册表文件，同事双击安装 |
| `publish.sh` | 一键发布脚本 |
| `build/` | 构建产物（.crx），已被 .gitignore 忽略 |

---

## 故障排查

| 问题 | 原因 | 解法 |
|------|------|------|
| 插件未出现 | 注册表未生效 | 完全退出 Chrome（包括托盘图标）后重开 |
| 更新不生效 | Chrome 缓存 | `chrome://extensions/` 手动点刷新 |
| `updates.xml` 404 | 仓库不是 public | 确认仓库可见性为 Public |
| `gh` 命令报错 | 未登录 | `gh auth login` 重新登录 |

---

## 分发原理

```
开发者: publish.sh
  → GitHub Release (.crx) + updates.xml (version bump)
  → git push

同事 Chrome:
  → 注册表策略指向 updates.xml (raw GitHub URL)
  → Chrome 定期检查 updates.xml
  → 发现新版本 → 自动下载 .crx → 自动安装
```
