"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Skeleton;
exports.CardSkeleton = CardSkeleton;
exports.ProductGridSkeleton = ProductGridSkeleton;
function Skeleton(_a) {
    var _b = _a.className, className = _b === void 0 ? '' : _b, _c = _a.count, count = _c === void 0 ? 1 : _c, _d = _a.variant, variant = _d === void 0 ? 'text' : _d;
    var baseClasses = 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%]';
    var variantClasses = {
        text: 'h-4 rounded',
        card: 'h-32 rounded-2xl',
        circle: 'rounded-full',
        image: 'aspect-[4/3] rounded-2xl',
    };
    return (<>
      {Array.from({ length: count }).map(function (_, i) { return (<div key={i} className={"".concat(baseClasses, " ").concat(variantClasses[variant], " ").concat(className)} style={{ animationDuration: '1.5s' }}/>); })}
    </>);
}
// Specialized skeleton for product/service cards
function CardSkeleton() {
    return (<div className="rounded-2xl bg-white dark:bg-gray-800 p-4 shadow-sm border border-gray-100 dark:border-gray-700">
      <Skeleton variant="image" className="mb-3"/>
      <Skeleton variant="text" className="w-3/4 h-5 mb-2"/>
      <Skeleton variant="text" className="w-1/2 h-4"/>
    </div>);
}
// Product grid skeleton
function ProductGridSkeleton(_a) {
    var _b = _a.count, count = _b === void 0 ? 4 : _b;
    return (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map(function (_, i) { return (<CardSkeleton key={i}/>); })}
    </div>);
}
