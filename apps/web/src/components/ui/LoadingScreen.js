"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LoadingScreen;
var LoadingSpinner_1 = require("./LoadingSpinner");
function LoadingScreen() {
    return (<div className="fixed inset-0 flex flex-col items-center justify-center bg-white dark:bg-gray-950 z-50">
      <span className="text-4xl mb-4">🐾</span>
      <LoadingSpinner_1.default size="lg"/>
    </div>);
}
