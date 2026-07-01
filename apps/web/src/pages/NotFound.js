"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = NotFound;
var react_router_dom_1 = require("react-router-dom");
var lucide_react_1 = require("lucide-react");
var framer_motion_1 = require("framer-motion");
var react_i18next_1 = require("react-i18next");
function NotFound() {
    var t = (0, react_i18next_1.useTranslation)().t;
    return (<div className="min-h-screen flex items-center justify-center">
      <framer_motion_1.motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
        <p className="text-8xl mb-6">🐾</p>
        <h1 className="text-4xl font-display font-bold text-gray-900 dark:text-white mb-3">{t('notFoundExtra.title')}</h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">{t('notFoundExtra.message')}</p>
        <react_router_dom_1.Link to="/" className="btn-primary inline-flex items-center gap-2"><lucide_react_1.Home size={18}/>{t('notFoundExtra.home')}</react_router_dom_1.Link>
      </framer_motion_1.motion.div>
    </div>);
}
