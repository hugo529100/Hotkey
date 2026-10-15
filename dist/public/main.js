(() => {
    'use strict';

    const LOG = '[Hotkey]';

    // ==================== 状态 ====================
    let enabled = true;
    let hiddenFileDialog = null;

    // ==================== 常量 ====================
    const MENU_BUTTON_SELECTOR = [
        '.dialog-backdrop.file-show button[title="Menu"]',
        '.dialog-backdrop.file-show button[aria-label="Menu"]',
        '.dialog-backdrop.file-show button:has(.fa-menu)',
        '.dialog-backdrop.file-dialog button[title="Menu"]',
        '.dialog-backdrop.file-dialog button[aria-label="Menu"]',
        '.dialog-backdrop.file-dialog button:has(.fa-menu)',
    ].join(', ');

    const ITEM_SELECTOR_PREFIX = '#menu-entry-';
    const MENU_CONTAINER_SELECTOR = '.file-menu';
    const FILE_DIALOG_SELECTOR = '.dialog-backdrop.file-dialog';

    const ACTIONS = [
        'comment', 'open', 'download', 'cut', 'rename',
        'delete', 'zoom', 'fullscreen', 'shuffle', 'repeat',
        'copy-link',
    ];

    const SHORTCUTS = {
        m: 'menu',
        c: 'comment',
        o: 'open',
        d: 'download',
        x: 'cut',
        r: 'rename',
        Delete: 'delete',
        z: 'zoom',
        f: 'fullscreen',
        s: 'shuffle',
        p: 'repeat',
        l: 'copy-link',
    };

    const HIDE_MENU_FOR_ACTIONS = new Set([
        'comment', 'cut', 'rename', 'delete',
    ]);

    // ==================== 上下文判断 ====================
    const Context = {
        isLogin() {
            const d = document.querySelector('[role="dialog"]');
            return !!d && !!d.querySelector('.fa-user');
        },
        isSearch() {
            const d = document.querySelector('[role="dialog"]');
            return !!d && d.id === 'search-dialog';
        },
        isFileShow() {
            return !!document.querySelector(
                '.dialog-backdrop.file-show, .dialog-backdrop.file-dialog'
            );
        },
        hasSubDialog() {
            return !!document.querySelector(
                '.dialog-backdrop.dialog-prompt:not([style*="display: none"]), ' +
                '.dialog-backdrop.dialog-alert:not([style*="display: none"]), ' +
                '.dialog-backdrop.dialog-confirm:not([style*="display: none"])'
            );
        },
        isFormInput() {
            const el = document.activeElement;
            if (!el) return false;
            const tag = el.tagName.toLowerCase();
            if (tag === 'input') {
                const type = (el.type || '').toLowerCase();
                if (['checkbox','radio','button','submit','reset','image'].includes(type)) {
                    return false;
                }
                return true;
            }
            if (tag === 'textarea' || tag === 'select') return true;
            return !!el.isContentEditable;
        },
        isMenuOpen() {
            return !!document.querySelector(MENU_CONTAINER_SELECTOR);
        },
    };

    // ==================== A：对话框按键逻辑 ====================
    function findButton(re) {
        const nodes = [
            ...document.querySelectorAll('button'),
            ...document.querySelectorAll('[role="button"]'),
        ];
        return nodes.find(el => re.test((el.textContent || '').trim()));
    }
    function clickYes() {
        const b = findButton(/^(yes|确定|确认)$/i);
        if (!b) return false;
        b.click(); return true;
    }
    function clickNo() {
        const b = findButton(/^(no|取消|cancel)$/i);
        if (!b) return false;
        b.click(); return true;
    }
    function clickContinue() {
        const b = findButton(/^(continue|继续)$/i);
        if (!b) return false;
        b.click(); return true;
    }

    function handleDialogKeys(e) {
        if (e.key === 'Enter') {
            if (Context.isFormInput()) {
                const btn = findButton(/^(continue|继续)$/i)
                         || findButton(/^(yes|确定|确认)$/i);
                if (btn) { btn.click(); swallow(e); return true; }
                return false;
            }
            if (clickContinue() || clickYes()) { swallow(e); return true; }
        }
        if (e.key === 'Escape' && clickNo()) { swallow(e); return true; }
        if (e.key === 'Backspace' && !Context.isFormInput() && clickNo()) {
            swallow(e); return true;
        }
        return false;
    }

    // ==================== B：文件预览按键逻辑 ====================
    function getMenuItem(action) {
        if (!ACTIONS.includes(action)) return null;
        return document.querySelector(`${ITEM_SELECTOR_PREFIX}${action}`);
    }
    function getMenuButton() {
        return document.querySelector(MENU_BUTTON_SELECTOR);
    }
    function getAllMenuContainers() {
        return Array.from(document.querySelectorAll(MENU_CONTAINER_SELECTOR));
    }
    function getFileDialog() {
        return document.querySelector(FILE_DIALOG_SELECTOR);
    }

    function hideFileDialog() {
        const d = getFileDialog();
        if (!d) return;
        if (hiddenFileDialog && hiddenFileDialog !== d) {
            hiddenFileDialog.style.display = '';
        }
        hiddenFileDialog = d;
        d.style.display = 'none';
    }
    function restoreFileDialog() {
        if (!hiddenFileDialog) return;
        hiddenFileDialog.style.display = '';
        hiddenFileDialog = null;
    }

    function closeAllMenus() {
        const menus = getAllMenuContainers();
        if (menus.length === 0) return false;
        const closer = document.querySelector(
            '.dialog-backdrop.file-show .dialog-closer, ' +
            '.dialog-backdrop.file-dialog .dialog-closer'
        );
        if (closer) closer.click();
        const remaining = getAllMenuContainers();
        if (remaining.length > 1) {
            remaining.slice(1).forEach(m => m.remove());
        }
        return true;
    }

    function clickMenuButton(options = {}) {
        const { toggle = true } = options;
        if (Context.isMenuOpen()) {
            if (toggle) { closeAllMenus(); return true; }
            closeAllMenus();
        }
        const btn = getMenuButton();
        if (!btn) return false;
        btn.click();
        return true;
    }

    function waitForMenuItem(action, timeoutMs = 1500, intervalMs = 50) {
        return new Promise(resolve => {
            const start = Date.now();
            (function check() {
                const item = getMenuItem(action);
                if (item) return resolve(item);
                if (Date.now() - start >= timeoutMs) return resolve(null);
                setTimeout(check, intervalMs);
            })();
        });
    }

    async function clickFileMenuItem(action, options = {}) {
        const { openMenuIfNeeded = true, timeoutMs = 1500, intervalMs = 50 } = options;

        let item = getMenuItem(action);
        if (item) { item.click(); return true; }
        if (!openMenuIfNeeded) return false;

        closeAllMenus();
        if (!clickMenuButton({ toggle: false })) return false;

        item = await waitForMenuItem(action, timeoutMs, intervalMs);
        if (!item) return false;

        const shouldHide = HIDE_MENU_FOR_ACTIONS.has(action);
        item.click();

        if (shouldHide) {
            requestAnimationFrame(() => {
                if (Context.hasSubDialog()) hideFileDialog();
                else requestAnimationFrame(() => {
                    if (Context.hasSubDialog()) hideFileDialog();
                });
            });
        }
        return true;
    }

    function listAvailableMenuItems() {
        const items = Array.from(
            document.querySelectorAll('.file-menu a[id^="menu-entry-"]')
        ).map(item => ({
            id: item.id,
            label: item.querySelector('label div')?.textContent?.trim() || '',
            href: item.getAttribute('href') || '',
        }));
        console.table(items);
        return items;
    }

    function handleFileShowKeys(e) {
        if (Context.isFormInput()) return false;

        if (e.key === 'Escape') {
            if (Context.isMenuOpen()) { closeAllMenus(); swallow(e); return true; }
            return false; // 交还 HFS 关闭预览
        }

        // Enter / Backspace：暂交还 HFS（可按需扩展）
        if (e.key === 'Enter' || e.key === 'Backspace') return false;

        const action = SHORTCUTS[e.key];
        if (!action) return false;

        swallow(e);
        if (action === 'menu') clickMenuButton({ toggle: true });
        else clickFileMenuItem(action);
        return true;
    }

    // ==================== 工具 ====================
    function swallow(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    function shouldSkipAll() {
        return Context.isLogin() || Context.isSearch();
    }

    // ==================== 统一路由 ====================
    function routeKey(e) {
        if (!enabled) return;
        if (shouldSkipAll()) return;

        if (Context.hasSubDialog()) return handleDialogKeys(e);
        if (Context.isFileShow())  return handleFileShowKeys(e);
        return handleDialogKeys(e);
    }

    function handleSubmit(e) {
        if (!enabled) return;
        if (shouldSkipAll()) return;
        const c = findButton(/^(continue|继续)$/i);
        const y = findButton(/^(yes|确定|确认)$/i);
        if (c || y) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            (c || y).click();
        }
    }

    // ==================== Observer（合并） ====================
    let lastState = '';
    function computeState() {
        return [
            Context.isLogin(),
            Context.isSearch(),
            Context.isFileShow(),
            Context.hasSubDialog(),
            Context.isMenuOpen(),
        ].join('|');
    }

    const observer = new MutationObserver(() => {
        const s = computeState();
        if (s !== lastState) {
            lastState = s;
            if (hiddenFileDialog && !Context.hasSubDialog()) {
                restoreFileDialog();
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['role', 'id', 'class', 'style', 'hidden'],
    });

    // ==================== 监听 ====================
    document.addEventListener('keydown', routeKey, true);
    document.addEventListener('submit', handleSubmit, true);

    // ==================== Console 工具 ====================
    window.hotkey = {
        openMenu:   () => clickMenuButton({ toggle: false }),
        closeMenu:  closeAllMenus,
        toggleMenu: () => clickMenuButton({ toggle: true }),
        clickItem:  clickFileMenuItem,
        listItems:  listAvailableMenuItems,
        setEnabled: v => { enabled = !!v; },
        isEnabled:  () => enabled,
        context:    () => ({
            login:    Context.isLogin(),
            search:   Context.isSearch(),
            fileShow: Context.isFileShow(),
            subDialog:Context.hasSubDialog(),
            menuOpen: Context.isMenuOpen(),
            input:    Context.isFormInput(),
        }),
    };

    console.log(LOG, 'installed');
})();