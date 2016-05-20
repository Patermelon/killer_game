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
    GameModeObject = require('./www/scripts/GameMode');
    gameModeIndicator = new GameModeObject('3');
    playerList = [];         //playerList stores the player info needed for gameplay
    Game_core = require('./www/scripts/Game_core');


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

_debug_logtoConsole('gameModeIndicator.name = ' + gameModeIndicator.name);
    //new user login
    socket.on('userLogin', function(id) {
        if (users.indexOf(id) > -1) {
            socket.emit('nickExisted');
        } else if (users.length >= gameModeIndicator.numberofPlayer()) {
            socket.emit('roomFull');
        } else {
            //socket.userIndex = users.length;// I wonder if .userIndex will be used in anyway, seems not
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
        _debug_logtoConsole('current users are: '+ users);
        
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
        //gameModeIndicator.name = '8';
        _debug_logtoConsole('heard inquiry, gamemode = ' + gameModeIndicator.name);
        if (users.indexOf(socket.username) == 0) {
            socket.emit('youareroomhost', 1, gameModeIndicator.name);
            _debug_logtoConsole('he is the host');
        } else {
            socket.emit('youareroomhost', 0, gameModeIndicator.name);
            _debug_logtoConsole('he is not the host');
        }
    });

    //user asking for userList
    socket.on('pulluserList', function() {
        socket.emit('senduserList', users);
    });

    //roomhost made change to gameMode
    socket.on('gameModeChange', function(gameMode_name) {
        gameModeIndicator.name = gameMode_name;
        socket.broadcast.emit('gameModeChanged',gameMode_name);
        _debug_logtoConsole('gameMode changed to ' + gameMode_name);
    });



/*  _Module: GAME_CORE  */    

    socket.on('gameStart', function() {
        playerList = Game_core.playerListInit(users, gameModeIndicator);
        socket.broadcast.emit('gameStarted',users);
        socket.emit('gameStarted',users);
    });

    socket.on('pullInstruction', function() {
        var userIndex = users.indexOf(socket.username);
            userRole = playerList[userIndex].role;
            teammates = [];
        
        teammates = Game_core.findTeammates(gameModeIndicator,playerList, userIndex);

        socket.emit('sendInstruction', playerList[userIndex].role, teammates);

        switch (userRole) { //don't forget to unsubscribe when dead or game end
            case 1:
                socket.join('cops');
                break;
            case 2:
                socket.join('killers');
                break;
            default :
        }
    });

    socket.on('pickTarget', function(targetIndex, myRole) {
        var userIndex = users.indexOf(socket.username);
        switch (myRole) {
            case 1:
                io.to('cops').emit('teammates_target', targetIndex, userIndex, users);
                _debug_logtoConsole(users);
                break;
            case 2:
                io.to('killers').emit('teammates_target', targetIndex, userIndex, users);
                break;
            default :
                socket.emit('teammates_target', targetIndex, userIndex, users);
                break;
        }
    });









});

