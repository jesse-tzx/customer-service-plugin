/**
 * background.js - 工具箱框架 Service Worker
 * v5.0 - 统一版本检查 + 多工具统计上报
 */

const YIDA_FORM_URL = 'https://yida.alibaba-inc.com/alibaba/web/APP_TKSIQSOUEFVBPW804P1B/inst/homepage/?spm=a1z32v.26049330.0.0.37f6611eM0cSEe&short_name=I3.VUOKa&app=chrome#/FORM-RJA66971ZK87LMEW5SGY6CJYVZ532CESQ9RCLI9';

// 防重复打开标记
var lastOpenTime = 0;

// ===== 上报到服务端（fire-and-forget，失败静默）=====
function reportToServer(action, extra) {
  // 从 tools.json 读取配置
  fetch('tools.json')
    .then(function(res) { return res.json(); })
    .then(function(config) {
      var settings = config.settings || {};
      if (!settings.reportEnabled || !settings.reportUrl) return;

      chrome.storage.local.get(['esuUserId', 'esuFirstUsed'], function(result) {
        var payload = {
          userId: result.esuUserId || 'unknown',
          action: action,
          version: chrome.runtime.getManifest().version,
          timestamp: new Date().toISOString(),
          firstUsed: result.esuFirstUsed || null,
          extra: extra || {}
        };

        try {
          fetch(settings.reportUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            mode: 'cors',
            cache: 'no-store'
          }).catch(function() {});
        } catch (e) {}
      });
    })
    .catch(function() {});
}

// ===== 初始化用户ID =====
function initUsageTracking() {
  chrome.storage.local.get(['esuUserId', 'esuFirstUsed'], function(result) {
    var data = {};
    if (!result.esuUserId) {
      data.esuUserId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      data.esuFirstUsed = new Date().toISOString();
      console.log('[Toolbox] 新用户: ' + data.esuUserId);
    }
    chrome.storage.local.set(data);
  });
}

// ===== 统计上报 =====
function trackEvent(action, toolId, extra) {
  var storageKey = toolId + (action === 'extract_data' ? 'ExtractCount' : 'PopupCount');
  chrome.storage.local.get([storageKey, 'esuFirstUsed'], function(result) {
    var count = (result[storageKey] || 0) + 1;
    var storeData = {};
    storeData[storageKey] = count;
    if (!result.esuFirstUsed) {
      storeData.esuFirstUsed = new Date().toISOString();
    }
    chrome.storage.local.set(storeData, function() {
      console.log('[Toolbox] ' + toolId + ' ' + action + ': 第' + count + '次');
      reportToServer(action, { toolId: toolId, count: count, extra: extra || {} });
    });
  });
}

// ===== 自动更新检查（支持多工具）=====
function checkAllUpdates(force) {
  var manifest = chrome.runtime.getManifest();
  var currentVersion = manifest.version;

  fetch('tools.json')
    .then(function(res) { return res.json(); })
    .then(function(config) {
      var tools = config.tools || [];
      var settings = config.settings || {};
      var intervalMs = (settings.updateCheckIntervalHours || 2) * 3600000;

      tools.forEach(function(tool) {
        if (!tool.enabled || !tool.versionCheckUrl) return;
        if (/your-server\.com|example\.com|localhost/.test(tool.versionCheckUrl)) return;

        chrome.storage.local.get([tool.id + 'LastCheckTime', tool.id + 'SkipVersion'], function(result) {
          var now = Date.now();
          var key = tool.id + 'LastCheckTime';
          if (!force && result[key] && (now - result[key] < intervalMs)) return;

          console.log('[Toolbox] 检查 ' + tool.name + ' 更新...');

          fetch(tool.versionCheckUrl, { method: 'GET', cache: 'no-cache' })
            .then(function(res) {
              if (!res.ok) throw new Error('HTTP ' + res.status);
              return res.json();
            })
            .then(function(data) {
              var remoteVersion = data.version || '';
              var skipVersion = result[tool.id + 'SkipVersion'] || '';
              var storeObj = {};
              storeObj[key] = now;
              chrome.storage.local.set(storeObj);

              if (remoteVersion && compareVersion(remoteVersion, tool.version) > 0 && remoteVersion !== skipVersion) {
                var updateObj = {};
                updateObj[tool.id + 'UpdateAvailable'] = true;
                updateObj[tool.id + 'RemoteVersion'] = remoteVersion;
                updateObj[tool.id + 'UpdateUrl'] = data.downloadUrl || '';
                updateObj[tool.id + 'ReleaseNotes'] = data.releaseNotes || '';
                chrome.storage.local.set(updateObj);
              } else {
                var noUpdateObj = {};
                noUpdateObj[tool.id + 'UpdateAvailable'] = false;
                chrome.storage.local.set(noUpdateObj);
              }
            })
            .catch(function(err) {
              console.log('[Toolbox] ' + tool.name + ' 更新检查失败:', err.message);
            });
        });
      });
    })
    .catch(function(err) {
      console.log('[Toolbox] 加载工具配置失败:', err.message);
    });
}

