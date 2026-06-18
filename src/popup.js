// popup.js - 工具箱主面板
document.addEventListener('DOMContentLoaded', function() {
  var manifest = chrome.runtime.getManifest();

  // 上报工具箱打开事件
  try {
    chrome.runtime.sendMessage({ action: 'track_popup_open', toolId: 'toolbox' });
  } catch (e) {}

  // 加载工具配置
  fetch('tools.json')
    .then(function(res) { return res.json(); })
    .then(function(config) {
      var tools = config.tools || [];
      var listEl = document.getElementById('tool-list');
      if (!listEl || tools.length === 0) return;

      listEl.innerHTML = '';
      tools.forEach(function(tool) {
        if (!tool.enabled) return;

        var li = document.createElement('li');
        li.className = 'tool-item';

        // 检查是否有更新
        chrome.storage.local.get(tool.id + 'UpdateAvailable', function(result) {
          var key = tool.id + 'UpdateAvailable';
          if (result[key]) {
            li.classList.add('has-update');
          }
        });

        li.innerHTML =
          '<div class="tool-icon">' + (tool.icon || '') + '</div>' +
          '<div class="tool-info">' +
            '<div class="tool-name">' + tool.name + '</div>' +
            '<div class="tool-desc">' + (tool.description || '') + '</div>' +
          '</div>' +
          '<span class="tool-badge badge-latest">最新版</span>';

        li.addEventListener('click', function() {
          try {
            chrome.runtime.sendMessage({ action: 'track_tool_open', toolId: tool.id });
          } catch (e) {}
          window.location.href = tool.page || 'tools/' + tool.id + '.html';
        });

        listEl.appendChild(li);
      });
    })
    .catch(function(err) {
      console.log('[Toolbox] 加载工具配置失败:', err.message);
      var listEl = document.getElementById('tool-list');
      if (listEl) {
        listEl.innerHTML = '<div class="empty-tip">工具配置加载失败，请检查 tools.json</div>';
      }
    });
});
