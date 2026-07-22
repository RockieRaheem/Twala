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
var ai = require("../services/ai.js");
var db = require("../services/database.js");
var router = (0, express_1.Router)();
// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------
router.get('/sessions', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessions;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db.getChatSessions()];
            case 1:
                sessions = _a.sent();
                res.json({ success: true, data: sessions });
                return [2 /*return*/];
        }
    });
}); });
router.post('/sessions', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var title, session;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                title = req.body.title;
                return [4 /*yield*/, db.createChatSession(title || 'New Chat')];
            case 1:
                session = _a.sent();
                // Seed welcome message
                return [4 /*yield*/, db.addChatMessage({
                        role: 'assistant',
                        content: "Hi! I'm **Kanzu**, your AI financial companion. I can help you send money to Uganda, track your savings goals, and more. What would you like to do today?",
                        sessionId: session.id,
                    })];
            case 2:
                // Seed welcome message
                _a.sent();
                res.json({ success: true, data: session });
                return [2 /*return*/];
        }
    });
}); });
router.get('/sessions/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var session, messages;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db.getChatSession(req.params.id)];
            case 1:
                session = _a.sent();
                if (!session)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Session not found' })];
                return [4 /*yield*/, db.getChatMessages(req.params.id)];
            case 2:
                messages = _a.sent();
                res.json({ success: true, data: { session: session, messages: messages } });
                return [2 /*return*/];
        }
    });
}); });
router.delete('/sessions/:id', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var session;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db.getChatSession(req.params.id)];
            case 1:
                session = _a.sent();
                if (!session)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Session not found' })];
                return [4 /*yield*/, db.deleteChatSession(req.params.id)];
            case 2:
                _a.sent();
                res.json({ success: true, message: 'Chat deleted' });
                return [2 /*return*/];
        }
    });
}); });
// ---------------------------------------------------------------------------
// Send message to a session (the core AI flow)
// ---------------------------------------------------------------------------
router.post('/sessions/:id/send', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var message, sessionId, session, msgs, userMsgCount, autoTitle, _a, messages, navigate, err_1, msg;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                message = req.body.message;
                sessionId = req.params.id;
                if (!message || !message.trim()) {
                    return [2 /*return*/, res.status(400).json({ success: false, message: 'Message required' })];
                }
                return [4 /*yield*/, db.getChatSession(sessionId)];
            case 1:
                session = _b.sent();
                if (!session)
                    return [2 /*return*/, res.status(404).json({ success: false, message: 'Session not found' })];
                // Save user message
                return [4 /*yield*/, db.addChatMessage({ role: 'user', content: message.trim(), sessionId: sessionId })];
            case 2:
                // Save user message
                _b.sent();
                return [4 /*yield*/, db.getChatMessages(sessionId)];
            case 3:
                msgs = _b.sent();
                userMsgCount = msgs.filter(function (m) { return m.role === 'user'; }).length;
                if (!(userMsgCount === 1 && session.title === 'New Chat')) return [3 /*break*/, 5];
                autoTitle = message.trim().substring(0, 60) + (message.trim().length > 60 ? '...' : '');
                return [4 /*yield*/, db.updateChatSessionTitle(sessionId, autoTitle)];
            case 4:
                _b.sent();
                return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, db.touchChatSession(sessionId)];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7:
                _b.trys.push([7, 9, , 10]);
                return [4 /*yield*/, ai.chat(message.trim(), sessionId)];
            case 8:
                _a = _b.sent(), messages = _a.messages, navigate = _a.navigate;
                res.json({ success: true, data: { messages: messages, navigate: navigate } });
                return [3 /*break*/, 10];
            case 9:
                err_1 = _b.sent();
                msg = err_1 instanceof Error ? err_1.message : String(err_1);
                res.status(500).json({ success: false, message: msg });
                return [3 /*break*/, 10];
            case 10: return [2 /*return*/];
        }
    });
}); });
// ---------------------------------------------------------------------------
// Existing: full history, suggestions, delete-all (backward compat)
// ---------------------------------------------------------------------------
router.get('/', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var history;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db.getChatMessages()];
            case 1:
                history = _a.sent();
                res.json({ success: true, data: history });
                return [2 /*return*/];
        }
    });
}); });
router.get('/suggestions', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var suggestions, wallet, goals;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                suggestions = [];
                return [4 /*yield*/, db.getWallet()];
            case 1:
                wallet = _a.sent();
                return [4 /*yield*/, db.getGoals()];
            case 2:
                goals = _a.sent();
                if (wallet && wallet.balanceUsdc > 0) {
                    suggestions.push('What is my balance?');
                    suggestions.push('Send money to Uganda');
                }
                else {
                    suggestions.push('Create a wallet');
                }
                if (goals.length > 0) {
                    suggestions.push("How is \"".concat(goals[0].title.substring(0, 20), "\" doing?"));
                    suggestions.push('Add to savings goal');
                }
                else {
                    suggestions.push('Help me set a savings goal');
                }
                suggestions.push('What is the exchange rate?');
                suggestions.push('Show recent transactions');
                suggestions.push('What can you do?');
                res.json({ success: true, data: suggestions });
                return [2 /*return*/];
        }
    });
}); });
router.delete('/', function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var history;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, db.clearChatMessages()];
            case 1:
                _a.sent();
                return [4 /*yield*/, db.getChatMessages()];
            case 2:
                history = _a.sent();
                res.json({ success: true, data: history });
                return [2 /*return*/];
        }
    });
}); });
exports.default = router;
