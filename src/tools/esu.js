// tools/esu.js - ESU 工具页面逻辑
document.addEventListener('DOMContentLoaded', function() {
  var manifest = chrome.runtime.getManifest();
  var ver = document.getElementById('version-text');
  if (ver) ver.textContent = 'v' + manifest.version + ' - 飞猪国际机票客服提效工具';

  // 上报使用事件
  try {
    chrome.runtime.sendMessage({ action: 'track_popup_open', toolId: 'esu' });
  } catch (e) {}

  // 加载统计信息
  chrome.storage.local.get([
    'esuUsageCount', 'esuPopupCount', 'esuFirstUsed', 'esuLastUsed',
    'esuUpdateAvailable', 'esuRemoteVersion', 'esuUpdateUrl', 'esuReleaseNotes'
  ], function(result) {
    var count = result.esuPopupCount || result.esuUsageCount || 0;
    var countEl = document.getElementById('stat-count');
    if (countEl) countEl.textContent = count + ' 次';

    var firstEl = document.getElementById('stat-first');
    if (firstEl && result.esuFirstUsed) {
      firstEl.textContent = new Date(result.esuFirstUsed).toLocaleDateString('zh-CN');
    }

    var lastEl = document.getElementById('stat-last');
    if (lastEl && result.esuLastUsed) {
      lastEl.textContent = new Date(result.esuLastUsed).toLocaleDateString('zh-CN');
    }

    var verEl = document.getElementById('stat-version');
    if (verEl) verEl.textContent = 'v' + manifest.version;

    var updateBox = document.getElementById('update-box');
    if (updateBox) {
      if (result.esuUpdateAvailable) {
        updateBox.style.display = 'block';
        var updateVer = document.getElementById('update-version');
        if (updateVer) updateVer.textContent = result.esuRemoteVersion || '新版本';
        var updateNotes = document.getElementById('update-notes');
        if (updateNotes) updateNotes.textContent = result.esuReleaseNotes || '发现新版本，建议更新以获得更好的体验。';
      } else {
        updateBox.style.display = 'none';
      }
    }
  });

  // 手动检查更新
  var checkBtn = document.getElementById('btn-check-update');
  if (checkBtn) {
    checkBtn.addEventListener('click', function() {
      checkBtn.textContent = '检查中...';
      checkBtn.disabled = true;
      chrome.runtime.sendMessage({ action: 'check_update_now', toolId: 'esu' }, function() {
        setTimeout(function() {
          chrome.storage.local.get(['esuUpdateAvailable', 'esuRemoteVersion', 'esuReleaseNotes'], function(result) {
            var updateBox = document.getElementById('update-box');
            if (updateBox) {
              if (result.esuUpdateAvailable) {
                updateBox.style.display = 'block';
                var updateVer = document.getElementById('update-version');
                if (updateVer) updateVer.textContent = result.esuRemoteVersion || '新版本';
                var updateNotes = document.getElementById('update-notes');
                if (updateNotes) updateNotes.textContent = result.esuReleaseNotes || '发现新版本，建议更新以获得更好的体验。';
                checkBtn.textContent = '发现新版本';
              } else {
                updateBox.style.display = 'none';
                checkBtn.textContent = '已是最新版';
              }
            }
            setTimeout(function() {
              checkBtn.textContent = '检查更新';
              checkBtn.disabled = false;
            }, 2000);
          });
        }, 1500);
      });
    });
  }

  // 忽略更新
  var skipBtn = document.getElementById('btn-skip-update');
  if (skipBtn) {
    skipBtn.addEventListener('click', function() {
      chrome.storage.local.get(['esuRemoteVersion'], function(result) {
        chrome.runtime.sendMessage({ action: 'skip_update_version', toolId: 'esu', version: result.esuRemoteVersion || '' });
        var updateBox = document.getElementById('update-box');
        if (updateBox) updateBox.style.display = 'none';
      });
    });
  }

  // 下载更新
  var downloadBtn = document.getElementById('btn-download-update');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      chrome.storage.local.get(['esuUpdateUrl'], function(result) {
        var url = result.esuUpdateUrl || '';
        if (url) {
          chrome.tabs.create({ url: url, active: true });
        } else {
          alert('暂无下载地址，请联系管理员获取最新版本。');
        }
      });
    });
  }

  // 返回工具箱
  var backBtn = document.getElementById('btn-back');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      chrome.tabs.getCurrent(function(tab) {
        chrome.tabs.update(tab.id, { url: 'popup.html' });
      });
    });
  }

  // 开始提取按钮
  var extractBtn = document.getElementById('btn-extract');
  if (extractBtn) {
    extractBtn.addEventListener('click', function() {
      var statusEl = document.getElementById('extract-status');
      if (statusEl) statusEl.textContent = '正在查找XP页面...';
      extractBtn.disabled = true;

      // 查找XP页面
      chrome.tabs.query({ url: ['*://fliggy.service.fliggy.com/*', '*://kefu.fliggy.com/*'] }, function(tabs) {
        if (!tabs || tabs.length === 0) {
          if (statusEl) statusEl.textContent = '❌ 未找到XP页面，请先打开飞猪客服页面';
          extractBtn.disabled = false;
          return;
        }

        var xpTab = tabs[0];
        chrome.tabs.sendMessage(xpTab.id, { action: 'esu_extract' }, function(response) {
          if (chrome.runtime.lastError || !response || !response.data) {
            if (statusEl) statusEl.textContent = '❌ 提取失败，请刷新XP页面后重试';
            extractBtn.disabled = false;
            return;
          }

          var data = response.data;
          var filled = Object.keys(data).filter(function(k) { return data[k] && data[k].trim(); });

          if (statusEl) statusEl.textContent = '✅ 已提取 ' + filled.length + ' 个字段，正在跳转...';

          // 发送数据到 background
          chrome.runtime.sendMessage({ action: 'extract_done', data: data }, function() {
            if (statusEl) statusEl.textContent = '✅ 已保存，正在打开宜搭页面...';
          });
        });
      });

      setTimeout(function() {
        extractBtn.disabled = false;
      }, 3000);
    });
  }
});
