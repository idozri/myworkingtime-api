const mongoose = require('mongoose');
const { getTotalHoursHelper } = require('../helpers/time');
const moment = require('moment');
const workdaySchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            require: true
        },
        timeIn: {
            type: Date
        },
        timeOut: {
            type: Date
        },
        totalHours: {
            type: Number,
            default: 0.0
        },
        note: {
            type: String,
            default: ''
        },
        isDayOff: {
            type: Boolean,
            default: false
        },

        owner: {
            type: mongoose.Schema.Types.ObjectId,
            require: true,
            ref: 'Month'
        }
    },
    {
        timestamps: true
    }
);

//Overide toJSON to get the workday with out the unnecenssary properites
workdaySchema.methods.toJSON = function () {
    const workday = this;
    const workdayObject = workday.toObject();

    delete workdayObject.__v;
    delete workdayObject.createdAt;
    delete workdayObject.updatedAt;

    return workdayObject;
};

// Update month total hours
const updateMonthHours = async (action, workday, oldTotalHours) => {
    const month = workday.owner;
    const { isDayOff } = workday;

    switch (action) {
        case 'add':
            if (!isDayOff) {
                month.totalHours += workday.totalHours;
                month.totalWorkdays += 1;
            } else {
                month.totalDaysOff++;
            }
            break;
        case 'update':
            handleUpdateWorkday(workday, month, oldTotalHours);
            break;
        case 'remove':
            if (!isDayOff) {
                month.totalHours -= workday.totalHours;
                month.totalWorkdays -= 1;
            } else {
                month.totalDaysOff--;
            }
        default:
            break;
    }

    await month.save();
};

const handleUpdateWorkday = function (workday, month, oldTotalHours) {
    if (!workday.isModified('isDayOff')) {
        if (oldTotalHours < workday.totalHours) {
            const newMonthTotalHours = workday.totalHours - oldTotalHours;
            month.totalHours += newMonthTotalHours;
        } else {
            const newMonthTotalHours = oldTotalHours - workday.totalHours;
            month.totalHours -= newMonthTotalHours;
        }
    } else {
        if (!workday.isDayOff) {
            month.totalHours += workday.totalHours;
            month.totalWorkdays++;
            month.totalDaysOff--;
        } else {
            month.totalDaysOff++;
            if (oldTotalHours > 0) {
                month.totalHours -= oldTotalHours;
                month.totalWorkdays--;
            }
        }
    }
};

// Remove workdays for the month
workdaySchema.statics.removeWorkdays = async monthId => {
    try {
        await Workday.deleteMany({ owner: monthId });
    } catch (err) {
        return err;
    }
};

workdaySchema.pre('save', async function (next) {
    const workday = this;
    const oldTotalHours = workday.totalHours;
    const { timeIn, timeOut, isDayOff, owner } = workday;
    const date = moment(workday.date).startOf('day');

    if (!workday.isModified() || workday.isModified('date')) {
        // Check if workday is exsit
        const isExist = await Workday.exists({
            date,
            owner
        });

        if (isExist) {
            throw new Error('This workday is already exist!');
        }
    }

    // Check if the hours was inserted
    if ((!timeIn && !isDayOff) || (!timeOut && !isDayOff)) {
        throw new Error('Must provide time in and time out');
    }

    // Check if hours are not equale to each other
    if (!isDayOff && timeIn === timeOut) {
        throw new Error('Time in and out should not be the same');
    }
    // If isDayOff is true, remove hours from day and month
    if (isDayOff === true) {
        workday.timeIn = null;
        workday.timeOut = null;
        workday.totalHours = 0;
    } else {
        // Calculate workday total hours
        workday.totalHours = getTotalHoursHelper(timeIn, timeOut);
    }

    workday.populate('owner').execPopulate(err => {
        if (!err) {
            if (!workday.isModified()) {
                updateMonthHours('add', workday);
            } else {
                // If the hours input was modified update total month hours
                if (
                    workday.isModified('timeIn') ||
                    workday.isModified('timeOut') ||
                    workday.isModified('isDayOff')
                ) {
                    updateMonthHours('update', workday, oldTotalHours);
                }
            }
        } else {
            throw new Error('Oops... Somthing went wrong!');
        }
    });

    next();
});

// Subtract the workday hours from the month total hours
workdaySchema.pre('remove', async function (next) {
    const workday = this;

    workday.populate('owner').execPopulate(err => {
        if (!err) {
            updateMonthHours('remove', workday);
            return workday;
        } else {
            throw new Error('Oops... Somthing went wrong!');
        }
    });

    next();
});

const Workday = mongoose.model('Workday', workdaySchema);

module.exports = Workday;
