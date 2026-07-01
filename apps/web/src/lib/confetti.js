"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.celebrate = celebrate;
exports.successBurst = successBurst;
exports.sideBurst = sideBurst;
var canvas_confetti_1 = require("canvas-confetti");
/**
 * Trigger celebratory confetti animation
 * Use after successful bookings, payments, registrations, etc.
 */
function celebrate() {
    var count = 200;
    var defaults = {
        origin: { y: 0.7 },
        colors: ['#FFD60A', '#FF9500', '#E65100', '#1565C0', '#10b981', '#a855f7'],
    };
    function fire(particleRatio, opts) {
        (0, canvas_confetti_1.default)(__assign(__assign(__assign({}, defaults), opts), { particleCount: Math.floor(count * particleRatio) }));
    }
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
}
/**
 * Quick success burst — smaller, snappier
 */
function successBurst() {
    (0, canvas_confetti_1.default)({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#FFD60A', '#FF9500'],
    });
}
/**
 * From side — for left/right achievements
 */
function sideBurst(side) {
    if (side === void 0) { side = 'left'; }
    (0, canvas_confetti_1.default)({
        particleCount: 100,
        angle: side === 'left' ? 60 : 120,
        spread: 55,
        origin: { x: side === 'left' ? 0 : 1, y: 0.7 },
        colors: ['#FFD60A', '#FF9500', '#E65100'],
    });
}
