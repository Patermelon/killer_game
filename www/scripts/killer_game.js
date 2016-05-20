// a variable to toggle the _debug_feedback()
var _debugOn = 0;

// upon loading, initializing the lobby
window.onload = function() {
    var lobby = new Lobby();
    lobby.init();
}

/*========================================================
    the Lobby class

        handles user login and the lobby functionality

==========================================================*/

var Lobby = function() {
    this.socket = null;
    var flag_imroomhost = 0;
        myusername = '';
        users_local = [];
        gameMode = new GameMode();
        myRole = '';
}//Lobby constructor


Lobby.prototype = {
    init: function() {
        var that = this;
        this.socket = io.connect();
        
//  login handling

        this.socket.on('connect', function() {
            document.getElementById('info').textContent = "欢迎光临，请输入你的昵称：";
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
        });

		this.socket.on('nickExisted',function(){
			document.getElementById('info').textContent = '这个昵称已存在';
		});

        this.socket.on('roomFull',function(){
            document.getElementById('info').textContent = '豹倩，房间已满';
        });

		this.socket.on('loginSuccess',function(id){
			document.title = '游戏中| ' + document.getElementById('nicknameInput').value;
			document.getElementById('loginWrapper').style.display = 'none';
			document.getElementById('messageInput').focus();
            myusername = id;
            that.systemLog('&quot;' + id + '&quot; 加入了房间');
            that.socket.emit('amIroomhost');
		});

		this.socket.on('system',function(id, action){
			var msg = '&quot;' + id + '&quot;' + (action == 'login' ? ' 加入了房间' : ' 退出了房间');
            that.systemLog(msg);
            that.socket.emit('amIroomhost');
		});

        document.getElementById('loginBtn').addEventListener('click', function() {
            var nickName = document.getElementById('nicknameInput').value;
            if (nickName.trim().length != 0) {
                that.socket.emit('userLogin', nickName.trim());
            } else {
                document.getElementById('nicknameInput').focus();
            };
        }, false);

        document.getElementById('nicknameInput').addEventListener('keyup', function(e) {
            if (e.keyCode == 13) {
                var nickName = document.getElementById('nicknameInput').value;
                if (nickName.trim().length != 0) {
                    that.socket.emit('userLogin', nickName.trim());
                };
            };
        }, false);


//  lobby handling

        this.socket.on('youareroomhost', function(roomhostIndicator,gameModeIndicator_name) {
            flag_imroomhost = roomhostIndicator;
            gameMode.name = gameModeIndicator_name;
            that.lobby_showgameInfo(gameMode);
            that.socket.emit('pulluserList');
        });

        this.socket.on('senduserList', function(users) {
            that._debug_feedback('showing userList...');
            users_local = users;
            that.lobby_showuserList(users);
        });

        this.socket.on('gameModeChanged', function(gameModeIndicator_name) {
            gameMode.name = gameModeIndicator_name;
            that.systemLog('游戏模式变更为：' + gameMode.title());
            that._showgameInfo(gameMode);
            that.lobby_showuserList(users);
        });

        document.getElementById('gameModeOption').addEventListener('change', function() {
            var option_name = document.getElementById('gameModeOption');
            gameMode.name = option_name.value;
            that.socket.emit('gameModeChange', gameMode.name);
            that._displayDescription(gameMode);
        },false);

        document.getElementById('startBtn').addEventListener('click', function() {
            that.socket.emit('gameStart');
        },false);


// gameplay

        this.socket.on('gameStarted', function(users) {           
            that.systemLog('游戏开始了！');
            users_local = users;
            that.gameplay_showgameInfo(gameMode);
            that.gameplay_showuserList(users);
            that.socket.emit('pullInstruction');
        });

        this.socket.on('sendInstruction', function(role, teammates) {    
            myRole = role;
            document.getElementById('startBtn').style.display = 'none';
            document.getElementById('confirmBtn').style.display = 'block';
            document.getElementById('gameInstructionContent').innerHTML = gameMode.roleInstruction(role);
            
            if (teammates.length > 0) {
                var teammatesInstruction = document.createElement('p');
                teammatesInstruction.innerHTML = '你的队友是：' +  teammates;
            }

            that.gameplay_addtargetCol(users_local);
        });

        this.socket.on('teammates_target', function(targetIndex, teammatesIndex, users) {
            cell_target = document.getElementById('target'+ teammatesIndex);
            console.log(users);
            cell_target.innerHTML = users[targetIndex];
        });


//  chat handling

        this.socket.on('newMsg',function(user,msg,color) {
            that._displayNewMsg(user,msg,color);
        });

        document.getElementById('sendBtn').addEventListener('click',function() {
        	var messageInput = document.getElementById('messageInput'),
        	msg = messageInput.value,
        	color = document.getElementById('colorStyle').value;
        	messageInput.value = '';
        	messageInput.focus();
        	if (msg.trim().length != 0) {
    		that.socket.emit('postMsg',msg,color);
        		that._displayNewMsg('me',msg,color);
        		return;
        	}
        },false);

        document.getElementById('messageInput').addEventListener('keyup', function(e) {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value,
                color = document.getElementById('colorStyle').value;
            if (e.keyCode == 13 && msg.trim().length != 0) {
                messageInput.value = '';
                that.socket.emit('postMsg', msg, color);
                that._displayNewMsg('me', msg, color);
            };
        }, false);

	}

}

