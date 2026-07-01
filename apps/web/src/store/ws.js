"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useWsStore = void 0;
var zustand_1 = require("zustand");
exports.useWsStore = (0, zustand_1.create)(function (set) { return ({
    lastMessage: null,
    setLastMessage: function (msg) { return set({ lastMessage: msg }); },
}); });
