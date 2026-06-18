/**
 * content_xp.js - XP页面工具箱入口 + 数据提取
 * v5.0 - 工具箱框架
 */

(function () {
  'use strict';

  console.log('[Toolbox] content_xp.js v5.0 已加载');

  if (window.__ESU_XP_LOADED) {
    console.log('[Toolbox] 已加载过，跳过');
    return;
  }
  window.__ESU_XP_LOADED = true;

  // ===== 工具箱入口按钮 + 工具选择面板 =====
  function createToolboxButton() {
    if (document.getElementById('toolbox-btn')) return;

    var btn = document.createElement('button');
    btn.id = 'toolbox-btn';
    btn.textContent = '🧰 工具箱';
    btn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:2147483647;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:6px;padding:6px 14px;font-size:13px;font-weight:600;cursor:grab;box-shadow:0 2px 8px rgba(102,126,234,0.4);';

    // 拖拽状态
    var dragging = false;
    var dragged = false;
    var startX = 0, startY = 0, origX = 0, origY = 0;

    btn.addEventListener('pointerdown', function(e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      dragging = true;
      dragged = false;
      startX = e.clientX;
      startY = e.clientY;
      var rect = btn.getBoundingClientRect();
      origX = rect.left;
      origY = rect.top;
      btn.setPointerCapture(e.pointerId);
      btn.style.cursor = 'grabbing';
      e.preventDefault();
    });

    btn.addEventListener('pointermove', function(e) {
      if (!dragging) return;
      var dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        dragged = true;
        btn.style.right = 'auto';
        btn.style.top = (origY + dy) + 'px';
        btn.style.left = (origX + dx) + 'px';
      }
    });

    btn.addEventListener('pointerup', function(e) {
      if (!dragging) return;
      dragging = false;
      btn.style.cursor = 'grab';
      // 注意：不使用 preventDefault()，让 click 事件正常触发
    });

    btn.addEventListener('click', function() {
      // 如果是拖拽操作，不执行点击逻辑
      if (dragged) {
        dragged = false;
        return;
      }
      if (document.getElementById('toolbox-panel')) {
        document.getElementById('toolbox-panel').remove();
        return;
      }
      showToolPanel();
    });

    document.body.appendChild(btn);
    console.log('[Toolbox] 工具箱入口按钮已创建');
  }

  // ===== 工具选择面板 =====
  function showToolPanel() {
    // 先移除已存在的面板
    var existing = document.getElementById('toolbox-panel');
    if (existing) existing.remove();

    var panel = document.createElement('div');
    panel.id = 'toolbox-panel';
    panel.style.cssText = 'position:fixed;top:42px;right:10px;z-index:2147483647;background:#fff;border-radius:10px;box-shadow:0 4px 20px rgba(0,0,0,0.15);min-width:220px;padding:12px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

    var title = document.createElement('div');
    title.textContent = '飞猪客服工具箱';
    title.style.cssText = 'font-size:14px;font-weight:600;color:#333;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid #eee;';
    panel.appendChild(title);

    var list = document.createElement('div');
    list.id = 'toolbox-list';
    list.style.cssText = 'display:flex;flex-direction:column;gap:6px;';

    // 加载提示
    var loading = document.createElement('div');
    loading.textContent = '加载中...';
    loading.style.cssText = 'color:#999;font-size:12px;padding:8px 0;text-align:center;';
    list.appendChild(loading);

    panel.appendChild(list);
    document.body.appendChild(panel);

    // 直接读取 tools.json（绕过 Service Worker，避免 MV3 消息丢失）
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
        fetch(chrome.runtime.getURL('tools.json'))
          .then(function(res) { return res.json(); })
          .then(function(config) {
            list.innerHTML = '';
            var tools = config && config.tools ? config.tools : [];
            if (tools.length === 0) {
              list.innerHTML = '<div style="color:#999;font-size:12px;padding:8px 0;text-align:center;">暂无可用工具</div>';
              return;
            }
            tools.forEach(function(tool) {
              if (!tool.enabled) return;
              var item = document.createElement('div');
              item.style.cssText = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;cursor:pointer;transition:background 0.15s;';
              item.addEventListener('mouseenter', function() { item.style.background = '#f5f5f5'; });
              item.addEventListener('mouseleave', function() { item.style.background = ''; });
              item.addEventListener('click', function() {
                executeTool(tool);
              });

              var icon;
              if (tool.icon && /\.(png|jpg|jpeg|svg|gif)$/i.test(tool.icon)) {
                icon = document.createElement('img');
                icon.src = chrome.runtime.getURL(tool.icon);
                icon.style.cssText = 'width:22px;height:22px;object-fit:contain;flex-shrink:0;';
                icon.onerror = function() { icon.style.display = 'none'; };
              } else {
                icon = document.createElement('span');
                icon.textContent = tool.icon || '';
                icon.style.cssText = 'font-size:20px;';
              }

              var info = document.createElement('div');
              info.style.cssText = 'flex:1;';

              var name = document.createElement('div');
              name.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:13px;font-weight:500;color:#333;';
              // ESU 前加红色标记
              if (tool.id === 'esu') {
                var badge = document.createElement('span');
                badge.textContent = '';
                badge.style.cssText = 'display:inline-block;width:8px;height:8px;background:#ff4d4f;border-radius:50%;flex-shrink:0;';
                name.appendChild(badge);
              }
              var nameText = document.createElement('span');
              nameText.textContent = tool.name;
              name.appendChild(nameText);

              var desc = document.createElement('div');
              desc.textContent = tool.description || '';
              desc.style.cssText = 'font-size:11px;color:#888;margin-top:2px;';

              info.appendChild(name);
              if (tool.description) info.appendChild(desc);
              item.appendChild(icon);
              item.appendChild(info);
              list.appendChild(item);
            });
          })
          .catch(function(err) {
            list.innerHTML = '<div style="color:#999;font-size:12px;padding:8px 0;text-align:center;">加载失败：' + (err && err.message ? err.message : '未知错误') + '</div>';
          });
      } else {
        list.innerHTML = '<div style="color:#999;font-size:12px;padding:8px 0;text-align:center;">扩展未就绪，请刷新页面或重新加载扩展</div>';
      }
    } catch (e) {
      list.innerHTML = '<div style="color:#999;font-size:12px;padding:8px 0;text-align:center;">扩展环境异常，请刷新页面</div>';
    }
  }

  // ===== 执行工具 =====
  function executeTool(tool) {
    // 关闭面板
    var panel = document.getElementById('toolbox-panel');
    if (panel) panel.remove();

    if (tool.type === 'extract' || tool.id === 'esu') {
      // ESU 一键报备：直接提取数据并跳转宜搭
      executeESU(tool);
    } else if (tool.id === 'refund_calculator') {
      // 退改费用计算器：在当前页面弹出面板
      showRefundPanel();
    } else if (tool.type === 'panel') {
      // 悬浮 iframe 面板：内嵌外部工具页面
      showIframePanel(tool);
    } else if (tool.type === 'open_url') {
      // 打开指定 URL
      if (chrome && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ action: 'open_tool_url', url: tool.url });
      }
    } else {
      // 默认：打开工具页面
      if (chrome && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ action: 'open_tool_page', page: tool.page });
      }
    }
  }

  // ===== ESU 一键报备执行 =====
  function executeESU(tool) {
    // 上报打开计数
    if (chrome && chrome.runtime && chrome.runtime.id) {
      chrome.runtime.sendMessage({ action: 'track_tool_open', toolId: 'esu' });
    }

    // 提取数据
    if (window.__esuExtractData) {
      var data = window.__esuExtractData();
      // 检查是否提取到有效数据
      var hasData = false;
      for (var key in data) {
        if (data[key] && data[key].length > 0) { hasData = true; break; }
      }
      if (!hasData) {
        // 显示提示
        showTip('未提取到数据，请确认当前在工单详情页', '#ff6b6b');
        return;
      }
      // 发送到 background 处理（计数 + 打开宜搭）
      if (chrome && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ action: 'extract_done', data: data, toolId: 'esu' });
      }
    } else {
      showTip('数据提取功能未就绪，请刷新页面', '#ff6b6b');
    }
  }

  // ===== 提示信息 =====
  function showTip(msg, color) {
    var tip = document.getElementById('toolbox-tip');
    if (tip) tip.remove();
    tip = document.createElement('div');
    tip.id = 'toolbox-tip';
    tip.textContent = msg;
    tip.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:2147483647;background:' + (color || '#4caf50') + ';color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;box-shadow:0 4px 12px rgba(0,0,0,0.2);';
    document.body.appendChild(tip);
    setTimeout(function() { if (tip && tip.parentNode) tip.remove(); }, 3000);
  }

  // ===== 数据提取功能（供 ESU 工具调用）=====
  function isInOurContainer(el) {
    var node = el;
    while (node) { if (node.id && node.id.indexOf('esu-') === 0) return true; node = node.parentElement; }
    return false;
  }

  function isOurText(text) {
    if (!text) return true;
    return text.indexOf('一键复制') >= 0 || text.indexOf('正在提取') >= 0 || text.indexOf('ESU报备') >= 0 ||
      text.indexOf('已复制') >= 0 || text.indexOf('提取失败') >= 0 || text.indexOf('复制失败') >= 0;
  }

  function isElementVisible(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    var style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return true;
  }

  function getActivePanel() {
    var activeContainers = document.querySelectorAll('[class*="active"], [class*="tab-active"], [aria-selected="true"]');
    for (var i = 0; i < activeContainers.length; i++) {
      var container = activeContainers[i];
      if (isInOurContainer(container)) continue;
      var caseIdEl = container.querySelector('.case-id, [class*="case-id"], .xixikf-fliggy-ticket-view-card_components-case-basic-info_case-id');
      if (caseIdEl && isElementVisible(caseIdEl)) {
        var rect = container.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 100) return container;
      }
    }
    var allLabels = document.querySelectorAll('span, div, label, th, dt, p, em, strong, td');
    for (var j = 0; j < allLabels.length; j++) {
      var el = allLabels[j];
      if (isInOurContainer(el)) continue;
      var text = el.textContent.trim();
      if (text === '工单编号' || text.indexOf('工单编号') >= 0) {
        if (!isElementVisible(el)) continue;
        var container = el;
        var current = el;
        while (current.parentElement && current.parentElement !== document.body) {
          var pr = current.parentElement.getBoundingClientRect();
          if (pr.width > 50 && pr.height > 50 && isElementVisible(current.parentElement)) {
            container = current.parentElement;
            current = current.parentElement;
          } else break;
        }
        return container;
      }
    }
    return document.body;
  }

  function getSkillGroup() {
    var panel = getActivePanel();
    var allEls = panel.querySelectorAll('span, div, td, th, label, dt');
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      if (isInOurContainer(el)) continue;
      if (!isElementVisible(el)) continue;
      var text = el.textContent.trim();
      if (text === '技能组名' || text.indexOf('技能组名') >= 0) {
        var next = el.nextElementSibling;
        while (next) {
          if (!isInOurContainer(next) && isElementVisible(next)) {
            var tag = next.tagName ? next.tagName.toUpperCase() : '';
            if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'BR', 'HR'].indexOf(tag) < 0) {
              var val = next.textContent.trim();
              if (val && val !== '技能组名') return val;
            }
          }
          next = next.nextElementSibling;
        }
        if (el.parentElement && !isInOurContainer(el.parentElement)) {
          var pn = el.parentElement.nextElementSibling;
          if (pn && !isInOurContainer(pn) && isElementVisible(pn)) {
            var val2 = pn.textContent.trim();
            if (val2 && val2 !== '技能组名') return val2;
          }
        }
      }
    }
    return '';
  }

  function findValueBesideLabel(labelText) {
    var panel = getActivePanel();
    var allEls = panel.querySelectorAll('span, div, label, th, dt, p, em, strong, td');
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      if (isInOurContainer(el)) continue;
      var tag = el.tagName ? el.tagName.toUpperCase() : '';
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'LINK', 'META', 'BR', 'HR'].indexOf(tag) >= 0) continue;
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      var rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      var text = el.textContent.trim();
      if (!text || isOurText(text)) continue;
      if (text !== labelText) continue;

      var next = el.nextElementSibling;
      while (next) {
        if (!isInOurContainer(next)) {
          var nr = next.getBoundingClientRect();
          var tag2 = next.tagName ? next.tagName.toUpperCase() : '';
          if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'BR', 'HR'].indexOf(tag2) < 0) {
            if (nr.width > 0 || nr.height > 0) {
              var val = next.textContent.trim();
              if (val && val !== labelText && val.indexOf(labelText) < 0 && !isOurText(val) && val.length > 2) {
                return val.length > 2000 ? val.slice(0, 2000) : val;
              }
            }
          }
        }
        next = next.nextElementSibling;
      }
      if (el.parentElement && !isInOurContainer(el.parentElement)) {
        var pn = el.parentElement.nextElementSibling;
        if (pn && !isInOurContainer(pn)) {
          var nr2 = pn.getBoundingClientRect();
          if (nr2.width > 0 || nr2.height > 0) {
            var val2 = pn.textContent.trim();
            if (val2 && val2 !== labelText && !isOurText(val2) && val2.length > 2) {
              return val2.length > 2000 ? val2.slice(0, 2000) : val2;
            }
          }
        }
      }
      var container = el.parentElement;
      if (container && !isInOurContainer(container)) {
        var siblings = container.querySelectorAll('span, div, p, td, th');
        for (var s = 0; s < siblings.length; s++) {
          if (siblings[s] === el || isInOurContainer(siblings[s])) continue;
          var sr = siblings[s].getBoundingClientRect();
          if (sr.width === 0 && sr.height === 0) continue;
          var sv = siblings[s].textContent.trim();
          if (sv && sv !== labelText && sv.indexOf(labelText) < 0 && !isOurText(sv) && sv.length > 2) {
            if (siblings[s].querySelector('span, div, label, td')) continue;
            return sv.length > 2000 ? sv.slice(0, 2000) : sv;
          }
        }
      }
    }
    return '';
  }

  function findTextInScope(scope, regex) {
    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, {
      acceptNode: function(node) {
        var parent = node.parentElement;
        if (!parent || isInOurContainer(parent)) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'NOSCRIPT'].indexOf(parent.tagName ? parent.tagName.toUpperCase() : '') >= 0) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    }, false);
    var node;
    while ((node = walker.nextNode())) {
      var match = node.textContent.match(regex);
      if (match) return match[1] || match[0];
    }
    return '';
  }

  function parseMemberLevel(text) {
    if (!text) return '';
    var m1 = text.match(/等级[：:\s]*F([1-6])(?!\d)/);
    if (m1) return 'F' + m1[1];
    var m2 = text.match(/F([1-6])(?!\d)会员/);
    if (m2) return 'F' + m2[1];
    var m3 = text.match(/(?:^|[\s：:,;|])F([1-6])(?!\d)(?=[\s：:,;|]|会员|标识|$)/);
    if (m3) return 'F' + m3[1];
    var m4 = text.match(/(K标|红线|黄牛)/);
    if (m4) return m4[1];
    return '';
  }

  var extractors = {
    businessScene: function() {
      var panel = getActivePanel();
      var el = panel.querySelector('.card_title .biz_tag');
      if (el) return el.textContent.trim();
      return findTextInScope(panel, /(国际机票|国内机票)/);
    },
    ticketNo: function() {
      var panel = getActivePanel();
      var allCaseIds = panel.querySelectorAll('.xixikf-fliggy-ticket-view-card_components-case-basic-info_case-id, .case-id');
      for (var i = 0; i < allCaseIds.length; i++) {
        var r = allCaseIds[i].getBoundingClientRect();
        if (r.width > 0 && r.height > 0) return allCaseIds[i].textContent.trim().replace(/工单编号[：:\s]*/, '').replace(/^#?/, '');
      }
      return '';
    },
    memberName: function() {
      // 优先在工单详情区域查找，避免取到左侧会话面板中的会员名
      var detailPanel = document.querySelector('[class*="ticket-detail"], [class*="order-detail"], [class*="work-order-detail"]');
      if (detailPanel) {
        var detailNickEls = detailPanel.querySelectorAll('.xixikf-fliggy-member-card_member-card-widgets-nick-name_text, .nick-name_text, [class*="nick-name"], [class*="nickName"]');
        for (var d = 0; d < detailNickEls.length; d++) {
          var el = detailNickEls[d];
          if (!isElementVisible(el)) continue;
          var text = el.textContent.trim();
          if (text && !isOurText(text)) return text;
        }
      }

      var panel = getActivePanel();
      var allNickEls = panel.querySelectorAll('.xixikf-fliggy-member-card_member-card-widgets-nick-name_text, .nick-name_text, [class*="nick-name"], [class*="nickName"]');
      var bestNick = '';
      for (var i = 0; i < allNickEls.length; i++) {
        var el = allNickEls[i];
        if (!isElementVisible(el)) continue;
        var text = el.textContent.trim();
        if (text && !isOurText(text)) {
          var rect = el.getBoundingClientRect();
          // 优先选择页面右侧的元素（工单详情通常在右侧，左侧是会话面板）
          if (rect.left > window.innerWidth / 2) {
            return text;
          }
          if (!bestNick) bestNick = text;
        }
      }
      if (bestNick) return bestNick;

      var nameVal = findValueBesideLabel('真实姓名');
      if (nameVal && nameVal.length > 1) return nameVal;
      return '';
    },
    memberLevel: function() {
      var panel = getActivePanel();
      var allInfoLines = panel.querySelectorAll('p.xixikf-fliggy-member-card_member-card-components-user-detail-info_info-line-content');
      for (var i = 0; i < allInfoLines.length; i++) {
        var el = allInfoLines[i];
        if (!isElementVisible(el)) continue;
        var text = el.textContent.trim();
        var result = parseMemberLevel(text);
        if (result) return result;
      }
      var memberCards = panel.querySelectorAll('[class*="member-card"], [class*="memberCard"], [class*="fliggy-member"]');
      for (var j = 0; j < memberCards.length; j++) {
        var card = memberCards[j];
        if (!isElementVisible(card)) continue;
        var cardText = card.textContent.trim();
        var result2 = parseMemberLevel(cardText);
        if (result2) return result2;
      }
      var levelVal = findValueBesideLabel('会员等级');
      if (levelVal) {
        var result3 = parseMemberLevel(levelVal);
        if (result3) return result3;
      }
      var allTexts = panel.querySelectorAll('span, div, p, td, em, strong');
      for (var k = 0; k < allTexts.length; k++) {
        var el = allTexts[k];
        if (isInOurContainer(el)) continue;
        if (!isElementVisible(el)) continue;
        var txt = el.textContent.trim();
        var result4 = parseMemberLevel(txt);
        if (result4) return result4;
      }
      return '';
    },
    orderNo: function() {
      var panel = getActivePanel();
      var allElements = panel.querySelectorAll('span, div, label, th, dt, p, em, strong, td');
      for (var i = 0; i < allElements.length; i++) {
        var el = allElements[i];
        if (isInOurContainer(el)) continue;
        var r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        var text = el.textContent.trim();
        if (text === '订单编号' || text.indexOf('订单编号') >= 0) {
          var next = el.nextElementSibling;
          while (next) {
            var nr = next.getBoundingClientRect();
            if (nr.width > 0 && nr.height > 0) {
              var val = next.textContent.trim();
              if (val && /^\d{10,}$/.test(val)) return val;
            }
            next = next.nextElementSibling;
          }
        }
      }
      return '';
    },
    problemDesc: function() {
      var skillGroup = getSkillGroup();
      var label1, label2;
      if (skillGroup.indexOf('国际机票') >= 0 || skillGroup.indexOf('云小二') >= 0) {
        label1 = '具体解决方案'; label2 = '处理结果';
      } else {
        label1 = '处理结果'; label2 = '具体解决方案';
      }
      var result = findValueBesideLabel(label1);
      if (result && result.trim().length > 5) return result.trim();
      result = findValueBesideLabel(label2);
      if (result && result.trim().length > 5) return result.trim();
      return '';
    },
    memberAppeal: function() {
      var skillGroup = getSkillGroup();
      var label1, label2;
      if (skillGroup.indexOf('国际机票') >= 0 || skillGroup.indexOf('云小二') >= 0) {
        label1 = '用户诉求'; label2 = '会员问题';
      } else {
        label1 = '会员问题'; label2 = '用户诉求';
      }
      var result = findValueBesideLabel(label1);
      if (result && result.trim().length > 5) return result.trim();
      result = findValueBesideLabel(label2);
      if (result && result.trim().length > 5) return result.trim();
      return '';
    }
  };

  // ===== 执行数据提取 =====
  window.__esuExtractData = function() {
    var data = {};
    for (var key in extractors) {
      if (extractors.hasOwnProperty(key)) data[key] = extractors[key]();
    }
    return data;
  };

  // ===== 消息监听（供 ESU 工具页面调用）=====
  chrome.runtime && chrome.runtime.onMessage && chrome.runtime.onMessage.addListener(function(msg, sender, sendResponse) {
    if (msg.action === 'esu_extract') {
      var data = window.__esuExtractData();
      sendResponse({ data: data });
    }
  });

  // ===== 退改费用计算器 =====

  // 从页面提取订单数据
  function extractOrderData() {
    var data = {
      airline: '',
      orderNo: '',
      totalAmount: '',
      flightInfo: '',
      segments: []
    };

    // 尝试提取订单号
    var orderMatch = document.body.textContent.match(/订单[：:：]\s*(\d{10,})/);
    if (orderMatch) data.orderNo = orderMatch[1];

    // 尝试提取航司名称
    var airlineMatch = document.body.textContent.match(/航司名称[：:：]\s*([\u4e00-\u9fa5a-zA-Z]+)/);
    if (airlineMatch) data.airline = airlineMatch[1];

    // 尝试提取总金额（多种模式）
    var amountPatterns = [
      /商品总金额[：:：]?\s*([\d.]+)元/,
      /订单总金额[：:：]?\s*([\d.]+)元/,
      /实付金额[：:：]?\s*([\d.]+)元/,
      /总计[：:：]?\s*([\d.]+)元/,
      /(\d+\.?\d*)元.*【/  // 1083.0元【...】
    ];
    for (var i = 0; i < amountPatterns.length; i++) {
      var m = document.body.textContent.match(amountPatterns[i]);
      if (m) { data.totalAmount = m[1]; break; }
    }

    // 尝试提取航段信息
    var flightNodes = document.querySelectorAll('*');
    var flightRegex = /\((\w{3})\)\s*[\d-]+\s*[\d:]+\s*-\s*[\d:]+\s*(\d{2})\s*$/;
    flightNodes.forEach(function(el) {
      var text = el.textContent.trim();
      if (text && text.length < 200 && flightRegex.test(text)) {
        var fm = text.match(flightRegex);
        if (fm && data.segments.length < 10) {
          data.segments.push({
            code: fm[1],
            time: fm[2]
          });
        }
      }
    });

    return data;
  }

  // 退改计算逻辑
  function calculateRefund(params) {
    var result = { canRefund: true, amount: 0, details: '', status: '' };
    var faceValue = parseFloat(params.faceValue);
    var tax = parseFloat(params.tax);
    var agentFee = parseFloat(params.agentFee);
    var refundFee = parseFloat(params.refundFee);
    var isPartial = params.isPartial;

    if (isNaN(faceValue) || isNaN(tax) || isNaN(agentFee) || isNaN(refundFee)) {
      return { canRefund: false, amount: 0, details: '输入数据不完整', status: 'error' };
    }

    // 计算有效票面（扣除代理点）
    var effectiveFaceValue = faceValue * (1 - agentFee / 100);
    var effectiveTax = tax;
    var usedFaceValue = isPartial ? effectiveFaceValue * 0.5 : 0; // 残值票面默认按50%，可手动调整
    var refundableTax = isPartial ? effectiveTax * 0.5 : effectiveTax;

    // 应用计算公式
    var diff = usedFaceValue - refundFee;

    if (diff >= 0) {
      // 票面够减退票费
      result.amount = usedFaceValue + refundableTax - refundFee;
      result.status = '可退票 - 票面够减退票费';
      result.details = usedFaceValue + ' + ' + refundableTax + ' - ' + refundFee + ' = ' + result.amount.toFixed(2);
    } else {
      // 票面不够减退票费，退税费
      result.amount = refundableTax;
      result.status = '可退票 - 票面不够退，退税费';
      result.details = '票面' + usedFaceValue + ' < 退票费' + refundFee + '，仅退税费';
    }

    // 特殊说明：E3税不可退（根据航司规则可能不同）
    result.note = '注意：E3税可能不可退，请以实际航司规则为准';

    return result;
  }

  // 显示退改计算器面板
  function showRefundPanel() {
    // 关闭已存在的面板
    var existing = document.getElementById('refund-panel');
    if (existing) { existing.remove(); return; }

    // 提取页面数据
    var orderData = extractOrderData();

    var panel = document.createElement('div');
    panel.id = 'refund-panel';
    panel.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:2147483646;width:380px;background:#fff;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,0.2);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden;';

    // 头部
    var header = document.createElement('div');
    header.style.cssText = 'background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;';
    header.innerHTML = '<span style="font-size:14px;font-weight:600;">🧮 退改费用计算器</span><span id="refund-close" style="cursor:pointer;font-size:18px;">&times;</span>';
    panel.appendChild(header);

    // 内容区
    var body = document.createElement('div');
    body.style.cssText = 'padding:16px;max-height:70vh;overflow-y:auto;';

    // 自动读取信息展示
    var autoInfo = document.createElement('div');
    autoInfo.style.cssText = 'background:#f5f5f5;border-radius:8px;padding:10px;margin-bottom:14px;';
    autoInfo.innerHTML = '<div style="font-size:12px;color:#666;margin-bottom:6px;font-weight:500;"> 已读取订单信息</div>';
    var infoRows = [
      { label: '航司', value: orderData.airline || '未识别' },
      { label: '订单号', value: orderData.orderNo || '未识别' },
      { label: '订单金额', value: orderData.totalAmount ? orderData.totalAmount + '元' : '未识别' }
    ];
    infoRows.forEach(function(row) {
      autoInfo.innerHTML += '<div style="font-size:12px;color:#333;display:flex;justify-content:space-between;padding:2px 0;"><span style="color:#999;">' + row.label + '</span><span>' + row.value + '</span></div>';
    });
    body.appendChild(autoInfo);

    // 输入区
    var inputSection = document.createElement('div');
    inputSection.innerHTML = '<div style="font-size:12px;color:#666;margin-bottom:8px;font-weight:500;">📝 请输入计算参数</div>';

    var inputGroups = [
      { id: 'faceValue', label: '票面金额', placeholder: '如：1000', default: orderData.totalAmount || '' },
      { id: 'tax', label: '税费金额', placeholder: '如：100', default: '' },
      { id: 'agentFee', label: '代理点(%)', placeholder: '如：10', default: '0' },
      { id: 'refundFee', label: '退票费', placeholder: '如：100', default: '' }
    ];

    inputGroups.forEach(function(g) {
      inputSection.innerHTML += '<div style="margin-bottom:10px;"><label style="font-size:12px;color:#666;display:block;margin-bottom:4px;">' + g.label + '</label><input id="refund-' + g.id + '" type="text" value="' + g.default + '" placeholder="' + g.placeholder + '" style="width:100%;padding:8px 10px;border:1px solid #e0e0e0;border-radius:6px;font-size:13px;box-sizing:border-box;"></div>';
    });

    // 使用状态选择
    inputSection.innerHTML += '<div style="margin-bottom:14px;"><label style="font-size:12px;color:#666;display:block;margin-bottom:6px;">使用状态</label><div style="display:flex;gap:12px;"><label style="font-size:13px;cursor:pointer;"><input type="radio" name="refundUsage" value="full" checked style="margin-right:4px;">全程未使用</label><label style="font-size:13px;cursor:pointer;"><input type="radio" name="refundUsage" value="partial" style="margin-right:4px;">部分已使用</label></div></div>';

    body.appendChild(inputSection);

    // 计算按钮
    var calcBtn = document.createElement('button');
    calcBtn.id = 'refund-calc-btn';
    calcBtn.textContent = '计算可退金额';
    calcBtn.style.cssText = 'width:100%;padding:10px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:14px;';
    body.appendChild(calcBtn);

    // 结果展示区
    var resultDiv = document.createElement('div');
    resultDiv.id = 'refund-result';
    resultDiv.style.cssText = 'background:#f9f9f9;border-radius:8px;padding:12px;display:none;';
    body.appendChild(resultDiv);

    panel.appendChild(body);
    document.body.appendChild(panel);

    // 关闭按钮事件
    document.getElementById('refund-close').addEventListener('click', function() {
      document.getElementById('refund-panel').remove();
    });

    // 计算按钮事件
    document.getElementById('refund-calc-btn').addEventListener('click', function() {
      var params = {
        faceValue: document.getElementById('refund-faceValue').value,
        tax: document.getElementById('refund-tax').value,
        agentFee: document.getElementById('refund-agentFee').value,
        refundFee: document.getElementById('refund-refundFee').value,
        isPartial: document.querySelector('input[name="refundUsage"]:checked').value === 'partial'
      };

      var result = calculateRefund(params);

      var rDiv = document.getElementById('refund-result');
      if (result.status === 'error') {
        rDiv.style.display = 'block';
        rDiv.style.background = '#fff2f0';
        rDiv.innerHTML = '<div style="color:#ff4d4f;font-size:13px;">⚠️ ' + result.details + '</div>';
        return;
      }

      rDiv.style.display = 'block';
      rDiv.style.background = result.amount > 0 ? '#f6ffed' : '#fff2f0';
      rDiv.innerHTML =
        '<div style="font-size:12px;color:#666;margin-bottom:6px;">✅ 计算结果</div>' +
        '<div style="font-size:24px;font-weight:700;color:' + (result.amount > 0 ? '#52c41a' : '#ff4d4f') + ';">¥' + result.amount.toFixed(2) + '</div>' +
        '<div style="font-size:12px;color:#888;margin-top:6px;">' + result.status + '</div>' +
        '<div style="font-size:11px;color:#aaa;margin-top:4px;font-family:monospace;">' + result.details + '</div>' +
        (result.note ? '<div style="font-size:11px;color:#faad14;margin-top:6px;">⚠️ ' + result.note + '</div>' : '');
    });
  }

  // ===== 抓取淘宝订单号（recall 工具需要的 tid）=====
  // 注意：工作台页面有两个订单号，顶部"订单号"是 10 位，"淘宝订单号"是 19 位，recall 需要后者
  function extractTaobaoTid() {
    var allEls = document.querySelectorAll('span, div, label, th, dt, p, em, strong, td');
    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      if (isInOurContainer(el)) continue;
      if (!isElementVisible(el)) continue;
      var text = el.textContent.trim();
      // 必须是精确包含"淘宝订单号"标签（避免匹配到含糊的"订单号"字段）
      if (text.indexOf('淘宝订单号') < 0) continue;
      // 跳过容器型节点（自身有大量子节点）
      if (text.length > 30) continue;

      // 1) 找紧邻的下一个兄弟节点
      var next = el.nextElementSibling;
      while (next) {
        if (!isInOurContainer(next) && isElementVisible(next)) {
          var val = next.textContent.trim();
          if (/^\d{15,25}$/.test(val)) return val;
        }
        next = next.nextElementSibling;
      }

      // 2) 在父容器范围内找 19 位数字
      var container = el.parentElement;
      if (container) {
        var siblings = container.querySelectorAll('span, div, p, td');
        for (var s = 0; s < siblings.length; s++) {
          if (isInOurContainer(siblings[s])) continue;
          if (!isElementVisible(siblings[s])) continue;
          var sv = siblings[s].textContent.trim();
          if (/^\d{15,25}$/.test(sv)) return sv;
        }
      }

      // 3) 在父容器文本中正则提取
      var ctxText = container ? container.textContent : '';
      var m = ctxText.match(/淘宝订单号[：:\s]*(\d{15,25})/);
      if (m) return m[1];
    }
    return '';
  }

  // ===== 悬浮 iframe 面板（内嵌外部工具，例如 recall 下单页还原）=====
  function showIframePanel(tool) {
    // 关闭已有面板
    var existing = document.getElementById('iframe-tool-panel');
    if (existing) { existing.remove(); return; }

    var tid = extractTaobaoTid();

    // 关键：必须先把 tid 写入 storage，再创建 iframe 触发导航
    // 否则 background 的 webNavigation.onCompleted 触发时读到的是旧 tid 或空
    function actuallyShowPanel() {
      buildAndAppendPanel(tool, tid);
    }
    if (tid && chrome && chrome.runtime && chrome.runtime.id) {
      // 顺便清掉旧的注入标记（在 iframe 里），让 background 能重新注入
      chrome.storage.local.set({ recallTid: tid, recallTidTime: Date.now() }, function () {
        actuallyShowPanel();
      });
    } else {
      // 没抓到 tid 也要显示面板（用户可能想手动用）
      // 顺便清掉旧 tid，避免误填上一单
      if (chrome && chrome.runtime && chrome.runtime.id) {
        chrome.storage.local.remove(['recallTid', 'recallTidTime'], actuallyShowPanel);
      } else {
        actuallyShowPanel();
      }
    }
  }

  function buildAndAppendPanel(tool, tid) {
    var panel = document.createElement('div');
    panel.id = 'iframe-tool-panel';
    panel.style.cssText = 'position:fixed;top:50px;right:10px;z-index:2147483646;width:560px;height:80vh;background:#fff;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,0.25);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;display:flex;flex-direction:column;overflow:hidden;';

    // 头部（可拖动整个面板）
    var header = document.createElement('div');
    header.style.cssText = 'background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:8px 12px;display:flex;align-items:center;gap:10px;flex-shrink:0;cursor:grab;';

    // 拖拽面板逻辑
    var panelDragging = false, panelDragged = false;
    var pdStartX = 0, pdStartY = 0, pdOrigLeft = 0, pdOrigTop = 0;
    header.addEventListener('pointerdown', function(e) {
      // 不拦截输入框、按钮、关闭按钮等可点击元素
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      if (e.target.dataset && e.target.dataset.noDrag) return;
      panelDragging = true;
      panelDragged = false;
      pdStartX = e.clientX;
      pdStartY = e.clientY;
      var rect = panel.getBoundingClientRect();
      pdOrigLeft = rect.left;
      pdOrigTop = rect.top;
      header.setPointerCapture(e.pointerId);
      header.style.cursor = 'grabbing';
      e.preventDefault();
    });
    header.addEventListener('pointermove', function(e) {
      if (!panelDragging) return;
      var dx = e.clientX - pdStartX;
      var dy = e.clientY - pdStartY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        panelDragged = true;
        panel.style.right = 'auto';
        panel.style.left = (pdOrigLeft + dx) + 'px';
        panel.style.top = (pdOrigTop + dy) + 'px';
      }
    });
    header.addEventListener('pointerup', function() {
      panelDragging = false;
      header.style.cursor = 'grab';
    });

    var title = document.createElement('span');
    title.textContent = tool.name || '工具';
    title.style.cssText = 'font-size:13px;font-weight:600;';
    header.appendChild(title);

    // tid 展示 + 复制按钮
    var tidWrap = document.createElement('div');
    tidWrap.style.cssText = 'flex:1;display:flex;align-items:center;gap:6px;';
    var tidLabel = document.createElement('span');
    tidLabel.textContent = '淘宝订单号:';
    tidLabel.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.8);';
    var tidInput = document.createElement('input');
    tidInput.id = 'iframe-tool-tid';
    tidInput.type = 'text';
    tidInput.value = tid || '';
    tidInput.placeholder = '未抓到，请手动填';
    tidInput.style.cssText = 'flex:1;padding:3px 8px;border:none;border-radius:4px;font-size:12px;font-family:monospace;background:rgba(255,255,255,0.95);color:#333;min-width:120px;';
    var copyBtn = document.createElement('button');
    copyBtn.textContent = '复制';
    copyBtn.style.cssText = 'padding:3px 10px;background:#fff;color:#667eea;border:none;border-radius:4px;font-size:12px;font-weight:600;cursor:pointer;flex-shrink:0;';
    copyBtn.addEventListener('click', function() {
      var val = tidInput.value.trim();
      if (!val) { showTip('订单号为空', '#ff6b6b'); return; }
      navigator.clipboard.writeText(val).then(function() {
        copyBtn.textContent = '✓已复制';
        copyBtn.style.background = '#52c41a';
        copyBtn.style.color = '#fff';
        setTimeout(function() {
          copyBtn.textContent = '复制';
          copyBtn.style.background = '#fff';
          copyBtn.style.color = '#667eea';
        }, 1500);
      }).catch(function() {
        // 兜底：选中
        tidInput.select();
        showTip('请按 Cmd+C 复制', '#faad14');
      });
    });
    tidWrap.appendChild(tidLabel);
    tidWrap.appendChild(tidInput);
    tidWrap.appendChild(copyBtn);
    header.appendChild(tidWrap);

    // 在新标签打开按钮（兜底，万一 iframe 加载失败）
    var openBtn = document.createElement('button');
    openBtn.textContent = '↗';
    openBtn.title = '在新标签页打开';
    openBtn.style.cssText = 'background:transparent;color:#fff;border:1px solid rgba(255,255,255,0.5);border-radius:4px;width:24px;height:24px;cursor:pointer;font-size:13px;flex-shrink:0;';
    openBtn.addEventListener('click', function() {
      // 重新存 tid（用户可能在面板输入框里修改过）
      var currentTid = tidInput.value.trim();
      if (currentTid && chrome && chrome.runtime && chrome.runtime.id) {
        chrome.storage.local.set({ recallTid: currentTid, recallTidTime: Date.now() });
      }
      if (chrome && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({ action: 'open_tool_url', url: tool.url });
      }
    });
    header.appendChild(openBtn);

    // 关闭按钮
    var closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.dataset.noDrag = '1';
    closeBtn.style.cssText = 'cursor:pointer;font-size:22px;line-height:1;flex-shrink:0;padding:0 4px;';
    closeBtn.addEventListener('click', function() { panel.remove(); });
    header.appendChild(closeBtn);

    panel.appendChild(header);

    // iframe 区域
    var iframeWrap = document.createElement('div');
    iframeWrap.style.cssText = 'flex:1;position:relative;background:#f5f5f5;';

    var iframe = document.createElement('iframe');
    iframe.src = tool.url;
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write');
    iframeWrap.appendChild(iframe);

    // 加载失败兜底提示
    var errorTip = document.createElement('div');
    errorTip.style.cssText = 'display:none;position:absolute;top:0;left:0;right:0;bottom:0;background:#fff;padding:20px;font-size:13px;color:#666;line-height:1.6;';
    errorTip.innerHTML = '若内容加载失败（白屏），可点击右上角 <b>↗</b> 在新标签页打开。<br>常见原因：未登录内网账号、需要先在新标签页登录一次后再回来。<br><br>⚠ 点击"开始还原"后小窗口无反应？这是 iframe 弹窗限制，请用右上角 <b>↗</b> 在新标签页打开后再点还原。';
    iframeWrap.appendChild(errorTip);
    // 5秒后若 iframe 还是空的就显示提示
    setTimeout(function() {
      try {
        if (!iframe.contentDocument && !iframe.contentWindow) {
          errorTip.style.display = 'block';
        }
      } catch (e) {
        // 跨域访问 contentDocument 会报错，这是正常的（说明 iframe 已加载）
      }
    }, 5000);

    panel.appendChild(iframeWrap);

    // 底部拖拽手柄（可调整宽度，简单实现：右下角拖动）
    var resizer = document.createElement('div');
    resizer.style.cssText = 'position:absolute;left:0;top:50%;width:6px;height:60px;margin-top:-30px;background:#ddd;border-radius:0 4px 4px 0;cursor:ew-resize;opacity:0.5;';
    resizer.title = '拖动调整宽度';
    panel.appendChild(resizer);

    var resizing = false;
    var startX = 0, startW = 0;
    resizer.addEventListener('pointerdown', function(e) {
      resizing = true;
      startX = e.clientX;
      startW = panel.offsetWidth;
      resizer.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    resizer.addEventListener('pointermove', function(e) {
      if (!resizing) return;
      var newW = Math.max(380, Math.min(window.innerWidth - 40, startW + (startX - e.clientX)));
      panel.style.width = newW + 'px';
    });
    resizer.addEventListener('pointerup', function() { resizing = false; });

    document.body.appendChild(panel);
  }

  // ===== 启动 =====
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    createToolboxButton();
  } else {
    document.addEventListener('DOMContentLoaded', function() {
      createToolboxButton();
    });
  }
})();
