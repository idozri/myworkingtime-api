const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');
const Month = require('../models/month');

// Set a schema for the users collection
const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            required: [true, 'Must provide an email address.'],
            trim: true,
            lowercase: true,
            validate(value) {
                if (!validator.isEmail(value)) {
                    throw new Error('Email is invalid.');
                }
            }
        },
        password: {
            type: String,
            required: [true, 'Must provide a password.'],
            minlength: [7, 'Password must have at least 7 characters'],
            trim: true,
            validate(value) {
                if (value.toLowerCase().includes('password')) {
                    throw new Error('Password can not contain "password"');
                }
            }
        },
        tokens: [
            {
                token: {
                    type: String,
                    require: true
                }
            }
        ]
    },
    {
        timestamps: true
    }
);

// Set the relation between the users and the months collections
userSchema.virtual('months', {
    ref: 'Month',
    localField: '_id',
    foreignField: 'owner'
});

//Overide toJSON to get the user with out the password and the token arrays
userSchema.methods.toJSON = function () {
    const user = this;
    const userObject = user.toObject();

    delete userObject.password;
    delete userObject.tokens;
    delete userObject.__v;
    delete userObject.createdAt;
    delete userObject.updatedAt;
    return userObject;
};

// Generate token for the signed user and store in the database
userSchema.methods.generateAuthToken = async function () {
    const user = this;
    const token = jwt.sign(
        { _id: user._id.toString() },
        process.env.JWT_SECRET
    );

    user.tokens = user.tokens.concat({ token });
    await user.save();

    return token;
};

// A statitc function to find user with the request email and password for the login
userSchema.statics.findByCredentials = async (email, password) => {
    const user = await User.findOne({ email });

    if (!user) {
        throw new Error('Unable to login');
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
        throw new Error('Unable to login');
    }

    return user;
};

// Hash the plain text password before saving
userSchema.pre('save', async function (next) {
    const user = this;
    if (user.isModified('password')) {
        user.password = await bcrypt.hash(user.password, 8);
    }

    next();
});

// Delete user months and workdays
userSchema.pre('remove', async function (next) {
    const user = this;
    const months = await Month.find({ owner: user._id });
    months.forEach(async month => {
        await month.remove();
    });

    next();
});

// Compile the model
const User = mongoose.model('User', userSchema);

module.exports = User;
