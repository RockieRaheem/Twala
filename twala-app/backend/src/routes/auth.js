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
var express_1 = require("express");
var crypto_1 = require("crypto");
var db = require("../services/database.js");
var router = (0, express_1.Router)();
function hashPin(pin) {
    return (0, crypto_1.createHash)('sha256').update(pin).digest('hex');
}
function sanitize(profile) {
    return {
        id: profile.id,
        name: profile.name,
        phone: profile.phone,
        createdAt: profile.createdAt,
    };
}
// ---------------------------------------------------------------------------
// POST /api/auth/register — create a new user profile
// ---------------------------------------------------------------------------
router.post('/register', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, phone, pin, errors, formattedPhone, existing, profile, err_1, msg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 3, , 4]);
                _a = req.body, name_1 = _a.name, phone = _a.phone, pin = _a.pin;
                errors = [];
                if (!name_1 || !name_1.trim())
                    errors.push('Full name is required');
                if (!phone || !phone.trim())
                    errors.push('Phone number is required');
                if (!pin || pin.length < 4 || pin.length > 6)
                    errors.push('PIN must be 4-6 digits');
                if (!/^\d+$/.test(pin))
                    errors.push('PIN must contain only digits');
                if (errors.length > 0) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: errors.join('; ') })];
                }
                formattedPhone = phone.startsWith('+') ? phone : "+".concat(phone);
                return [4 /*yield*/, db.getProfileByPhone(formattedPhone)];
            case 1:
                existing = _b.sent();
                if (existing) {
                    return [2 /*return*/, res.status(409).json({ success: false, message: 'An account with this phone number already exists' })];
                }
                return [4 /*yield*/, db.createProfile({
                        name: name_1.trim(),
                        phone: formattedPhone,
                        pinHash: hashPin(pin),
                    })];
            case 2:
                profile = _b.sent();
                res.status(201).json({ success: true, data: sanitize(profile), message: 'Account created successfully' });
                return [3 /*break*/, 4];
            case 3:
                err_1 = _b.sent();
                msg = err_1 instanceof Error ? err_1.message : String(err_1);
                res.status(500).json({ success: false, message: "Registration failed: ".concat(msg) });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// ---------------------------------------------------------------------------
// POST /api/auth/login — verify PIN and return profile
// ---------------------------------------------------------------------------
router.post('/login', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, phone, pin, formattedPhone, profile, err_2, msg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 2, , 3]);
                _a = req.body, phone = _a.phone, pin = _a.pin;
                if (!phone || !pin) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Phone and PIN are required' })];
                }
                formattedPhone = phone.startsWith('+') ? phone : "+".concat(phone);
                return [4 /*yield*/, db.getProfileByPhone(formattedPhone)];
            case 1:
                profile = _b.sent();
                if (!profile) {
                    return [2 /*return*/, res.status(401).json({ success: false, message: 'No account found with this phone number' })];
                }
                if (profile.pinHash !== hashPin(pin)) {
                    return [2 /*return*/, res.status(401).json({ success: false, message: 'Incorrect PIN' })];
                }
                res.json({ success: true, data: sanitize(profile), message: 'Login successful' });
                return [3 /*break*/, 3];
            case 2:
                err_2 = _b.sent();
                msg = err_2 instanceof Error ? err_2.message : String(err_2);
                res.status(500).json({ success: false, message: "Login failed: ".concat(msg) });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ---------------------------------------------------------------------------
// GET /api/auth/profile/:id — get profile by ID (for re-fetch after app restart)
// ---------------------------------------------------------------------------
router.get('/profile/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var profile, err_3, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                return [4 /*yield*/, db.getProfile(req.params.id)];
            case 1:
                profile = _a.sent();
                if (!profile) {
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Profile not found' })];
                }
                res.json({ success: true, data: sanitize(profile) });
                return [3 /*break*/, 3];
            case 2:
                err_3 = _a.sent();
                msg = err_3 instanceof Error ? err_3.message : String(err_3);
                res.status(500).json({ success: false, message: msg });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// ---------------------------------------------------------------------------
// GET /api/auth/check/:phone — check if a phone is registered (for onboarding flow)
// ---------------------------------------------------------------------------
router.get('/check/:phone', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var formattedPhone, profile, err_4, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                formattedPhone = req.params.phone.startsWith('+') ? req.params.phone : "+".concat(req.params.phone);
                return [4 /*yield*/, db.getProfileByPhone(formattedPhone)];
            case 1:
                profile = _a.sent();
                res.json({ success: true, data: { exists: !!profile } });
                return [3 /*break*/, 3];
            case 2:
                err_4 = _a.sent();
                msg = err_4 instanceof Error ? err_4.message : String(err_4);
                res.status(500).json({ success: false, message: msg });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
