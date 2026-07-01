"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var client_1 = require("react-dom/client");
var App_1 = require("./App");
require("./styles/globals.css");
require("@/lib/i18n");
// Handle OAuth token BEFORE React renders
// Support both ?token= (query) and #token= (hash) formats
var handleOAuthToken = function () {
    try {
        // Check query params
        var params = new URLSearchParams(window.location.search);
        var token = params.get('token');
        var userStr = params.get('user');
        // Check hash (for Google OAuth redirect)
        if (!token && window.location.hash) {
            var hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
            token = hashParams.get('token');
            userStr = hashParams.get('user');
        }
        if (token) {
            var user = null;
            if (userStr) {
                try {
                    user = JSON.parse(decodeURIComponent(userStr));
                }
                catch (_a) { }
            }
            if (user) {
                var stored = { state: { user: user, token: token, isAuthenticated: true }, version: 0 };
                localStorage.setItem('globipet-auth', JSON.stringify(stored));
            }
            else {
                // Just store token, fetch user after
                var existing = localStorage.getItem('globipet-auth');
                var parsed = existing ? JSON.parse(existing) : { state: {}, version: 0 };
                parsed.state.token = token;
                parsed.state.isAuthenticated = true;
                localStorage.setItem('globipet-auth', JSON.stringify(parsed));
            }
            // Clean URL
            window.history.replaceState({}, '', '/');
        }
    }
    catch (e) {
        console.error('OAuth parse error:', e);
    }
};
handleOAuthToken();
// Apply theme before React renders to prevent flash of light mode
try {
    var stored = localStorage.getItem('globipet-theme');
    if (stored) {
        var state = JSON.parse(stored).state;
        if ((state === null || state === void 0 ? void 0 : state.theme) === 'dark' || ((state === null || state === void 0 ? void 0 : state.theme) === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
            document.documentElement.classList.add('dark');
        }
    }
}
catch (_a) { }
client_1.default.createRoot(document.getElementById('root')).render(<App_1.default />);
