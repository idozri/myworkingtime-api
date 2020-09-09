const express = require('express');
require('./db/mongoose');
const monthRouter = require('./routers/month');
const userRouter = require('./routers/user');
const workdayRouter = require('./routers/workday');
const path = require('path');
const app = express();

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header(
        'Access-Control-Allow-Methods',
        'GET,HEAD,OPTIONS,POST,PUT,DELETE,PATCH'
    );
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    next();
});

app.use(express.json());
app.use(userRouter);
app.use(monthRouter);
app.use(workdayRouter);

if (process.env.NODE_ENV === 'production') {
    app.use(express.static('client/dist'));
    app.get('*', (req, res) => {
        console.log(__dirname);
        res.sendFile(path.resolve('client', 'dist', 'main.js'));
    });
}

module.exports = app;
