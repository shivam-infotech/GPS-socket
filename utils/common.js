module.exports = {
    Utils: {
        decryptDeviceData(data) { return data.toString('hex') },
        dexToDegree(dex) { return parseInt(dex, 16) / 1800000; },
        degreeToDex(degree) { return (degree * 1800000).toString(16); },
        checkBit(number, index) {
            return (number & (1 << index)) !== 0;
        },
        /**
         * Returns the distance between two points in meters.
         * 
         * @param {float} lat1 - latitude of first point
         * @param {float} lon1 - longitude of first point
         * @param {float} lat2 - latitude of second point
         * @param {float} lon2 - longitude of second point
         * @returns {float} distance in meters
         */
        getDistance: (lat1, lon1, lat2, lon2) => {
            const r = 6371; // Radius of the earth in km
            const p = Math.PI / 180;

            const a = 0.5 - Math.cos((lat2 - lat1) * p) / 2
                + Math.cos(lat1 * p) * Math.cos(lat2 * p) *
                (1 - Math.cos((lon2 - lon1) * p)) / 2;

            return parseInt(((2 * r * Math.asin(Math.sqrt(a))) * 1000).toFixed(2));
        },
        diffInSeconds(time1, time2) {
            time1 = new Date(time1);
            time2 = new Date(time2);
            return Math.floor((time2.getTime() - time1.getTime()) / 1000);
        },
        speedInSecond(speedInKmph) {
            return parseFloat((speedInKmph * 1000 / 3600).toFixed(6));
        },
        averageSpeed(...speeds) {
            return speeds.reduce((carry, speed) => carry + speed, 0) / speeds.length;
        }
    }
}