function compareVersion(v1, v2) {
  var a1 = v1.split('.').map(Number);
  var a2 = v2.split('.').map(Number);
  var len = Math.max(a1.length, a2.length);
  for (var i = 0; i < len; i++) {
    var n1 = a1[i] || 0;
    var n2 = a2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

// ===== 扩展安装/启动 =====
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    console.log('[Toolbox] 首次安装');
  }
  onExtensionReady();
  setTimeout(function() { checkAllUpdates(true); }, 5000);
});

chrome.runtime.onStartup.addListener(function() {
  onExtensionReady();
  setTimeout(function() { checkAllUpdates(false); }, 10000);
});

chrome.alarms && chrome.alarms.onAlarm && chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name === 'toolbox-update-check') {
    checkAllUpdates(false);
  }
});

function setupUpdateAlarm() {
  if (chrome.alarms) {
    chrome.alarms.create('toolbox-update-check', { periodInMinutes: 120 });
  } else {
    setInterval(function() { checkAllUpdates(false); }, 7200000);
  }
}
setupUpdateAlarm();

// ===== 扩展启动/重新加载 =====
function onExtensionReady() {
  console.log('[Toolbox] 扩展已加载，开始重新注入...');
  initUsageTracking();

  const yidaPatterns = ['*://yida.alibaba-inc.com/*'];
  const xpPatterns = ['*://fliggy.service.fliggy.com/*', '*://kefu.fliggy.com/*'];

  chrome.tabs.query({}, (tabs) => {
    for (const tab of tabs) {
      if (!tab.url) continue;
      if (xpPatterns.some(p => matchPattern(p, tab.url))) {
        injectCleanupScript(tab.id, 'xp');
      }
      if (yidaPatterns.some(p => matchPattern(p, tab.url))) {
        injectCleanupScript(tab.id, 'yida', () => {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content_yida.js'],
          }).catch(err => {
            console.log('[Toolbox] 宜搭注入失败 tab ' + tab.id + ':', err.message);
          });
        });
      }
    }
  });
}

function injectCleanupScript(tabId, type, callback) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (t) => {
      if (t === 'yida') {
        window.__ESU_YIDA_LOADED = true;
      } else {
        window.__ESU_XP_LOADED = true;
      }
      window.__ESU_CLEANED = true;
      const oldBtn = document.getElementById('esu-copy-btn');
      if (oldBtn) oldBtn.remove();
      const oldYidaBtn = document.getElementById('esu-yida-fill-btn');
      if (oldYidaBtn) oldYidaBtn.parentElement?.remove();
      const oldPanel = document.getElementById('esu-debug-panel');
      if (oldPanel) oldPanel.remove();
    },
    args: [type],
    world: 'MAIN',
  }).then(() => {
    if (callback) callback();
  }).catch(() => {
    if (callback) callback();
  });
}

function matchPattern(pattern, url) {
  const regex = pattern.replace(/\*/g, '.*').replace(/\?/g, '\\?');
  return new RegExp('^' + regex + '$').test(url);
}

// ===== 消息处理 =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'extract_done') {
    var toolId = msg.toolId || 'esu';
    var now = Date.now();
    if (now - lastOpenTime < 5000) {
      sendResponse({ ok: true, skipped: true });
      return;
    }
    lastOpenTime = now;

    chrome.storage.local.set({ esuData: msg.data }, () => {});
    trackEvent('extract_data', toolId, msg.data);
    chrome.tabs.create({ url: YIDA_FORM_URL, active: true });
    sendResponse({ ok: true });
  }

  if (msg.action === 'get_data') {
    chrome.storage.local.get('esuData', (result) => {
      sendResponse(result.esuData || null);
    });
    return true;
  }

  if (msg.action === 'clear_data') {
    chrome.storage.local.remove('esuData');
    sendResponse({ ok: true });
  }

  // 打开工具箱
  if (msg.action === 'open_toolbox') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html'), active: true });
    sendResponse({ ok: true });
  }

  // 获取工具列表（供 content_xp.js 调用）
  if (msg.action === 'get_tool_list') {
    fetch(chrome.runtime.getURL('tools.json'))
      .then(function(res) { return res.json(); })
      .then(function(config) {
        sendResponse({ tools: config.tools || [] });
      })
      .catch(function() {
        sendResponse({ tools: [] });
      });
    return true; // 保持消息通道开放
  }

  // 打开工具 URL
  if (msg.action === 'open_tool_url') {
    var openUrl = msg.url;
    // 如果是相对路径（不含 ://），用 chrome.runtime.getURL 转为扩展内地址
    if (openUrl.indexOf('://') < 0) {
      openUrl = chrome.runtime.getURL(openUrl);
    }
    chrome.tabs.create({ url: openUrl, active: true });
    sendResponse({ ok: true });
  }

  // 打开工具页面
  if (msg.action === 'open_tool_page') {
    chrome.tabs.create({ url: chrome.runtime.getURL(msg.page), active: true });
    sendResponse({ ok: true });
  }

  if (msg.action === 'track_popup_open') {
    trackEvent('popup_open', msg.toolId || 'toolbox');
    sendResponse({ ok: true });
  }

  if (msg.action === 'track_tool_open') {
    trackEvent('tool_open', msg.toolId);
    sendResponse({ ok: true });
  }

  if (msg.action === 'check_update_now') {
    checkAllUpdates(true);
    sendResponse({ ok: true, checking: true });
  }

  if (msg.action === 'skip_update_version') {
    chrome.storage.local.set({ [msg.toolId + 'SkipVersion']: msg.version || '' });
    sendResponse({ ok: true });
  }
});

