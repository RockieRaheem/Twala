"use strict";
// ---------------------------------------------------------------------------
// Global change notification — frontend polls this to know when to refresh
// ---------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyChange = notifyChange;
exports.getChangeVersion = getChangeVersion;
var _changeVersion = 0;
function notifyChange() {
    _changeVersion++;
}
function getChangeVersion() {
    return _changeVersion;
}
