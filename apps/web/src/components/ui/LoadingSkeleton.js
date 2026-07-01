"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoadingSkeleton;
var utils_1 = require("@/lib/utils");
/**
 * Animated skeleton placeholders for loading states.
 * Better UX than a centered spinner: gives a sense of layout
 * before the data arrives, reducing perceived load time.
 */
function LoadingSkeleton(_a) {
    var _b = _a.variant, variant = _b === void 0 ? 'card' : _b, _c = _a.count, count = _c === void 0 ? 1 : _c, className = _a.className;
    var items = Array.from({ length: count });
    if (variant === 'card') {
        return (<div className={(0, utils_1.cn)('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
        {items.map(function (_, i) { return (<div key={i} className="card overflow-hidden" aria-hidden="true">
            <div className="aspect-video bg-gray-100 dark:bg-gray-800 skeleton"/>
            <div className="p-3 space-y-2">
              <div className="skeleton h-4 w-3/4"/>
              <div className="skeleton h-3 w-1/2"/>
              <div className="flex items-center justify-between mt-3">
                <div className="skeleton h-3 w-12"/>
                <div className="skeleton h-4 w-14"/>
              </div>
            </div>
          </div>); })}
      </div>);
    }
    if (variant === 'list-row') {
        return (<div className={(0, utils_1.cn)('space-y-3', className)}>
        {items.map(function (_, i) { return (<div key={i} className="card p-4 flex gap-4" aria-hidden="true">
            <div className="skeleton w-20 h-20 rounded-xl shrink-0"/>
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-2/3"/>
              <div className="skeleton h-3 w-1/3"/>
              <div className="skeleton h-3 w-1/4"/>
            </div>
            <div className="skeleton h-8 w-20 rounded-xl shrink-0"/>
          </div>); })}
      </div>);
    }
    if (variant === 'avatar') {
        return <div className={(0, utils_1.cn)('skeleton rounded-full w-10 h-10', className)} aria-hidden="true"/>;
    }
    // text
    return (<div className={(0, utils_1.cn)('space-y-2', className)} aria-hidden="true">
      {items.map(function (_, i) { return (<div key={i} className="skeleton h-3 w-full"/>); })}
    </div>);
}
