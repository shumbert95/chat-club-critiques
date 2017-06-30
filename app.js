var app = require('express')(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'),
    fs = require('fs');

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');
});
var messages = [];
io.sockets.on('connection', function (socket, username) {
    socket.on('new_user', function(data) {
        username = ent.encode(data.username);
        lobby = ent.encode(data.lobby);

        socket.lobby = lobby;
        socket.username = username;

        socket.join(lobby);

        socket.to(lobby).broadcast.emit('new_user_room', username);
        socket.broadcast.emit('new_user', username);
    });

    socket.on('join_room_two', function() {
        console.log(socket.username + ' is joining room two');
        socket.to('room_one').broadcast.emit('message', socket.username + 'a rejoint le salon 2 !');
        socket.join('room_two');
    });

    socket.on('message', function (message) {
        message = ent.encode(message);
        messages.push(message);
        socket.broadcast.emit('message', {username: socket.username, message: message});
    });

    socket.on('end_lobby', function () {
       console.log(messages);
    });
});

server.listen(3000);
