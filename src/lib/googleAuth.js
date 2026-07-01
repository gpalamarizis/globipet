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
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureGoogleSignIn = configureGoogleSignIn;
exports.signInWithGoogle = signInWithGoogle;
exports.signOutGoogle = signOutGoogle;
var google_signin_1 = require("@react-native-google-signin/google-signin");
var expo_constants_1 = require("expo-constants");
var isConfigured = false;
/**
 * Initialize Google Sign-In. Call this once when the app starts.
 *
 * IMPORTANT: webClientId is REQUIRED even on Android!
 * The native SDK uses the Web Client ID to request an ID token
 * that the backend can verify.
 *
 * The Android Client ID with package name + SHA-1 is what
 * authorizes the app to use the Web Client ID.
 */
function configureGoogleSignIn() {
    var _a, _b, _c, _d;
    if (isConfigured)
        return;
    var webClientId = (_b = (_a = expo_constants_1.default.expoConfig) === null || _a === void 0 ? void 0 : _a.extra) === null || _b === void 0 ? void 0 : _b.googleWebClientId;
    var iosClientId = (_d = (_c = expo_constants_1.default.expoConfig) === null || _c === void 0 ? void 0 : _c.extra) === null || _d === void 0 ? void 0 : _d.googleIosClientId;
    if (!webClientId) {
        console.warn('Google Sign-In: webClientId not configured in app.json');
        return;
    }
    google_signin_1.GoogleSignin.configure({
        webClientId: webClientId,
        iosClientId: iosClientId,
        offlineAccess: false,
        scopes: ['openid', 'profile', 'email'],
    });
    isConfigured = true;
}
/**
 * Trigger the Google Sign-In flow.
 * Returns the user info + tokens, or null if cancelled.
 */
function signInWithGoogle() {
    return __awaiter(this, void 0, void 0, function () {
        var result, data, idToken, user, accessToken, tokens, _a, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 7, , 8]);
                    configureGoogleSignIn();
                    // Check if Play Services available (Android)
                    return [4 /*yield*/, google_signin_1.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
                        // Trigger sign-in
                    ];
                case 1:
                    // Check if Play Services available (Android)
                    _b.sent();
                    return [4 /*yield*/, google_signin_1.GoogleSignin.signIn()
                        // Handle response (new API in v13+ wraps in {type, data})
                    ];
                case 2:
                    result = _b.sent();
                    data = result.data || result;
                    idToken = data.idToken;
                    user = data.user;
                    if (!idToken || !user) {
                        throw new Error('No ID token received from Google');
                    }
                    accessToken = null;
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, google_signin_1.GoogleSignin.getTokens()];
                case 4:
                    tokens = _b.sent();
                    accessToken = tokens.accessToken;
                    return [3 /*break*/, 6];
                case 5:
                    _a = _b.sent();
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/, {
                        idToken: idToken,
                        accessToken: accessToken,
                        user: {
                            id: user.id,
                            email: user.email,
                            name: user.name || '',
                            photo: user.photo,
                            givenName: user.givenName,
                            familyName: user.familyName,
                        },
                    }];
                case 7:
                    error_1 = _b.sent();
                    if (error_1.code === google_signin_1.statusCodes.SIGN_IN_CANCELLED) {
                        return [2 /*return*/, null]; // User cancelled
                    }
                    if (error_1.code === google_signin_1.statusCodes.IN_PROGRESS) {
                        throw new Error('Η σύνδεση είναι σε εξέλιξη');
                    }
                    if (error_1.code === google_signin_1.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                        throw new Error('Το Google Play Services δεν είναι διαθέσιμο');
                    }
                    throw error_1;
                case 8: return [2 /*return*/];
            }
        });
    });
}
/**
 * Sign out from Google (revokes the local session)
 */
function signOutGoogle() {
    return __awaiter(this, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    configureGoogleSignIn();
                    return [4 /*yield*/, google_signin_1.GoogleSignin.signOut()];
                case 1:
                    _a.sent();
                    return [3 /*break*/, 3];
                case 2:
                    err_1 = _a.sent();
                    console.warn('Google sign-out error:', err_1);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
