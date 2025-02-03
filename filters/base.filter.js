class BaseFilter {
    data = {}; // store the data in an object
    history = {}; // store the history of the data in an object
    __instance = null; // singleton instance of the filter
    constructor(data, history) {this.setData(data).setHistory(history);}
    getData(){ return this.data; }
    getHistory(){ return this.history; }
    setHistory(history) { this.history = history; return this; }
    setData(data) { this.data = data; return this; }
}

module.exports = BaseFilter;