module.exports = {
  async getDevices(){
      return await fetch(process.env.BACKEND_URL + "/devices", {
          headers: {
              "X-Requested-With": "XMLHttpRequest",
              "Accept": "application/json",
              "Content-Type": "application/json"
          }
      });
  },
}