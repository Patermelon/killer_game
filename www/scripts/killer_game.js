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
        gameMode = '8';
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
			document.getElementById('info').textContent = 'This ID already exists.';
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

        this.socket.on('youareroomhost', function(roomhostIndicator,gameModeIndicator) {
            flag_imroomhost = roomhostIndicator;
            gameMode = gameModeIndicator;

            //that._debug_feedback('After knowing the host, showgameInfo');
            that._showgameInfo(gameMode);
            that.socket.emit('pullplayerList');
        });

        this.socket.on('sendplayerList', function(users) {
            that._debug_feedback('showing playerList...');
            that._showplayerList(users);
        });

        this.socket.on('gameModeChanged', function(gameModeIndicator) {
            gameMode = gameModeIndicator;
            // call chat to indicate change of gameMode
            that._debug_feedback('gameModeChanged to ' + gameModeIndicator);
            that._showgameInfo(gameMode);
        });

        document.getElementById('gameModeOption').addEventListener('change', function() {
            var option_name = document.getElementById('gameModeOption');
            that.socket.emit('gameModeChange', option_name.value);
            gameMode = option_name.value;
            that._displayDescription(option_name.value);
        },false);

//  chat handling

        this.socket.on('newMsg',function(user,msg,color){
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

    switch (gameMode) {
        case '7':
            msgToDisplay.innerHTML = '2警2杀1医2平';
            break;
        case '8':
            msgToDisplay.innerHTML = '2警2杀1医1狙2平';
            break;
        default :
    }
}

Lobby.prototype._showgameInfo = function(gameMode) {
    if (flag_imroomhost == 1) {
        this._debug_feedback('I am host now, should display hostWrapper.');
        document.getElementById('roomhostWrapper').style.display = "block";
        document.getElementById('roomguestWrapper').style.display = "none";
        this._displayDescription(gameMode);
    } else {
        document.getElementById('roomhostWrapper').style.display = "none";
        document.getElementById('roomguestWrapper').style.display = "block";
        this._debug_feedback('generate gameModeName..');
        
        var gameModeName = document.getElementById('roomguestWrapper').children[0];
        /**/
        switch (gameMode) {
            case '7':
                gameModeName.innerHTML = '游戏模式：7人局';
                break;
            case '8':
                gameModeName.innerHTML = '游戏模式：8人局';
                break;
            default :
        }

        this._displayDescription(gameMode);
    }
}

Lobby.prototype._showplayerList = function(users) {
    var table = document.getElementById('playerList');
    var old_tableBody = table.childNodes[3];
    var new_tableBody = document.createElement('tbody');

    if (flag_imroomhost == 1) {
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
                var kickBtn = document.createElement('button');
                kickBtn.innerHTML = 'kick';
                kickBtn.setAttribute("id","kick" + i);
                kickBtn.setAttribute("style", "width: 150px; height: 40px; background-color: #cccccc;");
                cell_kickBtn.appendChild(kickBtn);
                row.appendChild(cell_kickBtn);

                new_tableBody.appendChild(row);
        }
        table.replaceChild(new_tableBody,old_tableBody);
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
        table.children[1].children[0].children[2].innerHTML = '房主';
    }

}


Lobby.prototype._debug_feedback = function(log) {
    if (_debugOn == 1) {
        var logmsg = document.createElement('p');
        logmsg.innerHTML = log;
        document.getElementById('historyMsg').appendChild(logmsg);
    }
}

Lobby.prototype.systemLog = function(log) {
        var logmsg = document.createElement('p');
        logmsg.innerHTML = 'SYSTEM: ' + log;
        logmsg.style.color = 'red';
        document.getElementById('historyMsg').appendChild(logmsg);
}


/*=======================================================================
    the Gameplay class

        it handles the gameplay functionality on the client/browser side.

=========================================================================*/

var Gameplay = function() {
    this.socket = null;
    //var ???
}//Gameplay constructor

Gameplay.prototype = {
    init: function() {
        var that = this;
    }
}














