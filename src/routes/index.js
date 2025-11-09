import accountRoute from "./account.route.js";
import exerciseRoute from "./exercise.route.js";
import programRoute from "./program.route.js";
import measurementRoute from "./measurement.route.js";
import checkoffRoute from "./checkoff.route.js";

function route(app) {
    app.use('/api/v1/account', accountRoute);
    app.use('/api/v1/exercises', exerciseRoute);
    app.use('/api/v1/programs', programRoute);
    app.use('/api/v1/measurements', measurementRoute);
    app.use('/api/v1/checkoffs', checkoffRoute);
}


export default route;