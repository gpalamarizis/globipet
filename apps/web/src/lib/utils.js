"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.speciesLabel = exports.speciesEmoji = void 0;
exports.cn = cn;
exports.createPageUrl = createPageUrl;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatRelativeTime = formatRelativeTime;
exports.truncate = truncate;
exports.slugify = slugify;
exports.getInitials = getInitials;
exports.debounce = debounce;
var clsx_1 = require("clsx");
var tailwind_merge_1 = require("tailwind-merge");
function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return (0, tailwind_merge_1.twMerge)((0, clsx_1.clsx)(inputs));
}
function createPageUrl(pageName) {
    return '/' + pageName.toLowerCase().replace(/ /g, '-');
}
function formatCurrency(amount, currency) {
    if (currency === void 0) { currency = 'EUR'; }
    return new Intl.NumberFormat('el-GR', { style: 'currency', currency: currency }).format(amount);
}
function formatDate(date, options) {
    return new Date(date).toLocaleDateString('el-GR', options !== null && options !== void 0 ? options : {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}
function formatRelativeTime(date) {
    var now = new Date();
    var then = new Date(date);
    var diff = now.getTime() - then.getTime();
    var minutes = Math.floor(diff / 60000);
    var hours = Math.floor(diff / 3600000);
    var days = Math.floor(diff / 86400000);
    if (minutes < 1)
        return 'Μόλις τώρα';
    if (minutes < 60)
        return "".concat(minutes, "\u03BB");
    if (hours < 24)
        return "".concat(hours, "\u03C9");
    if (days < 7)
        return "".concat(days, "\u03BC");
    return formatDate(date, { day: 'numeric', month: 'short' });
}
function truncate(str, length) {
    if (length === void 0) { length = 100; }
    return str.length > length ? str.slice(0, length) + '...' : str;
}
function slugify(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
function getInitials(name) {
    return name.split(' ').map(function (n) { return n[0]; }).slice(0, 2).join('').toUpperCase();
}
function debounce(fn, ms) {
    if (ms === void 0) { ms = 300; }
    var timer;
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        clearTimeout(timer);
        timer = setTimeout(function () { return fn.apply(void 0, args); }, ms);
    };
}
exports.speciesEmoji = {
    dog: '🐶', cat: '🐱', bird: '🐦', rabbit: '🐰',
    fish: '🐟', reptile: '🦎', horse: '🐴', other: '🐾',
};
exports.speciesLabel = {
    dog: 'Σκύλος', cat: 'Γάτα', bird: 'Πτηνό', rabbit: 'Κουνέλι',
    fish: 'Ψάρι', reptile: 'Ερπετό', horse: 'Άλογο', other: 'Άλλο',
};
