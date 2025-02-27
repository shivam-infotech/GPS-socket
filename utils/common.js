const fs = require('fs');
const PDFDocument = require('pdfkit');
const { stringify } = require('csv-stringify');

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
        diffInMilisecond(time1, time2) {
            time1 = new Date(time1);
            time2 = new Date(time2);
            return Math.floor((time2.getTime() - time1.getTime()));
        },        
        speedInSecond(speedInKmph) {
            return parseFloat((speedInKmph * 1000 / 3600).toFixed(6));
        },
        averageSpeed(...speeds) {
            return speeds.reduce((carry, speed) => carry + speed, 0) / speeds.length;
        },
        /**
         * Converts array data to CSV format and saves to file
         * @param {Array} data - Array of objects to convert
         * @param {string} filePath - Path where to save the CSV file
         * @param {Array} headers - Optional array of column headers
         * @returns {Promise<string>} - Path to saved file
         */
        async convertToCSV(data, filePath, headers = null) {
            return new Promise((resolve, reject) => {
                // If headers not provided, use object keys from first item
                const columns = headers || Object.keys(data[0] || {});
                
                stringify(data, {
                    header: true,
                    columns: columns
                }, (err, output) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    fs.writeFile(filePath, output, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(filePath);
                    });
                });
            });
        },

        /**
         * Converts array data to PDF format and saves to file
         * @param {Array} data - Array of objects to convert
         * @param {string} filePath - Path where to save the PDF file
         * @param {Object} options - PDF generation options
         * @returns {Promise<string>} - Path to saved file
         */
        async convertToPDF(data, filePath, options = {}) {
            return new Promise((resolve, reject) => {
                const doc = new PDFDocument({
                    margin: 30,
                    size: options.size || 'A4'
                });

                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);

                // Add title if provided
                if (options.title) {
                    doc.fontSize(16).text(options.title, { align: 'center' });
                    doc.moveDown();
                }

                // Set up table headers
                const headers = options.headers || Object.keys(data[0] || {});
                const colWidth = (doc.page.width - 60) / headers.length;

                // Draw headers
                doc.fontSize(12);
                headers.forEach((header, i) => {
                    doc.text(header, 30 + (i * colWidth), doc.y, {
                        width: colWidth,
                        align: 'left'
                    });
                });
                doc.moveDown();

                // Draw data rows
                doc.fontSize(10);
                data.forEach(row => {
                    const y = doc.y;
                    headers.forEach((header, i) => {
                        const value = row[header] || '';
                        doc.text(value.toString(), 30 + (i * colWidth), y, {
                            width: colWidth,
                            align: 'left'
                        });
                    });
                    doc.moveDown();

                    // Add new page if content exceeds page height
                    if (doc.y > doc.page.height - 50) {
                        doc.addPage();
                    }
                });

                doc.end();

                stream.on('finish', () => {
                    resolve(filePath);
                });

                stream.on('error', reject);
            });
        }
    }
}