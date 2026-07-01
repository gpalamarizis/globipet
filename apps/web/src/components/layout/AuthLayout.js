"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = AuthLayout;
var react_router_dom_1 = require("react-router-dom");
var auth_1 = require("@/store/auth");
function AuthLayout() {
    var isAuthenticated = (0, auth_1.useAuthStore)().isAuthenticated;
    if (isAuthenticated)
        return <react_router_dom_1.Navigate to="/" replace/>;
    return <react_router_dom_1.Outlet />;
}
