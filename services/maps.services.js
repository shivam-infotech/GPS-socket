const mapsService = {
    apis: {
        geolocate: "https://www.googleapis.com/geolocation/v1/geolocate",
        address: "https://maps.googleapis.com/maps/api/geocode/json",
    },

    mergeParamsInURL(url, paramsToMerge) {
        let urlObj = new URL(url);
        for (let queryKey in paramsToMerge) {
            urlObj.searchParams.set(queryKey, paramsToMerge[queryKey]);
        }
        return urlObj.toString();
    },

    async getLocationByLbsData(mcc, mnc, lac, cellId) {
        try {
            const response = await fetch(this.mergeParamsInURL(this.apis.geolocate, { key: process.env.GOOGLE_MAPS_API_KEY }), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cellTowers: [
                        {
                            mobileCountryCode: mcc,
                            mobileNetworkCode: mnc,
                            locationAreaCode: lac,
                            cellId: cellId
                        }
                    ]
                })
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();
            if (!data.location) throw new Error("Location data not found.");
            return data.location;
        } catch (error) {
            console.error("Error fetching location by LBS data:", error);
            throw error;
        }
    },

    async getAddressByLatLng(lat, lng, approximate = false) {
        try {
            const response = await fetch(this.mergeParamsInURL(this.apis.address, {
                latlng: `${lat},${lng}`,
                key: process.env.GOOGLE_MAPS_API_KEY,
                ...(approximate ? { location_type: 'approximate' } : {})
            }));

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                throw new Error("No address found for the given coordinates.");
            }
            return data.results[0].formatted_address;
        } catch (error) {
            console.error("Error fetching address by LatLng:", error);
            throw error;
        }
    }
};

module.exports = mapsService;
