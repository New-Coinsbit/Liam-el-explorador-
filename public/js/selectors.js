// One themed, accessible picker for every single-value select in the app.
// The original select retains its value, FormData entry and native validation.
export function installSelectors(root) {
  const controls = new WeakMap();
  const sheet = document.createElement('dialog');
  sheet.className = 'selection-sheet';
  sheet.setAttribute('aria-labelledby', 'selection-title');
  sheet.innerHTML = `<div class="selection-heading"><div><p>Elige para tu aventura</p><h2 id="selection-title"></h2></div><button type="button" class="round selection-close" aria-label="Cerrar opciones">×</button></div><div class="selection-search" hidden><input type="search" placeholder="Buscar colegio…" aria-label="Buscar colegio" autocomplete="off"></div><div class="selection-options" role="listbox" aria-labelledby="selection-title"></div><p class="selection-empty" hidden>No encontramos ese colegio.</p>`;
  document.body.append(sheet);
  const list = sheet.querySelector('.selection-options');
  const searchBox = sheet.querySelector('.selection-search');
  const search = searchBox.querySelector('input');
  let active = null;
  let scrollPosition = 0;
  let sequence = 0;
  let typeahead = '';
  let typeaheadTimer;

  function refresh(select) {
    const control = controls.get(select);
    if (!control) return;
    const value = select.selectedOptions[0]?.textContent.trim() || 'Seleccionar';
    control.value.textContent = value;
    control.button.disabled = select.disabled;
    control.button.setAttribute('aria-label', `${control.label}: ${value}${select.required ? ', obligatorio' : ''}`);
    control.button.classList.toggle('placeholder', select.value === '');
    if (select.validity.valid) {
      control.button.removeAttribute('aria-invalid');
      control.button.removeAttribute('aria-describedby');
      control.error.hidden = true;
    }
  }

  function focusOption(option) {
    if (!option) return;
    list.querySelectorAll('[role=option]').forEach(item => item.tabIndex = item === option ? 0 : -1);
    option.focus({preventScroll: true});
    option.scrollIntoView({block: 'nearest'});
  }

  function paintOptions() {
    if (!active) return;
    const filter = search.value.trim().toLocaleLowerCase('es');
    list.replaceChildren();
    for (const option of active.options) {
      const label = option.dataset.label || option.textContent.trim();
      if (!label.toLocaleLowerCase('es').includes(filter) || option.hidden) continue;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'selection-option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      item.disabled = option.disabled || option.parentElement.disabled === true;
      item.tabIndex = -1;
      const text = document.createElement('span');
      text.textContent = label;
      const tick = document.createElement('span');
      tick.className = 'selection-tick';
      tick.setAttribute('aria-hidden', 'true');
      tick.textContent = option.selected ? '✓' : '';
      item.append(text, tick);
      item.addEventListener('click', () => {
        const select = active;
        select.selectedIndex = option.index;
        refresh(select);
        dismiss();
        select.dispatchEvent(new Event('input', {bubbles: true}));
        select.dispatchEvent(new Event('change', {bubbles: true}));
      });
      list.append(item);
    }
    const first = list.querySelector('[aria-selected=true]:not(:disabled)') || list.querySelector(':not(:disabled)');
    if (first) first.tabIndex = 0;
    sheet.querySelector('.selection-empty').hidden = list.childElementCount > 0;
  }

  function dismiss() {
    if (!active) return;
    const button = controls.get(active)?.button;
    active = null;
    if (sheet.open) sheet.close();
    document.documentElement.classList.remove('selection-open');
    document.documentElement.style.removeProperty('--page-scroll-top');
    window.scrollTo(0, scrollPosition);
    button?.setAttribute('aria-expanded', 'false');
    if (button?.isConnected) button.focus({preventScroll: true});
    clearTimeout(typeaheadTimer);
    typeahead = '';
  }

  function open(select) {
    if (select.disabled) return;
    if (active) dismiss();
    const control = controls.get(select);
    active = select;
    search.value = '';
    searchBox.hidden = select.name !== 'schoolId';
    sheet.querySelector('#selection-title').textContent = control.label;
    paintOptions();
    scrollPosition = window.scrollY;
    document.documentElement.style.setProperty('--page-scroll-top', `${-scrollPosition}px`);
    document.documentElement.classList.add('selection-open');
    control.button.setAttribute('aria-expanded', 'true');
    sheet.showModal();
    focusOption(list.querySelector('[tabindex="0"]'));
  }

  function upgrade() {
    if (active && !root.contains(active)) dismiss();
    root.querySelectorAll('select:not([multiple])').forEach(select => {
      if (controls.has(select)) return refresh(select);
      const labelElement = select.closest('label');
      const label = select.getAttribute('aria-label') || labelElement?.querySelector('span')?.textContent.trim() || 'Selecciona una opción';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'select-trigger';
      button.id = `select-trigger-${++sequence}`;
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute('aria-controls', 'selection-sheet');
      const value = document.createElement('span');
      value.className = 'select-value';
      const chevron = document.createElement('span');
      chevron.className = 'select-chevron';
      chevron.setAttribute('aria-hidden', 'true');
      button.append(value, chevron);
      const error = document.createElement('small');
      error.className = 'selection-error';
      error.id = `${button.id}-error`;
      error.hidden = true;
      error.textContent = `Selecciona ${label.toLocaleLowerCase('es')}.`;
      const wrapper = document.createElement('div');
      wrapper.className = 'select-control';
      select.before(wrapper);
      wrapper.append(select, button, error);
      select.hidden = true;
      select.tabIndex = -1;
      if (labelElement) labelElement.htmlFor = button.id;
      controls.set(select, {button, value, error, label});
      button.addEventListener('click', () => open(select));
      button.addEventListener('keydown', event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          open(select);
        }
      });
      select.addEventListener('change', () => refresh(select));
      select.addEventListener('invalid', event => {
        event.preventDefault();
        button.setAttribute('aria-invalid', 'true');
        button.setAttribute('aria-describedby', error.id);
        error.hidden = false;
        if (select === select.form?.querySelector(':invalid')) button.focus();
      });
      refresh(select);
    });
  }

  sheet.id = 'selection-sheet';
  sheet.querySelector('.selection-close').addEventListener('click', dismiss);
  sheet.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  sheet.addEventListener('close', () => { if (!sheet.open) dismiss(); });
  // A click on the backdrop closes the panel, without treating padding as outside.
  sheet.addEventListener('click', event => {
    if (event.target !== sheet) return;
    const box = sheet.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dismiss();
  });
  search.addEventListener('input', paintOptions);
  list.addEventListener('keydown', event => {
    const items = [...list.querySelectorAll('[role=option]:not(:disabled)')];
    const index = items.indexOf(document.activeElement);
    let next;
    if (event.key === 'ArrowDown') next = items[(index + 1) % items.length];
    else if (event.key === 'ArrowUp') next = items[(index - 1 + items.length) % items.length];
    else if (event.key === 'Home') next = items[0];
    else if (event.key === 'End') next = items.at(-1);
    else if (event.key.length === 1 && event.key !== ' ' && !event.ctrlKey && !event.metaKey && !event.altKey) {
      typeahead += event.key.toLocaleLowerCase('es');
      clearTimeout(typeaheadTimer);
      typeaheadTimer = setTimeout(() => { typeahead = ''; }, 700);
      next = items.find(item => item.firstChild.textContent.toLocaleLowerCase('es').startsWith(typeahead));
    }
    if (next) { event.preventDefault(); focusOption(next); }
  });
  root.addEventListener('reset', () => queueMicrotask(() => root.querySelectorAll('select').forEach(refresh)));
  window.addEventListener('hashchange', dismiss);
  // Views can replace their markup after a role switch, upload or async request.
  const observer = new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes, ...record.removedNodes].some(node => node.nodeType === 1 && (node.matches('select') || node.querySelector('select'))))) upgrade();
  });
  observer.observe(root, {childList: true, subtree: true});
  upgrade();
}
