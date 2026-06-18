/**
 * content_recall.js - 在 recall.alibaba-inc.com 页面内自动填充淘宝订单号
 * 工作原理：从 chrome.storage.local 读取 recallTid，持续监听页面变化
 * 只要出现新的空 tid 输入框就自动填入（支持切换标签页场景）
 */
(function () {
  'use strict';

  console.log('[Toolbox-Recall] content_recall.js 已加载');

  if (!chrome || !chrome.storage || !chrome.storage.local) return;

  chrome.storage.local.get(['recallTid', 'recallTidTime'], function (result) {
    var tid = result.recallTid;
    var tidTime = result.recallTidTime || 0;

    // 如果没有 tid 或已过期（超过 10 分钟不再自动填）
    if (!tid || (Date.now() - tidTime > 600000)) {
      console.log('[Toolbox-Recall] 无有效 tid 或已过期，跳过自动填充');
      return;
    }

    console.log('[Toolbox-Recall] tid 就绪:', tid);

    // 已经填过的输入框，避免重复填
    var filledInputs = new WeakSet();

    // 填充单个输入框
    function fillInput(input) {
      if (filledInputs.has(input)) return;
      if (input.value) return; // 已有值，不覆盖

      var nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      ).set;
      nativeInputValueSetter.call(input, tid);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new Event('focus', { bubbles: true }));
      input.dispatchEvent(new Event('blur', { bubbles: true }));

      filledInputs.add(input);
      console.log('[Toolbox-Recall] 已自动填充 tid 到输入框');
    }

    // 判断是否为 tid 输入框
    function isTidInput(input) {
      var placeholder = (input.placeholder || '').toLowerCase();
      var label = '';

      // 向上找关联的 label 文本（多层查找）
      var el = input;
      for (var depth = 0; depth < 5; depth++) {
        var parent = el.parentElement;
        if (!parent) break;
        // 查找前面的兄弟节点
        var prev = parent.previousElementSibling;
        if (prev) {
          var prevText = (prev.textContent || '').trim().toLowerCase();
          if (prevText.indexOf('tid') >= 0 || prevText.indexOf('订单') >= 0) {
            label = prevText;
            break;
          }
        }
        // 也检查 parent 内部靠前的文本（如 label 元素）
        var labelEl = parent.querySelector('label, .ant-form-item-label, [class*="label"]');
        if (labelEl) {
          var lText = (labelEl.textContent || '').trim().toLowerCase();
          if (lText.indexOf('tid') >= 0 || lText.indexOf('订单') >= 0) {
            label = lText;
            break;
          }
        }
        el = parent;
      }

      return placeholder.indexOf('对应值') >= 0 ||
             placeholder.indexOf('tid') >= 0 ||
             label.indexOf('tid') >= 0 ||
             label.indexOf('订单') >= 0;
    }

    // 扫描页面所有输入框，填充匹配的
    function scanAndFill() {
      var inputs = document.querySelectorAll('input[type="text"], input:not([type]), textarea');
      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];
        if (input.value) continue; // 已有值
        if (filledInputs.has(input)) continue;
        if (isTidInput(input)) {
          fillInput(input);
        }
      }
    }

    // 初始扫描（延迟等页面渲染）
    setTimeout(scanAndFill, 1000);
    setTimeout(scanAndFill, 2000);
    setTimeout(scanAndFill, 3000);

    // 持续监听 DOM 变化（处理切换标签页出现新输入框的场景）
    var observer = new MutationObserver(function () {
      // 稍微延迟，等框架渲染完
      setTimeout(scanAndFill, 300);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 10 分钟后停止监听，避免无限占用资源
    setTimeout(function () {
      observer.disconnect();
      console.log('[Toolbox-Recall] 监听已停止（超时）');
    }, 600000);
  });
})();
