"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
var sdk_1 = require("@anthropic-ai/sdk");
var aiRoutes = function (app) { return __awaiter(void 0, void 0, void 0, function () {
    // Extract the final text block from a response that may include web_search tool blocks
    function extractFinalText(content) {
        var textBlocks = content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; });
        return textBlocks[textBlocks.length - 1] || '';
    }
    function parseJsonResponse(text) {
        var cleaned = text.replace(/```json|```/g, '').trim();
        // Claude sometimes adds a short lead-in/trailing note after using tools — extract just the {...} block
        var firstBrace = cleaned.indexOf('{');
        var lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
            throw new Error('Δεν βρέθηκε έγκυρο JSON στην απάντηση του AI');
        }
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    var client, webSearchTool;
    return __generator(this, function (_a) {
        client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
        webSearchTool = { type: 'web_search_20250305', name: 'web_search' };
        // Pet Health Analysis — now compares against public veterinary reference data via web search
        app.post('/pet-health', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, image_url, analysis_type, breed, species, dataUrlMatch, imageContent, systemPrompt, userPrompt, response, text, err_1;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, image_url = _a.image_url, analysis_type = _a.analysis_type, breed = _a.breed, species = _a.species;
                        if (!image_url || !analysis_type)
                            return [2 /*return*/, reply.code(400).send({ message: 'Απαιτούνται image_url και analysis_type' })
                                // The /upload endpoint falls back to a base64 data: URI when no storage (R2) is configured.
                                // Claude's "url" image source can't fetch data: URIs — convert those to a base64 image block instead.
                            ];
                        dataUrlMatch = image_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
                        imageContent = dataUrlMatch
                            ? { type: 'image', source: { type: 'base64', media_type: dataUrlMatch[1], data: dataUrlMatch[2] } }
                            : { type: 'image', source: { type: 'url', url: image_url } };
                        systemPrompt = analysis_type === 'skin'
                            ? "\u0395\u03AF\u03C3\u03B1\u03B9 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03CC\u03C2 \u03B2\u03BF\u03B7\u03B8\u03CC\u03C2 AI \u03B5\u03BE\u03B5\u03B9\u03B4\u03B9\u03BA\u03B5\u03C5\u03BC\u03AD\u03BD\u03BF\u03C2 \u03C3\u03C4\u03B7 \u03B4\u03B5\u03C1\u03BC\u03B1\u03C4\u03BF\u03BB\u03BF\u03B3\u03AF\u03B1 \u03B6\u03CE\u03C9\u03BD \u03C3\u03C5\u03BD\u03C4\u03C1\u03BF\u03C6\u03B9\u03AC\u03C2. \u038C\u03C4\u03B1\u03BD \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9, \u03B1\u03BD\u03B1\u03B6\u03B7\u03C4\u03AC\u03C2 \u03C3\u03C4\u03BF \u03B4\u03B9\u03B1\u03B4\u03AF\u03BA\u03C4\u03C5\u03BF \u03B1\u03BE\u03B9\u03CC\u03C0\u03B9\u03C3\u03C4\u03B5\u03C2 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03AD\u03C2 \u03C0\u03B7\u03B3\u03AD\u03C2 (\u03C0.\u03C7. veterinary partner, merck vet manual, pet health sites) \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03C3\u03C5\u03B3\u03BA\u03C1\u03AF\u03BD\u03B5\u03B9\u03C2 \u03C4\u03B1 \u03B5\u03C5\u03C1\u03AE\u03BC\u03B1\u03C4\u03B1 \u03BC\u03B5 \u03B3\u03BD\u03C9\u03C3\u03C4\u03AD\u03C2 \u03C0\u03B1\u03B8\u03AE\u03C3\u03B5\u03B9\u03C2/\u03C6\u03C5\u03C3\u03B9\u03BF\u03BB\u03BF\u03B3\u03B9\u03BA\u03AC \u03C0\u03C1\u03CC\u03C4\u03C5\u03C0\u03B1 \u03C4\u03B7\u03C2 \u03C1\u03AC\u03C4\u03C3\u03B1\u03C2. \u03A0\u03AC\u03BD\u03C4\u03B1 \u03B1\u03C0\u03B1\u03BD\u03C4\u03AC\u03C2 \u03C3\u03B5 JSON \u03BA\u03B1\u03B9 \u039C\u039F\u039D\u039F JSON \u03C3\u03C4\u03BF \u03C4\u03B5\u03BB\u03B9\u03BA\u03CC \u03C3\u03BF\u03C5 \u03BC\u03AE\u03BD\u03C5\u03BC\u03B1, \u03C7\u03C9\u03C1\u03AF\u03C2 markdown."
                            : "\u0395\u03AF\u03C3\u03B1\u03B9 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03CC\u03C2 \u03B2\u03BF\u03B7\u03B8\u03CC\u03C2 AI \u03B5\u03BE\u03B5\u03B9\u03B4\u03B9\u03BA\u03B5\u03C5\u03BC\u03AD\u03BD\u03BF\u03C2 \u03C3\u03C4\u03B7\u03BD \u03BF\u03C6\u03B8\u03B1\u03BB\u03BC\u03BF\u03BB\u03BF\u03B3\u03AF\u03B1 \u03B6\u03CE\u03C9\u03BD \u03C3\u03C5\u03BD\u03C4\u03C1\u03BF\u03C6\u03B9\u03AC\u03C2. \u038C\u03C4\u03B1\u03BD \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9, \u03B1\u03BD\u03B1\u03B6\u03B7\u03C4\u03AC\u03C2 \u03C3\u03C4\u03BF \u03B4\u03B9\u03B1\u03B4\u03AF\u03BA\u03C4\u03C5\u03BF \u03B1\u03BE\u03B9\u03CC\u03C0\u03B9\u03C3\u03C4\u03B5\u03C2 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03AD\u03C2 \u03C0\u03B7\u03B3\u03AD\u03C2 \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03C3\u03C5\u03B3\u03BA\u03C1\u03AF\u03BD\u03B5\u03B9\u03C2 \u03C4\u03B1 \u03B5\u03C5\u03C1\u03AE\u03BC\u03B1\u03C4\u03B1 \u03BC\u03B5 \u03B3\u03BD\u03C9\u03C3\u03C4\u03AD\u03C2 \u03C0\u03B1\u03B8\u03AE\u03C3\u03B5\u03B9\u03C2/\u03C6\u03C5\u03C3\u03B9\u03BF\u03BB\u03BF\u03B3\u03B9\u03BA\u03AC \u03C0\u03C1\u03CC\u03C4\u03C5\u03C0\u03B1 \u03C4\u03B7\u03C2 \u03C1\u03AC\u03C4\u03C3\u03B1\u03C2. \u03A0\u03AC\u03BD\u03C4\u03B1 \u03B1\u03C0\u03B1\u03BD\u03C4\u03AC\u03C2 \u03C3\u03B5 JSON \u03BA\u03B1\u03B9 \u039C\u039F\u039D\u039F JSON \u03C3\u03C4\u03BF \u03C4\u03B5\u03BB\u03B9\u03BA\u03CC \u03C3\u03BF\u03C5 \u03BC\u03AE\u03BD\u03C5\u03BC\u03B1, \u03C7\u03C9\u03C1\u03AF\u03C2 markdown.";
                        userPrompt = "\u0391\u03BD\u03AC\u03BB\u03C5\u03C3\u03B5 \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7 \u03C6\u03C9\u03C4\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1 ".concat(analysis_type === 'skin' ? 'δέρματος' : 'ματιού', " \u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03AF\u03B4\u03B9\u03BF\u03C5 \u03B6\u03CE\u03BF\u03C5").concat(breed ? " (\u03C1\u03AC\u03C4\u03C3\u03B1: ".concat(breed, ")") : '').concat(species ? " (\u03B5\u03AF\u03B4\u03BF\u03C2: ".concat(species, ")") : '', ".\n\u0391\u03BD \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9, \u03C8\u03AC\u03BE\u03B5 \u03C3\u03C4\u03BF \u03B4\u03B9\u03B1\u03B4\u03AF\u03BA\u03C4\u03C5\u03BF \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03C3\u03C5\u03B3\u03BA\u03C1\u03AF\u03BD\u03B5\u03B9\u03C2 \u03C4\u03B1 \u03B5\u03C5\u03C1\u03AE\u03BC\u03B1\u03C4\u03B1 \u03BC\u03B5 \u03B4\u03B7\u03BC\u03CC\u03C3\u03B9\u03B5\u03C2 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03AD\u03C2 \u03C0\u03B7\u03B3\u03AD\u03C2 \u03C3\u03C7\u03B5\u03C4\u03B9\u03BA\u03AC \u03BC\u03B5 \u03C3\u03C5\u03BD\u03AE\u03B8\u03B5\u03B9\u03C2 \u03C0\u03B1\u03B8\u03AE\u03C3\u03B5\u03B9\u03C2 \u03B1\u03C5\u03C4\u03AE\u03C2 \u03C4\u03B7\u03C2 \u03C1\u03AC\u03C4\u03C3\u03B1\u03C2/\u03B5\u03AF\u03B4\u03BF\u03C5\u03C2.\n\u0395\u03C0\u03AD\u03C3\u03C4\u03C1\u03B5\u03C8\u03B5 \u039C\u039F\u039D\u039F JSON \u03C9\u03C2 \u03C4\u03B5\u03BB\u03B9\u03BA\u03AE \u03B1\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B7. \u03A4\u03B1 \"findings\" \u03BA\u03B1\u03B9 \"conditions\" \u03C0\u03C1\u03AD\u03C0\u03B5\u03B9 \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 arrays \u03B1\u03C0\u03CC \u0391\u03A0\u039B\u0391 strings (\u03CC\u03C7\u03B9 objects):\n{\"severity\":\"low\"|\"medium\"|\"high\",\"findings\":[\"...\"],\"conditions\":[\"...\"],\"comparison_sources\":[\"\u03C3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B7 \u03B1\u03BD\u03B1\u03C6\u03BF\u03C1\u03AC \u03C0\u03B7\u03B3\u03AE\u03C2 1\",\"\u03C3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B7 \u03B1\u03BD\u03B1\u03C6\u03BF\u03C1\u03AC \u03C0\u03B7\u03B3\u03AE\u03C2 2\"],\"recommendation\":\"\",\"urgency\":\"\",\"disclaimer\":\"\u0391\u03C5\u03C4\u03AE \u03B7 \u03B1\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B5\u03BD\u03B4\u03B5\u03B9\u03BA\u03C4\u03B9\u03BA\u03AE \u03BA\u03B1\u03B9 \u03B4\u03B5\u03BD \u03C5\u03C0\u03BF\u03BA\u03B1\u03B8\u03B9\u03C3\u03C4\u03AC \u03C4\u03B7\u03BD \u03B5\u03C0\u03AF\u03C3\u03BA\u03B5\u03C8\u03B7 \u03C3\u03B5 \u03BA\u03C4\u03B7\u03BD\u03AF\u03B1\u03C4\u03C1\u03BF.\"}");
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.messages.create({
                                model: 'claude-opus-4-5',
                                max_tokens: 1536,
                                system: systemPrompt,
                                tools: [webSearchTool],
                                messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
                            })];
                    case 2:
                        response = _b.sent();
                        text = extractFinalText(response.content);
                        return [2 /*return*/, parseJsonResponse(text)];
                    case 3:
                        err_1 = _b.sent();
                        console.error('AI health error:', err_1);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err_1.message })];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // Pet Emotion Analysis - single frame (image URL or base64)
        app.post('/emotion', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, image_url, image_base64, media_type, species, context, systemPrompt, userPrompt, imageContent, response, text, err_2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, image_url = _a.image_url, image_base64 = _a.image_base64, media_type = _a.media_type, species = _a.species, context = _a.context;
                        if (!image_url && !image_base64)
                            return [2 /*return*/, reply.code(400).send({ message: 'Απαιτείται εικόνα' })];
                        systemPrompt = "\u0395\u03AF\u03C3\u03B1\u03B9 \u03B5\u03B9\u03B4\u03B9\u03BA\u03CC\u03C2 AI \u03C3\u03C4\u03B7 \u03C3\u03C5\u03BD\u03B1\u03B9\u03C3\u03B8\u03B7\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u03BD\u03BF\u03B7\u03BC\u03BF\u03C3\u03CD\u03BD\u03B7 \u03B6\u03CE\u03C9\u03BD \u03C3\u03C5\u03BD\u03C4\u03C1\u03BF\u03C6\u03B9\u03AC\u03C2.\n\u0391\u03BD\u03B1\u03BB\u03CD\u03B5\u03B9\u03C2 \u03B5\u03B9\u03BA\u03CC\u03BD\u03B5\u03C2/frames \u03B2\u03AF\u03BD\u03C4\u03B5\u03BF \u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03AF\u03B4\u03B9\u03C9\u03BD \u03B6\u03CE\u03C9\u03BD \u03BA\u03B1\u03B9 \u03B1\u03BE\u03B9\u03BF\u03BB\u03BF\u03B3\u03B5\u03AF\u03C2:\n- \u03A3\u03C5\u03BD\u03B1\u03B9\u03C3\u03B8\u03B7\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u03BA\u03B1\u03C4\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7 (happy, calm, anxious, fearful, excited, playful, tired, stressed, neutral)\n- \u0393\u03BB\u03CE\u03C3\u03C3\u03B1 \u03C3\u03CE\u03BC\u03B1\u03C4\u03BF\u03C2 (\u03C3\u03C4\u03AC\u03C3\u03B7, \u03B1\u03C5\u03C4\u03B9\u03AC, \u03BF\u03C5\u03C1\u03AC, \u03BC\u03AC\u03C4\u03B9\u03B1, \u03C3\u03C4\u03CC\u03BC\u03B1)\n- \u0395\u03C0\u03AF\u03C0\u03B5\u03B4\u03BF \u03B5\u03BD\u03AD\u03C1\u03B3\u03B5\u03B9\u03B1\u03C2 (1-10)\n- \u03A3\u03C5\u03BC\u03B2\u03BF\u03C5\u03BB\u03AD\u03C2 \u03B3\u03B9\u03B1 \u03C4\u03BF\u03BD \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7\n\u038C\u03C4\u03B1\u03BD \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9, \u03BC\u03C0\u03BF\u03C1\u03B5\u03AF\u03C2 \u03BD\u03B1 \u03B1\u03BD\u03B1\u03B6\u03B7\u03C4\u03AE\u03C3\u03B5\u03B9\u03C2 \u03C3\u03C4\u03BF \u03B4\u03B9\u03B1\u03B4\u03AF\u03BA\u03C4\u03C5\u03BF \u03B4\u03B7\u03BC\u03CC\u03C3\u03B9\u03B5\u03C2 \u03C0\u03B7\u03B3\u03AD\u03C2 \u03B3\u03B9\u03B1 \u03C3\u03C5\u03BC\u03C0\u03B5\u03C1\u03B9\u03C6\u03BF\u03C1\u03AC \u03C4\u03B7\u03C2 \u03C1\u03AC\u03C4\u03C3\u03B1\u03C2/\u03B5\u03AF\u03B4\u03BF\u03C5\u03C2 \u03CE\u03C3\u03C4\u03B5 \u03B7 \u03C3\u03CD\u03B3\u03BA\u03C1\u03B9\u03C3\u03B7 \u03BD\u03B1 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03C0\u03B9\u03BF \u03B1\u03BA\u03C1\u03B9\u03B2\u03AE\u03C2.\n\u0391\u03C0\u03B1\u03BD\u03C4\u03AC\u03C2 \u039C\u039F\u039D\u039F \u03C3\u03B5 JSON \u03C3\u03C4\u03BF \u03C4\u03B5\u03BB\u03B9\u03BA\u03CC \u03C3\u03BF\u03C5 \u03BC\u03AE\u03BD\u03C5\u03BC\u03B1, \u03C7\u03C9\u03C1\u03AF\u03C2 markdown.";
                        userPrompt = "\u0391\u03BD\u03AC\u03BB\u03C5\u03C3\u03B5 \u03C4\u03B7 \u03C3\u03C5\u03BD\u03B1\u03B9\u03C3\u03B8\u03B7\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u03BA\u03B1\u03C4\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7 ".concat(species ? "\u03C4\u03BF\u03C5 ".concat(species) : 'του κατοικίδιου', " \u03C3\u03B5 \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7\u03BD \u03B5\u03B9\u03BA\u03CC\u03BD\u03B1.\n").concat(context ? "\u03A0\u03BB\u03B1\u03AF\u03C3\u03B9\u03BF: ".concat(context) : '', "\n\n\u0395\u03C0\u03AD\u03C3\u03C4\u03C1\u03B5\u03C8\u03B5 \u039C\u039F\u039D\u039F JSON:\n{\n  \"emotion\": \"happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral\",\n  \"emotion_el\": \"\u03C7\u03B1\u03C1\u03BF\u03CD\u03BC\u03B5\u03BD\u03BF|\u03AE\u03C1\u03B5\u03BC\u03BF|\u03B1\u03BD\u03AE\u03C3\u03C5\u03C7\u03BF|\u03C6\u03BF\u03B2\u03B9\u03C3\u03BC\u03AD\u03BD\u03BF|\u03B5\u03BD\u03B8\u03BF\u03C5\u03C3\u03B9\u03B1\u03C3\u03BC\u03AD\u03BD\u03BF|\u03C0\u03B1\u03B9\u03C7\u03BD\u03B9\u03B4\u03B9\u03AC\u03C1\u03B9\u03BA\u03BF|\u03BA\u03BF\u03C5\u03C1\u03B1\u03C3\u03BC\u03AD\u03BD\u03BF|\u03B1\u03B3\u03C7\u03C9\u03BC\u03AD\u03BD\u03BF|\u03BF\u03C5\u03B4\u03AD\u03C4\u03B5\u03C1\u03BF\",\n  \"confidence\": 0.0-1.0,\n  \"energy_level\": 1-10,\n  \"body_language\": {\n    \"posture\": \"\u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AE \u03C3\u03C4\u03AC\u03C3\u03B7\u03C2\",\n    \"ears\": \"\u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AE \u03B1\u03C5\u03C4\u03B9\u03CE\u03BD\",\n    \"tail\": \"\u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AE \u03BF\u03C5\u03C1\u03AC\u03C2\",\n    \"eyes\": \"\u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AE \u03BC\u03B1\u03C4\u03B9\u03CE\u03BD\",\n    \"mouth\": \"\u03C0\u03B5\u03C1\u03B9\u03B3\u03C1\u03B1\u03C6\u03AE \u03C3\u03C4\u03CC\u03BC\u03B1\u03C4\u03BF\u03C2\"\n  },\n  \"observations\": [\"\u03C0\u03B1\u03C1\u03B1\u03C4\u03AE\u03C1\u03B7\u03C3\u03B7 1\", \"\u03C0\u03B1\u03C1\u03B1\u03C4\u03AE\u03C1\u03B7\u03C3\u03B7 2\"],\n  \"advice\": \"\u03C3\u03C5\u03BC\u03B2\u03BF\u03C5\u03BB\u03AE \u03B3\u03B9\u03B1 \u03C4\u03BF\u03BD \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7\",\n  \"welfare_score\": 1-10\n}");
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        imageContent = image_base64
                            ? { type: 'image', source: { type: 'base64', media_type: media_type || 'image/jpeg', data: image_base64 } }
                            : { type: 'image', source: { type: 'url', url: image_url } };
                        return [4 /*yield*/, client.messages.create({
                                model: 'claude-opus-4-5',
                                max_tokens: 1536,
                                system: systemPrompt,
                                tools: [webSearchTool],
                                messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
                            })];
                    case 2:
                        response = _b.sent();
                        text = extractFinalText(response.content);
                        return [2 /*return*/, parseJsonResponse(text)];
                    case 3:
                        err_2 = _b.sent();
                        console.error('AI emotion error:', err_2);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err_2.message })];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // Pet Emotion - analyze uploaded video frames (multiple frames)
        app.post('/emotion/video', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, frames, species, duration_seconds, systemPrompt, framesToAnalyze, imageContents, userPrompt, response, text, err_3;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, frames = _a.frames, species = _a.species, duration_seconds = _a.duration_seconds;
                        // frames: array of base64 strings (extracted from video on frontend)
                        if (!frames || !Array.isArray(frames) || frames.length === 0)
                            return [2 /*return*/, reply.code(400).send({ message: 'Απαιτούνται frames' })];
                        systemPrompt = "\u0395\u03AF\u03C3\u03B1\u03B9 \u03B5\u03B9\u03B4\u03B9\u03BA\u03CC\u03C2 AI \u03C3\u03C4\u03B7 \u03C3\u03C5\u03BD\u03B1\u03B9\u03C3\u03B8\u03B7\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u03BD\u03BF\u03B7\u03BC\u03BF\u03C3\u03CD\u03BD\u03B7 \u03B6\u03CE\u03C9\u03BD. \u0391\u03BD\u03B1\u03BB\u03CD\u03B5\u03B9\u03C2 \u03C0\u03BF\u03BB\u03BB\u03B1\u03C0\u03BB\u03AC frames \u03B2\u03AF\u03BD\u03C4\u03B5\u03BF \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03B1\u03BE\u03B9\u03BF\u03BB\u03BF\u03B3\u03AE\u03C3\u03B5\u03B9\u03C2 \u03C4\u03B7 \u03C3\u03C5\u03BD\u03BF\u03BB\u03B9\u03BA\u03AE \u03C3\u03C5\u03BD\u03B1\u03B9\u03C3\u03B8\u03B7\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u03BA\u03B1\u03C4\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7. \u038C\u03C4\u03B1\u03BD \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9, \u03B1\u03BD\u03B1\u03B6\u03B7\u03C4\u03AC\u03C2 \u03C3\u03C4\u03BF \u03B4\u03B9\u03B1\u03B4\u03AF\u03BA\u03C4\u03C5\u03BF \u03B4\u03B7\u03BC\u03CC\u03C3\u03B9\u03B5\u03C2 \u03C0\u03B7\u03B3\u03AD\u03C2 \u03B3\u03B9\u03B1 \u03C3\u03C5\u03BC\u03C0\u03B5\u03C1\u03B9\u03C6\u03BF\u03C1\u03AC \u03C4\u03B7\u03C2 \u03C1\u03AC\u03C4\u03C3\u03B1\u03C2/\u03B5\u03AF\u03B4\u03BF\u03C5\u03C2. \u0391\u03C0\u03B1\u03BD\u03C4\u03AC\u03C2 \u039C\u039F\u039D\u039F JSON \u03C3\u03C4\u03BF \u03C4\u03B5\u03BB\u03B9\u03BA\u03CC \u03C3\u03BF\u03C5 \u03BC\u03AE\u03BD\u03C5\u03BC\u03B1.";
                        framesToAnalyze = frames.slice(0, 5);
                        imageContents = framesToAnalyze.map(function (f) { return ({
                            type: 'image',
                            source: { type: 'base64', media_type: 'image/jpeg', data: f }
                        }); });
                        userPrompt = "\u0391\u03C5\u03C4\u03AC \u03B5\u03AF\u03BD\u03B1\u03B9 ".concat(framesToAnalyze.length, " frames \u03B1\u03C0\u03CC \u03B2\u03AF\u03BD\u03C4\u03B5\u03BF \u03B4\u03B9\u03AC\u03C1\u03BA\u03B5\u03B9\u03B1\u03C2 ").concat(duration_seconds || '?', " \u03B4\u03B5\u03C5\u03C4\u03B5\u03C1\u03BF\u03BB\u03AD\u03C0\u03C4\u03C9\u03BD ").concat(species ? "\u03B5\u03BD\u03CC\u03C2 ".concat(species) : 'ενός κατοικίδιου', ".\n\u0391\u03BD\u03AC\u03BB\u03C5\u03C3\u03B5 \u03C4\u03B7 \u03C3\u03C5\u03BD\u03B1\u03B9\u03C3\u03B8\u03B7\u03BC\u03B1\u03C4\u03B9\u03BA\u03AE \u03BA\u03B1\u03C4\u03AC\u03C3\u03C4\u03B1\u03C3\u03B7 \u03C3\u03C5\u03BD\u03BF\u03BB\u03B9\u03BA\u03AC.\n\n\u0395\u03C0\u03AD\u03C3\u03C4\u03C1\u03B5\u03C8\u03B5 \u039C\u039F\u039D\u039F JSON:\n{\n  \"overall_emotion\": \"happy|calm|anxious|fearful|excited|playful|tired|stressed|neutral\",\n  \"overall_emotion_el\": \"\u03B5\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AE \u03BC\u03B5\u03C4\u03AC\u03C6\u03C1\u03B1\u03C3\u03B7\",\n  \"confidence\": 0.0-1.0,\n  \"energy_level\": 1-10,\n  \"welfare_score\": 1-10,\n  \"emotion_timeline\": [{\"frame\": 1, \"emotion\": \"...\", \"note\": \"...\"}],\n  \"key_observations\": [\"\u03C0\u03B1\u03C1\u03B1\u03C4\u03AE\u03C1\u03B7\u03C3\u03B7 1\", \"\u03C0\u03B1\u03C1\u03B1\u03C4\u03AE\u03C1\u03B7\u03C3\u03B7 2\", \"\u03C0\u03B1\u03C1\u03B1\u03C4\u03AE\u03C1\u03B7\u03C3\u03B7 3\"],\n  \"body_language_summary\": \"\u03C3\u03CD\u03BD\u03BF\u03C8\u03B7 \u03B3\u03BB\u03CE\u03C3\u03C3\u03B1\u03C2 \u03C3\u03CE\u03BC\u03B1\u03C4\u03BF\u03C2\",\n  \"advice\": \"\u03C3\u03C5\u03BC\u03B2\u03BF\u03C5\u03BB\u03AD\u03C2 \u03B3\u03B9\u03B1 \u03C4\u03BF\u03BD \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7\",\n  \"needs_attention\": true|false,\n  \"attention_reason\": \"\u03B1\u03B9\u03C4\u03AF\u03B1 \u03B1\u03BD needs_attention=true\"\n}");
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.messages.create({
                                model: 'claude-opus-4-5',
                                max_tokens: 2048,
                                system: systemPrompt,
                                tools: [webSearchTool],
                                messages: [{ role: 'user', content: __spreadArray(__spreadArray([], imageContents, true), [{ type: 'text', text: userPrompt }], false) }]
                            })];
                    case 2:
                        response = _b.sent();
                        text = extractFinalText(response.content);
                        return [2 /*return*/, parseJsonResponse(text)];
                    case 3:
                        err_3 = _b.sent();
                        console.error('AI emotion video error:', err_3);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err_3.message })];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // Stool & Urine Analysis
        app.post('/stool-urine', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, image_url, sample_type, species, breed, age_years, weight_kg, is_sterilized, ate_from_street, recent_medications, diet_change, last_normal_stool, symptoms, additional_notes, dataUrlMatch, imageContent, sampleEl, speciesEl, contextParts, systemPrompt, userPrompt, response, text, err_4;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _a = req.body, image_url = _a.image_url, sample_type = _a.sample_type, species = _a.species, breed = _a.breed, age_years = _a.age_years, weight_kg = _a.weight_kg, is_sterilized = _a.is_sterilized, ate_from_street = _a.ate_from_street, recent_medications = _a.recent_medications, diet_change = _a.diet_change, last_normal_stool = _a.last_normal_stool, symptoms = _a.symptoms, additional_notes = _a.additional_notes;
                        if (!image_url || !sample_type || !species) {
                            return [2 /*return*/, reply.code(400).send({ message: 'Απαιτούνται image_url, sample_type, species' })];
                        }
                        dataUrlMatch = image_url.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
                        imageContent = dataUrlMatch
                            ? { type: 'image', source: { type: 'base64', media_type: dataUrlMatch[1], data: dataUrlMatch[2] } }
                            : { type: 'image', source: { type: 'url', url: image_url } };
                        sampleEl = sample_type === 'stool' ? 'περιττώματα' : 'ούρα';
                        speciesEl = species === 'dog' ? 'σκύλου' : 'γάτας';
                        contextParts = [
                            "\u0395\u03AF\u03B4\u03BF\u03C2: ".concat(speciesEl),
                            breed ? "\u03A1\u03AC\u03C4\u03C3\u03B1: ".concat(breed) : null,
                            age_years != null ? "\u0397\u03BB\u03B9\u03BA\u03AF\u03B1: ".concat(age_years, " \u03AD\u03C4\u03B7") : null,
                            weight_kg != null ? "\u0392\u03AC\u03C1\u03BF\u03C2: ".concat(weight_kg, " kg") : null,
                            is_sterilized != null ? "\u03A3\u03C4\u03B5\u03AF\u03C1\u03C9\u03C3\u03B7: ".concat(is_sterilized ? 'Ναι' : 'Όχι') : null,
                            ate_from_street ? "\u0388\u03C6\u03B1\u03B3\u03B5 \u03BA\u03AC\u03C4\u03B9 \u03B1\u03C0\u03CC \u03C4\u03BF\u03BD \u03B4\u03C1\u03CC\u03BC\u03BF \u03C0\u03C1\u03CC\u03C3\u03C6\u03B1\u03C4\u03B1: \u039D\u03B1\u03B9" : null,
                            recent_medications ? "\u03A0\u03C1\u03CC\u03C3\u03C6\u03B1\u03C4\u03B1 \u03C6\u03AC\u03C1\u03BC\u03B1\u03BA\u03B1/\u03B1\u03BD\u03C4\u03B9\u03C0\u03B1\u03C1\u03B1\u03C3\u03B9\u03C4\u03B9\u03BA\u03AC: ".concat(recent_medications) : null,
                            diet_change ? "\u0391\u03BB\u03BB\u03B1\u03B3\u03AE \u03B4\u03B9\u03B1\u03C4\u03C1\u03BF\u03C6\u03AE\u03C2: ".concat(diet_change) : null,
                            last_normal_stool ? "\u03A4\u03B5\u03BB\u03B5\u03C5\u03C4\u03B1\u03AF\u03B1 \u03C6\u03C5\u03C3\u03B9\u03BF\u03BB\u03BF\u03B3\u03B9\u03BA\u03AC \u03C0\u03B5\u03C1\u03B9\u03C4\u03C4\u03CE\u03BC\u03B1\u03C4\u03B1: ".concat(last_normal_stool) : null,
                            symptoms ? "\u03A3\u03C5\u03BC\u03C0\u03C4\u03CE\u03BC\u03B1\u03C4\u03B1 \u03C0\u03BF\u03C5 \u03C0\u03B1\u03C1\u03B1\u03C4\u03B7\u03C1\u03AE\u03B8\u03B7\u03BA\u03B1\u03BD: ".concat(symptoms) : null,
                            additional_notes ? "\u0395\u03C0\u03B9\u03C0\u03BB\u03AD\u03BF\u03BD \u03C3\u03B7\u03BC\u03B5\u03B9\u03CE\u03C3\u03B5\u03B9\u03C2: ".concat(additional_notes) : null,
                        ].filter(Boolean).join('\n');
                        systemPrompt = "\u0395\u03AF\u03C3\u03B1\u03B9 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03CC\u03C2 \u03B2\u03BF\u03B7\u03B8\u03CC\u03C2 AI \u03B5\u03BE\u03B5\u03B9\u03B4\u03B9\u03BA\u03B5\u03C5\u03BC\u03AD\u03BD\u03BF\u03C2 \u03C3\u03C4\u03B7 \u03B3\u03B1\u03C3\u03C4\u03C1\u03B5\u03BD\u03C4\u03B5\u03C1\u03BF\u03BB\u03BF\u03B3\u03AF\u03B1 \u03BA\u03B1\u03B9 \u03BF\u03C5\u03C1\u03BF\u03BB\u03BF\u03B3\u03AF\u03B1 \u03B6\u03CE\u03C9\u03BD \u03C3\u03C5\u03BD\u03C4\u03C1\u03BF\u03C6\u03B9\u03AC\u03C2.\n\u0391\u03BD\u03B1\u03BB\u03CD\u03B5\u03B9\u03C2 \u03C6\u03C9\u03C4\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B5\u03C2 \u03C0\u03B5\u03C1\u03B9\u03C4\u03C4\u03C9\u03BC\u03AC\u03C4\u03C9\u03BD \u03BA\u03B1\u03B9 \u03BF\u03CD\u03C1\u03C9\u03BD \u03C3\u03BA\u03CD\u03BB\u03C9\u03BD \u03BA\u03B1\u03B9 \u03B3\u03B1\u03C4\u03CE\u03BD \u03BB\u03B1\u03BC\u03B2\u03AC\u03BD\u03BF\u03BD\u03C4\u03B1\u03C2 \u03C5\u03C0\u03CC\u03C8\u03B7 \u03C4\u03BF \u03B9\u03C3\u03C4\u03BF\u03C1\u03B9\u03BA\u03CC \u03C4\u03BF\u03C5 \u03B6\u03CE\u03BF\u03C5.\n\u038C\u03C4\u03B1\u03BD \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9, \u03B1\u03BD\u03B1\u03B6\u03B7\u03C4\u03AC\u03C2 \u03C3\u03B5 \u03B1\u03BE\u03B9\u03CC\u03C0\u03B9\u03C3\u03C4\u03B5\u03C2 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03AD\u03C2 \u03C0\u03B7\u03B3\u03AD\u03C2 (Merck Vet Manual, VCA Hospitals, PetMD, WSAVA guidelines) \u03B3\u03B9\u03B1 \u03BD\u03B1 \u03C3\u03C5\u03B3\u03BA\u03C1\u03AF\u03BD\u03B5\u03B9\u03C2 \u03C4\u03B1 \u03B5\u03C5\u03C1\u03AE\u03BC\u03B1\u03C4\u03B1.\n\u0391\u03C0\u03B1\u03BD\u03C4\u03AC\u03C2 \u039C\u039F\u039D\u039F \u03C3\u03B5 JSON \u03BA\u03B1\u03B9 \u039C\u039F\u039D\u039F JSON \u03C3\u03C4\u03BF \u03C4\u03B5\u03BB\u03B9\u03BA\u03CC \u03C3\u03BF\u03C5 \u03BC\u03AE\u03BD\u03C5\u03BC\u03B1, \u03C7\u03C9\u03C1\u03AF\u03C2 markdown backticks.";
                        userPrompt = "\u0391\u03BD\u03AC\u03BB\u03C5\u03C3\u03B5 \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7 \u03C6\u03C9\u03C4\u03BF\u03B3\u03C1\u03B1\u03C6\u03AF\u03B1 ".concat(sampleEl, " ").concat(speciesEl, ".\n\n\u0399\u03A3\u03A4\u039F\u03A1\u0399\u039A\u039F \u0396\u03A9\u039F\u03A5:\n").concat(contextParts, "\n\n\u039B\u03AC\u03B2\u03B5 \u03C5\u03C0\u03CC\u03C8\u03B7 \u03CC\u03BB\u03BF \u03C4\u03BF \u03B9\u03C3\u03C4\u03BF\u03C1\u03B9\u03BA\u03CC \u03BA\u03B1\u03C4\u03AC \u03C4\u03B7\u03BD \u03B1\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7 (\u03C0.\u03C7. \u03B1\u03BD \u03AD\u03C6\u03B1\u03B3\u03B5 \u03B1\u03C0\u03CC \u03C4\u03BF\u03BD \u03B4\u03C1\u03CC\u03BC\u03BF, \u03B1\u03BD \u03B5\u03AF\u03BD\u03B1\u03B9 \u03C3\u03C4\u03B5\u03AF\u03C1\u03BF, \u03B1\u03BB\u03BB\u03B1\u03B3\u03AD\u03C2 \u03B4\u03B9\u03B1\u03C4\u03C1\u03BF\u03C6\u03AE\u03C2, \u03C6\u03AC\u03C1\u03BC\u03B1\u03BA\u03B1).\n\u0391\u03BD \u03C7\u03C1\u03B5\u03B9\u03AC\u03B6\u03B5\u03C4\u03B1\u03B9, \u03C8\u03AC\u03BE\u03B5 \u03C3\u03B5 \u03BA\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03AD\u03C2 \u03C0\u03B7\u03B3\u03AD\u03C2 \u03B3\u03B9\u03B1 \u03C3\u03C5\u03C7\u03BD\u03AD\u03C2 \u03B1\u03B9\u03C4\u03AF\u03B5\u03C2 \u03BA\u03B1\u03B9 \u03C6\u03C5\u03C3\u03B9\u03BF\u03BB\u03BF\u03B3\u03B9\u03BA\u03CC \u03B5\u03CD\u03C1\u03BF\u03C2 \u03B3\u03B9\u03B1 \u03B1\u03C5\u03C4\u03CC \u03C4\u03BF \u03B5\u03AF\u03B4\u03BF\u03C2/\u03C1\u03AC\u03C4\u03C3\u03B1/\u03B7\u03BB\u03B9\u03BA\u03AF\u03B1.\n\n\u0395\u03C0\u03AD\u03C3\u03C4\u03C1\u03B5\u03C8\u03B5 \u039C\u039F\u039D\u039F JSON \u03BC\u03B5 \u03B1\u03C5\u03C4\u03AE \u03C4\u03B7 \u03B4\u03BF\u03BC\u03AE:\n{\n  \"sample_type\": \"").concat(sample_type, "\",\n  \"severity\": \"normal\"|\"mild\"|\"moderate\"|\"severe\",\n  \"color\": \"\u03C7\u03C1\u03CE\u03BC\u03B1 \u03B4\u03B5\u03AF\u03B3\u03BC\u03B1\u03C4\u03BF\u03C2\",\n  \"consistency\": \"\u03C3\u03CD\u03C3\u03C4\u03B1\u03C3\u03B7 (\u03BC\u03CC\u03BD\u03BF \u03B3\u03B9\u03B1 \u03C0\u03B5\u03C1\u03B9\u03C4\u03C4\u03CE\u03BC\u03B1\u03C4\u03B1)\",\n  \"findings\": [\"\u03B5\u03CD\u03C1\u03B7\u03BC\u03B1 1 \u03C9\u03C2 plain string\", \"\u03B5\u03CD\u03C1\u03B7\u03BC\u03B1 2 \u03C9\u03C2 plain string\"],\n  \"likely_causes\": [\"\u03C0\u03B9\u03B8\u03B1\u03BD\u03AE \u03B1\u03B9\u03C4\u03AF\u03B1 1\", \"\u03C0\u03B9\u03B8\u03B1\u03BD\u03AE \u03B1\u03B9\u03C4\u03AF\u03B1 2\"],\n  \"context_factors\": [\"\u03C0\u03CE\u03C2 \u03B5\u03C0\u03B7\u03C1\u03B5\u03AC\u03B6\u03B5\u03B9 \u03C4\u03BF \u03B9\u03C3\u03C4\u03BF\u03C1\u03B9\u03BA\u03CC \u03C4\u03B1 \u03B5\u03C5\u03C1\u03AE\u03BC\u03B1\u03C4\u03B1\"],\n  \"comparison_sources\": [\"\u03C3\u03CD\u03BD\u03C4\u03BF\u03BC\u03B7 \u03B1\u03BD\u03B1\u03C6\u03BF\u03C1\u03AC \u03C0\u03B7\u03B3\u03AE\u03C2\"],\n  \"recommendation\": \"\u03C3\u03B1\u03C6\u03AE\u03C2 \u03C3\u03CD\u03C3\u03C4\u03B1\u03C3\u03B7 \u03B3\u03B9\u03B1 \u03C4\u03BF\u03BD \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7\",\n  \"vet_urgency\": \"routine\"|\"within_48h\"|\"today\"|\"emergency\",\n  \"vet_urgency_el\": \"\u03A4\u03B1\u03BA\u03C4\u03B9\u03BA\u03CC \u03C1\u03B1\u03BD\u03C4\u03B5\u03B2\u03BF\u03CD\"|\"\u0395\u03BD\u03C4\u03CC\u03C2 48 \u03C9\u03C1\u03CE\u03BD\"|\"\u03A3\u03AE\u03BC\u03B5\u03C1\u03B1\"|\"\u0386\u03BC\u03B5\u03C3\u03B1 / \u0388\u03BA\u03C4\u03B1\u03BA\u03C4\u03BF\",\n  \"home_care\": [\"\u03C4\u03B9 \u03BC\u03C0\u03BF\u03C1\u03B5\u03AF \u03BD\u03B1 \u03BA\u03AC\u03BD\u03B5\u03B9 \u03BF \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7\u03C2 \u03C3\u03C4\u03BF \u03C3\u03C0\u03AF\u03C4\u03B9\"],\n  \"warning_signs\": [\"\u03C3\u03C5\u03BC\u03C0\u03C4\u03CE\u03BC\u03B1\u03C4\u03B1 \u03C0\u03BF\u03C5 \u03BD\u03B1 \u03BF\u03B4\u03B7\u03B3\u03BF\u03CD\u03BD \u03B1\u03BC\u03AD\u03C3\u03C9\u03C2 \u03C3\u03B5 \u03BA\u03C4\u03B7\u03BD\u03AF\u03B1\u03C4\u03C1\u03BF\"],\n  \"disclaimer\": \"\u0391\u03C5\u03C4\u03AE \u03B7 \u03B1\u03BD\u03AC\u03BB\u03C5\u03C3\u03B7 \u03B5\u03AF\u03BD\u03B1\u03B9 \u03B5\u03BD\u03B4\u03B5\u03B9\u03BA\u03C4\u03B9\u03BA\u03AE \u03BA\u03B1\u03B9 \u03B4\u03B5\u03BD \u03C5\u03C0\u03BF\u03BA\u03B1\u03B8\u03B9\u03C3\u03C4\u03AC \u03C4\u03B7\u03BD \u03B5\u03BE\u03AD\u03C4\u03B1\u03C3\u03B7 \u03B1\u03C0\u03CC \u03BA\u03C4\u03B7\u03BD\u03AF\u03B1\u03C4\u03C1\u03BF.\"\n}");
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.messages.create({
                                model: 'claude-opus-4-5',
                                max_tokens: 2048,
                                system: systemPrompt,
                                tools: [webSearchTool],
                                messages: [{ role: 'user', content: [imageContent, { type: 'text', text: userPrompt }] }]
                            })];
                    case 2:
                        response = _b.sent();
                        text = extractFinalText(response.content);
                        return [2 /*return*/, parseJsonResponse(text)];
                    case 3:
                        err_4 = _b.sent();
                        console.error('AI stool/urine error:', err_4);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα ανάλυσης: ' + err_4.message })];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        // ─── LEGAL Q&A ──────────────────────────────────────────────────
        app.post('/legal', { preHandler: [app.authenticate] }, function (req, reply) { return __awaiter(void 0, void 0, void 0, function () {
            var _a, question, _b, country, context, systemPrompt, userPrompt, response, text, err_5;
            var _c;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        _a = req.body, question = _a.question, _b = _a.country, country = _b === void 0 ? 'GR' : _b, context = _a.context;
                        if (!question)
                            return [2 /*return*/, reply.code(400).send({ message: 'Απαιτείται ερώτηση' })];
                        systemPrompt = "\u0395\u03AF\u03C3\u03B1\u03B9 \u03B5\u03BE\u03B5\u03B9\u03B4\u03B9\u03BA\u03B5\u03C5\u03BC\u03AD\u03BD\u03BF\u03C2 \u03BD\u03BF\u03BC\u03B9\u03BA\u03CC\u03C2 \u03C3\u03CD\u03BC\u03B2\u03BF\u03C5\u03BB\u03BF\u03C2 \u03C3\u03B5 \u03B8\u03AD\u03BC\u03B1\u03C4\u03B1 \u03BD\u03BF\u03BC\u03BF\u03B8\u03B5\u03C3\u03AF\u03B1\u03C2 \u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03B9\u03B4\u03AF\u03C9\u03BD \u03B6\u03CE\u03C9\u03BD \u03C3\u03C4\u03B7\u03BD \u0395\u03BB\u03BB\u03AC\u03B4\u03B1.\n\u0388\u03C7\u03B5\u03B9\u03C2 \u03C0\u03BB\u03AE\u03C1\u03B7 \u03B3\u03BD\u03CE\u03C3\u03B7 \u03C4\u03B7\u03C2 \u03B5\u03BB\u03BB\u03B7\u03BD\u03B9\u03BA\u03AE\u03C2 \u03BD\u03BF\u03BC\u03BF\u03B8\u03B5\u03C3\u03AF\u03B1\u03C2:\n\n\u0392\u0391\u03A3\u0399\u039A\u0397 \u039D\u039F\u039C\u039F\u0398\u0395\u03A3\u0399\u0391 \u0395\u039B\u039B\u0391\u0394\u0391:\n\u2022 \u039D. 4830/2021 \"\u039D\u03AD\u03BF \u03C0\u03BB\u03B1\u03AF\u03C3\u03B9\u03BF \u03B3\u03B9\u03B1 \u03C4\u03B1 \u03B6\u03CE\u03B1 \u03C3\u03C5\u03BD\u03C4\u03C1\u03BF\u03C6\u03B9\u03AC\u03C2\" - \u039F \u03BA\u03CD\u03C1\u03B9\u03BF\u03C2 \u03BD\u03CC\u03BC\u03BF\u03C2. \u03A5\u03C0\u03BF\u03C7\u03C1\u03B5\u03C9\u03C4\u03B9\u03BA\u03AE \u03C3\u03C4\u03B5\u03AF\u03C1\u03C9\u03C3\u03B7, \u03BC\u03B9\u03BA\u03C1\u03BF\u03C4\u03C3\u03AF\u03C0, \u03B5\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE \u03C3\u03C4\u03BF \u0395\u039C\u0396\u0395, \u03B7\u03BB\u03B5\u03BA\u03C4\u03C1\u03BF\u03BD\u03B9\u03BA\u03CC \u03B2\u03B9\u03B2\u03BB\u03B9\u03AC\u03C1\u03B9\u03BF. \u03A0\u03C1\u03CC\u03C3\u03C4\u03B9\u03BC\u03B1 \u20AC1.000-\u20AC30.000 \u03B3\u03B9\u03B1 \u03C0\u03B1\u03C1\u03B1\u03B2\u03AC\u03C3\u03B5\u03B9\u03C2. \u0391\u03C0\u03B1\u03B3\u03CC\u03C1\u03B5\u03C5\u03C3\u03B7 \u03B5\u03B3\u03BA\u03B1\u03C4\u03AC\u03BB\u03B5\u03B9\u03C8\u03B7\u03C2, \u03BA\u03B1\u03BA\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7\u03C2, \u03B5\u03C5\u03B8\u03B1\u03BD\u03B1\u03C3\u03AF\u03B1\u03C2 \u03C3\u03B5 \u03B1\u03B4\u03AD\u03C3\u03C0\u03BF\u03C4\u03B1.\n\u2022 \u039D. 4039/2012 - \u03A0\u03C1\u03BF\u03B7\u03B3\u03BF\u03CD\u03BC\u03B5\u03BD\u03BF\u03C2 \u03BD\u03CC\u03BC\u03BF\u03C2 \u03B3\u03B9\u03B1 \u03B1\u03B4\u03AD\u03C3\u03C0\u03BF\u03C4\u03B1 \u03B6\u03CE\u03B1. \u0394\u03B7\u03BC\u03BF\u03C4\u03B9\u03BA\u03AC \u03BA\u03B1\u03C4\u03B1\u03C6\u03CD\u03B3\u03B9\u03B1, \u03C5\u03B9\u03BF\u03B8\u03B5\u03C3\u03AF\u03B1, \u03C4\u03C3\u03B9\u03C0.\n\u2022 \u039D. 3170/2003 - \u03A0\u03C1\u03CE\u03C4\u03BF\u03C2 \u03BD\u03CC\u03BC\u03BF\u03C2 \u03C0\u03C1\u03BF\u03C3\u03C4\u03B1\u03C3\u03AF\u03B1\u03C2 \u03B6\u03CE\u03C9\u03BD \u03C3\u03C5\u03BD\u03C4\u03C1\u03BF\u03C6\u03B9\u03AC\u03C2.\n\u2022 \u039D. 1197/1981 - \u0391\u03C1\u03C7\u03B9\u03BA\u03CC\u03C2 \u03BD\u03CC\u03BC\u03BF\u03C2 \u03C0\u03C1\u03BF\u03C3\u03C4\u03B1\u03C3\u03AF\u03B1\u03C2 \u03B6\u03CE\u03C9\u03BD.\n\u2022 \u03A0\u0394 463/1978 - \u039A\u03B1\u03BD\u03CC\u03BD\u03B5\u03C2 \u03B3\u03B9\u03B1 \u03B5\u03C0\u03B9\u03BA\u03AF\u03BD\u03B4\u03C5\u03BD\u03B1 \u03B6\u03CE\u03B1.\n\n\u03A5\u03A0\u039F\u03A7\u03A1\u0395\u03A9\u03A3\u0395\u0399\u03A3 \u0399\u0394\u0399\u039F\u039A\u03A4\u0397\u03A4\u0397 (\u039D.4830/2021):\n\u2022 \u03A5\u03C0\u03BF\u03C7\u03C1\u03B5\u03C9\u03C4\u03B9\u03BA\u03CC \u03BC\u03B9\u03BA\u03C1\u03BF\u03C4\u03C3\u03AF\u03C0 (ISO 11784/11785) \u03B5\u03BD\u03C4\u03CC\u03C2 2 \u03BC\u03B7\u03BD\u03CE\u03BD \u03B1\u03C0\u03CC \u03B1\u03C0\u03CC\u03BA\u03C4\u03B7\u03C3\u03B7\n\u2022 \u0395\u03B3\u03B3\u03C1\u03B1\u03C6\u03AE \u03C3\u03C4\u03BF \u0395\u039C\u0396\u0395 (\u0395\u03B8\u03BD\u03B9\u03BA\u03CC \u039C\u03B7\u03C4\u03C1\u03CE\u03BF \u0396\u03CE\u03C9\u03BD \u03A3\u03C5\u03BD\u03C4\u03C1\u03BF\u03C6\u03B9\u03AC\u03C2) - \u03BC\u03AD\u03C7\u03C1\u03B9 31/12/2024 \u03B3\u03B9\u03B1 \u03C5\u03C0\u03AC\u03C1\u03C7\u03BF\u03BD\u03C4\u03B1, \u03B1\u03BC\u03AD\u03C3\u03C9\u03C2 \u03B3\u03B9\u03B1 \u03BD\u03AD\u03B1\n\u2022 \u0397\u03BB\u03B5\u03BA\u03C4\u03C1\u03BF\u03BD\u03B9\u03BA\u03CC \u03B2\u03B9\u03B2\u03BB\u03B9\u03AC\u03C1\u03B9\u03BF \u03C5\u03B3\u03B5\u03AF\u03B1\u03C2\n\u2022 \u03A5\u03C0\u03BF\u03C7\u03C1\u03B5\u03C9\u03C4\u03B9\u03BA\u03AE \u03C3\u03C4\u03B5\u03AF\u03C1\u03C9\u03C3\u03B7 \u03C3\u03BA\u03CD\u03BB\u03C9\u03BD & \u03B3\u03AC\u03C4\u03C9\u03BD (\u03B5\u03BE\u03B1\u03AF\u03C1\u03B5\u03C3\u03B7 \u03B3\u03B9\u03B1 \u03B5\u03BA\u03C4\u03C1\u03BF\u03C6\u03B5\u03AF\u03C2 \u03BC\u03B5 \u03AC\u03B4\u03B5\u03B9\u03B1)\n\u2022 \u0395\u03BC\u03B2\u03CC\u03BB\u03B9\u03BF \u03BA\u03B1\u03C4\u03AC \u03BB\u03CD\u03C3\u03C3\u03B1\u03C2 \u03B3\u03B9\u03B1 \u03C3\u03BA\u03CD\u03BB\u03BF\u03C5\u03C2\n\u2022 \u03A3\u03AE\u03BC\u03B1 \u03B1\u03BD\u03B1\u03B3\u03BD\u03CE\u03C1\u03B9\u03C3\u03B7\u03C2 (\u03BA\u03BF\u03BB\u03AC\u03C1\u03BF \u03BC\u03B5 \u03C3\u03C4\u03BF\u03B9\u03C7\u03B5\u03AF\u03B1 \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7)\n\n\u0395\u03A5\u0398\u03A5\u039D\u0397 \u0399\u0394\u0399\u039F\u039A\u03A4\u0397\u03A4\u0397:\n\u2022 \u0391\u03C3\u03C4\u03B9\u03BA\u03AE \u03B5\u03C5\u03B8\u03CD\u03BD\u03B7 (\u0391\u039A 924) \u03B3\u03B9\u03B1 \u03B6\u03B7\u03BC\u03B9\u03AD\u03C2 \u03C0\u03BF\u03C5 \u03C0\u03C1\u03BF\u03BA\u03B1\u03BB\u03B5\u03AF \u03C4\u03BF \u03B6\u03CE\u03BF - \u03B5\u03BA\u03C4\u03CC\u03C2 \u03B1\u03BD \u03B1\u03C0\u03BF\u03B4\u03B5\u03AF\u03BE\u03B5\u03B9 \u03B1\u03BD\u03C9\u03C4\u03AD\u03C1\u03B1 \u03B2\u03AF\u03B1\n\u2022 \u03A0\u03BF\u03B9\u03BD\u03B9\u03BA\u03AE \u03B5\u03C5\u03B8\u03CD\u03BD\u03B7 \u03B3\u03B9\u03B1 \u03BA\u03B1\u03BA\u03BF\u03C0\u03BF\u03AF\u03B7\u03C3\u03B7 (\u03C6\u03C5\u03BB\u03AC\u03BA\u03B9\u03C3\u03B7 6 \u03BC\u03B7\u03BD\u03CE\u03BD - 2 \u03C7\u03C1\u03CC\u03BD\u03B9\u03B1 + \u03C0\u03C1\u03CC\u03C3\u03C4\u03B9\u03BC\u03BF \u20AC5.000-\u20AC30.000)\n\u2022 \u0395\u03C5\u03B8\u03CD\u03BD\u03B7 \u03B3\u03B9\u03B1 \u03B8\u03CC\u03C1\u03C5\u03B2\u03BF/\u03B5\u03BD\u03CC\u03C7\u03BB\u03B7\u03C3\u03B7 \u03B3\u03B5\u03B9\u03C4\u03CC\u03BD\u03C9\u03BD (\u039A\u039F\u039A, \u03BA\u03B1\u03BD\u03BF\u03BD\u03B9\u03C3\u03BC\u03BF\u03AF \u03C0\u03BF\u03BB\u03C5\u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03AF\u03B1\u03C2)\n\n\u0396\u03A9\u039D\u03A4\u0391\u039D\u0391 \u03A3\u0395 \u0395\u039D\u039F\u0399\u039A\u0399\u0391\u0396\u039F\u039C\u0395\u039D\u0391:\n\u2022 \u039F \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7\u03C2 \u0394\u0395\u039D \u03BC\u03C0\u03BF\u03C1\u03B5\u03AF \u03BD\u03B1 \u03B1\u03C0\u03B1\u03B3\u03BF\u03C1\u03B5\u03CD\u03C3\u03B5\u03B9 \u03B3\u03B5\u03BD\u03B9\u03BA\u03CE\u03C2 \u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03AF\u03B4\u03B9\u03B1 \u03B1\u03BD \u03B4\u03B5\u03BD \u03B1\u03BD\u03B1\u03C6\u03AD\u03C1\u03B5\u03C4\u03B1\u03B9 \u03C3\u03C4\u03BF \u03BC\u03B9\u03C3\u03B8\u03C9\u03C4\u03AE\u03C1\u03B9\u03BF\n\u2022 \u03A4\u03BF \u03AC\u03C1\u03B8\u03C1\u03BF 13 \u039D.1493/1984 \u03B5\u03C0\u03B9\u03C4\u03C1\u03AD\u03C0\u03B5\u03B9 \u03C1\u03CD\u03B8\u03BC\u03B9\u03C3\u03B7 \u03C3\u03C4\u03BF \u03BC\u03B9\u03C3\u03B8\u03C9\u03C4\u03AE\u03C1\u03B9\u03BF\n\u2022 \u03A0\u03C1\u03B1\u03BA\u03C4\u03B9\u03BA\u03AC: \u03B1\u03BD \u03C4\u03BF \u03C3\u03C5\u03BC\u03B2\u03CC\u03BB\u03B1\u03B9\u03BF \u03B1\u03C0\u03B1\u03B3\u03BF\u03C1\u03B5\u03CD\u03B5\u03B9, \u03B9\u03C3\u03C7\u03CD\u03B5\u03B9. \u0391\u03BD \u03B4\u03B5\u03BD \u03BB\u03AD\u03B5\u03B9 \u03C4\u03AF\u03C0\u03BF\u03C4\u03B1, \u03B5\u03C0\u03B9\u03C4\u03C1\u03AD\u03C0\u03B5\u03C4\u03B1\u03B9\n\u2022 \u0396\u03B7\u03BC\u03B9\u03AD\u03C2 \u03B1\u03C0\u03CC \u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03AF\u03B4\u03B9\u03BF = \u03B5\u03C5\u03B8\u03CD\u03BD\u03B7 \u03BC\u03B9\u03C3\u03B8\u03C9\u03C4\u03AE\n\n\u0391\u0394\u0395\u03A3\u03A0\u039F\u03A4\u0391 \u0396\u03A9\u0399\u0391:\n\u2022 \u0391\u03C0\u03B1\u03B3\u03BF\u03C1\u03B5\u03CD\u03B5\u03C4\u03B1\u03B9 \u03B7 \u03B8\u03B1\u03BD\u03AC\u03C4\u03C9\u03C3\u03B7 / \u03B5\u03C5\u03B8\u03B1\u03BD\u03B1\u03C3\u03AF\u03B1 \u03B1\u03B4\u03AD\u03C3\u03C0\u03BF\u03C4\u03C9\u03BD (\u03B5\u03BA\u03C4\u03CC\u03C2 \u03B1\u03BD\u03AF\u03B1\u03C4\u03B7\u03C2 \u03BD\u03CC\u03C3\u03BF\u03C5)\n\u2022 \u0394\u03AE\u03BC\u03BF\u03B9 \u03C5\u03C0\u03BF\u03C7\u03C1\u03B5\u03BF\u03CD\u03BD\u03C4\u03B1\u03B9 \u03C3\u03B5 \u0394\u03A4\u03A3\u03A4\u0395 (\u0394\u03C1\u03AC\u03C3\u03B5\u03B9\u03C2 \u03A4\u03C3\u03B9\u03C0-\u03A3\u03C4\u03B5\u03AF\u03C1\u03C9\u03C3\u03B7-\u03A4\u03BF\u03C0\u03BF\u03B8\u03AD\u03C4\u03B7\u03C3\u03B7-\u0395\u03C0\u03B9\u03C3\u03C4\u03C1\u03BF\u03C6\u03AE)\n\u2022 \u03A4\u03C1\u03BF\u03C6\u03BF\u03B4\u03CC\u03C4\u03B5\u03C2 \u03B1\u03B4\u03AD\u03C3\u03C0\u03BF\u03C4\u03C9\u03BD: \u03BD\u03CC\u03BC\u03B9\u03BC\u03BF\u03B9, \u03C5\u03C0\u03CC \u03C0\u03C1\u03BF\u03CB\u03C0\u03BF\u03B8\u03AD\u03C3\u03B5\u03B9\u03C2\n\u2022 \u03A5\u03B9\u03BF\u03B8\u03B5\u03C3\u03AF\u03B1 \u03B1\u03B4\u03AD\u03C3\u03C0\u03BF\u03C4\u03BF\u03C5: \u03B4\u03C9\u03C1\u03B5\u03AC\u03BD, \u03BC\u03AD\u03C3\u03C9 \u03B4\u03AE\u03BC\u03BF\u03C5 \u03AE \u03C6\u03B9\u03BB\u03BF\u03B6\u03C9\u03B9\u03BA\u03BF\u03CD\n\n\u039C\u0395\u03A4\u0391\u03A6\u039F\u03A1\u0391 - \u03A4\u0391\u039E\u0399\u0394\u0399:\n\u2022 \u0395\u03C3\u03C9\u03C4\u03B5\u03C1\u03B9\u03BA\u03CC: \u03BC\u03B9\u03BA\u03C1\u03BF\u03C4\u03C3\u03AF\u03C0 + \u03B5\u03BC\u03B2\u03CC\u03BB\u03B9\u03BF \u03BB\u03CD\u03C3\u03C3\u03B1\u03C2 + \u03B2\u03B9\u03B2\u03BB\u03B9\u03AC\u03C1\u03B9\u03BF\n\u2022 \u0395\u0395: EU Pet Passport + \u03BC\u03B9\u03BA\u03C1\u03BF\u03C4\u03C3\u03AF\u03C0 + \u03BB\u03CD\u03C3\u03C3\u03B1 (21+ \u03B7\u03BC\u03AD\u03C1\u03B5\u03C2 \u03C0\u03C1\u03B9\u03BD \u03C4\u03B1\u03BE\u03AF\u03B4\u03B9)\n\u2022 \u0391\u03B5\u03C1\u03BF\u03C0\u03BB\u03AC\u03BD\u03BF: \u03BA\u03AC\u03B8\u03B5 \u03B5\u03C4\u03B1\u03B9\u03C1\u03B5\u03AF\u03B1 \u03AD\u03C7\u03B5\u03B9 \u03B4\u03B9\u03BA\u03AD\u03C2 \u03C4\u03B7\u03C2 \u03C0\u03BF\u03BB\u03B9\u03C4\u03B9\u03BA\u03AD\u03C2\n\u2022 \u039C\u039C\u039C (\u0391\u03C4\u03C4\u03B9\u03BA\u03CC \u039C\u03B5\u03C4\u03C1\u03CC/\u0397\u03A3\u0391\u03A0): \u03C3\u03B5 \u03C4\u03C3\u03AC\u03BD\u03C4\u03B1 \u03BC\u03B5\u03C4\u03B1\u03C6\u03BF\u03C1\u03AC\u03C2 \u03AE \u03BA\u03BB\u03BF\u03C5\u03B2\u03AF\n\n\u0395\u039A\u03A4\u03A1\u039F\u03A6\u0395\u0399\u0391 / \u03A0\u03A9\u039B\u0397\u03A3\u0397:\n\u2022 \u03A5\u03C0\u03BF\u03C7\u03C1\u03B5\u03C9\u03C4\u03B9\u03BA\u03AE \u03AC\u03B4\u03B5\u03B9\u03B1 \u03B5\u03BA\u03C4\u03C1\u03BF\u03C6\u03B5\u03AF\u03BF\u03C5 \u03B1\u03C0\u03CC \u039A\u03C4\u03B7\u03BD\u03B9\u03B1\u03C4\u03C1\u03B9\u03BA\u03AE \u0391\u03C1\u03C7\u03AE\n\u2022 \u039C\u03B7\u03C4\u03C1\u03CE\u03BF \u0395\u039C\u0396\u0395 \u03B3\u03B9\u03B1 \u03B5\u03BA\u03C4\u03C1\u03BF\u03C6\u03B5\u03AF\u03C2\n\u2022 \u03A0\u03CE\u03BB\u03B7\u03C3\u03B7 \u03BA\u03BF\u03C5\u03C4\u03B1\u03B2\u03B9\u03CE\u03BD <8 \u03B5\u03B2\u03B4\u03BF\u03BC\u03AC\u03B4\u03C9\u03BD: \u0391\u03A0\u0391\u0393\u039F\u03A1\u0395\u03A5\u0395\u03A4\u0391\u0399 (\u03C0\u03C1\u03CC\u03C3\u03C4\u03B9\u03BC\u03BF \u20AC3.000-\u20AC10.000)\n\u2022 Pet shops: \u03B5\u03C0\u03B9\u03C4\u03C1\u03AD\u03C0\u03B5\u03C4\u03B1\u03B9 \u03BC\u03CC\u03BD\u03BF \u03C0\u03CE\u03BB\u03B7\u03C3\u03B7 \u03C8\u03B1\u03C1\u03B9\u03CE\u03BD/\u03C0\u03C4\u03B7\u03BD\u03CE\u03BD/\u03B5\u03C1\u03C0\u03B5\u03C4\u03CE\u03BD - \u039F\u03A7\u0399 \u03C3\u03BA\u03CD\u03BB\u03C9\u03BD/\u03B3\u03AC\u03C4\u03C9\u03BD \u03B1\u03C0\u03CC \u039D.4830/2021\n\n\u03A0\u0391\u03A1\u039F\u03A5\u03A3\u0399\u0391 \u03A3\u0395 \u0394\u0397\u039C\u039F\u03A3\u0399\u039F\u03A5\u03A3 \u03A7\u03A9\u03A1\u039F\u03A5\u03A3:\n\u2022 \u03A3\u03BA\u03CD\u03BB\u03BF\u03B9 \u03C3\u03B5 \u03B4\u03B7\u03BC\u03CC\u03C3\u03B9\u03BF\u03C5\u03C2 \u03C7\u03CE\u03C1\u03BF\u03C5\u03C2: \u03C5\u03C0\u03BF\u03C7\u03C1\u03B5\u03C9\u03C4\u03B9\u03BA\u03AC \u03BC\u03B5 \u03BB\u03BF\u03C5\u03C1\u03AF & \u03C6\u03AF\u03BC\u03C9\u03C4\u03C1\u03BF \u03B1\u03BD >20kg \u03AE \u03B5\u03C0\u03B9\u03B8\u03B5\u03C4\u03B9\u03BA\u03AE\u03C2 \u03C1\u03AC\u03C4\u03C3\u03B1\u03C2\n\u2022 \u03A0\u03B1\u03C1\u03B1\u03BB\u03AF\u03B5\u03C2: \u03B1\u03C0\u03BF\u03BA\u03BB\u03B5\u03AF\u03BF\u03BD\u03C4\u03B1\u03B9 \u03B3\u03B5\u03BD\u03B9\u03BA\u03AC, \u03B5\u03BA\u03C4\u03CC\u03C2 \u03B5\u03B9\u03B4\u03B9\u03BA\u03AC \u03C3\u03B7\u03BC\u03B5\u03B9\u03C9\u03BC\u03AD\u03BD\u03C9\u03BD pet-friendly\n\u2022 \u0395\u03C3\u03C4\u03B9\u03B1\u03C4\u03CC\u03C1\u03B9\u03B1/\u03BA\u03B1\u03C6\u03AD: \u03B1\u03C0\u03CC\u03C6\u03B1\u03C3\u03B7 \u03B9\u03B4\u03B9\u03BF\u03BA\u03C4\u03AE\u03C4\u03B7, \u03B4\u03B5\u03BD \u03C5\u03C0\u03AC\u03C1\u03C7\u03B5\u03B9 \u03B3\u03B5\u03BD\u03B9\u03BA\u03AE \u03B1\u03C0\u03B1\u03B3\u03CC\u03C1\u03B5\u03C5\u03C3\u03B7\n\u2022 \u0394\u03B7\u03BC\u03CC\u03C3\u03B9\u03B1 \u03BA\u03C4\u03AF\u03C1\u03B9\u03B1: \u03B1\u03C0\u03B1\u03B3\u03BF\u03C1\u03B5\u03CD\u03BF\u03BD\u03C4\u03B1\u03B9 \u03B5\u03BA\u03C4\u03CC\u03C2 \u0391\u03BC\u03B5\u0391 \u03BC\u03B5 \u03C3\u03BA\u03CD\u03BB\u03BF \u03BF\u03B4\u03B7\u03B3\u03CC\n\n\u0391\u03A0\u039F\u0396\u0397\u039C\u0399\u03A9\u03A3\u0397 / \u0394\u0399\u039A\u0391\u03A3\u03A4\u0399\u039A\u0395\u03A3 \u0395\u039D\u0395\u03A1\u0393\u0395\u0399\u0395\u03A3:\n\u2022 \u0391\u03C4\u03CD\u03C7\u03B7\u03BC\u03B1 \u03B1\u03C0\u03CC \u03B1\u03B4\u03AD\u03C3\u03C0\u03BF\u03C4\u03BF: \u03B5\u03C5\u03B8\u03CD\u03BD\u03B7 \u03C4\u03BF\u03C5 \u0394\u03AE\u03BC\u03BF\u03C5 \u03B1\u03BD \u03B1\u03C0\u03BF\u03B4\u03B5\u03B9\u03C7\u03B8\u03B5\u03AF \u03B1\u03BC\u03AD\u03BB\u03B5\u03B9\u03B1\n\u2022 \u0398\u03AC\u03BD\u03B1\u03C4\u03BF\u03C2 \u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03B9\u03B4\u03AF\u03BF\u03C5 \u03B1\u03C0\u03CC \u03C4\u03C1\u03AF\u03C4\u03BF: \u03B1\u03C3\u03C4\u03B9\u03BA\u03AE \u03B5\u03C5\u03B8\u03CD\u03BD\u03B7, \u03B1\u03C0\u03BF\u03B6\u03B7\u03BC\u03AF\u03C9\u03C3\u03B7 \u03B1\u03BE\u03AF\u03B1\u03C2 \u03B6\u03CE\u03BF\u03C5 + \u03B7\u03B8\u03B9\u03BA\u03AE \u03B2\u03BB\u03AC\u03B2\u03B7\n\u2022 \u03A0\u03B1\u03C1\u03AC\u03BD\u03BF\u03BC\u03B7 \u03BA\u03B1\u03C4\u03AC\u03C3\u03C7\u03B5\u03C3\u03B7 \u03BA\u03B1\u03C4\u03BF\u03B9\u03BA\u03B9\u03B4\u03AF\u03BF\u03C5: \u03B1\u03AF\u03C4\u03B7\u03C3\u03B7 \u03B1\u03C0\u03BF\u03B4\u03BF\u03C7\u03AE\u03C2 \u03C3\u03C4\u03BF\u03BD \u0395\u03B9\u03C3\u03B1\u03B3\u03B3\u03B5\u03BB\u03AD\u03B1\n\n\u0391\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B5 \u03A0\u0391\u039D\u03A4\u0391:\n1. \u03A3\u03C4\u03B1 \u0395\u039B\u039B\u0397\u039D\u0399\u039A\u0391\n2. \u0391\u03BD\u03B1\u03C6\u03AD\u03C1\u03BF\u03BD\u03C4\u03B1\u03C2 \u03C3\u03C5\u03B3\u03BA\u03B5\u03BA\u03C1\u03B9\u03BC\u03AD\u03BD\u03B1 \u03AC\u03C1\u03B8\u03C1\u03B1/\u03BD\u03CC\u03BC\u03BF\u03C5\u03C2\n3. \u0395\u03BE\u03B7\u03B3\u03CE\u03BD\u03C4\u03B1\u03C2 \u03C0\u03C1\u03B1\u03BA\u03C4\u03B9\u03BA\u03AC \u03B2\u03AE\u03BC\u03B1\u03C4\u03B1\n4. \u03A4\u03BF\u03BD\u03AF\u03B6\u03BF\u03BD\u03C4\u03B1\u03C2 \u03CC\u03C4\u03B9 \u03B4\u03B5\u03BD \u03B1\u03BD\u03C4\u03B9\u03BA\u03B1\u03B8\u03B9\u03C3\u03C4\u03AC\u03C2 \u03B4\u03B9\u03BA\u03B7\u03B3\u03CC\u03C1\u03BF \u03B3\u03B9\u03B1 \u03C3\u03BF\u03B2\u03B1\u03C1\u03AD\u03C2 \u03C5\u03C0\u03BF\u03B8\u03AD\u03C3\u03B5\u03B9\u03C2\n5. \u03A3\u03B5 JSON format:\n{\n  \"answer\": \"\u03C0\u03BB\u03AE\u03C1\u03B7\u03C2 \u03B1\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B7 \u03C3\u03B5 Markdown\",\n  \"relevant_laws\": [\"\u039D.4830/2021 \u03AC\u03C1\u03B8\u03C1\u03BF X\", \"...\"],\n  \"practical_steps\": [\"\u03B2\u03AE\u03BC\u03B1 1\", \"\u03B2\u03AE\u03BC\u03B1 2\"],\n  \"urgency\": \"low\"|\"medium\"|\"high\",\n  \"recommend_lawyer\": true|false,\n  \"disclaimer\": \"\u0397 \u03B1\u03C0\u03AC\u03BD\u03C4\u03B7\u03C3\u03B7 \u03B1\u03C5\u03C4\u03AE \u03C0\u03B1\u03C1\u03AD\u03C7\u03B5\u03C4\u03B1\u03B9 \u03B3\u03B9\u03B1 \u03B5\u03BD\u03B7\u03BC\u03B5\u03C1\u03C9\u03C4\u03B9\u03BA\u03BF\u03CD\u03C2 \u03C3\u03BA\u03BF\u03C0\u03BF\u03CD\u03C2...\"\n}";
                        userPrompt = "".concat(context ? "\u03A0\u03BB\u03B1\u03AF\u03C3\u03B9\u03BF: ".concat(context, "\n") : '', "\u0395\u03C1\u03CE\u03C4\u03B7\u03C3\u03B7: ").concat(question);
                        _d.label = 1;
                    case 1:
                        _d.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, client.messages.create({
                                model: 'claude-opus-4-5',
                                max_tokens: 2048,
                                system: systemPrompt,
                                messages: [{ role: 'user', content: userPrompt }],
                            })];
                    case 2:
                        response = _d.sent();
                        text = ((_c = response.content[0]) === null || _c === void 0 ? void 0 : _c.text) || '';
                        return [2 /*return*/, parseJsonResponse(text)];
                    case 3:
                        err_5 = _d.sent();
                        console.error('AI legal error:', err_5);
                        return [2 /*return*/, reply.code(500).send({ message: 'Σφάλμα: ' + err_5.message })];
                    case 4: return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
exports.default = aiRoutes;
