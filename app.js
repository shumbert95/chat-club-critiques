var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'),
    fs = require('fs');

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
        }
    }, 1000);

    // Envoie des messages à l'application Symfony pour l'enregistrement
    var http = require('http');
    jsonObject = JSON.stringify(room);
    var postheaders = {
        'Content-Type' : 'application/json',
        'Content-Length' : Buffer.byteLength(jsonObject, 'utf8')
    };
    var options = {
        host : 'jeremyfsmoreau.com',
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

var lobbies = [];
// Tache récurrente pour terminer les salons
setInterval(function() {
    var datetime = new Date().today() + " " + new Date().timeNow();
    lobbies.forEach(function(element) {
        if (element.date_end == datetime) {
            endLobby(element, io);
        }
    });
}, 20 * 1000);

// Fonctionnement du chat
io.sockets.on('connection', function (socket, username) {
    socket.on('new_user', function(data) {
        var lobby_exists = false;
        var room_exists = false;
        socket.user = {lobby: ent.encode(data.lobby), firstName: ent.encode(data.firstName), lastName: ent.encode(data.lastName), username:  ent.encode(data.username), user_id: ent.encode(data.user_id), room: ent.encode(data.room)};
        lobbies.forEach(function(element) {
           if (element.id == socket.user.lobby) {
               lobby_exists = true;
               element.rooms++;
               element.messages.forEach(function(room) {
                   if (room.room_id == socket.user.room) {
                       room_exists = true;
                   }
               });
               if (!room_exists) {
                   element.messages.push({room_id: socket.user.room, messages: []});
               }
           }
        });
        if (!lobby_exists) {
            lobbies.push({id: socket.user.lobby, messages:[{room_id: 1, messages: []}], users: [], date_start: data.lobby_date_start, date_end: data.lobby_date_end, rooms: 1});
        }
        lobbies.forEach(function(lobby) {
           if (lobby.id == socket.user.lobby) {
               lobby.users.push({room_id: socket.user.room, user: socket.user});
               socket.join(socket.user.lobby+"-"+socket.user.room);
               io.sockets.in(socket.user.lobby+"-"+socket.user.room).emit('new_user_room', {"username" : socket.user.username, users: lobby.users});
           }
        });
    });

    socket.on('message', function (message) {
        message = ent.encode(message);
        lobbies.forEach(function (element) {
            if (socket.user.lobby == element.id) {
                element.messages.forEach(function (room){
                    if (room.room_id == socket.user.room) {
                        room.messages.push({user_id: socket.user.user_id, username: socket.user.username, message: message});
                    }
                })
            }
        });
        socket.to(socket.user.lobby+"-"+socket.user.room).broadcast.emit('message', {username: socket.user.username, message: message});
    });

    socket.on('disconnect', function() {
        console.log(socket.user.username + ' disconnected !');
        lobbies.forEach(function(lobby) {
           if (lobby.id == socket.user.lobby) {
               lobby.users.forEach(function(user, index) {
                  if (user.user == socket.user) {
                      lobby.users.splice(index, 1);
                      socket.to(socket.user.lobby+"-"+socket.user.room).broadcast.emit('user_disconnect', {user: socket.user});
                  }
               });
           }
        });
    });
});

server.listen(3000);
