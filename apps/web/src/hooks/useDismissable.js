"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useDismissable = useDismissable;
var react_1 = require("react");
function useDismissable(open, onClose, options) {
    if (options === void 0) { options = {}; }
    var _a = options.escape, escape = _a === void 0 ? true : _a, _b = options.clickOutside, clickOutside = _b === void 0 ? true : _b, _c = options.extraRefs, extraRefs = _c === void 0 ? [] : _c;
    var ref = (0, react_1.useRef)(null);
    var onCloseRef = (0, react_1.useRef)(onClose);
    onCloseRef.current = onClose;
    (0, react_1.useEffect)(function () {
        if (!open)
            return;
        var handleMouseDown = function (e) {
            var target = e.target;
            if (ref.current && ref.current.contains(target))
                return;
            for (var _i = 0, extraRefs_1 = extraRefs; _i < extraRefs_1.length; _i++) {
                var r = extraRefs_1[_i];
                if (r.current && r.current.contains(target))
                    return;
            }
            onCloseRef.current();
        };
        var handleEscape = function (e) {
            if (e.key === 'Escape')
                onCloseRef.current();
        };
        if (clickOutside)
            document.addEventListener('mousedown', handleMouseDown, true);
        if (escape)
            document.addEventListener('keydown', handleEscape);
        return function () {
            document.removeEventListener('mousedown', handleMouseDown, true);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [open]);
    return ref;
}
