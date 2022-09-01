const fs = require('fs');
const http = require('http');
const pug = require('pug');

//  GLOBAL Variables
let restaurants = {};   //  contains actual restuarants objects
let restaurantIds = []; //  contains Id->name to available restaurants
let statistics = [];    //  contains statistical info of each restaurant

// Helper function(object?) for maintaining statistics for each restaurant
function getStats() {
    /**
     * itemsSold syntax is as follows:
     * ```js
     * itemsSold = {
     *  "item1" : item1_units_sold,
     *  "item2" : item2_units_sold,
     *  "item3" : item3_units_sold,
     *  ... }
     * ```
     */
    let itemsSold = {};
    let total = 0;
    let numOrders = 0;
    return {
        /**
         * Adds passed in items to Object `itemsSold` of this restaurant
         * @param {Object} items Items to add to the restaurant's stat data
         * @param {Number} amt The total cost of this order
         */
        addOrder: (items, amt) => {
            Object.keys(items).forEach((item) => {
                if (itemsSold.hasOwnProperty(item)) {
                    itemsSold[item] += items[item];
                } else {
                    itemsSold[item] = items[item];
                }
            });
            numOrders++;
            total += Number(amt);
        },
        getAvgOrderTotal: () => { return (total/numOrders).toFixed(2); },
        /**
         * @returns itemsSold is an array of arrays containing items and its 
         *  units sold in decreasing order
         * ```js
         *  [   
         *   ["item1": item1_units_sold],
         *   ["item2": item2_units_sold],
         *   ["item3": item3_units_sold],
         *  ... ]
         * ```
         */
        getItemsSold: () => { 
            let toRet = [];
            for (const [key, value] of Object.entries(itemsSold)) {
                toRet.push([key, value]);
            }
            toRet.sort((a, b) => {
                return b[1] - a[1]; //  [ [k1,v1], [k2,v2], ...]
            });
            // return toRet.map((elt) => elt[0] );
            return toRet;
        },
        getNumOrders: () => { return numOrders; }
    }
};

const server = http.createServer((request, response) => {
    console.log(request.method + " " + request.url);

    if (request.method === "GET") {
        if (request.url === "/" || request.url === "/home") {
            let data = pug.renderFile("views/home.pug");
            response.writeHead(200, { "Content-Type": "text/html" });
            response.end(data);
        }
        else if (request.url === "/order") {
            let data = pug.renderFile("views/order.pug");
            response.writeHead(200, { "Content-Type": "text/html" });
            response.end(data);
        }
        else if (request.url.startsWith("/order/")) {
            //  Client asking for a particular restaurant object
            //  url is "/order/restaurant_id"
            //  --------------^
            let name = restaurantIds[request.url.slice(7)];
            response.writeHead(200, { "Content-Type": "application/JSON" });
            if (name)
                response.end(JSON.stringify(restaurants[name]));
            else
                send404(response);
        }
        else if (request.url === "/order.css") {
            sendFile("./css/order.css", "text/css", response);
        }
        else if (request.url === "/order.js") {
            sendFile("order.js", "application/javascript", response);
        }
        else if (request.url === "/add.png") {
            sendFile("./images/add.png", "image/png", response);
        }
        else if (request.url === "/remove.png") {
            sendFile("./images/remove.png", "image/png", response);
        }
        else if (request.url === "/statistics") {
            let data = pug.renderFile("views/statistics.pug", {
                restaurants: restaurantIds,
                stats: statistics
            });
            response.writeHead(200, {"Content-Type": "text/html"});
            response.end(data);
        }
        else {
            send404(response);
        }
    }
    else if (request.method === "POST") {
        //Client gave us order info of a restaurant
        if (request.url.startsWith("/order/")) {
            let id = request.url.slice(7);

            let body = "";
            request.on('data', (chunk) => {
                body += chunk;
            });

            request.on("end", () => {
                let data = JSON.parse(body);
                updateStatistics(id, data);
                response.writeHead(200, {"Content-Type": "text/plain"});
                response.end("Done");
            });
        }
        else {
            send404(response);
        }
    }
    else if (request.method === "PUT") {
        //Client asking list of available restaurants
        if (request.url === "/order") {
            response.writeHead(200, {"Content-Type": "application/JSON"});
            response.end(JSON.stringify(Object.keys(restaurants)));
        }
    }
    else {
        send404(response);
    }

});

//read restaurants files and store it in restaurants
fs.readdir("./restaurants", (err, files) => {
    if (err) {
        console.log(err);
    }
    files.forEach(file => {
        if (file.endsWith(".json")) {
            let res = require(`./restaurants/${file}`);
            restaurants[res.name] = res;
            restaurantIds.push(res.name);
            statistics.push(getStats());
        }
    })
    console.log(restaurantIds);
    //Start server
    server.listen(3000);
    console.log("Server listening at http://localhost:3000");
});

/**
 * Updates the statistics of the passed in Id of the restaurant
 * @param {Number} id       The id of the restaurant
 * @param {Object} data     Information sent by client related to the now submitted order
 */
function updateStatistics(id, data) {
    console.log(data);
    let stats = statistics[id];

    stats.addOrder(data.items, data.amt);
    console.log(restaurantIds[id]);
    console.log(`  numOrders: ${stats.getNumOrders()}, avgOrdertotal: ${stats.getAvgOrderTotal()}`);
    console.log(`  itemsSold: ` + stats.getItemsSold());
    console.log(`  Most items sold is: ` + stats.getItemsSold()[0][0]);

}


/**
 * Sends the requested file to client
 * @param {String} dir the directory of the file to send
 * @param {Object} type `Content-Type` header info for the response to be sent
 * @param {http.ServerResponse} response well, the response object itself
 */
function sendFile(dir, type, response) {
    //read requested file and send it back
    fs.readFile(`${dir}`, function (err, data) {
        if (err) {
            response.statusCode = 500;
            response.write("Server error.");
            response.end();
            return;
        }
        response.writeHead(200, { "Content-Type": `${type}` });
        response.end(data);
    });
}

//Helper function to send a 404 error
function send404(response) {
    response.statusCode = 404;
    response.write("Unknown resource.");
    response.end();
}
