const WS = require('ws').Server;
const port = process.env.PORT || 9000
const wss = new WS({ port: port });
console.log('YUKIMOCHI VRC_WSMMS Running on ' + port);

var publish = null;
var publish_key = "KEYKEYKEY";

wss.on('connection', function (ws) {
    ws.binaryType = 'arraybuffer';
    try {
        auth = JSON.parse(ws.protocol);
    } catch (error) {
        auth = null;
    }
    if (auth && auth.WSMMSPUB && auth.WSMMSPUB == publish_key) {
        console.log('Publisher Connected.');
        publish = ws;
    }

    ws.on('message', function (message) {
        wss.clients.forEach(function each(client) {
            if (ws == client || ws != publish) {
            }
            else {
                client.send(message);
            }
        });
    });
    ws.on('error', function (e) {
        console.log(e);
    });
    ws.on('close', function (e) {
        console.log('DISCONNECT CLIENT.');
    });
});
