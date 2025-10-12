import accountRoute from "./account.route.js";
import exerciseRoute from "./exercise.route.js";
import programRoute from "./program.route.js";

function route(app) {
    app.use('/api/v1/account', accountRoute);
    app.use('/api/v1/exercises', exerciseRoute);
    app.use('/api/v1/programs', programRoute);
}


export default route;