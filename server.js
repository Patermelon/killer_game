//routine setup
var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server);

app.use('/',express.static(__dirname + '/www'));

server.listen(process.env.PORT || 8888);


//define variables
var users = [];              // the list of users' id
    roomhostExits = 0;       // By default, there is no roomhost
    gameModeIndicator = '8'; // By default, gameMode is 8




/*  a simple function allowing us to toggle on/off debug messages to console.   */
var _debugOn = 1;

var _debug_logtoConsole = function(debug_msg) {
    if (_debugOn == 1) {
        console.log('  debug:  ' + debug_msg);
    }
}



/*==============================================================
        The server functionality is realized in 4 modules:
            1. LOGIN/OUT
            2. CHAT
            3. LOBBY
            4. GAME_CORE
================================================================*/



io.sockets.on('connection', function(socket) {
    
/*  _Module: LOGIN/OUT  */


    //new user login
    socket.on('userLogin', function(id) {
        if (users.indexOf(id) > -1) {
            socket.emit('nickExisted');
        } else {
            socket.userIndex = users.length;// I wonder if .userIndex will be used in anyway, seems not
            socket.username = id;
            users.push(id);
            socket.emit('loginSuccess',id); 
            _debug_logtoConsole('users = ' + users);
            socket.broadcast.emit('system',id,'login');

            if (!roomhostExits) { //if there is no roomhost, make the current user the roomhost
                _debug_logtoConsole('there is no roomhost currently.');
                roomhostExits = 1;
                _debug_logtoConsole('roomhost assigned to ' + socket.username);
            }
        }
    });

    //user leaves
    socket.on('disconnect', function() {
        _debug_logtoConsole(users);
        
        var leavinguserIndex = users.indexOf(socket.username);
        if (leavinguserIndex > -1) {
            users.splice(leavinguserIndex, 1);
            socket.broadcast.emit('system', socket.username, 'logout');
            _debug_logtoConsole(socket.username+ ' has left -> ' + users);

            if(leavinguserIndex == 0) { // if the current roomhost left
                _debug_logtoConsole('current roomhost left.');
                if (users.length <= 0) { // if the last user left
                    roomhostExits = 0;
                } else {
                    _debug_logtoConsole('roomhost reassigned to ' + users[0]);
                }
            }
        } else {
            _debug_logtoConsole('a no one has left: ' + users);
        }
    });



/*  _Module: CHAT   */


    //new message get
    socket.on('postMsg', function(msg, color) {
        socket.broadcast.emit('newMsg', socket.username, msg, color);
    });

    //emoji or pic posting functionality here



/*  _Module: LOBBY  */


    //user's inquiry about the roomhost
    socket.on('amIroomhost', function() {
        _debug_logtoConsole('heard inquiry');
        if (users.indexOf(socket.username) == 0) {
            socket.emit('youareroomhost', 1, gameModeIndicator);
            _debug_logtoConsole('he is the host.');
        } else {
            socket.emit('youareroomhost', 0, gameModeIndicator);
            _debug_logtoConsole('he is not the host');
        }
    });

    //user asking for playerList
    socket.on('pullplayerList', function() {
        socket.emit('sendplayerList', users);
    });

    //roomhost made change to gameMode
    socket.on('gameModeChange', function(gameMode) {
        gameModeIndicator = gameMode;
        socket.broadcast.emit('gameModeChanged',gameModeIndicator);
        _debug_logtoConsole('gameMode changed to ' + gameModeIndicator);
    });



/*  _Module: GAME_CORE  */    

















});