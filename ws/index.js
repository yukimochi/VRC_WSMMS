const WS = require('ws').Server;
const port = process.env.PORT || 9000
const wss = new WS({ port: port });
console.log('YUKIMOCHI VRC_WSMMS Running on ' + port);

var room = {}

wss.on('connection', function (ws) {
    ws.binaryType = 'arraybuffer';
    var params;
    try {
        params = {
            publish: ws.protocol.split('-')[0] == "publish",
            room: ws.protocol.split('-')[1]
        }
    } catch (error) {
        params = null;
    }
    if (params && params.room) {
        room[params.room] = room[params.room] ? room[params.room] : { "clients": [], "publish": null };
        room[params.room].clients.push(ws);
        if (params.publish) {
            room[params.room].publish = ws;
            console.log('[' + params.room + '] CONNECT PUBLISHER.');
        } else {
            console.log('[' + params.room + '] CONNECT CLIENT.');
        }
        ws.on('message', function (message) {
            if (params.room && ws == room[params.room].publish) {
                room[params.room].clients.forEach(client => {
                    if (ws == client) {
                    }
                    else {
                        client.send(message);
                    }
                });
            }
        });
        ws.on('error', function (e) {
            console.log(e);
        });
        ws.on('close', function (e) {
            delete room[params.room].clients[room[params.room].clients.indexOf(ws)];
            if (ws != room[params.room].publish) {
                console.log('[' + params.room + '] DISCONNECT CLIENT.');
            } else {
                room[params.room].publish = null;
                console.log('[' + params.room + '] DISCONNECT PUBLISHER.');
            }
        });
    } else {
        ws.close();
    }
});
