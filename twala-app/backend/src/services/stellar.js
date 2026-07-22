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
exports.getRecommendedFee = getRecommendedFee;
exports.clearAccountCache = clearAccountCache;
exports.getAccountInfo = getAccountInfo;
exports.initializeTestUsdc = initializeTestUsdc;
exports.mintTestUsdc = mintTestUsdc;
exports.createWallet = createWallet;
exports.getBalance = getBalance;
exports.ensureTrustline = ensureTrustline;
exports.submitPayment = submitPayment;
exports.getStellarPayments = getStellarPayments;
exports.getRecentTransactions = getRecentTransactions;
exports.restoreWallet = restoreWallet;
exports.isValidPublicKey = isValidPublicKey;
exports.generateKeypair = generateKeypair;
var stellar_sdk_1 = require("@stellar/stellar-sdk");
var config_js_1 = require("../config.js");
// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
var BASE_RESERVE_XLM = 1;
var TRUSTLINE_RESERVE_XLM = 0.5;
var MAX_RETRIES = 3;
var RETRY_DELAY_MS = 1000;
var SUBMIT_TIMEOUT_MS = 30000;
var TX_TIMEOUT_SECONDS = 300;
// ---------------------------------------------------------------------------
// Server & Dynamic Asset
// ---------------------------------------------------------------------------
var server = new stellar_sdk_1.Horizon.Server(config_js_1.default.stellar.horizonUrl);
function getNetworkPassphrase() {
    return config_js_1.default.stellar.network === 'TESTNET' ? stellar_sdk_1.Networks.TESTNET : stellar_sdk_1.Networks.PUBLIC;
}
function isTestnet() {
    return config_js_1.default.stellar.network === 'TESTNET';
}
function getUsdcAsset() {
    return new stellar_sdk_1.Asset('USDC', config_js_1.default.stellar.usdcIssuer);
}
// ---------------------------------------------------------------------------
// Fee estimation
// ---------------------------------------------------------------------------
var cachedFeeStats = null;
var lastFeeFetch = 0;
function getRecommendedFee() {
    return __awaiter(this, void 0, void 0, function () {
        var now, stats, result, _a, fallback;
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
        return __generator(this, function (_t) {
            switch (_t.label) {
                case 0:
                    now = Date.now();
                    if (cachedFeeStats && now - lastFeeFetch < 30000)
                        return [2 /*return*/, cachedFeeStats];
                    _t.label = 1;
                case 1:
                    _t.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, server.feeStats()];
                case 2:
                    stats = _t.sent();
                    result = {
                        lastLedger: stats.last_ledger,
                        lastLedgerBaseFee: parseInt(String(stats.last_ledger_base_fee)) || 100,
                        modeAcceptedFee: parseInt(String(stats.mode_accepted_fee)) || 100,
                        minAcceptedFee: parseInt(String(stats.min_accepted_fee)) || 100,
                        maxFee: 100 * (parseInt(String((_b = stats.max_fee) === null || _b === void 0 ? void 0 : _b.mode)) || 100),
                        feeCharged: {
                            max: parseInt(String((_c = stats.fee_charged) === null || _c === void 0 ? void 0 : _c.max)) || 100,
                            min: parseInt(String((_d = stats.fee_charged) === null || _d === void 0 ? void 0 : _d.min)) || 100,
                            mode: parseInt(String((_e = stats.fee_charged) === null || _e === void 0 ? void 0 : _e.mode)) || 100,
                            p10: parseInt(String((_f = stats.fee_charged) === null || _f === void 0 ? void 0 : _f.p10)) || 100,
                            p20: parseInt(String((_g = stats.fee_charged) === null || _g === void 0 ? void 0 : _g.p20)) || 100,
                            p30: parseInt(String((_h = stats.fee_charged) === null || _h === void 0 ? void 0 : _h.p30)) || 100,
                            p40: parseInt(String((_j = stats.fee_charged) === null || _j === void 0 ? void 0 : _j.p40)) || 100,
                            p50: parseInt(String((_k = stats.fee_charged) === null || _k === void 0 ? void 0 : _k.p50)) || 100,
                            p60: parseInt(String((_l = stats.fee_charged) === null || _l === void 0 ? void 0 : _l.p60)) || 100,
                            p70: parseInt(String((_m = stats.fee_charged) === null || _m === void 0 ? void 0 : _m.p70)) || 100,
                            p80: parseInt(String((_o = stats.fee_charged) === null || _o === void 0 ? void 0 : _o.p80)) || 100,
                            p90: parseInt(String((_p = stats.fee_charged) === null || _p === void 0 ? void 0 : _p.p90)) || 100,
                            p95: parseInt(String((_q = stats.fee_charged) === null || _q === void 0 ? void 0 : _q.p95)) || 100,
                            p99: parseInt(String((_r = stats.fee_charged) === null || _r === void 0 ? void 0 : _r.p99)) || 100,
                        },
                        ledgerCapacityUsage: stats.ledger_capacity_usage,
                        recommendedFee: parseInt(String((_s = stats.fee_charged) === null || _s === void 0 ? void 0 : _s.p50)) || 100,
                    };
                    cachedFeeStats = result;
                    lastFeeFetch = now;
                    return [2 /*return*/, result];
                case 3:
                    _a = _t.sent();
                    fallback = {
                        lastLedger: 0,
                        lastLedgerBaseFee: 100,
                        modeAcceptedFee: 100,
                        minAcceptedFee: 100,
                        maxFee: 1000,
                        feeCharged: {},
                        ledgerCapacityUsage: 0,
                        recommendedFee: 100,
                    };
                    cachedFeeStats = fallback;
                    lastFeeFetch = now;
                    return [2 /*return*/, fallback];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Account cache
// ---------------------------------------------------------------------------
var accountCache = new Map();
function getCachedAccount(publicKey) {
    var entry = accountCache.get(publicKey);
    if (entry && Date.now() - entry.fetchedAt < 10000)
        return entry.account;
    return null;
}
function setCachedAccount(publicKey, account) {
    accountCache.set(publicKey, { account: account, fetchedAt: Date.now() });
    if (accountCache.size > 100) {
        var oldest = accountCache.keys().next().value;
        if (oldest)
            accountCache.delete(oldest);
    }
}
function loadAccount(publicKey) {
    return __awaiter(this, void 0, void 0, function () {
        var cached, account;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cached = getCachedAccount(publicKey);
                    if (cached)
                        return [2 /*return*/, cached];
                    return [4 /*yield*/, server.loadAccount(publicKey)];
                case 1:
                    account = _a.sent();
                    setCachedAccount(publicKey, account);
                    return [2 /*return*/, account];
            }
        });
    });
}
function clearAccountCache(publicKey) {
    accountCache.delete(publicKey);
}
// ---------------------------------------------------------------------------
// Account info
// ---------------------------------------------------------------------------
function getAccountInfo(publicKey) {
    return __awaiter(this, void 0, void 0, function () {
        var account, balances, xlmBalance, trustlines, _i, balances_1, b, subentryCount, xlmReserve, availableXlm, err_1;
        var _a, _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    _e.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, server.loadAccount(publicKey)];
                case 1:
                    account = _e.sent();
                    balances = account.balances;
                    xlmBalance = 0;
                    trustlines = [];
                    for (_i = 0, balances_1 = balances; _i < balances_1.length; _i++) {
                        b = balances_1[_i];
                        if (b.asset_type === 'native') {
                            xlmBalance = parseFloat(b.balance);
                        }
                        else {
                            trustlines.push({
                                assetCode: b.asset_code,
                                assetIssuer: b.asset_issuer,
                                balance: b.balance,
                                limit: b.limit || '0',
                                isAuthorized: b.is_authorized !== false,
                            });
                        }
                    }
                    subentryCount = account.subentry_count || 0;
                    xlmReserve = BASE_RESERVE_XLM + (subentryCount * TRUSTLINE_RESERVE_XLM);
                    availableXlm = Math.max(0, xlmBalance - xlmReserve);
                    return [2 /*return*/, {
                            publicKey: publicKey,
                            sequence: account.sequence,
                            subentryCount: subentryCount,
                            balances: balances,
                            signers: (account.signers || []).map(function (s) { return ({
                                key: s.key,
                                weight: s.weight,
                                type: s.type,
                            }); }),
                            thresholds: {
                                lowThreshold: ((_a = account.thresholds) === null || _a === void 0 ? void 0 : _a.low_threshold) || 0,
                                medThreshold: ((_b = account.thresholds) === null || _b === void 0 ? void 0 : _b.med_threshold) || 0,
                                highThreshold: ((_c = account.thresholds) === null || _c === void 0 ? void 0 : _c.high_threshold) || 0,
                            },
                            isFunded: xlmBalance > 0,
                            xlmReserve: xlmReserve,
                            availableXlm: availableXlm,
                        }];
                case 2:
                    err_1 = _e.sent();
                    if (((_d = err_1 === null || err_1 === void 0 ? void 0 : err_1.response) === null || _d === void 0 ? void 0 : _d.status) === 404) {
                        return [2 /*return*/, {
                                publicKey: publicKey,
                                sequence: '0',
                                subentryCount: 0,
                                balances: [],
                                signers: [],
                                thresholds: { lowThreshold: 0, medThreshold: 0, highThreshold: 0 },
                                isFunded: false,
                                xlmReserve: BASE_RESERVE_XLM,
                                availableXlm: 0,
                            }];
                    }
                    throw err_1;
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Test USDC issuer — creates a self-managed USDC issuer on testnet
// ---------------------------------------------------------------------------
function initializeTestUsdc() {
    return __awaiter(this, void 0, void 0, function () {
        var issuer, issuerPublic, issuerSecret, fbResponse, errBody, err_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isTestnet())
                        return [2 /*return*/];
                    // Only skip if user provided BOTH an issuer address AND its secret key
                    if (process.env.USDC_ISSUER && process.env.USDC_ISSUER_SECRET)
                        return [2 /*return*/];
                    console.log("  \uD83D\uDD04 Initializing test USDC...");
                    issuer = stellar_sdk_1.Keypair.random();
                    issuerPublic = issuer.publicKey();
                    issuerSecret = issuer.secret();
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 5, , 6]);
                    return [4 /*yield*/, fetch("https://friendbot.stellar.org?addr=".concat(issuerPublic), { signal: AbortSignal.timeout(15000) })];
                case 2:
                    fbResponse = _a.sent();
                    if (!!fbResponse.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, fbResponse.text().catch(function () { return ''; })];
                case 3:
                    errBody = _a.sent();
                    throw new Error("Friendbot returned ".concat(fbResponse.status, ": ").concat(errBody));
                case 4:
                    console.log("  \u2705 Issuer funded: ".concat(issuerPublic.slice(0, 8), "..."));
                    return [3 /*break*/, 6];
                case 5:
                    err_2 = _a.sent();
                    if ((err_2 === null || err_2 === void 0 ? void 0 : err_2.name) === 'AbortError') {
                        console.log("  \u26A0\uFE0F  Issuer funding timed out. USDC will be $0.");
                        return [2 /*return*/];
                    }
                    console.log("  \u26A0\uFE0F  Issuer funding failed: ".concat(err_2.message));
                    return [2 /*return*/];
                case 6:
                    // Step 3: Update config to use our issuer
                    config_js_1.default.stellar.usdcIssuer = issuerPublic;
                    config_js_1.default.stellar.usdcIssuerSecret = issuerSecret;
                    config_js_1.default.testUsdc.issuerSecret = issuerSecret;
                    console.log("  \u2705 USDC issuer set to self-managed account");
                    return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Mint test USDC to wallet
// ---------------------------------------------------------------------------
function mintTestUsdc(walletSecret_1) {
    return __awaiter(this, arguments, void 0, function (walletSecret, amount) {
        var walletKeypair, walletPublic, issuerKeypair, issuerPublic, err_3, issuerAccount, feeStats, fee, tx, result, err_4, msg;
        if (amount === void 0) { amount = config_js_1.default.testUsdc.initialMintAmount; }
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!isTestnet())
                        return [2 /*return*/];
                    if (!config_js_1.default.testUsdc.issuerSecret) {
                        console.log("  \u26A0\uFE0F  No test USDC issuer configured. Skipping mint.");
                        return [2 /*return*/];
                    }
                    walletKeypair = stellar_sdk_1.Keypair.fromSecret(walletSecret);
                    walletPublic = walletKeypair.publicKey();
                    issuerKeypair = stellar_sdk_1.Keypair.fromSecret(config_js_1.default.testUsdc.issuerSecret);
                    issuerPublic = config_js_1.default.stellar.usdcIssuer;
                    console.log("  \uD83D\uDD04 Minting ".concat(amount, " test USDC to wallet..."));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, ensureTrustline(walletSecret)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_3 = _a.sent();
                    console.log("  \u26A0\uFE0F  Trustline setup: ".concat(err_3.message));
                    return [2 /*return*/];
                case 4:
                    _a.trys.push([4, 8, , 9]);
                    clearAccountCache(issuerPublic);
                    return [4 /*yield*/, loadAccount(issuerPublic)];
                case 5:
                    issuerAccount = _a.sent();
                    return [4 /*yield*/, getRecommendedFee()];
                case 6:
                    feeStats = _a.sent();
                    fee = Math.max(feeStats.recommendedFee, 100).toString();
                    tx = new stellar_sdk_1.TransactionBuilder(issuerAccount, {
                        fee: fee,
                        networkPassphrase: getNetworkPassphrase(),
                    })
                        .addOperation(stellar_sdk_1.Operation.payment({
                        destination: walletPublic,
                        asset: getUsdcAsset(),
                        amount: amount.toFixed(7),
                    }))
                        .setTimeout(TX_TIMEOUT_SECONDS)
                        .build();
                    tx.sign(issuerKeypair);
                    return [4 /*yield*/, server.submitTransaction(tx)];
                case 7:
                    result = _a.sent();
                    clearAccountCache(issuerPublic);
                    clearAccountCache(walletPublic);
                    console.log("  \u2705 Minted ".concat(amount, " USDC to wallet (tx: ").concat(result.hash.slice(0, 8), "...)"));
                    return [3 /*break*/, 9];
                case 8:
                    err_4 = _a.sent();
                    msg = extractStellarError(err_4);
                    console.log("  \u26A0\uFE0F  USDC mint failed: ".concat(msg));
                    return [3 /*break*/, 9];
                case 9: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Wallet creation
// ---------------------------------------------------------------------------
function createWallet() {
    return __awaiter(this, void 0, void 0, function () {
        var keypair, publicKey, secretKey, isFunded, response, errorBody, json, detail, err_5, balance, wallet;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    keypair = stellar_sdk_1.Keypair.random();
                    publicKey = keypair.publicKey();
                    secretKey = keypair.secret();
                    isFunded = false;
                    if (!isTestnet()) return [3 /*break*/, 7];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    return [4 /*yield*/, fetch("https://friendbot.stellar.org?addr=".concat(publicKey), { signal: AbortSignal.timeout(15000) })];
                case 2:
                    response = _a.sent();
                    if (!!response.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, response.text().catch(function () { return ''; })];
                case 3:
                    errorBody = _a.sent();
                    throw new Error("Friendbot returned ".concat(response.status, ": ").concat(errorBody));
                case 4: return [4 /*yield*/, response.json()];
                case 5:
                    json = _a.sent();
                    if (!(json === null || json === void 0 ? void 0 : json.hash)) {
                        detail = (json === null || json === void 0 ? void 0 : json.detail) || (json === null || json === void 0 ? void 0 : json.title) || 'empty response';
                        throw new Error("Friendbot funding failed: ".concat(detail));
                    }
                    isFunded = true;
                    clearAccountCache(publicKey);
                    return [3 /*break*/, 7];
                case 6:
                    err_5 = _a.sent();
                    if ((err_5 === null || err_5 === void 0 ? void 0 : err_5.name) === 'AbortError') {
                        throw new Error('Friendbot request timed out. The testnet faucet may be slow. Try again.');
                    }
                    throw err_5;
                case 7: return [4 /*yield*/, getBalance(publicKey)];
                case 8:
                    balance = _a.sent();
                    wallet = {
                        publicKey: publicKey,
                        secretKey: secretKey,
                        balanceUsdc: balance.usdc,
                        balanceXlm: balance.xlm,
                        isFunded: isFunded,
                    };
                    return [2 /*return*/, wallet];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Balance
// ---------------------------------------------------------------------------
function getBalance(address) {
    return __awaiter(this, void 0, void 0, function () {
        var account, usdc, xlm, _i, _a, b, bal, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, server.loadAccount(address)];
                case 1:
                    account = _c.sent();
                    usdc = 0;
                    xlm = 0;
                    for (_i = 0, _a = account.balances; _i < _a.length; _i++) {
                        b = _a[_i];
                        bal = b;
                        if (bal.asset_type === 'native') {
                            xlm = parseFloat(bal.balance);
                        }
                        else if (bal.asset_code === 'USDC' && bal.asset_issuer === config_js_1.default.stellar.usdcIssuer) {
                            usdc = parseFloat(bal.balance);
                        }
                    }
                    return [2 /*return*/, { usdc: usdc, xlm: xlm }];
                case 2:
                    _b = _c.sent();
                    return [2 /*return*/, { usdc: 0, xlm: 0 }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Trustline management
// ---------------------------------------------------------------------------
function hasTrustline(publicKey) {
    return __awaiter(this, void 0, void 0, function () {
        var account, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, server.loadAccount(publicKey)];
                case 1:
                    account = _b.sent();
                    return [2 /*return*/, account.balances.some(function (b) { return b.asset_code === 'USDC' && b.asset_issuer === config_js_1.default.stellar.usdcIssuer; })];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, false];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function ensureTrustline(secretKey) {
    return __awaiter(this, void 0, void 0, function () {
        var keypair, publicKey, alreadyExists, account_1, nativeBalance, xlmBalance, subentryCount, neededReserve, shortfall, msg, err_6, account, feeStats, fee, tx, err_7, stellarErr;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    keypair = stellar_sdk_1.Keypair.fromSecret(secretKey);
                    publicKey = keypair.publicKey();
                    return [4 /*yield*/, hasTrustline(publicKey)];
                case 1:
                    alreadyExists = _b.sent();
                    if (alreadyExists)
                        return [2 /*return*/];
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, server.loadAccount(publicKey)];
                case 3:
                    account_1 = _b.sent();
                    nativeBalance = account_1.balances.find(function (b) { return b.asset_type === 'native'; });
                    xlmBalance = nativeBalance ? parseFloat(nativeBalance.balance) : 0;
                    subentryCount = account_1.subentry_count || 0;
                    neededReserve = BASE_RESERVE_XLM + ((subentryCount + 1) * TRUSTLINE_RESERVE_XLM);
                    if (xlmBalance < neededReserve) {
                        shortfall = neededReserve - xlmBalance;
                        msg = "Insufficient XLM to add USDC trustline. ";
                        msg += "Need ".concat(neededReserve, " XLM (").concat(BASE_RESERVE_XLM, " base + ").concat(subentryCount + 1, " entries \u00D7 ").concat(TRUSTLINE_RESERVE_XLM, "). ");
                        msg += "Have ".concat(xlmBalance, " XLM. Shortfall: ").concat(shortfall.toFixed(1), " XLM.");
                        if (isTestnet()) {
                            msg += ' Use Friendbot to get free XLM.';
                        }
                        throw new Error(msg);
                    }
                    return [3 /*break*/, 5];
                case 4:
                    err_6 = _b.sent();
                    if ((_a = err_6 === null || err_6 === void 0 ? void 0 : err_6.message) === null || _a === void 0 ? void 0 : _a.includes('Insufficient XLM'))
                        throw err_6;
                    return [3 /*break*/, 5];
                case 5: return [4 /*yield*/, loadAccount(publicKey)];
                case 6:
                    account = _b.sent();
                    return [4 /*yield*/, getRecommendedFee()];
                case 7:
                    feeStats = _b.sent();
                    fee = Math.max(feeStats.recommendedFee, 100).toString();
                    tx = new stellar_sdk_1.TransactionBuilder(account, {
                        fee: fee,
                        networkPassphrase: getNetworkPassphrase(),
                    })
                        .addOperation(stellar_sdk_1.Operation.changeTrust({
                        asset: getUsdcAsset(),
                        limit: '922337203685.4775807',
                    }))
                        .setTimeout(TX_TIMEOUT_SECONDS)
                        .build();
                    tx.sign(keypair);
                    _b.label = 8;
                case 8:
                    _b.trys.push([8, 10, , 11]);
                    return [4 /*yield*/, server.submitTransaction(tx)];
                case 9:
                    _b.sent();
                    clearAccountCache(publicKey);
                    return [3 /*break*/, 11];
                case 10:
                    err_7 = _b.sent();
                    stellarErr = extractStellarError(err_7);
                    throw new Error("Trustline creation failed: ".concat(stellarErr));
                case 11: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Payment submission
// ---------------------------------------------------------------------------
function submitPayment(secretKey, destination, amountUsdc, memoText) {
    return __awaiter(this, void 0, void 0, function () {
        var keypair, publicKey, account, balance, amountNum, feeStats, fee, txBuilder, tx, lastError, _loop_1, attempt, state_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    keypair = stellar_sdk_1.Keypair.fromSecret(secretKey);
                    publicKey = keypair.publicKey();
                    try {
                        stellar_sdk_1.Keypair.fromPublicKey(destination);
                    }
                    catch (_b) {
                        throw new Error("Invalid destination address: ".concat(destination));
                    }
                    clearAccountCache(publicKey);
                    return [4 /*yield*/, loadAccount(publicKey)];
                case 1:
                    account = _a.sent();
                    return [4 /*yield*/, getBalance(publicKey)];
                case 2:
                    balance = _a.sent();
                    amountNum = parseFloat(amountUsdc);
                    if (amountNum > balance.usdc) {
                        throw new Error("Insufficient USDC balance. Have ".concat(balance.usdc.toFixed(2), " USDC, trying to send ").concat(amountNum.toFixed(2), " USDC."));
                    }
                    return [4 /*yield*/, getRecommendedFee()];
                case 3:
                    feeStats = _a.sent();
                    fee = Math.max(feeStats.recommendedFee * 2, 100).toString();
                    txBuilder = new stellar_sdk_1.TransactionBuilder(account, {
                        fee: fee,
                        networkPassphrase: getNetworkPassphrase(),
                    });
                    if (memoText) {
                        txBuilder.addMemo(stellar_sdk_1.Memo.text(memoText));
                    }
                    txBuilder
                        .addOperation(stellar_sdk_1.Operation.payment({
                        destination: destination,
                        asset: getUsdcAsset(),
                        amount: amountUsdc,
                    }))
                        .setTimeout(TX_TIMEOUT_SECONDS);
                    tx = txBuilder.build();
                    tx.sign(keypair);
                    lastError = null;
                    _loop_1 = function (attempt) {
                        var result, err_8, stellarErr, freshAccount, retryBuilder, retryTx, _c;
                        return __generator(this, function (_d) {
                            switch (_d.label) {
                                case 0:
                                    _d.trys.push([0, 2, , 8]);
                                    return [4 /*yield*/, server.submitTransaction(tx)];
                                case 1:
                                    result = _d.sent();
                                    clearAccountCache(publicKey);
                                    return [2 /*return*/, { value: result.hash }];
                                case 2:
                                    err_8 = _d.sent();
                                    lastError = err_8;
                                    stellarErr = extractStellarError(err_8);
                                    if (isTerminalError(err_8)) {
                                        throw new Error("Payment failed: ".concat(stellarErr));
                                    }
                                    if (!(attempt < MAX_RETRIES)) return [3 /*break*/, 7];
                                    return [4 /*yield*/, new Promise(function (r) { return setTimeout(r, RETRY_DELAY_MS * attempt); })];
                                case 3:
                                    _d.sent();
                                    _d.label = 4;
                                case 4:
                                    _d.trys.push([4, 6, , 7]);
                                    clearAccountCache(publicKey);
                                    return [4 /*yield*/, loadAccount(publicKey)];
                                case 5:
                                    freshAccount = _d.sent();
                                    retryBuilder = new stellar_sdk_1.TransactionBuilder(freshAccount, {
                                        fee: fee,
                                        networkPassphrase: getNetworkPassphrase(),
                                    });
                                    if (memoText)
                                        retryBuilder.addMemo(stellar_sdk_1.Memo.text(memoText));
                                    retryBuilder
                                        .addOperation(stellar_sdk_1.Operation.payment({
                                        destination: destination,
                                        asset: getUsdcAsset(),
                                        amount: amountUsdc,
                                    }))
                                        .setTimeout(TX_TIMEOUT_SECONDS);
                                    retryTx = retryBuilder.build();
                                    retryTx.sign(keypair);
                                    return [3 /*break*/, 7];
                                case 6:
                                    _c = _d.sent();
                                    return [3 /*break*/, 7];
                                case 7: return [3 /*break*/, 8];
                                case 8: return [2 /*return*/];
                            }
                        });
                    };
                    attempt = 1;
                    _a.label = 4;
                case 4:
                    if (!(attempt <= MAX_RETRIES)) return [3 /*break*/, 7];
                    return [5 /*yield**/, _loop_1(attempt)];
                case 5:
                    state_1 = _a.sent();
                    if (typeof state_1 === "object")
                        return [2 /*return*/, state_1.value];
                    _a.label = 6;
                case 6:
                    attempt++;
                    return [3 /*break*/, 4];
                case 7: throw lastError || new Error('Payment submission failed after all retries');
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Transaction history
// ---------------------------------------------------------------------------
function getStellarPayments(address_1) {
    return __awaiter(this, arguments, void 0, function (address, limit, cursor) {
        var builder, page, payments, _a;
        if (limit === void 0) { limit = 50; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    builder = server
                        .payments()
                        .forAccount(address)
                        .limit(limit)
                        .order('desc');
                    if (cursor)
                        builder.cursor(cursor);
                    return [4 /*yield*/, builder.call()];
                case 1:
                    page = _b.sent();
                    payments = page.records.map(function (p) { return ({
                        id: p.id,
                        pagingToken: p.paging_token || '',
                        transactionHash: p.transaction_hash,
                        operationId: p.id,
                        type: p.type,
                        assetType: p.asset_type || 'native',
                        assetCode: p.asset_code,
                        assetIssuer: p.asset_issuer,
                        from: p.from,
                        to: p.to,
                        amount: p.amount || '0',
                        createdAt: p.created_at,
                        isReceived: p.to === address,
                    }); });
                    return [2 /*return*/, {
                            payments: payments,
                            cursor: page.records.length > 0
                                ? page.records[page.records.length - 1].paging_token
                                : cursor || '',
                        }];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, { payments: [], cursor: cursor || '' }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function getRecentTransactions(address_1) {
    return __awaiter(this, arguments, void 0, function (address, limit) {
        var payments, _a;
        if (limit === void 0) { limit = 20; }
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _b.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, getStellarPayments(address, limit)];
                case 1:
                    payments = (_b.sent()).payments;
                    return [2 /*return*/, payments.map(function (p) { return ({
                            id: p.id,
                            type: p.isReceived ? 'received' : 'sent',
                            amount: p.amount,
                            asset: p.assetCode || 'XLM',
                            from: p.from,
                            to: p.to,
                            createdAt: p.createdAt,
                            txHash: p.transactionHash,
                            memo: p.memo,
                        }); })];
                case 2:
                    _a = _b.sent();
                    return [2 /*return*/, []];
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Wallet restoration
// ---------------------------------------------------------------------------
function restoreWallet(secretKey) {
    return __awaiter(this, void 0, void 0, function () {
        var keypair, publicKey, balance, isFunded, _a, wallet;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    try {
                        keypair = stellar_sdk_1.Keypair.fromSecret(secretKey);
                    }
                    catch (_c) {
                        throw new Error('Invalid secret key format. Please check and try again.');
                    }
                    publicKey = keypair.publicKey();
                    return [4 /*yield*/, getBalance(publicKey)];
                case 1:
                    balance = _b.sent();
                    isFunded = false;
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 4, , 5]);
                    return [4 /*yield*/, server.loadAccount(publicKey)];
                case 3:
                    _b.sent();
                    isFunded = true;
                    return [3 /*break*/, 5];
                case 4:
                    _a = _b.sent();
                    isFunded = false;
                    return [3 /*break*/, 5];
                case 5:
                    wallet = {
                        publicKey: publicKey,
                        secretKey: secretKey,
                        balanceUsdc: balance.usdc,
                        balanceXlm: balance.xlm,
                        isFunded: isFunded,
                    };
                    return [2 /*return*/, wallet];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function isValidPublicKey(address) {
    try {
        stellar_sdk_1.Keypair.fromPublicKey(address);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function generateKeypair() {
    var kp = stellar_sdk_1.Keypair.random();
    return { publicKey: kp.publicKey(), secretKey: kp.secret() };
}
// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------
function extractStellarError(err) {
    var _a, _b;
    if ((_a = err === null || err === void 0 ? void 0 : err.response) === null || _a === void 0 ? void 0 : _a.data) {
        var data = err.response.data;
        var resultCodes = (_b = data.extras) === null || _b === void 0 ? void 0 : _b.result_codes;
        if (resultCodes) {
            var txCode = resultCodes.transaction;
            var opCodes = resultCodes.operations;
            if (txCode) {
                var msg = transactionResultCodeMessage(txCode);
                if (opCodes === null || opCodes === void 0 ? void 0 : opCodes.length) {
                    var opMessages = opCodes.map(function (c) { return operationResultCodeMessage(c); });
                    msg += " (operations: ".concat(opMessages.join(', '), ")");
                }
                return msg;
            }
        }
        return data.detail || data.title || "Horizon error ".concat(err.response.status);
    }
    if ((err === null || err === void 0 ? void 0 : err.name) === 'AbortError') {
        return 'Request timed out. The Stellar network may be congested.';
    }
    if (err === null || err === void 0 ? void 0 : err.message) {
        var msg = err.message;
        if (msg.includes('tx_bad_seq'))
            return 'Transaction sequence error. Please try again.';
        if (msg.includes('tx_too_late'))
            return 'Transaction expired. Please try again.';
        if (msg.includes('tx_no_source_account'))
            return 'Source account does not exist on the network.';
        return msg;
    }
    return 'Unknown Stellar error';
}
function isTerminalError(err) {
    var msg = extractStellarError(err).toLowerCase();
    var terminal = [
        'insufficient balance',
        'op_underfunded',
        'op_no_trust',
        'op_src_not_authorized',
        'op_not_authorized',
        'op_line_full',
        'invalid address',
        'tx_bad_seq',
        'tx_too_late',
        'tx_no_source_account',
        'tx_insufficient_fee',
        'invalid secret key',
    ];
    return terminal.some(function (t) { return msg.includes(t); });
}
function transactionResultCodeMessage(code) {
    var map = {
        tx_failed: 'Transaction failed',
        tx_too_early: 'Transaction too early',
        tx_too_late: 'Transaction expired',
        tx_missing_operation: 'No operations',
        tx_bad_seq: 'Bad sequence number',
        tx_bad_auth: 'Invalid authorization',
        tx_insufficient_balance: 'Insufficient balance for fees',
        tx_no_source_account: 'Source account does not exist',
        tx_insufficient_fee: 'Fee too low',
        tx_bad_auth_extra: 'Unused signers present',
        tx_fee_bump_inner_failed: 'Inner transaction failed',
    };
    return map[code] || code;
}
function operationResultCodeMessage(code) {
    var map = {
        op_inner: 'Inner operation failed',
        op_bad_auth: 'Bad authorization',
        op_no_source: 'Source account does not exist',
        op_not_authorized: 'Not authorized',
        op_underfunded: 'Insufficient funds',
        op_no_trust: 'No trustline',
        op_src_not_authorized: 'Source not authorized',
        op_line_full: 'Trustline limit reached',
        op_low_reserve: 'Insufficient XLM reserve',
        op_malformed: 'Malformed operation',
        payment_no_destination: 'Destination does not exist',
        payment_no_trust: 'No destination trustline',
        payment_not_authorized: 'Destination not authorized',
        payment_line_full: 'Destination trustline limit reached',
        payment_src_no_trust: 'Source has no trustline',
    };
    return map[code] || code;
}
