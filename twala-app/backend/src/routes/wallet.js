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
var stellar = require("../services/stellar.js");
var db = require("../services/database.js");
var router = (0, express_1.Router)();
router.post('/create', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, freshBalance, err_1, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, stellar.createWallet()];
            case 1:
                wallet = _a.sent();
                return [4 /*yield*/, db.saveWallet(wallet)];
            case 2:
                _a.sent();
                return [4 /*yield*/, stellar.ensureTrustline(wallet.secretKey)];
            case 3:
                _a.sent();
                return [4 /*yield*/, stellar.getBalance(wallet.publicKey)];
            case 4:
                freshBalance = _a.sent();
                res.json({
                    success: true,
                    data: {
                        publicKey: wallet.publicKey,
                        balanceUsdc: freshBalance.usdc,
                        balanceXlm: freshBalance.xlm,
                        isFunded: wallet.isFunded,
                    },
                });
                return [3 /*break*/, 6];
            case 5:
                err_1 = _a.sent();
                msg = err_1 instanceof Error ? err_1.message : String(err_1);
                res.status(500).json({ success: false, message: "Wallet creation failed: ".concat(msg) });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
router.post('/restore', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var secretKey, wallet, err_2, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                secretKey = req.body.secretKey;
                if (!secretKey)
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'secretKey required' })];
                return [4 /*yield*/, stellar.restoreWallet(secretKey)];
            case 1:
                wallet = _a.sent();
                return [4 /*yield*/, db.saveWallet(wallet)];
            case 2:
                _a.sent();
                res.json({
                    success: true,
                    data: {
                        publicKey: wallet.publicKey,
                        balanceUsdc: wallet.balanceUsdc,
                        balanceXlm: wallet.balanceXlm,
                        isFunded: wallet.isFunded,
                    },
                });
                return [3 /*break*/, 4];
            case 3:
                err_2 = _a.sent();
                msg = err_2 instanceof Error ? err_2.message : String(err_2);
                res.status(500).json({ success: false, message: "Wallet restoration failed: ".concat(msg) });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get('/balance', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, balance, err_3, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, db.getWallet()];
            case 1:
                wallet = _a.sent();
                if (!wallet) {
                    return [2 /*return*/, res.json({
                            success: true,
                            data: { balanceUsdc: 0, balanceXlm: 0, publicKey: null, isFunded: false },
                        })];
                }
                return [4 /*yield*/, stellar.getBalance(wallet.publicKey)];
            case 2:
                balance = _a.sent();
                return [4 /*yield*/, db.updateWalletBalance(wallet.publicKey, balance.usdc, balance.xlm)];
            case 3:
                _a.sent();
                res.json({
                    success: true,
                    data: {
                        balanceUsdc: balance.usdc,
                        balanceXlm: balance.xlm,
                        publicKey: wallet.publicKey,
                        isFunded: wallet.isFunded,
                    },
                });
                return [3 /*break*/, 5];
            case 4:
                err_3 = _a.sent();
                msg = err_3 instanceof Error ? err_3.message : String(err_3);
                res.status(500).json({ success: false, message: "Balance check failed: ".concat(msg) });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/info', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, balance, err_4, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 4, , 5]);
                return [4 /*yield*/, db.getWallet()];
            case 1:
                wallet = _a.sent();
                if (!wallet) {
                    return [2 /*return*/, res.json({ success: true, data: null })];
                }
                return [4 /*yield*/, stellar.getBalance(wallet.publicKey)];
            case 2:
                balance = _a.sent();
                return [4 /*yield*/, db.updateWalletBalance(wallet.publicKey, balance.usdc, balance.xlm)];
            case 3:
                _a.sent();
                res.json({
                    success: true,
                    data: {
                        publicKey: wallet.publicKey,
                        balanceUsdc: balance.usdc,
                        balanceXlm: balance.xlm,
                        isFunded: wallet.isFunded,
                    },
                });
                return [3 /*break*/, 5];
            case 4:
                err_4 = _a.sent();
                msg = err_4 instanceof Error ? err_4.message : String(err_4);
                res.status(500).json({ success: false, message: msg });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
router.get('/details', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, info, err_5, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, db.getWallet()];
            case 1:
                wallet = _a.sent();
                if (!wallet) {
                    return [2 /*return*/, res.json({ success: true, data: null })];
                }
                return [4 /*yield*/, stellar.getAccountInfo(wallet.publicKey)];
            case 2:
                info = _a.sent();
                res.json({ success: true, data: info });
                return [3 /*break*/, 4];
            case 3:
                err_5 = _a.sent();
                msg = err_5 instanceof Error ? err_5.message : String(err_5);
                res.status(500).json({ success: false, message: msg });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get('/payments', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, limit, cursor, result, err_6, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                return [4 /*yield*/, db.getWallet()];
            case 1:
                wallet = _a.sent();
                if (!wallet) {
                    return [2 /*return*/, res.json({ success: true, data: { payments: [], cursor: '' } })];
                }
                limit = parseInt(req.query.limit) || 20;
                cursor = req.query.cursor;
                return [4 /*yield*/, stellar.getStellarPayments(wallet.publicKey, limit, cursor)];
            case 2:
                result = _a.sent();
                res.json({ success: true, data: result });
                return [3 /*break*/, 4];
            case 3:
                err_6 = _a.sent();
                msg = err_6 instanceof Error ? err_6.message : String(err_6);
                res.status(500).json({ success: false, message: msg });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
router.get('/validate/:address', function (req, res) {
    var isValid = stellar.isValidPublicKey(req.params.address);
    res.json({ success: true, data: { address: req.params.address, isValid: isValid } });
});
router.post('/generate-keypair', function (_req, res) {
    var keypair = stellar.generateKeypair();
    res.json({
        success: true,
        data: {
            publicKey: keypair.publicKey,
            secretKey: keypair.secretKey,
            message: 'Store this secret key securely. It will not be shown again.',
        },
    });
});
// POST /api/wallet/sync — force balance sync from Stellar to DB
router.post('/sync', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var wallet, balance, pending, err_7, msg;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 5, , 6]);
                return [4 /*yield*/, db.getWallet()];
            case 1:
                wallet = _a.sent();
                if (!wallet) {
                    return [2 /*return*/, res.json({ success: true, data: { balanceUsdc: 0, balanceXlm: 0, publicKey: null } })];
                }
                return [4 /*yield*/, stellar.getBalance(wallet.publicKey)];
            case 2:
                balance = _a.sent();
                return [4 /*yield*/, db.updateWalletBalance(wallet.publicKey, balance.usdc, balance.xlm)];
            case 3:
                _a.sent();
                return [4 /*yield*/, db.countPendingTransactions()];
            case 4:
                pending = _a.sent();
                res.json({
                    success: true,
                    data: {
                        balanceUsdc: balance.usdc,
                        balanceXlm: balance.xlm,
                        publicKey: wallet.publicKey,
                        isFunded: wallet.isFunded,
                        pendingTransactions: pending,
                    },
                });
                return [3 /*break*/, 6];
            case 5:
                err_7 = _a.sent();
                msg = err_7 instanceof Error ? err_7.message : String(err_7);
                res.status(500).json({ success: false, message: msg });
                return [3 /*break*/, 6];
            case 6: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
