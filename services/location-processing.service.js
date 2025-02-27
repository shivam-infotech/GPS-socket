class LocationFilter {
    constructor() {
        this.EARTH_RADIUS = 6371; // Earth's radius in kilometers
        this.MIN_DISTANCE = 0.01; // 10 meters minimum movement threshold
        this.MAX_SPEED = 150; // Maximum realistic speed in km/h
        this.HISTORY_SIZE = 5; // Number of points to keep in history
        this.locationHistory = new Map(); // Store location history for each device
    }

    /**
     * Calculate distance between two points using Haversine formula
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return this.EARTH_RADIUS * c;
    }

    /**
     * Calculate speed between two points
     */
    calculateSpeed(point1, point2) {
        const distance = this.calculateDistance(
            point1.latitude, 
            point1.longitude, 
            point2.latitude, 
            point2.longitude
        );
        const timeHours = Math.abs(new Date(point2.date) - new Date(point1.date)) / (1000 * 60 * 60);
        return distance / timeHours; // km/h
    }

    /**
     * Filter out GPS jitter and smooth location data
     */
    filterLocation(deviceId, pingData) {
        if (!this.locationHistory.has(deviceId)) {
            this.locationHistory.set(deviceId, []);
        }

        const history = this.locationHistory.get(deviceId);
        const lastPoint = history[history.length - 1];

        // If this is the first point or GPS status is 0, return as is
        if (!lastPoint || pingData.gpsStatus === 0) {
            this.updateHistory(deviceId, pingData);
            return pingData;
        }

        // Calculate distance and speed from last point
        const distance = this.calculateDistance(
            lastPoint.latitude,
            lastPoint.longitude,
            pingData.latitude,
            pingData.longitude
        );
        const speed = this.calculateSpeed(lastPoint, pingData);

        // Check if movement is realistic
        const isValidMovement = this.isValidMovement(distance, speed, pingData);

        if (!isValidMovement) {
            // If movement isn't valid, use last known good position
            pingData.latitude = lastPoint.latitude;
            pingData.longitude = lastPoint.longitude;
            pingData.jitter = true; // Flag for monitoring
        } else {
            // If movement is valid, apply Kalman filter for smoothing
            const smoothedLocation = this.applyKalmanFilter(deviceId, pingData);
            pingData.latitude = smoothedLocation.latitude;
            pingData.longitude = smoothedLocation.longitude;
            pingData.jitter = false;
        }

        this.updateHistory(deviceId, pingData);
        return pingData;
    }

    /**
     * Validate if movement is realistic
     */
    isValidMovement(distance, speed, pingData) {
        // Check if distance is above minimum threshold
        if (distance < this.MIN_DISTANCE && pingData.speed <= this.getStoppedThreshold()) {
            return false;
        }

        // Check if speed is realistic
        if (speed > this.MAX_SPEED) {
            return false;
        }

        // Additional checks based on device status
        if (pingData.deviceStatus === 'stopped' && distance > this.MIN_DISTANCE) {
            return false;
        }

        return true;
    }

    /**
     * Apply Kalman filter for location smoothing
     */
    applyKalmanFilter(deviceId, pingData) {
        const history = this.locationHistory.get(deviceId);
        if (history.length < 2) return pingData;

        // Calculate weighted average based on GPS accuracy and speed
        const weights = history.map(point => {
            const timeDiff = Math.abs(new Date(pingData.date) - new Date(point.date));
            return Math.exp(-timeDiff / (1000 * 60)); // Exponential decay with time
        });

        const sumWeights = weights.reduce((a, b) => a + b, 0);
        const smoothedLat = history.reduce((acc, point, i) => 
            acc + (point.latitude * weights[i]), 0) / sumWeights;
        const smoothedLng = history.reduce((acc, point, i) => 
            acc + (point.longitude * weights[i]), 0) / sumWeights;

        return {
            ...pingData,
            latitude: smoothedLat,
            longitude: smoothedLng
        };
    }

    /**
     * Update location history
     */
    updateHistory(deviceId, pingData) {
        const history = this.locationHistory.get(deviceId);
        history.push(pingData);
        
        // Keep history size limited
        if (history.length > this.HISTORY_SIZE)" {\n            history.shift();\n        }"
        
        this.locationHistory.set(deviceId, history);
    }

    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    }
}

module.exports = new LocationFilter();