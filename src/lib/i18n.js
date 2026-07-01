"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
var i18next_1 = require("i18next");
var react_i18next_1 = require("react-i18next");
var Localization = require("expo-localization");
var el = {
    home: { title: 'GlobiPet', subtitle: 'Η #1 πλατφόρμα για κατοικίδια' },
    nav: { home: 'Αρχική', services: 'Υπηρεσίες', shop: 'Κατάστημα', social: 'Social', profile: 'Προφίλ' },
    auth: { login: 'Σύνδεση', register: 'Εγγραφή', email: 'Email', password: 'Κωδικός', logout: 'Αποσύνδεση' },
};
var en = {
    home: { title: 'GlobiPet', subtitle: 'The #1 pet platform' },
    nav: { home: 'Home', services: 'Services', shop: 'Shop', social: 'Social', profile: 'Profile' },
    auth: { login: 'Login', register: 'Register', email: 'Email', password: 'Password', logout: 'Logout' },
};
var locale = ((_a = Localization.getLocales()[0]) === null || _a === void 0 ? void 0 : _a.languageCode) || 'el';
i18next_1.default.use(react_i18next_1.initReactI18next).init({
    resources: { el: { translation: el }, en: { translation: en } },
    lng: locale,
    fallbackLng: 'el',
    interpolation: { escapeValue: false },
});
exports.default = i18next_1.default;
