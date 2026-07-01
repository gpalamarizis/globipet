"use strict";
/**
 * i18n helper for backend responses.
 * Reads user's preferred language from:
 *  1. ?lang= query parameter
 *  2. Accept-Language header
 *  3. Falls back to 'el'
 */
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
exports.getRequestLang = getRequestLang;
exports.translateRecord = translateRecord;
exports.translateRecords = translateRecords;
var SUPPORTED = ['el', 'en', 'es', 'fr', 'zh'];
function getRequestLang(req) {
    var _a, _b;
    // Priority 1: query param ?lang=en
    if (((_a = req.query) === null || _a === void 0 ? void 0 : _a.lang) && SUPPORTED.includes(req.query.lang)) {
        return req.query.lang;
    }
    // Priority 2: Accept-Language header (e.g. "en-US,en;q=0.9,el;q=0.8")
    var header = (_b = req.headers) === null || _b === void 0 ? void 0 : _b['accept-language'];
    if (header) {
        var langs = header.split(',').map(function (s) { return s.trim().split(';')[0].split('-')[0].toLowerCase(); });
        for (var _i = 0, langs_1 = langs; _i < langs_1.length; _i++) {
            var lang = langs_1[_i];
            if (SUPPORTED.includes(lang))
                return lang;
        }
    }
    return 'el';
}
/**
 * Applies translation to an object by overwriting base fields with translated ones.
 * E.g. translateRecord({ name: 'Α', name_translations: { en: 'A' } }, 'en')
 *   →  { name: 'A', name_translations: {...} }
 *
 * @param record - The database record
 * @param lang - Target language code
 * @param fields - Array of field names to translate (e.g. ['name', 'description'])
 */
function translateRecord(record, lang, fields) {
    if (fields === void 0) { fields = ['name', 'description', 'title', 'provider_name']; }
    if (!record)
        return record;
    if (lang === 'el')
        return record; // EL is the default, no translation needed
    var result = __assign({}, record);
    for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
        var field = fields_1[_i];
        var translationsKey = "".concat(field, "_translations");
        var translations = record[translationsKey];
        if (translations && typeof translations === 'object' && translations[lang]) {
            result[field] = translations[lang];
        }
    }
    return result;
}
/**
 * Apply translateRecord to an array of records
 */
function translateRecords(records, lang, fields) {
    return records.map(function (r) { return translateRecord(r, lang, fields); });
}