//  functions used in Lobby.init()

Lobby.prototype.systemLog = function(log) {
        var logmsg = document.createElement('p');
        container = document.getElementById('historyMsg');
        logmsg.innerHTML = 'SYSTEM: ' + log;
        logmsg.style.color = '#6699ff';
        container.appendChild(logmsg);
        container.scrollTop = container.scrollHeight;
}

Lobby.prototype._displayNewMsg = function(user, msg, color) {
    var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
}

Lobby.prototype._displayDescription = function(gameMode) {
    var msgToDisplay = document.getElementById('gameDescription');
    this._debug_feedback('showing gameMode.description');
    this._debug_feedback('it should be ' + gameMode.description());
    msgToDisplay.innerHTML = gameMode.description();
}

Lobby.prototype.lobby_showgameInfo = function(gameMode) {
    if (flag_imroomhost == 1) {
        this._debug_feedback('I am host now, should display hostWrapper.');
        document.getElementById('roomhostWrapper').style.display = "block";
        document.getElementById('roomguestWrapper').style.display = "none";
    } else {
        document.getElementById('roomhostWrapper').style.display = "none";
        document.getElementById('roomguestWrapper').style.display = "block";
        this._debug_feedback('I am not host, generate gameModeTitle.');
        
        var gameModeTitle = document.getElementById('roomguestWrapper').children[0];
        /**/
        gameModeTitle.innerHTML = '游戏模式：' + gameMode.title();
    }
    this._displayDescription(gameMode);
}

Lobby.prototype.lobby_showuserList = function(users) {
    var table = document.getElementById('playerList');
    var old_tableBody = table.childNodes[3];
    var new_tableBody = document.createElement('tbody');

    if (flag_imroomhost == 1) {
        for (var i = 0; i < users.length; i++) {
                var row = document.createElement('tr');
                
                // <td width = "150px"> i+1 </td>
                var cell_number = document.createElement('td');
                cell_number.appendChild(document.createTextNode(i+1));
                row.appendChild(cell_number);
                
                // <td width = "150px"> users[i] </td>
                var cell_id = document.createElement('td');
                cell_id.appendChild(document.createTextNode(users[i]));
                row.appendChild(cell_id);

                // <td width = "150px"> <button id = "kicki"> kick </button> </td>
                var cell_kickBtn = document.createElement('td');
                var kickBtn = document.createElement('button');
                kickBtn.innerHTML = 'kick';
                kickBtn.setAttribute("id","kick" + i);
                kickBtn.setAttribute("class","kickBtn");
                cell_kickBtn.appendChild(kickBtn);
                row.appendChild(cell_kickBtn);

                kickBtn.addEventListener('click', function() {
                    // added the kick functionality later, be nice!
                },false);

                new_tableBody.appendChild(row);
        }
        table.replaceChild(new_tableBody,old_tableBody);

        
        if (users.length < gameMode.numberofPlayer()) {
            document.getElementById('startBtn').disabled = true;
            document.getElementById('gameInstructionContent').innerHTML = '人数未达到要求';
        } else {
            document.getElementById('startBtn').disabled = false;
            document.getElementById('gameInstructionContent').innerHTML = '人数已达到要求';
        }
        document.getElementById('startBtn').style.display = 'block';

    } else {
        for (var i = 0; i < users.length; i++) {
                var row = document.createElement('tr');
                
                // <td width = "150px"> i+1 </td>
                var cell_number = document.createElement('td');
                cell_number.setAttribute("width","150px");
                cell_number.appendChild(document.createTextNode(i+1));
                row.appendChild(cell_number);
                
                // <td width = "150px"> users[i] </td>
                var cell_id = document.createElement('td');
                cell_id.setAttribute("width","150px");
                cell_id.appendChild(document.createTextNode(users[i]));
                row.appendChild(cell_id);

                // <td width = "150px"> <button id = "kicki"> kick </button> </td>
                var cell_kickBtn = document.createElement('td');
                cell_kickBtn.setAttribute("width","150px");
                cell_kickBtn.appendChild(document.createTextNode('N/A'));
                row.appendChild(cell_kickBtn);

                new_tableBody.appendChild(row);
        }
        table.replaceChild(new_tableBody,old_tableBody);
        //table.children[1].children[0].children[2].innerHTML = '房主';
        console.log(table.children[1].children[0]);
        
        if (users.length < gameMode.numberofPlayer()) {
            document.getElementById('gameInstructionContent').innerHTML = '人数未达到要求';
        } else {
            document.getElementById('gameInstructionContent').innerHTML = '等待房主开始游戏';
        }
        document.getElementById('startBtn').style.display = 'none';
    }

}

