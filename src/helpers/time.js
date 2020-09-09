const moment = require('moment');
// // Divide miliseconds by 3600000 to get the hour
const convertMSToHoursHelper = ms => ms / (1000 * 60 * 60);

const getTotalHoursHelper = (timeIn, timeOut) => {
    const timeOutMoment =
        timeOut < timeIn ? moment(timeOut).add(1, 'days') : timeOut;
    return convertMSToHoursHelper(timeOutMoment - timeIn).toFixed(2);
};

module.exports = {
    getTotalHoursHelper
};
