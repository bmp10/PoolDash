const worldpos = [500, 500];
const worldradius = 400;
const root2 = 2 ** 0.5;
const kb = 10;
let allr = false;
let count = 200;
let count2 = 200;

class Player {
    constructor(x, y, radius, playerid) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.oldx = x;
        this.oldy = y;
        this.accx = 0;
        this.accy = 0;
        this.color = '#' + playerid.toString().slice(-6);
        this.ready = false;
        this.placed = false;
        this.turn = false;
        this.cd = 0;
    }

    updatepos(dt) {
        const velx = this.x - this.oldx;
        const vely = this.y - this.oldy;

        this.oldx = this.x;
        this.oldy = this.y;

        this.x = this.x + velx * 0.95 + this.accx * dt * dt;
        this.y = this.y + vely * 0.95 + this.accy * dt * dt;

        this.accx = 0;
        this.accy = 0;
    }

    accelerate(accx, accy) {
        this.accx += accx;
        this.accy += accy;
    }
}

const world = {};
world.x = worldpos[0];
world.y = worldpos[1];
world.radius = worldradius;

let cols = [];
let sidecols = [];
let battle = false;

function updatepositions(player) {
    player.updatepos((now - start) / 1000 / substeps);
}
function applyconstraint(player) {
    const diffx = player.x - worldpos[0];
    const diffy = player.y - worldpos[1];

    const dist2 = diffx ** 2 + diffy ** 2;

    const radiusdiff = worldradius - player.radius;
    if (dist2 > radiusdiff ** 2) {
        const dist = dist2 ** 0.5;
        const unitx = diffx / dist;
        const unity = diffy / dist;

        sidecols.push([worldradius * unitx + worldpos[0], worldradius * unity + worldpos[1], 5, player.color])

        player.x = worldpos[0] + unitx * (radiusdiff);
        player.y = worldpos[1] + unity * (radiusdiff);
    }
}
function solvecollisions() {
    for (let [i, circle1] of Object.entries(players)) {
        for (let [j, circle2] of Object.entries(players)) {
            const axisx = circle1.x - circle2.x;
            const axisy = circle1.y - circle2.y;
            const dist2 = axisx ** 2 + axisy ** 2;

            const mindist = circle1.radius + circle2.radius;

            if (dist2 > 0) {
                if (dist2 < mindist ** 2) {
                    const dist = dist2 ** 0.5;
                    const unitx = axisx / dist;
                    const unity = axisy / dist;
    
                    const delta = mindist - dist;

                    cols.push([(circle1.x + circle2.x) / 2, (circle1.y + circle2.y) / 2, 5])
    
                    circle1.x += (circle1.radius * kb / 100) * delta * unitx;
                    circle1.y += (circle1.radius * kb / 100) * delta * unity;
    
                    circle2.x -= (circle2.radius * kb / 100) * delta * unitx;
                    circle2.y -= (circle2.radius * kb / 100) * delta * unity;
                }
            }
        }
    }
}

var start = Date.now();
var now;

var substeps = 1;

function substep() {
    for (let i = 0; i < substeps; i++) {
        for (let [key, player] of Object.entries(players)) updatepositions(player);
        for (let [key, player] of Object.entries(players)) applyconstraint(player);
        solvecollisions();
    }
}

function update() {
    now = Date.now();
    
    substep();

    return now
}








const WebSocket = require('ws');
const sha256 = require('js-sha256');
const port = 5000;
const wsServer = new WebSocket.Server({'port': port});

let players = {};
let turn = 0;
const away = 75

wsServer.on('connection', function(ws) {
    console.log('Client connected');
    for (let [key, player] of Object.entries(players)) player.placed = false;

    let thisplayer;
    ws.on('message', function(msg) {
        msg = JSON.parse(msg.toString())
        thisplayer = sha256(msg.cookie);
        if (players[thisplayer] == undefined) {
            players[thisplayer] = new Player(1000 * Object.keys(players).length / (Object.keys(players).length + 1), 500, 50, thisplayer)
        }
        thisplayernum = Object.values(players).sort().indexOf(players[thisplayer])

        players[thisplayer].ready = true

        if (count2 == 200) {
            if (allr) {
                if (msg.x) {
                    if (players[thisplayer].cd <= 0) {
                        players[thisplayer].accelerate(msg.x*500, msg.y*500)
                        players[thisplayer].cd = 500
                    }
                }
            } else if (!players[thisplayer].placed) {
                players[thisplayer].placed = true;
                players[thisplayer].x = 1000 * (thisplayernum + 1) / (Object.keys(players).length + 1);
                players[thisplayer].y = 500;
                players[thisplayer].oldx = players[thisplayer].x
                players[thisplayer].oldy = players[thisplayer].y
            } else {
                if (msg.x) {
                    players[thisplayer].cd = 500
                }
            }
        }
    })

    ws.on('close', function() {
        delete players[thisplayer]
        for (let [key, player] of Object.entries(players)) player.placed = false;
    })
});

setInterval(function() {
    if (allr && count2 == 200) {
        start = update();
    } else {
        start = Date.now()
    }

    let tosend = {players: players, cols: cols, sidecols: sidecols, count: count, battle: battle, allr: allr};

    if (sidecols.filter((value, index) => value[2] == 5).length > 0 && battle) {
        count2 -= 1
        if (count2 == 0) {
            tosend.set = false;
            for (let [key, player] of Object.entries(players)) player.placed = false;
            allr = false

            count2 = 200;
            sidecols = [];
        }
        console.log(count2)
    } else {
        cols.forEach(function(value, index) {
            battle = true
            value[2] -= 1
            if (value[2] == 0) {
                cols.splice(index, 1);
            }
        })
        sidecols.forEach(function(value, index) {
            value[2] -= 1
            if (value[2] == 0) {
                sidecols.splice(index, 1);
            }
        })
    }

    wsServer.clients.forEach(function(client) {
        client.send(JSON.stringify(tosend));
    });

    if (!allr && count2 == 200) {
        battle = false
        if (Object.entries(players).every(([value, player]) => player.ready)) {
            count -= 1
            if (count == 0) {
                count = 200
                allr = true
            }
        }        
    }

    Object.entries(players).forEach(function([id, player]) {
        player.cd -= Math.min(player.cd, 10)
    })
}, 10)