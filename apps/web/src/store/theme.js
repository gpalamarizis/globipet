"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useThemeStore = void 0;
var zustand_1 = require("zustand");
var middleware_1 = require("zustand/middleware");
function getSystemTheme() {
    if (typeof window === 'undefined')
        return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyThemeToDOM(theme) {
    if (typeof document === 'undefined')
        return;
    var effectiveTheme = theme === 'system' ? getSystemTheme() : theme;
    if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark');
    }
    else {
        document.documentElement.classList.remove('dark');
    }
}
exports.useThemeStore = (0, zustand_1.create)()((0, middleware_1.persist)(function (set, get) { return ({
    theme: 'light',
    setTheme: function (theme) {
        set({ theme: theme });
        applyThemeToDOM(theme);
    },
    toggleTheme: function () {
        var current = get().theme;
        var next = current === 'dark' ? 'light' : 'dark';
        set({ theme: next });
        applyThemeToDOM(next);
    },
    applyTheme: function () {
        applyThemeToDOM(get().theme);
    },
}); }, {
    name: 'globipet-theme',
    onRehydrateStorage: function () { return function (state) {
        if (state) {
            applyThemeToDOM(state.theme);
        }
    }; },
}));
// Listen for system theme changes if in 'system' mode
if (typeof window !== 'undefined') {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        var state = exports.useThemeStore.getState();
        if (state.theme === 'system') {
            applyThemeToDOM('system');
        }
    });
}
