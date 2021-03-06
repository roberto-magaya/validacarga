const program = require('commander');
const packageJson = require('./package.json');
// require the hyperion middleware
const hyperionMiddleware = require('@magaya/hyperion-express-middleware');
// create the hyperion middleware for express.js, pass the required arguments to connect to the database
// the second parameter is optional, if you specify it it will include specialized APIs like the one for LiveTrack Mobile (ltm)
const middleware = hyperionMiddleware.middleware(process.argv,'');
// require the express framework and create an instance of it
const express = require('express');
const app = express();
// helper for paths
const path = require('path');
// helper package to get the body of requests
const bodyParser = require("body-parser");
// require our setup helper functions
const setup = require(path.join(__dirname, 'api/setup'));
// require our Warehouse Receipts API
const whr = require(path.join(__dirname, 'api/whr'));

program.version(packageJson.version)
    .option('-p, --port <n>', 'running port', parseInt)
    .option('-r, --root <value>', 'startup root for api')
    .option('-s, --service-name <value>', 'name for service')
    .option('-g, --gateway', 'dictates if we should be through gateway')
    .option('-i, --network-id <n>', 'magaya network id', parseInt)
    .option('--connection-string <value>', 'connection endpoint for database')
    .parse(process.argv);

if (!program.port) {
    console.log('Must submit port on which to listen...');
    process.exit(1);
} else if (!program.root) {
    console.log('Must submit root...');
    process.exit(1);
}

// create an instance of hyperion (no middleware) with the same connection to the database
const hyperion = hyperionMiddleware.hyperion(process.argv,'');

// setup the extension with required data, notice this occurs at the application startup, not thru a web request
setup.createCustomFieldDefinitions(hyperion);

// apply the middleware in the application
app.use(middleware);
// applye other hepler middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// serve the static content under the root path
app.use(`${program.root}/`, express.static(path.join(__dirname, 'static')));

// define a route that can be consumed from a web browser
app.get('/server/test', function(request, response) {
    const dbx = request.dbx;                // hyperion namespaces
    const algorithm = request.algorithm;    // hyperion algorithms
    const api = request.api;                // api functions (requested with the second argument at require time)
 
    response.send("Company Name:"+dbx.Company.Name);
});

// route that takes a WHR number as a parameter
app.get(`/server/whr/:number`, async (request, response) => {
    // invoke an asynchronous method and wait for it's return value
    const count = await whr.getWhrItemCount(request.param("number"), request.dbx, request.algorithm);
    // send the response to the browser
    response.json({
        whrs : count
    });
});

// start your application in the port 8000
app.listen(program.port, () => {
    console.log(`Server started on port ${program.port}...`);
});