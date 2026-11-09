import { photos } from './photos.js';
const icons = {
  settings: '<path d="M3 6h7m4 0h7M3 12h12m4 0h2M3 18h3m4 0h11M10 3v6m5 0v6m-9 0v6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  save: '<path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4"/>',
  reset: '<path d="M3 10a9 9 0 1 1 1 7M3 4v6h6"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const defaults = Object.freeze({ preset: 'wired', relief: .55, diffusion: .32, light: .50, wire: .32, motion: .40 });
const sliders = [
  ['relief', '玻璃凹凸 / Relief'], ['diffusion', '磨砂程度 / Diffusion'], ['light', '光照强度 / Light'],
  ['wire', '夹丝强度 / Wire'], ['motion', '流动速度 / Drift'],
];

/** Small, independent controls for the glass renderer. No render loop is owned here. */
export function setupControls({ onPhotoChange = async () => true, onChange = () => {}, onSave = () => {}, onReset = () => {} } = {}) {
  const values = { ...defaults };
  let toastTimer;
  const abort = new AbortController();
  const listen = (node, event, handler, options = {}) => node.addEventListener(event, handler, { ...options, signal: abort.signal });
  const ui = document.createElement('div');
  ui.className = 'glass-ui';
  ui.innerHTML = `
    <div class="photo-picker" role="group" aria-label="切换照片 / Switch photo">
      <div class="photo-strip">${photos.map((photo, index) => `<button class="photo-choice" type="button" data-photo="${index}" aria-label="${photo.label}" aria-pressed="${index === 0}" title="${photo.label}"><img src="${photo.src}" alt="${photo.label}" draggable="false" /></button>`).join('')}</div>
      <button class="source-button" type="button" aria-label="查看原图 / View original" aria-haspopup="dialog">↗</button>
    </div>
    <div class="glass-toolbar" role="toolbar" aria-label="Scene controls">
      <button type="button" class="settings-button" aria-haspopup="dialog" aria-expanded="false" aria-controls="glass-settings">${icon('settings')}<span>调节 / Settings</span></button>
    </div>
    <dialog class="glass-settings" id="glass-settings" aria-labelledby="settings-title">
      <div class="settings-heading"><h2 id="settings-title">玻璃材质 / Material</h2><button type="button" class="icon-button close-settings" aria-label="关闭 / Close">${icon('close')}</button></div>
      <label class="preset-label" for="glass-preset">选择玻璃 / Glass finish</label>
      <div class="select-wrap"><select id="glass-preset" name="preset"><option value="wired">夹丝玻璃 / Wired</option><option value="frosted">磨砂玻璃 / Frosted</option><option value="fluted">长虹玻璃 / Fluted</option><option value="clear">清玻璃 / Clear</option></select><span aria-hidden="true">⌄</span></div>
      <div class="material-sliders">${sliders.map(([key, label]) => `
        <div class="range-control"><div class="range-label"><label for="glass-${key}">${label}</label><output for="glass-${key}" id="value-${key}">${Math.round(defaults[key] * 100)}</output></div>
        <input type="range" id="glass-${key}" name="${key}" min="0" max="1" step="0.01" value="${defaults[key]}" style="--progress:${defaults[key] * 100}%" /></div>`).join('')}
      </div>
      <div class="settings-actions"><button type="button" class="reset-button">${icon('reset')}<span>重置 / Reset</span></button><button type="button" class="fullscreen-button" aria-label="进入全屏 / Enter fullscreen" title="全屏 / Fullscreen">${icon('expand')}</button><button type="button" class="save-button" aria-label="保存图片 / Save image" title="保存图片 / Save image">${icon('save')}</button></div>
      <p class="settings-hint">移动鼠标或触摸，追随光线。<br>Move your pointer or touch to move the light.<br><kbd>H</kbd> 隐藏界面 / Hide controls</p>
    </dialog>
    <dialog class="source-dialog" aria-labelledby="source-title">
      <div class="source-heading"><div><h2 id="source-title">原始照片</h2><p>IMG_6426 · 光影与窗</p></div><button type="button" class="icon-button close-source" aria-label="Close background image">${icon('close')}</button></div>
      <img src="${photos[0].src}" alt="你的原始照片" draggable="false" />
    </dialog>
    <div class="glass-toast" role="status" aria-live="polite"></div>
  `;
  const app = document.getElementById('app') || document.body;
  app.append(ui);
  const $ = (selector) => ui.querySelector(selector);
  const settings = $('.glass-settings');
  const settingsButton = $('.settings-button');
  const source = $('.source-dialog');
  const sourceButton = $('.source-button');
  const announce = (message) => {
    clearTimeout(toastTimer);
    $('.glass-toast').textContent = message;
    $('.glass-toast').classList.add('visible');
    toastTimer = setTimeout(() => $('.glass-toast').classList.remove('visible'), 2600);
  };
  const closeSettings = (focus = false) => {
    settings.close();
    settingsButton.setAttribute('aria-expanded', 'false');
    if (focus) settingsButton.focus();
  };
  const setHidden = (state) => {
    const hidden = Boolean(state);
    if (hidden) { closeSettings(); source.close(); }
    ui.classList.toggle('ui-hidden', hidden);
    // Keep the same visibility and keyboard state for shortcuts and clean URLs.
    for (const node of [$('.photo-picker'), $('.glass-toolbar')]) node.inert = hidden;
  };
  listen(settingsButton, 'click', () => {
    if (settings.open) { closeSettings(true); return; }
    settings.show();
    settingsButton.setAttribute('aria-expanded', 'true');
    $('#glass-preset').focus();
  });
  listen($('.close-settings'), 'click', () => closeSettings(true));
  listen(settings, 'close', () => settingsButton.setAttribute('aria-expanded', 'false'));
  let selectionRequest = 0;
  for (const button of ui.querySelectorAll('.photo-choice')) {
    listen(button, 'click', async () => {
      const request = ++selectionRequest;
      const index = Number(button.dataset.photo);
      button.setAttribute('aria-busy', 'true');
      try {
        const changed = await onPhotoChange(index);
        if (request !== selectionRequest || !changed) return;
        for (const choice of ui.querySelectorAll('.photo-choice')) choice.setAttribute('aria-pressed', String(choice === button));
        $('.source-dialog > img').src = photos[index].src;
        $('.source-dialog > img').alt = photos[index].label;
        $('.source-heading p').textContent = photos[index].label;
        button.scrollIntoView({block:'nearest', inline:'nearest', behavior:'smooth'});
      } catch { if (request === selectionRequest) announce('照片加载失败，请重试 / Could not load photo.'); }
      finally { button.removeAttribute('aria-busy'); }
    });
  }
  listen(sourceButton, 'click', () => {
    closeSettings();
    source.showModal();
    $('.close-source').focus();
  });
  listen($('.close-source'), 'click', () => source.close());
  listen(source, 'close', () => sourceButton.focus());
  listen(source, 'click', (event) => {
    if (event.target !== source) return;
    const rect = source.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) source.close();
  });
  listen($('#glass-preset'), 'change', (event) => {
    values.preset = event.target.value;
    onChange('preset', values.preset);
  });
  for (const [key] of sliders) {
    listen($(`#glass-${key}`), 'input', (event) => {
      values[key] = Number(event.target.value);
      $(`#value-${key}`).value = Math.round(values[key] * 100);
      event.target.style.setProperty('--progress', `${values[key] * 100}%`);
      onChange(key, values[key]);
    });
  }
  listen($('.reset-button'), 'click', () => {
    Object.assign(values, defaults);
    $('#glass-preset').value = defaults.preset;
    for (const [key] of sliders) {
      $(`#glass-${key}`).value = defaults[key];
      $(`#glass-${key}`).style.setProperty('--progress', `${defaults[key] * 100}%`);
      $(`#value-${key}`).value = Math.round(defaults[key] * 100);
    }
    for (const [key, value] of Object.entries(values)) onChange(key, value);
    onReset();
    announce('已恢复默认材质 / Material reset.');
  });
  const fullscreenButton = $('.fullscreen-button');
  if (!document.fullscreenEnabled) fullscreenButton.hidden = true;
  listen(fullscreenButton, 'click', async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { announce('暂不支持全屏 / Fullscreen unavailable.'); }
  });
  listen(document, 'fullscreenchange', () => fullscreenButton.setAttribute('aria-label', document.fullscreenElement ? '退出全屏 / Exit fullscreen' : '进入全屏 / Enter fullscreen'));
  listen($('.save-button'), 'click', async () => {
    try { await onSave(); announce('图片已保存 / Image saved.'); }
    catch { announce('图片保存失败 / Could not save image.'); }
  });
  listen(document, 'pointerdown', (event) => {
    if (settings.open && !settings.contains(event.target) && !settingsButton.contains(event.target)) closeSettings();
  });
  listen(document, 'keydown', (event) => {
    if (event.key === 'Escape') {
      if (source.open) return; // Native modal dismissal also restores focus.
      if (settings.open) { event.preventDefault(); closeSettings(true); }
      else setHidden(false);
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey || event.target.closest('input, select, textarea, [contenteditable="true"]') || source.open) return;
    if (event.key.toLowerCase() === 'h') setHidden(!ui.classList.contains('ui-hidden'));
  });
  return {
    values,
    setHidden,
    destroy() { clearTimeout(toastTimer); source.close(); settings.close(); abort.abort(); ui.remove(); },
  };
}
