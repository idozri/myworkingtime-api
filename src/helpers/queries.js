// const populateUser = async user => {
//     const data = await user
//         .populate({
//             path: 'months',
//             options: { sort: { monthDate: -1 } },
//             populate: { path: 'workdays' }
//         })
//         .execPopulate();
//     return data.months;
// };

// module.exports = {
//     populateUser
// };
