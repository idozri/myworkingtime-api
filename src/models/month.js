const mongoose = require('mongoose');
const moment = require('moment');
const Workday = require('./workday');

const monthSchema = new mongoose.Schema(
    {
        monthDate: {
            type: Date,
            required: true
        },
        totalHours: {
            type: Number,
            default: 0.0
        },
        totalWorkdays: {
            type: Number,
            default: 0
        },
        totalDaysOff: {
            type: Number,
            default: 0
        },
        potentialMonthHours: {
            type: Number,
            default: 160
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            required: true,
            ref: 'User'
        }
    },
    {
        timestamps: true
    }
);

//Overide toJSON to get the month with out the unnecenssary properites
monthSchema.methods.toJSON = function () {
    const month = this;

    const monthObject = month.toObject();

    delete monthObject.__v;
    delete monthObject.createdAt;
    delete monthObject.updatedAt;
    delete monthObject.owner;

    return { ...monthObject, workdays: month.workdays };
};

monthSchema.virtual('workdays', {
    ref: 'Workday',
    localField: '_id',
    foreignField: 'owner'
});

monthSchema.pre('save', async function (next) {
    const month = this;

    // Check if the month is already exist for this user
    const isExist = await Month.exists({
        owner: month.owner,
        monthDate: month.monthDate
    });

    // If exist when new month or modified a month throw error
    if ((month.isNew && isExist) || (month.isModified('month') && isExist)) {
        throw new Error('This month is already exist!');
    }

    // If month date  was changed, update the date for all the month workdays
    if (month.isModified('monthDate')) {
        month.populate('workdays').execPopulate(res => {
            const monthNo = moment(month.monthDate).month();
            const monthYear = moment(month.monthDate).year();
            month.workdays.forEach(async workday => {
                workday.date = moment(workday.date)
                    .set('month', monthNo)
                    .set('year', monthYear);
                workday.timeIn = moment(workday.timeIn)
                    .set('month', monthNo)
                    .set('year', monthYear);
                workday.timeOut = moment(workday.timeOut)
                    .set('month', monthNo)
                    .set('year', monthYear);
                await workday.save();
            });
        });
    }
    next();
});

//Delete user tasks when user is removed
monthSchema.pre('remove', async function (next) {
    const month = this;

    await Workday.deleteMany({ owner: month._id });
    next();
});

const Month = mongoose.model('Month', monthSchema);

module.exports = Month;
