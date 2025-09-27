import accountRoute from "./account.route.js";


function route(app) {
    app.use('/api/v1/account', accountRoute);

}


export default route;