Lobby.prototype._debug_feedback = function(log) {
    if (_debugOn == 1) {
        var logmsg = document.createElement('p');
        logmsg.innerHTML = log;
        document.getElementById('historyMsg').appendChild(logmsg);
    }
}



/*=======================================================================
    the Gameplay class

        it handles the gameplay functionality on the client/browser side.

=========================================================================*/


Lobby.prototype.gameplay_showgameInfo = function(gameMode) {

    document.getElementById('roomhostWrapper').style.display = "none";
    document.getElementById('roomguestWrapper').style.display = "block";
    
    var gameModeTitle = document.getElementById('roomguestWrapper').children[0];

    gameModeTitle.innerHTML = '游戏模式：' + gameMode.title();

    this._displayDescription(gameMode);
}

Lobby.prototype.gameplay_showuserList = function(users) {
    var table = document.getElementById('playerList');
        old_tableBody = table.children[1];
        new_tableBody = document.createElement('tbody');
        that = this;

    for (var i = 0; i < users.length; i++) {
        (function(i) {
            var row = document.createElement('tr');
        
            // <td width = "150px"> i+1 </td>
            var cell_number = document.createElement('td');
            cell_number.appendChild(document.createTextNode(i+1));
            row.appendChild(cell_number);
            
            // <td width = "150px"> users[i] </td>
            var cell_id = document.createElement('td');
            cell_id.appendChild(document.createTextNode(users[i]));
            row.appendChild(cell_id);

            // <td width = "150px"> <button id = "kicki"> kick </button> </td>
            var cell_kickBtn = document.createElement('td');
            var kickBtn = document.createElement('button');
            kickBtn.innerHTML = '选择此人';
            kickBtn.setAttribute("id","pick" + i);
            kickBtn.setAttribute("class","kickBtn");
            cell_kickBtn.appendChild(kickBtn);
            row.appendChild(cell_kickBtn);

            kickBtn.addEventListener('click', function() {
                console.log('i = '+ i );
                that.systemLog('picked ' + (i+1));
                that.socket.emit('pickTarget', i, myRole);   
            },false);

            new_tableBody.appendChild(row);
        }(i));
    }
        
    table.replaceChild(new_tableBody,old_tableBody);

}

            
Lobby.prototype.gameplay_addtargetCol = function(users) {

    var tbody = document.getElementById('playerList').children[1]
    var thead = document.getElementById('playerList').children[0];

    thead_mypick = document.createElement('th');
    thead_mypick.innerHTML = 'TA选择的目标';
    thead.children[0].appendChild(thead_mypick);

    for (var i = 0; i < users.length; i++) {
        var row = tbody.children[i];
        
        var cell_target = document.createElement('td');
        cell_target.appendChild(document.createTextNode(' '));
        cell_target.setAttribute('id','target' + i);
        row.appendChild(cell_target);
    }
}









