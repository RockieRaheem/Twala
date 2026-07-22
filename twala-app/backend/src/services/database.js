"use strict";
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
exports.getWallet = getWallet;
exports.updateWalletBalance = updateWalletBalance;
exports.saveWallet = saveWallet;
exports.getGoals = getGoals;
exports.getGoal = getGoal;
exports.createGoal = createGoal;
exports.deleteGoal = deleteGoal;
exports.updateGoal = updateGoal;
exports.contributeToGoal = contributeToGoal;
exports.getTransactions = getTransactions;
exports.getTransactionByKotaniRef = getTransactionByKotaniRef;
exports.getTransaction = getTransaction;
exports.createTransaction = createTransaction;
exports.updateTransaction = updateTransaction;
exports.getTransactionStats = getTransactionStats;
exports.getPendingTransactions = getPendingTransactions;
exports.countPendingTransactions = countPendingTransactions;
exports.getChatSessions = getChatSessions;
exports.getChatSession = getChatSession;
exports.createChatSession = createChatSession;
exports.deleteChatSession = deleteChatSession;
exports.updateChatSessionTitle = updateChatSessionTitle;
exports.touchChatSession = touchChatSession;
exports.getChatMessages = getChatMessages;
exports.addChatMessage = addChatMessage;
exports.clearChatMessages = clearChatMessages;
exports.getLatestRate = getLatestRate;
exports.saveRate = saveRate;
exports.getProfileByPhone = getProfileByPhone;
exports.getProfile = getProfile;
exports.createProfile = createProfile;
var supabase_js_1 = require("@supabase/supabase-js");
var supabaseUrl = process.env.SUPABASE_URL || '';
var supabaseKey = process.env.SUPABASE_ANON_KEY || '';
var _db = null;
function db() {
    if (!_db) {
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
        }
        _db = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            auth: { persistSession: false },
        });
        console.log('  ✅ Supabase connected');
    }
    return _db;
}
function checkError(error, context) {
    if (error) {
        throw new Error("DB ".concat(context, ": ").concat(error.message));
    }
}
// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------
function getWallet() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('wallets')
                        .select('*')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getWallet');
                    if (!data)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            publicKey: data.public_key,
                            secretKey: data.secret_key,
                            balanceUsdc: Number(data.balance_usdc || 0),
                            balanceXlm: Number(data.balance_xlm || 0),
                            isFunded: data.is_funded,
                        }];
            }
        });
    });
}
function updateWalletBalance(publicKey, balanceUsdc, balanceXlm) {
    return __awaiter(this, void 0, void 0, function () {
        var error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db()
                        .from('wallets')
                        .update({ balance_usdc: balanceUsdc.toFixed(7), balance_xlm: balanceXlm.toFixed(7), updated_at: new Date().toISOString() })
                        .eq('public_key', publicKey)];
                case 1:
                    error = (_a.sent()).error;
                    checkError(error, 'updateWalletBalance');
                    return [2 /*return*/];
            }
        });
    });
}
function saveWallet(wallet) {
    return __awaiter(this, void 0, void 0, function () {
        var delErr, insErr;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db().from('wallets').delete().neq('id', '00000000-0000-0000-0000-000000000000')];
                case 1:
                    delErr = (_a.sent()).error;
                    checkError(delErr, 'saveWallet (delete)');
                    return [4 /*yield*/, db().from('wallets').insert({
                            public_key: wallet.publicKey,
                            secret_key: wallet.secretKey,
                            is_funded: wallet.isFunded,
                            balance_usdc: wallet.balanceUsdc.toFixed(7),
                            balance_xlm: wallet.balanceXlm.toFixed(7),
                        })];
                case 2:
                    insErr = (_a.sent()).error;
                    checkError(insErr, 'saveWallet (insert)');
                    return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
function getGoals() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('goals')
                        .select('*')
                        .order('created_at', { ascending: false })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'getGoals');
                    return [2 /*return*/, (data || []).map(goalRow)];
            }
        });
    });
}
function getGoal(id) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('goals')
                        .select('*')
                        .eq('id', id)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getGoal');
                    return [2 /*return*/, data ? goalRow(data) : null];
            }
        });
    });
}
function createGoal(input) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('goals')
                        .insert({
                        title: input.title,
                        description: input.description || '',
                        target_amount_ugx: input.targetAmountUgx,
                        target_date: input.targetDate || null,
                        category: input.category || 'other',
                        milestones: input.milestones || [],
                    })
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'createGoal');
                    if (!data)
                        throw new Error('Failed to create goal');
                    return [2 /*return*/, goalRow(data)];
            }
        });
    });
}
function deleteGoal(id) {
    return __awaiter(this, void 0, void 0, function () {
        var error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db().from('goals').delete().eq('id', id)];
                case 1:
                    error = (_a.sent()).error;
                    checkError(error, 'deleteGoal');
                    return [2 /*return*/];
            }
        });
    });
}
function updateGoal(id, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var dbUpdates, _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dbUpdates = { updated_at: new Date().toISOString() };
                    if (updates.savedAmountUgx !== undefined)
                        dbUpdates.saved_amount_ugx = updates.savedAmountUgx;
                    if (updates.status !== undefined)
                        dbUpdates.status = updates.status;
                    if (updates.milestones !== undefined)
                        dbUpdates.milestones = updates.milestones;
                    return [4 /*yield*/, db()
                            .from('goals')
                            .update(dbUpdates)
                            .eq('id', id)
                            .select()
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'updateGoal');
                    return [2 /*return*/, data ? goalRow(data) : null];
            }
        });
    });
}
function contributeToGoal(id, amountUgx) {
    return __awaiter(this, void 0, void 0, function () {
        var goal, newSaved, milestones, status;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getGoal(id)];
                case 1:
                    goal = _a.sent();
                    if (!goal)
                        return [2 /*return*/, null];
                    newSaved = goal.savedAmountUgx + amountUgx;
                    milestones = goal.milestones.map(function (m) {
                        if (!m.completed && newSaved >= (m.targetAmountUgx || 0)) {
                            return __assign(__assign({}, m), { completed: true, completedAt: new Date().toISOString() });
                        }
                        return m;
                    });
                    status = newSaved >= goal.targetAmountUgx ? 'completed' : goal.status;
                    return [2 /*return*/, updateGoal(id, {
                            savedAmountUgx: newSaved,
                            milestones: milestones,
                            status: status,
                        })];
            }
        });
    });
}
function goalRow(data) {
    return {
        id: data.id,
        title: data.title,
        description: data.description || '',
        targetAmountUgx: Number(data.target_amount_ugx),
        savedAmountUgx: Number(data.saved_amount_ugx),
        targetDate: data.target_date || '2026-12-31',
        category: data.category || 'other',
        status: data.status || 'active',
        createdAt: data.created_at,
        milestones: data.milestones || [],
    };
}
// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------
function getTransactions(options) {
    return __awaiter(this, void 0, void 0, function () {
        var type, page, limit, offset, query, _a, data, error, count;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    type = options === null || options === void 0 ? void 0 : options.type;
                    page = (options === null || options === void 0 ? void 0 : options.page) || 1;
                    limit = Math.min((options === null || options === void 0 ? void 0 : options.limit) || 50, 100);
                    offset = (page - 1) * limit;
                    query = db()
                        .from('transactions')
                        .select('*', { count: 'exact' });
                    if (type && type !== 'all') {
                        query = query.eq('type', type);
                    }
                    if (options === null || options === void 0 ? void 0 : options.goalId) {
                        query = query.eq('goal_id', options.goalId);
                    }
                    return [4 /*yield*/, query
                            .order('created_at', { ascending: false })
                            .range(offset, offset + limit - 1)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error, count = _a.count;
                    checkError(error, 'getTransactions');
                    return [2 /*return*/, {
                            transactions: (data || []).map(txRow),
                            total: count || 0,
                        }];
            }
        });
    });
}
function getTransactionByKotaniRef(referenceId) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('transactions')
                        .select('*')
                        .eq('kotani_reference_id', referenceId)
                        .limit(1)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getTransactionByKotaniRef');
                    return [2 /*return*/, data ? txRow(data) : null];
            }
        });
    });
}
function getTransaction(id) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('transactions')
                        .select('*')
                        .eq('id', id)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getTransaction');
                    return [2 /*return*/, data ? txRow(data) : null];
            }
        });
    });
}
function createTransaction(input) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('transactions')
                        .insert({
                        type: input.type,
                        amount_usdc: input.amountUsdc,
                        amount_ugx: input.amountUgx || null,
                        rate: input.rate || null,
                        recipient_name: input.recipientName || '',
                        recipient_phone: input.recipientPhone || '',
                        recipient_network: input.recipientNetwork || '',
                        status: input.status || 'pending',
                        purpose: input.purpose || '',
                        stellar_tx_hash: input.stellarTxHash || '',
                        stellar_operation_id: input.stellarOperationId || '',
                        kotani_reference_id: input.kotaniReferenceId || '',
                        kotani_status: input.kotaniStatus || '',
                        goal_id: input.goalId || null,
                    })
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'createTransaction');
                    if (!data)
                        throw new Error('Failed to create transaction');
                    return [2 /*return*/, txRow(data)];
            }
        });
    });
}
function updateTransaction(id, updates) {
    return __awaiter(this, void 0, void 0, function () {
        var dbUpdates, _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    dbUpdates = { updated_at: new Date().toISOString() };
                    if (updates.status !== undefined)
                        dbUpdates.status = updates.status;
                    if (updates.kotaniStatus !== undefined)
                        dbUpdates.kotani_status = updates.kotaniStatus;
                    if (updates.stellarTxHash !== undefined)
                        dbUpdates.stellar_tx_hash = updates.stellarTxHash;
                    return [4 /*yield*/, db()
                            .from('transactions')
                            .update(dbUpdates)
                            .eq('id', id)
                            .select()
                            .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'updateTransaction');
                    return [2 /*return*/, data ? txRow(data) : null];
            }
        });
    });
}
function getTransactionStats() {
    return __awaiter(this, void 0, void 0, function () {
        var now, startOfMonth, _a, sentData, sentErr, _b, receivedData, recErr, _c, count, countErr;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    now = new Date();
                    startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
                    return [4 /*yield*/, db()
                            .from('transactions')
                            .select('amount_usdc')
                            .eq('type', 'sent')
                            .eq('status', 'completed')];
                case 1:
                    _a = _d.sent(), sentData = _a.data, sentErr = _a.error;
                    checkError(sentErr, 'getTransactionStats (sent)');
                    return [4 /*yield*/, db()
                            .from('transactions')
                            .select('amount_usdc')
                            .eq('type', 'received')
                            .eq('status', 'completed')];
                case 2:
                    _b = _d.sent(), receivedData = _b.data, recErr = _b.error;
                    checkError(recErr, 'getTransactionStats (received)');
                    return [4 /*yield*/, db()
                            .from('transactions')
                            .select('id', { count: 'exact', head: true })
                            .gte('created_at', startOfMonth)];
                case 3:
                    _c = _d.sent(), count = _c.count, countErr = _c.error;
                    checkError(countErr, 'getTransactionStats (month)');
                    return [2 /*return*/, {
                            totalSent: (sentData || []).reduce(function (s, r) { return s + Number(r.amount_usdc); }, 0),
                            totalReceived: (receivedData || []).reduce(function (s, r) { return s + Number(r.amount_usdc); }, 0),
                            thisMonth: count || 0,
                        }];
            }
        });
    });
}
function getPendingTransactions() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('transactions')
                        .select('*')
                        .eq('status', 'pending')
                        .order('created_at', { ascending: true })
                        .limit(20)];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'getPendingTransactions');
                    return [2 /*return*/, (data || []).map(txRow)];
            }
        });
    });
}
function countPendingTransactions() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, count, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('transactions')
                        .select('id', { count: 'exact', head: true })
                        .eq('status', 'pending')];
                case 1:
                    _a = _b.sent(), count = _a.count, error = _a.error;
                    checkError(error, 'countPendingTransactions');
                    return [2 /*return*/, count || 0];
            }
        });
    });
}
function txRow(data) {
    return {
        id: data.id,
        type: data.type,
        amountUsdc: Number(data.amount_usdc),
        amountUgx: data.amount_ugx ? Number(data.amount_ugx) : undefined,
        rate: data.rate ? Number(data.rate) : undefined,
        recipientName: data.recipient_name || '',
        recipientPhone: data.recipient_phone || '',
        recipientNetwork: data.recipient_network || undefined,
        status: data.status,
        purpose: data.purpose || '',
        stellarTxHash: data.stellar_tx_hash || undefined,
        stellarOperationId: data.stellar_operation_id || undefined,
        kotaniReferenceId: data.kotani_reference_id || undefined,
        kotaniStatus: data.kotani_status || undefined,
        goalId: data.goal_id || undefined,
        createdAt: data.created_at,
    };
}
// ---------------------------------------------------------------------------
// Chat Sessions
// ---------------------------------------------------------------------------
function getChatSessions() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('chat_sessions')
                        .select('*')
                        .order('last_message_at', { ascending: false })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'getChatSessions');
                    return [2 /*return*/, (data || []).map(function (r) { return ({
                            id: r.id,
                            title: r.title,
                            createdAt: r.created_at,
                            lastMessageAt: r.last_message_at || r.created_at,
                        }); })];
            }
        });
    });
}
function getChatSession(id) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('chat_sessions')
                        .select('*')
                        .eq('id', id)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getChatSession');
                    if (!data)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            id: data.id,
                            title: data.title,
                            createdAt: data.created_at,
                            lastMessageAt: data.last_message_at || data.created_at,
                        }];
            }
        });
    });
}
function createChatSession(title) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('chat_sessions')
                        .insert({ title: title, last_message_at: new Date().toISOString() })
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'createChatSession');
                    if (!data)
                        throw new Error('Failed to create session');
                    return [2 /*return*/, {
                            id: data.id,
                            title: data.title,
                            createdAt: data.created_at,
                            lastMessageAt: data.last_message_at,
                        }];
            }
        });
    });
}
function deleteChatSession(id) {
    return __awaiter(this, void 0, void 0, function () {
        var msgErr, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db()
                        .from('chat_messages')
                        .delete()
                        .eq('session_id', id)];
                case 1:
                    msgErr = (_a.sent()).error;
                    checkError(msgErr, 'deleteChatSession (messages)');
                    return [4 /*yield*/, db()
                            .from('chat_sessions')
                            .delete()
                            .eq('id', id)];
                case 2:
                    error = (_a.sent()).error;
                    checkError(error, 'deleteChatSession');
                    return [2 /*return*/];
            }
        });
    });
}
function updateChatSessionTitle(id, title) {
    return __awaiter(this, void 0, void 0, function () {
        var error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db()
                        .from('chat_sessions')
                        .update({ title: title, last_message_at: new Date().toISOString() })
                        .eq('id', id)];
                case 1:
                    error = (_a.sent()).error;
                    checkError(error, 'updateChatSessionTitle');
                    return [2 /*return*/];
            }
        });
    });
}
function touchChatSession(id) {
    return __awaiter(this, void 0, void 0, function () {
        var error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db()
                        .from('chat_sessions')
                        .update({ last_message_at: new Date().toISOString() })
                        .eq('id', id)];
                case 1:
                    error = (_a.sent()).error;
                    checkError(error, 'touchChatSession');
                    return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Chat Messages
// ---------------------------------------------------------------------------
function getChatMessages(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var query, _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    query = db()
                        .from('chat_messages')
                        .select('*');
                    if (sessionId) {
                        query = query.eq('session_id', sessionId);
                    }
                    return [4 /*yield*/, query
                            .order('created_at', { ascending: true })];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'getChatMessages');
                    return [2 /*return*/, (data || []).map(function (r) { return ({
                            id: r.id,
                            role: r.role,
                            content: r.content,
                            timestamp: r.created_at,
                            sessionId: r.session_id || undefined,
                        }); })];
            }
        });
    });
}
function addChatMessage(msg) {
    return __awaiter(this, void 0, void 0, function () {
        var insert, error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    insert = { role: msg.role, content: msg.content };
                    if (msg.sessionId)
                        insert.session_id = msg.sessionId;
                    return [4 /*yield*/, db().from('chat_messages').insert(insert)];
                case 1:
                    error = (_a.sent()).error;
                    checkError(error, 'addChatMessage');
                    return [2 /*return*/];
            }
        });
    });
}
function clearChatMessages(sessionId) {
    return __awaiter(this, void 0, void 0, function () {
        var query, error, seedErr;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = db().from('chat_messages').delete();
                    if (sessionId) {
                        query = query.eq('session_id', sessionId);
                    }
                    else {
                        query = query.neq('id', '00000000-0000-0000-0000-000000000000');
                    }
                    return [4 /*yield*/, query];
                case 1:
                    error = (_a.sent()).error;
                    checkError(error, 'clearChatMessages');
                    if (!!sessionId) return [3 /*break*/, 3];
                    return [4 /*yield*/, db().from('chat_messages').insert({
                            role: 'assistant',
                            content: "Hi! I'm **Kanzu**, your AI financial companion. I can help you send money to Uganda, track your savings goals, and more. What would you like to do today?",
                        })];
                case 2:
                    seedErr = (_a.sent()).error;
                    checkError(seedErr, 'clearChatMessages (seed)');
                    _a.label = 3;
                case 3: return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// Exchange Rates
// ---------------------------------------------------------------------------
function getLatestRate() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('exchange_rates')
                        .select('*')
                        .order('fetched_at', { ascending: false })
                        .limit(1)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getLatestRate');
                    if (!data)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            usdcToUgx: Number(data.usdc_to_ugx),
                            usdToUgx: Number(data.usd_to_ugx),
                            lastUpdated: data.fetched_at,
                            change24h: Number(data.change_24h),
                        }];
            }
        });
    });
}
function saveRate(rate) {
    return __awaiter(this, void 0, void 0, function () {
        var error;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, db().from('exchange_rates').insert({
                        usdc_to_ugx: rate.usdcToUgx,
                        usd_to_ugx: rate.usdToUgx,
                        change_24h: rate.change24h || 0,
                        fetched_at: rate.lastUpdated || new Date().toISOString(),
                    })];
                case 1:
                    error = (_a.sent()).error;
                    checkError(error, 'saveRate');
                    return [2 /*return*/];
            }
        });
    });
}
// ---------------------------------------------------------------------------
// User Profiles
// ---------------------------------------------------------------------------
function getProfileByPhone(phone) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('profiles')
                        .select('*')
                        .eq('phone', phone)
                        .limit(1)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getProfileByPhone');
                    if (!data)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            id: data.id,
                            name: data.name,
                            phone: data.phone,
                            pinHash: data.pin_hash,
                            createdAt: data.created_at,
                        }];
            }
        });
    });
}
function getProfile(id) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('profiles')
                        .select('*')
                        .eq('id', id)
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error && error.code === 'PGRST116')
                        return [2 /*return*/, null];
                    checkError(error, 'getProfile');
                    if (!data)
                        return [2 /*return*/, null];
                    return [2 /*return*/, {
                            id: data.id,
                            name: data.name,
                            phone: data.phone,
                            pinHash: data.pin_hash,
                            createdAt: data.created_at,
                        }];
            }
        });
    });
}
function createProfile(input) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, db()
                        .from('profiles')
                        .insert({
                        name: input.name,
                        phone: input.phone,
                        pin_hash: input.pinHash,
                    })
                        .select()
                        .single()];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    checkError(error, 'createProfile');
                    if (!data)
                        throw new Error('Failed to create profile');
                    return [2 /*return*/, {
                            id: data.id,
                            name: data.name,
                            phone: data.phone,
                            pinHash: data.pin_hash,
                            createdAt: data.created_at,
                        }];
            }
        });
    });
}
