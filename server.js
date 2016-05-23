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
    GameMode = require('./www/scripts/GameMode');
    gameModeIndicator = new GameMode('3');
    Game_core = require('./www/scripts/Game_core');
    playerList = [];         //playerList stores the player info needed for gameplay
    
    cops_target = [];
    killers_target = [];
    doctor_target = -1;
    sniper_target = -1;
    sniper_ammo = 1;
    response_count = 0;


/*  a simple function allowing us to toggle on/off debug messages to console.   */
var _debugOn = 1;

var _debug_logtoConsole = function(debug_msg) {
    if (_debugOn == 1) {
        console.log('  debug:  ' + debug_msg);
    }
}

console.log('gameMode is ' + gameModeIndicator.name);


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
            response_count = 0;

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
        socket.emit('gameModeChanged', gameMode_name);
        socket.broadcast.emit('gameModeChanged',gameMode_name);
        _debug_logtoConsole('gameMode changed to ' + gameMode_name);
    });

    //
    socket.on('kickPlayer', function(userIndex) {
        console.log(users[userIndex] + ' 被踢了！');
        socket.broadcast.emit('gotKicked', userIndex);
    });


/*  _Module: GAME_CORE  */    

    socket.on('gameStart', function() {
        playerList = Game_core.playerListInit(users, gameModeIndicator);
        console.log(playerList);
        socket.broadcast.emit('gameStarted',users);
        socket.emit('gameStarted',users);
    });

    socket.on('pullInstruction', function() {
        var userIndex = users.indexOf(socket.username);
            userRole = playerList[userIndex].role;
            teammates = [];
        
        if (userRole == 1 || userRole == 2) {
            teammates = Game_core.findTeammates(gameModeIndicator,playerList, userIndex);
        }

        socket.emit('sendInstruction', playerList[userIndex].role, teammates);

        switch (userRole) { //don't forget to unsubscribe when dead or game end
            case 1:
                socket.join('cops');
                break;
            case 2:
                socket.join('killers');
                break;
            case 4:
                socket.join('sniper');
            default :
        }
    });

    socket.on('pickTarget', function(targetIndex, myRole) {
        var userIndex = users.indexOf(socket.username);
        switch (myRole) {
            case 1:
                io.to('cops').emit('teammates_target', targetIndex, userIndex);
                break;
            case 2:
                io.to('killers').emit('teammates_target', targetIndex, userIndex);
                break;
            default :
                socket.emit('teammates_target', targetIndex, userIndex);
                break;
        }
    });

    socket.on('confirmTarget', function(myTarget) {
        var userIndex = users.indexOf(socket.username);
            myRole = playerList[userIndex].role;

        _debug_logtoConsole('this response is from '+ socket.username);
        _debug_logtoConsole('the target is ' + myTarget);


        switch (myRole) {
            case 1:
                if (cops_target.indexOf(myTarget) == -1) {
                    cops_target.push(myTarget);
                }
                break;
            case 2:
                if (killers_target.indexOf(myTarget) == -1) {
                    killers_target.push(myTarget);
                }
                break;
            case 3:
                doctor_target = myTarget;
                break;
            case 4:
                sniper_target = myTarget;
                if (sniper_target != -1) {
                    sniper_ammo = 0;
                }
                break;
            default :
                break;
        }


        response_count++;
        _debug_logtoConsole('response_count = ' + response_count);
        console.log("cops' target is:");
        console.log(cops_target);
        console.log('killers\' target is:' );
        console.log(killers_target);

        if (response_count < users.length) {
            socket.emit('waitforalltoRespond');
        } else {
            response_count = 0;
            nightSettlement(socket);
        }

    });








});

function nightSettlement(socket) {
    //settlement and send back result
    //reset some variables as the night begins

    if (cops_target.length == 1) {
        var isKiller = (playerList[cops_target[0]].role == 2);
        console.log("isKiller = " + isKiller);
        io.to('cops').emit('killerConfirm', isKiller, playerList[cops_target[0]].name);
    } else {
        io.to('cops').emit('disagreement', cops_target);
    }

    if (killers_target.length == 1) {
        var victim = killers_target[0];
        io.to('killers').emit('killConfirm', playerList[victim].name);
    } else {
        io.to('killers').emit('disagreement', killers_target);
        victim = -1;
    }


    var deathpool = [];
    _debug_logtoConsole('victim = ' + playerList[victim].name);
    _debug_logtoConsole('doctor_target = ' + doctor_target);

    if (doctor_target != -1) {
        if (doctor_target != victim) {
            playerList[victim].kill();
            deathpool.push(victim);
            playerList[doctor_target].toxincount++;
        }
        if (playerList[doctor_target].toxincount == 2) {
            playerList[doctor_target].kill();
            if (deathpool.indexOf(doctor_target) == -1) {
                deathpool.push(doctor_target);
            }
        }
    } else {
        playerList[victim].kill();
        deathpool.push(victim);
        console.log(playerList[victim].isAlive);
    }
    if (sniper_target != -1) {
        playerList[sniper_target].kill();
        if (deathpool.indexOf(sniper_target) == -1) {
            deathpool.push(sniper_target);
        }
        sniper_ammo = 0;
        io.to('sniper').emit('snipeDone');
    }

    cops_target = [];
    killers_target = [];

    var win_flag = Game_core.checkWin(gameModeIndicator,playerList);

    console.log(playerList);
    _debug_logtoConsole('win_flag = ' + win_flag);
    
    if (win_flag != 0) {
        socket.broadcast.emit('win', win_flag, playerList);
        socket.emit('win',win_flag, playerList);
    } else {
        socket.broadcast.emit('deathReport',deathpool);
        socket.emit('deathReport',deathpool);
    }
}






