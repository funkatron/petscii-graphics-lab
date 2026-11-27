/** Download dialog shell: open/close, export tabs, format toggles (modularization slice 4). */

const TAB_KEYS = Object.freeze(['ArrowRight', 'ArrowLeft', 'Home', 'End']);

/**
 * Index of the export tab a key moves to, or -1 when the key is not a tab key.
 * Arrow keys wrap; Home and End jump to the first and last tab.
 */
export function nextTabIndex(index, key, count) {
  if (!TAB_KEYS.includes(key) || count < 1) return -1;
  if (key === 'ArrowRight') return (index + 1) % count;
  if (key === 'ArrowLeft') return (index + count - 1) % count;
  if (key === 'Home') return 0;
  return count - 1;
}

/** True when a click on the dialog element landed outside its box (the ::backdrop). */
export function clickedBackdrop(rect, x, y) {
  return x < rect.left || x > rect.right || y < rect.top || y > rect.bottom;
}

/**
 * Wire the Download dialog chrome. Exporters, preview rendering and filename
 * rules stay in their own modules; this shell only calls the hooks.
 *
 * @param {object} deps
 * @param {(id: string) => HTMLElement} deps.$
 * @param {() => void} deps.closeOtherSurfaces  Close header menus and popovers before opening.
 * @param {() => void} deps.onOpen              Refresh labels, copy, preview and filename after opening.
 * @param {() => void} deps.onRefresh           Refresh preview and filename after a setting or tab change.
 */
export function initDownloadShell({ $, closeOtherSurfaces, onOpen, onRefresh }) {
  const dialog = $('downloadDialog');
  const tabs = [...document.querySelectorAll('[data-export-tab]')];
  const tabListeners = [];

  function activeExportTab() {
    for (const tab of tabs) if (tab.getAttribute('aria-selected') === 'true') return tab.dataset.exportTab;
    return 'still';
  }

  function selectExportTab(tab) {
    for (const item of tabs) {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.tabIndex = active ? 0 : -1;
    }
    for (const panel of document.querySelectorAll('[data-export-mode]')) panel.hidden = panel.dataset.exportMode !== tab.dataset.exportTab;
    onRefresh();
    for (const listener of tabListeners) listener(tab.dataset.exportTab);
  }

  // onclick (not addEventListener): other code adds its own listeners to this button.
  $('downloadOpen').onclick = () => {
    closeOtherSurfaces();
    dialog.showModal();
    onOpen();
  };
  $('downloadClose').onclick = () => dialog.close();
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog && clickedBackdrop(dialog.getBoundingClientRect(), e.clientX, e.clientY)) dialog.close();
  });
  dialog.addEventListener('change', onRefresh);
  $('cancelSheetDownload').onclick = () => $('cancelAnimationExport').click();

  for (const tab of tabs) {
    tab.onclick = () => selectExportTab(tab);
    tab.onkeydown = (e) => {
      const index = nextTabIndex(tabs.indexOf(tab), e.key, tabs.length);
      if (index < 0) return;
      e.preventDefault();
      selectExportTab(tabs[index]);
      tabs[index].focus();
    };
  }

  $('stillFormat').onchange = () => {
    const svg = $('stillFormat').value === 'svg';
    $('png').hidden = svg;
    $('svg').hidden = !svg;
    $('pngResolution').hidden = svg;
    onRefresh();
  };
  $('animationFormat').onchange = () => {
    for (const group of document.querySelectorAll('[data-motion-format]')) group.hidden = group.dataset.motionFormat !== $('animationFormat').value;
  };

  return {
    activeExportTab,
    selectExportTab,
    /** Run `fn(mode)` after every tab change, by click or keyboard. */
    onTabChange: (fn) => { tabListeners.push(fn); },
    isOpen: () => dialog.open,
    close: () => dialog.close(),
  };
}