// ===== 主动注入 tid 自动填充到 recall 页面（含 iframe）=====
chrome.webNavigation.onCompleted.addListener(
  function (details) {
    // 从 storage 读 tid，然后直接注入带 tid 值的内联函数
    chrome.storage.local.get(['recallTid', 'recallTidTime'], function (result) {
      var tid = result.recallTid;
      var tidTime = result.recallTidTime || 0;
      if (!tid || (Date.now() - tidTime > 600000)) return; // 过期不填

      chrome.scripting.executeScript({
        target: { tabId: details.tabId, frameIds: [details.frameId] },
        world: 'MAIN',
        func: function (tidValue) {
          // 已注入的情况：tid 可能换了（用户切换订单），更新闭包共享的 tid 即可
          if (window.__toolboxRecall) {
            console.log('[Toolbox-Recall] 已注入，更新 tid:', tidValue);
            window.__toolboxRecall.tid = tidValue;
            // 重置 filledInputs，让旧输入框能用新 tid 重填
            window.__toolboxRecall.filledInputs = new WeakSet();
            // 立即扫描一次
            if (typeof window.__toolboxRecall.scanAndFill === 'function') {
              window.__toolboxRecall.scanAndFill();
            }
            // 重启 30 秒轮询
            if (window.__toolboxRecall.pollTimer) clearInterval(window.__toolboxRecall.pollTimer);
            var rePollCount = 0;
            window.__toolboxRecall.pollTimer = setInterval(function () {
              rePollCount++;
              window.__toolboxRecall.scanAndFill();
              if (rePollCount >= 60) clearInterval(window.__toolboxRecall.pollTimer);
            }, 500);
            return;
          }

          var state = window.__toolboxRecall = {
            tid: tidValue,
            filledInputs: new WeakSet(),
          };

          console.log('[Toolbox-Recall] MAIN world 首次注入, tid:', tidValue);

          function fillInput(input) {
            var setter = Object.getOwnPropertyDescriptor(
              HTMLInputElement.prototype, 'value'
            ).set;
            setter.call(input, state.tid);

            // React 16+ 通过 _valueTracker 比较，需要先清空才能让 onChange 触发
            var tracker = input._valueTracker;
            if (tracker) tracker.setValue('');

            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            state.filledInputs.add(input);
            console.log('[Toolbox-Recall] tid 已填充:', state.tid);
          }

          function isTidInput(input) {
            var placeholder = input.placeholder || '';
            if (placeholder.indexOf('对应值') < 0 && placeholder.indexOf('请输入') < 0) return false;
            var p = input;
            for (var d = 0; d < 8; d++) {
              p = p.parentElement;
              if (!p) break;
              var t = p.textContent || '';
              if (t.length > 300) t = t.substring(0, 300);
              if (/tid/i.test(t)) return true;
            }
            return false;
          }

          function scanAndFill() {
            if (!state.tid) return;
            var inputs = document.querySelectorAll('input, textarea');
            for (var i = 0; i < inputs.length; i++) {
              var input = inputs[i];
              if (state.filledInputs.has(input)) continue;
              if (input.value && input.value === state.tid) {
                state.filledInputs.add(input);
                continue;
              }
              if (input.value) continue; // 用户已手动填了就别覆盖
              if (isTidInput(input)) fillInput(input);
            }
          }
          state.scanAndFill = scanAndFill;

          // 立即扫描一次
          scanAndFill();

          // 持续轮询 30 秒（不因找到就停，因为切 tab 后会出现新输入框）
          var pollCount = 0;
          state.pollTimer = setInterval(function () {
            pollCount++;
            scanAndFill();
            if (pollCount >= 60) {
              clearInterval(state.pollTimer);
              console.log('[Toolbox-Recall] 30 秒轮询结束');
            }
          }, 500);

          // MutationObserver 长期监听 DOM 变化（不断开，切 tab/切订单都能响应）
          try {
            state.observer = new MutationObserver(function () {
              scanAndFill();
            });
            state.observer.observe(document.body, { childList: true, subtree: true });
          } catch (e) {}
        },
        args: [tid]
      }).catch(function (err) {
        console.log('[Toolbox] recall 注入失败:', err.message);
      });
    });
  },
  { url: [{ hostEquals: 'recall.alibaba-inc.com' }] }
);
