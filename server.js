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
    clientId = [];

    GameMode = require('./www/scripts/GameMode');
    gameModeIndicator = new GameMode('7');
    Game_core = require('./www/scripts/Game_core');
    playerList = [];         //playerList stores the player info needed for gameplay
    
    numberofplayerAlive = gameModeIndicator.numberofPlayer();
    cops_target = [];
    killers_target = [];
    doctor_target = -1;
    sniper_target = -1;
    sniper_ammo = 1;
    response_count = 0;
    votes = [];
    isRevote = 0;


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
            clientId[id] = socket.id;
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
        if (users.indexOf(socket.username) == 0) {
            socket.emit('youareroomhost', 1, gameModeIndicator.name);
        } else {
            socket.emit('youareroomhost', 0, gameModeIndicator.name);
        }
    });

    //user asking for userList
    socket.on('pulluserList', function() {
        socket.emit('senduserList', users);
    });

    //roomhost made change to gameMode
    socket.on('gameModeChange', function(gameMode_name) {
        gameModeIndicator.name = gameMode_name;
        numberofplayerAlive = gameModeIndicator.numberofPlayer();
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
        //initializing game
        playerList = Game_core.playerListInit(users, gameModeIndicator);
        numberofplayerAlive = gameModeIndicator.numberofPlayer();
        cops_target = [];
        killers_target = [];
        doctor_target = -1;
        sniper_target = -1;
        sniper_ammo = 1;
        response_count = 0;
        
        console.log('game instance initialized,');
        console.log(playerList);
        console.log(clientId);

        var targetSocket = null;
        debugger;

        playerList.forEach(function(i) {
            targetSocket = io.sockets.connected[clientId[i.name]];
            console.log('id for ' + i.name + ' is '+ targetSocket.id);
            switch (i.role) {
                case 1:
                    targetSocket.join('cops');
                    break;
                case 2:
                    targetSocket.join('killers');
                    break;
                case 4:
                    targetSocket.join('sniper');
                default :
            }
        });

        socket.broadcast.emit('gameStarted',users);
        socket.emit('gameStarted',users);
    });

    socket.on('pullInstruction', function() {
        var userIndex = users.indexOf(socket.username),
            userRole = playerList[userIndex].role;
            teammates = [];

        if (userRole == 1 || userRole == 2) {
            teammates = Game_core.findTeammates(gameModeIndicator,playerList, userIndex);
        }

        socket.emit('sendInstruction', playerList[userIndex].role, teammates);

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
        _debug_logtoConsole('the target is ' + playerList[myTarget].name);
        _debug_logtoConsole('numberofplayerAlive = '+ numberofplayerAlive);


        switch (myRole) {
            case 1:
                if (cops_target.indexOf(myTarget) == -1) {
                    cops_target.push(myTarget);
                }
                io.to('cops').emit('teammates_target_fixed', myTarget, userIndex);
                break;
            case 2:
                if (killers_target.indexOf(myTarget) == -1) {
                    killers_target.push(myTarget);
                }
                io.to('killers').emit('teammates_target_fixed', myTarget, userIndex);
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

        socket.emit('target_fixed');

        response_count++;
        _debug_logtoConsole('response_count = ' + response_count);
        console.log("cops' target is:");
        console.log(cops_target);
        console.log('killers\' target is:' );
        console.log(killers_target);

        if (response_count < numberofplayerAlive) {
            socket.emit('waitforalltoRespond');
        } else {
            socket.emit('waitforalltoRespond');
            response_count = 0;
            nightSettlement(socket);
        }
        console.log('votes initialized');
        console.log(votes);
    });

    socket.on('confirmVote', function(myTarget) {
        var userIndex = users.indexOf(socket.username);

        socket.emit('target_fixed');

        response_count++;

        votes[userIndex] = myTarget;
        
        _debug_logtoConsole('this vote is from '+ socket.username);
        _debug_logtoConsole('the target is ' + playerList[myTarget].name);
        _debug_logtoConsole('response_count = ' + response_count);
        console.log(votes);

        if (response_count < numberofplayerAlive) {
            socket.emit('waitforotherVotes');
        } else {
            socket.emit('waitforotherVotes');
            _debug_logtoConsole('response_count set to 0');
            response_count = 0;

            var convict;
            convict = Game_core.countVote(votes);

            console.log('the verdict says: ');
            console.log(convict);

            socket.broadcast.emit('voteResult', votes);
            socket.emit('voteResult', votes);
        }
    });

    socket.on('sawvoteResult', function() {
        _debug_logtoConsole(socket.username + ' has read the voteResult.');
        _debug_logtoConsole('response_count = ' + response_count);

        response_count++;

        if (response_count < numberofplayerAlive) {
            socket.emit('waitforothervoteResult');
        } else {
            socket.emit('waitforothervoteResult');
            response_count = 0;
            console.log('calling daySettlement');
            daySettlement(socket);
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
    //_debug_logtoConsole('victim = ' + playerList[victim].name);
    console.log('doctor_target = ' + doctor_target);

    if (victim != -1) {
        if (doctor_target != -1) {
            if (doctor_target != victim) {
                playerList[victim].kill();
                deathpool.push(victim);
                playerList[doctor_target].toxincount++;
            }
        } else {
            playerList[victim].kill();
            deathpool.push(victim);
            console.log(playerList[victim].isAlive);
        }
    } else {
        if (doctor_target != -1) {
            playerList[doctor_target].toxincount++;
        }
    }

    if (doctor_target != -1) {
        if (playerList[doctor_target].toxincount >= 2) {
            playerList[doctor_target].kill();
            if (deathpool.indexOf(doctor_target) == -1) {
                deathpool.push(doctor_target);
            }
        }
    }

    if (sniper_target != -1) {
        playerList[sniper_target].kill();
        if (deathpool.indexOf(sniper_target) == -1) {
            deathpool.push(sniper_target);
        }
        sniper_ammo = 0;
        io.to('sniper').emit('snipeDone');
    }

    leaveRoom(deathpool);

    cops_target = [];
    killers_target = [];
    doctor_target = -1;
    sniper_target = -1;

    var win_flag = Game_core.checkWin(gameModeIndicator,playerList);

    console.log(playerList);
    _debug_logtoConsole('win_flag = ' + win_flag);
    
    socket.broadcast.emit('deathReport',deathpool);
    socket.emit('deathReport',deathpool);

    if (win_flag != 0) {
        socket.broadcast.emit('win', win_flag, playerList);
        socket.emit('win',win_flag, playerList);
        return;
    }

    //initializing the vote array
    for (var i = 0; i < users.length; i++) {
        votes[i] = -1;
    }

    isRevote = 0;
}


function daySettlement(socket) {
    debugger;
    console.log('the votes is:');
    console.log(votes);
    var convict;
        convict = Game_core.countVote(votes);

    console.log('convict is: ');
    console.log(convict);
    console.log('isRevote = ' + isRevote);
    if (isRevote == 0){
        if (convict.length > 1) {
            socket.broadcast.emit('revote', convict);
            socket.emit('revote', convict);
            isRevote = 1;

            for (var i = 0; i < users.length; i++) {
                votes[i] = -1;
            }            
            _debug_logtoConsole('before revote, the response_count is' + response_count);
            return;
        }
    }

    console.log('it is revote.');
    isRevote = 0;

    convict.forEach(function(i) {
        playerList[i].kill();
    });

    leaveRoom(convict);

    var win_flag = Game_core.checkWin(gameModeIndicator,playerList);
    if (win_flag != 0) {
        socket.broadcast.emit('win', win_flag, playerList);
        socket.emit('win',win_flag, playerList);
        return;
    }

    console.log(playerList);
    _debug_logtoConsole('win_flag = ' + win_flag);

    socket.broadcast.emit('enterNight',convict);
    socket.emit('enterNight',convict);
}

function leaveRoom(deathpool) {
    deathpool.forEach(function(i) {
        var player = playerList[i];
        switch (player.role) {
            case 1:
                io.sockets.connected[clientId[player.name]].leave('cops');
                break;
            case 2:
                io.sockets.connected[clientId[player.name]].leave('killers');
                break;
            case 4:
                io.sockets.connected[clientId[player.name]].leave('sniper');
            default :
        }
    });
}


































