"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoadingSpinner;
function LoadingSpinner(_a) {
    var _b = _a.size, size = _b === void 0 ? 'md' : _b;
    var s = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }[size];
    return <div className={"".concat(s, " border-2 border-gray-200 border-t-brand-900 rounded-full animate-spin")}/>;
}
