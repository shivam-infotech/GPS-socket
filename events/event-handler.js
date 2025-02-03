const { Debug } = require("../utils/debug");

class EventHandler {
    __events = [];
    on(event, callback) {
        if( this.__events[event] === undefined ) this.__events[event] = [callback];
        else this.__events[event].push(callback);
        return this;
    }
    emit(event, ...data) { 
        this.__events[event]?.forEach(callback => callback(...data));
        return this;
    }
    off(event, callback) { this.__events[event] = this.__events[event]?.filter(cb => cb!== callback); return this; }
    clear(event) { this.__events[event] = []; return this; }
}

module.exports.EventHandler = EventHandler;