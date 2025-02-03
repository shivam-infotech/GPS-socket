const router = require('express').Router();
const TrackingController = require('../controllers/tracking.controller');
const StatsController = require('../controllers/stats.controller');
const EventController = require('../controllers/event.controller');
const { models } = require('../database/database');

// Tracking APIs
router.get('/devices/resync', TrackingController.resyncDevices); // Resync devices to the socket server
router.get('/devices/locations/available-devices', TrackingController.availableDevicesForlocation )
router.get('/device/:deviceId/location/last', TrackingController.deviceLastLocation ); // Get the last location of the device.
router.get('/device/:deviceId/locations/available-dates', TrackingController.availableDatesForDeviceLocations );

// Roporting Routes
router.get('/device/:deviceId/locations/:date', TrackingController.deviceLocationsOfADay );
router.get('/device/:deviceId/locations/:startDate/:endDate', TrackingController.deviceLocationsBetweenDates );

// Event Reporting Routes
router.get('/device/:deviceId/events/:startDate/:endDate', EventController.DeviceEvents );
router.get('/device/:deviceId/ignition/:startDate/:endDate', EventController.IgnitionLocations );
router.get('/device/:deviceId/stoppages/:startDate/:endDate', EventController.StoppedLocations );
router.get('/device/:deviceId/idles/:startDate/:endDate', EventController.IdlesLocations );
router.get('/device/:deviceId/trip/:startDate/:endDate', StatsController.getTripsSummary )
router.get('/device/:deviceId/travel/summary/:startDate/:endDate', StatsController.getTravelSummary);

router.get('/event-types', async (req, res) => {
    const eventTypes = models.EventType.findAll();
    res.json(eventTypes);
});

module.exports.apis = router;