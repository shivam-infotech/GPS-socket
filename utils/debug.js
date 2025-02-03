module.exports.Debug = {
    isDebug: true,
    setDebug: function(isDebug){this.isDebug = isDebug; return this;},
    log: function(...message){
        if (this.isDebug) console.log(new Date(Date.now()).toUTCString() ,...message);
        return this;
    }
}