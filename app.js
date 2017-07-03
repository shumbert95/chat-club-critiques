var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'),
    fs = require('fs');

var test = [
    {id: 1, title: 'Salon Harry Potter', messages:[], date_start:'2017-06-29 11:50', date_end:'2017-06-30 21:00', users: [], book:75},
    {id: 2, title: 'Discussion sur Hunger Games', messages:[], date_start:'2017-07-26', date_end:'2017-06-27 19:00', users: [], book:76},
    {id: 3, title: 'Salon sur Titeuf', messages:[], date_start:'2017-07-28', date_end:'2017-06-29 20:00', users: [], book:77},
    {id: 4, title: 'Salon Harry Potter', messages:[], date_start:'2017-07-01', date_end:'2017-06-30 21:00', users: [], book:78},
    {id: 5, title: 'Discussion sur Hunger Games', messages:[], date_start:'2017-07-01', date_end:'2017-06-26 19:00', users: [], book:79},
    {id: 6, title: 'Salon sur Titeuf', messages:[], date_start:'2017-07-01', date_end:'2017-06-27 13:00', users: [], book:80},
    {id: 7, title: 'Salon Harry Potter', messages:[], date_start:'2017-07-01', date_end:'2017-06-26 21:00', users: [], book:81},
    {id: 8, title: 'Discussion sur Hunger Games', messages:[], date_start:'2017-07-01', date_end:'2017-06-26 19:00', users: [], book:82},
    {id: 9, title: 'Salon sur Titeuf', messages:[], date_start:'2017-07-01', date_end:'2017-06-29 20:00', users: [], book:83},
    {id: 10, title: 'Salon Harry Potter', messages:[], date_start:'2017-07-01', date_end:'2017-06-26 21:00', users: [], book:84},
    {id: 11, title: 'Discussion sur Hunger Games', messages:[], date_start:'2017-07-01', date_end:'2017-06-26 19:00', users: [], book:85},
    {id: 12, title: 'Salon sur Titeuf', messages:[], date_start:'2017-07-01', date_end:'2017-06-29 20:00', users: [], book:86}
    ];

Date.prototype.today = function () {
    return this.getFullYear() + '-' + (((this.getMonth()+1) < 10)?"0":"") + (this.getMonth()+1) + '-' + ((this.getDate() < 10)?"0":"") + this.getDate();
};
Date.prototype.timeNow = function () {
    return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes();
};

function endLobby(room, io) {
    io.sockets.to(room.id).emit('end_lobby', 'Le salon vient de se terminer. Il va donc fermer. Vous serez redirigé à la page d\'accueil dans :');
    var x = 1;
    var intervalID = setInterval(function () {
        io.to(room.id).emit('end_lobby', '' + (10-x) + ' secondes..');
        if (x++ == 10) {
            io.to(room.id).emit('end_lobby', 'Déconnexion..');
            io.to(room.id).emit('redirect');
            clearInterval(intervalID);
            console.log(clients);
        }
    }, 1000);

    var http = require('http');
    jsonObject = JSON.stringify(room);
    var postheaders = {
        'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };
    var options = {
        host : 'club-critiques.dev',
        port : 80,
        path : '/app_dev.php/api/chat/messages',
        method : 'POST',
        headers : postheaders
    };
    var req = http.request(options, function(res) {
        console.log("statusCode: ", res.statusCode);
    });
    req.write(jsonObject);
    req.end();
    req.on('error', function(e) {
        console.error(e);
    });
}

var rooms = [];
// Tache récurrente pour terminer les salons
setInterval(function() {
    var datetime = new Date().today() + " " + new Date().timeNow();
    rooms.forEach(function(element) {
        if (element.date_end == datetime) {
            endLobby(element, io);
        }
    });
}, 20 * 1000);

// Fonctionnement du chat
io.sockets.on('connection', function (socket, username) {
    socket.on('new_user', function(data) {
        var lobby_exist = false;
        socket.user = {lobby: ent.encode(data.lobby), username:  ent.encode(data.username), user_id: ent.encode(data.user_id)};
        rooms.forEach(function(element) {
           if (element.id == socket.user.lobby) {
               lobby_exist = true;
           }
        });
        if (!lobby_exist) {
            rooms.push({id: socket.user.lobby, messages:[], date_start: data.lobby_date_start, date_end: data.lobby_date_end})
        }
        socket.join(socket.user.lobby);
        socket.to(socket.user.lobby).broadcast.emit('new_user_room', socket.user.username);
    });

    socket.on('message', function (message) {
        message = ent.encode(message);
        rooms.forEach(function (element) {
            if (socket.user.lobby == element.id) {
                element.messages.push({user_id: socket.user.user_id, message: message});
            }
        });
        socket.broadcast.emit('message', {username: socket.user.username, message: message});
    });
});

server.listen(3000);
