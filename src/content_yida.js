/**
 * content_yida.js - 宜搭表单自动填充脚本
 * v4.0 - 彻底修复：
 * 1. 旧脚本（僵尸脚本）静默退出，绝不弹窗
 * 2. 等待宜搭表单完全渲染后再填充
 * 3. 填充失败自动重试
 */

(function () {
  'use strict';

  // ===== 扩展上下文检测 =====
  function isExtensionAlive() {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (e) {
      return false;
    }
  }

  // ===== 等待扩展恢复 =====
  function waitForExtensionRecovery() {
    if (isExtensionAlive()) {
      init();
      return;
    }
    // 旧脚本：扩展上下文已死，静默等待，绝不弹窗
    console.log('[ESU] 扩展上下文无效，旧脚本静默等待');
    const check = setInterval(() => {
      if (isExtensionAlive()) {
        clearInterval(check);
        console.log('[ESU] 扩展已恢复，初始化');
        init();
      }
    }, 500);
    setTimeout(() => clearInterval(check), 60000);
  }

  function init() {
    // 防重复初始化
    if (window.__ESU_YIDA_LOADED) {
      console.log('[ESU] 已初始化，跳过');
      return;
    }
    window.__ESU_YIDA_LOADED = true;

    // 双重保险：再次确认
    if (!isExtensionAlive()) {
      console.log('[ESU] init 时扩展无效，静默退出');
      return;
    }

    // ===== 字段映射 =====
    const fieldMap = [
      { label: '业务场景',       key: 'businessScene', type: 'radio',
        options: [
          { keyword: '国际', labels: ['国际机票'] },
          { keyword: '国内', labels: ['国内机票'] },
        ]},
      { label: '订单编号',       key: 'orderNo',         type: 'text' },
      { label: '工单编号',       key: 'ticketNo',        type: 'text' },
      { label: '会员名',         key: 'memberName',      type: 'text' },
      { label: '会员等级和标识', key: 'memberLevel',     type: 'radio',
        options: [
          { keyword: 'F1', labels: ['F1'] },
          { keyword: 'F2', labels: ['F2'] },
          { keyword: 'F3', labels: ['F3'] },
          { keyword: 'F4', labels: ['F4'] },
          { keyword: 'F5', labels: ['F5'] },
          { keyword: 'F6', labels: ['F6'] },
          { keyword: 'K标', labels: ['K标/红线会员', 'K标'] },
          { keyword: '红线', labels: ['K标/红线会员'] },
          { keyword: '黄牛', labels: ['黄牛标识', '黄牛'] },
        ]},
      { label: '问题描述',       key: 'problemDesc',     type: 'textarea' },
      { label: '会员诉求',       key: 'memberAppeal',    type: 'textarea' },
    ];

    // ===== 查找 kuma 主容器 =====
    function findKumaField(labelText) {
      const allFields = document.querySelectorAll('.kuma-uxform-field');
      for (const field of allFields) {
        if (field.parentElement && field.parentElement.closest('.kuma-uxform-field')) continue;
        const fullText = field.textContent.trim();
        const cleanText = fullText.replace(/^\*\s*/, '');
        if (cleanText.includes(labelText)) return field;
      }
      return null;
    }

    // ===== 查找真正的 input =====
    function findRealInput(field, type) {
      if (type === 'textarea') {
        const ta = field.querySelector('textarea');
        if (ta) return ta;
        const ce = field.querySelector('[contenteditable="true"]');
        if (ce) return ce;
      }
      const input = field.querySelector('input:not([type="radio"]):not([type="checkbox"]):not([type="hidden"]):not([type="file"])');
      if (input) return input;
      const allInputs = field.querySelectorAll('input, textarea');
      for (const el of allInputs) {
        if (el.type !== 'radio' && el.type !== 'checkbox' && el.type !== 'hidden' && el.type !== 'file') {
          return el;
        }
      }
      return null;
    }

    // ===== 设置字段值 =====
    function setFieldValue(input, value) {
      input.focus();
      input.select();

      try {
        document.execCommand('delete', false);
        document.execCommand('insertText', false, value);
      } catch (e) {}

      input.value = value;

      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype, 'value'
      )?.set || Object.getOwnPropertyDescriptor(
        window.HTMLTextAreaElement.prototype, 'value'
      )?.set;
      if (nativeSetter) nativeSetter.call(input, value);

      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));

      const tracker = input._valueTracker;
      if (tracker) tracker.setValue('');
      for (const key of Object.keys(input)) {
        if (key.startsWith('__react')) {
          try {
            const props = input[key];
            if (props?.onChange) props.onChange({ target: { value }, bubbles: true });
          } catch (e) {}
        }
      }

      setTimeout(() => {
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
      }, 300);
    }

    // ===== 填充文本字段 =====
    function fillTextField(label, value) {
      const field = findKumaField(label);
      if (!field) return { ok: false, reason: '未找到字段容器' };

      const input = findRealInput(field, 'text');
      if (!input) return { ok: false, reason: '未找到输入框' };

      input.style.outline = '3px solid #4ecca3';
      setTimeout(() => { input.style.outline = ''; }, 3000);

      input.click();
      setTimeout(() => {
        setFieldValue(input, value);
        console.log(`[ESU] ${label}: ${input.tagName}, value="${value?.slice(0, 30)}"`);
      }, 100);

      return { ok: true };
    }

    // ===== Radio 点击 =====
    function matchAndClickRadio(field, value) {
      const kumaField = findKumaField(field.label);
      if (!kumaField) return { ok: false, reason: '未找到字段容器' };

      for (const opt of field.options) {
        if (value.includes(opt.keyword)) {
          for (const targetLabel of opt.labels) {
            const result = clickRadioInField(kumaField, targetLabel);
            if (result.ok) return result;
          }
          const result = clickRadioByValue(kumaField, opt.keyword);
          if (result.ok) return result;
        }
      }
      return { ok: false, reason: `未匹配到选项` };
    }

    function clickRadioInField(fieldContainer, text) {
      const allLabels = fieldContainer.querySelectorAll('label');
      for (const label of allLabels) {
        if (label.textContent.trim().includes(text)) {
          const radio = label.querySelector('input[type="radio"]');
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.dispatchEvent(new Event('input', { bubbles: true }));
            label.click();
            return { ok: true };
          }
          label.click();
          return { ok: true };
        }
      }

      const radios = fieldContainer.querySelectorAll('input[type="radio"]');
      for (const radio of radios) {
        const parentLabel = radio.closest('label');
        if (parentLabel && parentLabel.textContent.includes(text)) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          parentLabel.click();
          return { ok: true };
        }
        const next = radio.nextElementSibling;
        if (next && next.textContent.includes(text)) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          radio.click();
          return { ok: true };
        }
        const parent = radio.parentElement;
        if (parent) {
          const nextSibling = parent.nextElementSibling;
          if (nextSibling && nextSibling.textContent.includes(text)) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.click();
            return { ok: true };
          }
        }
      }
      return { ok: false, reason: `未找到选项 "${text}"` };
    }

    function clickRadioByValue(fieldContainer, keyword) {
      const radios = fieldContainer.querySelectorAll('input[type="radio"]');
      for (const radio of radios) {
        if (radio.value && radio.value.includes(keyword)) {
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          radio.dispatchEvent(new Event('input', { bubbles: true }));
          radio.click();
          return { ok: true };
        }
      }
      return { ok: false };
    }

    // ===== 填充表单 =====
    function fillYidaForm(data) {
      const results = [];
      for (const field of fieldMap) {
        const value = data[field.key];
        if (!value || !value.trim()) {
          results.push({ field: field.label, status: 'skip', value: '' });
          continue;
        }
        const result = field.type === 'radio'
          ? matchAndClickRadio(field, value)
          : fillTextField(field.label, value);
        results.push({
          field: field.label,
          status: result.ok ? 'ok' : 'fail',
          reason: result.reason || '',
          value: value.slice(0, 50),
        });
      }
      return results;
    }

    // ===== 调试面板（0.1s 自动关闭） =====
    function createDebugPanel(data, results) {
      const old = document.getElementById('esu-debug-panel');
      if (old) old.remove();

      const panel = document.createElement('div');
      panel.id = 'esu-debug-panel';
      panel.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999;background:#1a1a2e;color:#eee;padding:16px;border-radius:12px;font-size:12px;max-width:420px;max-height:80vh;overflow:auto;font-family:monospace;box-shadow:0 8px 32px rgba(0,0,0,0.5);';

      let html = '<div style="font-size:14px;font-weight:bold;margin-bottom:12px;color:#4ecca3;">📊 ESU 调试面板</div>';
      html += '<div style="background:#16213e;padding:8px;border-radius:6px;margin-bottom:12px;">';
      html += '<div style="color:#e94560;font-weight:bold;margin-bottom:6px;">📤 填充结果：</div>';
      for (const r of results) {
        const icon = r.status === 'ok' ? '✅' : r.status === 'skip' ? '⚪' : '❌';
        const color = r.status === 'ok' ? '#4ecca3' : r.status === 'skip' ? '#aaa' : '#e94560';
        html += `<div style="color:${color};margin:2px 0;">${icon} ${r.field}${r.reason ? ` <span style="color:#888;font-size:10px;">(${r.reason})</span>` : ''}</div>`;
      }
      html += '</div>';
      html += '<button onclick="this.parentElement.remove()" style="margin-top:8px;background:#e94560;color:#fff;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;width:100%;">关闭</button>';

      panel.innerHTML = html;
      document.body.appendChild(panel);

      setTimeout(() => {
        const p = document.getElementById('esu-debug-panel');
        if (p) p.remove();
      }, 100);
    }

    // ===== 等待宜搭表单渲染 =====
    function waitForFormReady(callback, maxRetries) {
      let retries = 0;
      const check = setInterval(() => {
        retries++;
        const fields = document.querySelectorAll('.kuma-uxform-field');
        if (fields.length > 0) {
          clearInterval(check);
          console.log(`[ESU] 表单已就绪，找到 ${fields.length} 个字段`);
          callback();
          return;
        }
        if (retries >= maxRetries) {
          clearInterval(check);
          console.log(`[ESU] 等待表单超时（${maxRetries * 500}ms），强制填充`);
          callback();
        }
      }, 500);
    }

    // ===== 自动填充 =====
    function tryAutoFill() {
      // 扩展上下文无效时，静默退出（绝不弹窗）
      if (!chrome || !chrome.runtime || !chrome.runtime.id) {
        console.log('[ESU] 扩展上下文无效，跳过自动填充');
        return;
      }

      // 如果已被清理脚本标记为已加载，说明旧脚本不应继续执行
      if (window.__ESU_YIDA_LOADED && window.__ESU_CLEANED) {
        console.log('[ESU] 旧脚本被清理，跳过自动填充');
        return;
      }

      try {
        chrome.runtime.sendMessage({ action: 'get_data' }, (data) => {
          if (chrome.runtime.lastError) {
            console.log('[ESU] 消息发送失败:', chrome.runtime.lastError.message);
            return;
          }

          if (data && (data.orderNo || data.businessScene)) {
            waitForFormReady(() => {
              const results = fillYidaForm(data);
              createDebugPanel(data, results);
              try {
                chrome.runtime.sendMessage({ action: 'clear_data' });
              } catch (e) {}
            }, 20);
          } else {
            // 尝试剪贴板兜底
            try {
              navigator.clipboard.readText().then(text => {
                try {
                  const parsed = JSON.parse(text);
                  if (parsed.orderNo || parsed.businessScene) {
                    waitForFormReady(() => {
                      const results = fillYidaForm(parsed);
                      createDebugPanel(parsed, results);
                    }, 20);
                  }
                } catch (e) {}
              }).catch(() => {});
            } catch (e) {}
          }
        });
      } catch (e) {
        console.log('[ESU] 自动填充异常:', e.message);
      }
    }

    // ===== 隐藏按钮（功能保留） =====
    function createButton() {
      if (document.getElementById('esu-yida-fill-btn')) return;

      const btn = document.createElement('div');
      btn.innerHTML = `
        <div style="position:fixed;top:100px;right:20px;z-index:999999;display:flex;flex-direction:column;gap:8px;opacity:0.15;transition:opacity 0.3s;"
             onmouseenter="this.style.opacity='1'" onmouseleave="this.style.opacity='0.15'">
          <button id="esu-yida-fill-btn" style="
            background:linear-gradient(135deg,#11998e,#38ef7d);color:#fff;border:none;border-radius:8px;
            padding:12px 16px;font-size:14px;font-weight:600;cursor:pointer;
            box-shadow:0 4px 15px rgba(17,153,142,0.4);white-space:nowrap;">
            ✨ 一键填充ESU数据
          </button>
          <button id="esu-yida-debug-btn" style="
            background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;border:none;border-radius:8px;
            padding:8px 12px;font-size:12px;cursor:pointer;
            box-shadow:0 4px 15px rgba(245,87,108,0.4);white-space:nowrap;">
            🔧 调试
          </button>
        </div>
      `;
      document.body.appendChild(btn);

      document.getElementById('esu-yida-fill-btn').addEventListener('click', tryAutoFill);
      document.getElementById('esu-yida-debug-btn').addEventListener('click', () => {
        createDebugPanel(null, [{ field: '手动调试', status: 'skip', reason: '点击调试按钮', value: '' }]);
      });

      // 页面加载后自动填充（1秒后开始，等表单渲染）
      setTimeout(tryAutoFill, 1000);
    }

    createButton();
  }

  // ===== 启动 =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForExtensionRecovery);
  } else {
    waitForExtensionRecovery();
  }
})();
