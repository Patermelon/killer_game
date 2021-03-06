// a variable to toggle the _debug_feedback()
var _debugOn = 0;

// upon loading, initializing the game
window.onload = function() {
    var game = new Game();
    game.init();
}

/*========================================================
    the Game class

        handles all game functionalities

==========================================================*/

var Game = function() {
    this.socket = null;
    var flag_imroomhost = 0;
        myusername = '';
        users_local = [];
        aliveIndex = [];
        gameMode = new GameMode();
        myRole = '';
        myTarget = -1;
        myAmmo = 1;
}//Game constructor


Game.prototype = {
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
            that.systemLog('加入了房间', id);
            that.socket.emit('amIroomhost');
		});

		this.socket.on('system',function(id, action){
			var msg = (action == 'login' ? ' 加入了房间' : ' 退出了房间');
            that.systemLog(msg, id);
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
            that.lobby_showgameInfo(gameMode);
            that.lobby_showuserList(users_local);
        });

        document.getElementById('gameModeOption').addEventListener('change', function() {
            var option_name = document.getElementById('gameModeOption');
            gameMode.name = option_name.value;
            that.socket.emit('gameModeChange', gameMode.name);
        },false);

        document.getElementById('startBtn').addEventListener('click', function() {
            if (users_local.length > gameMode.numberofPlayer()) {
                var preceed = window.alert('房间现有人数大于游戏人数，请踢出部分玩家或改变游戏模式。');
            } else {
                that.socket.emit('gameStart');
            }
        },false);

        this.socket.on('gotKicked', function(userIndex) {
            console.log('I got kicked! OMG');
            if (users_local.indexOf(myusername) == userIndex) {
                window.alert('你被踢出了房间');
                window.location.reload();
            }
        });


// gameplay

        this.socket.on('gameStarted', function(users) {           
            document.getElementById('historyMsg').innerHTML = '';
            document.getElementById('myRole').innerHTML = '我的身份';
            that.systemLog('游戏开始了！');
            
            //initializing variables
            users_local = users;
            that.gameplay_aliveIndex_init();
            myRole = -1;
            myAmmo = 1;
            
            //preparing game board
            that.gameplay_showgameInfo(gameMode);
            
            //ask for instruction from server
            that.socket.emit('pullInstruction');
        });

        this.socket.on('sendInstruction', function(role, teammates) {    
            myRole = role;

            that.gameplay_showuserList_night(users_local);
            that.gameplay_addtargetCol(users_local);

            if (teammates.length > 0) {
                var teammatesInfo = document.createElement('p');
                teammatesInfo.innerHTML = '你的队友是：' +  teammates;
                document.getElementById('gameInstructionContent').appendChild(teammatesInfo);
            }

            document.getElementById('myRole').innerHTML = gameMode.roleName(myRole);
        });

        this.socket.on('teammates_target', function(targetIndex, teammatesIndex) {
            cell_target = document.getElementById('target'+ teammatesIndex);
            console.log(users_local);
            cell_target.innerHTML = users_local[targetIndex];
        });

        document.getElementById('confirmBtn').addEventListener('click', function() {
            console.log('confirm button is pushed, myTarget= '+ myTarget);


            if (myTarget == -1 && myRole != 4) {
                window.alert('必须选择一个目标！');
                console.log('myRole = ' + myRole);
            } else if ( myTarget != -1 && myRole == 4 && myAmmo == 0) {
                window.alert('你已经开过枪了！');
                console.log('2');
            }
            else {
                that.socket.emit('confirmTarget', myTarget);
                that.systemLog('你选择了 ' + (myTarget+1) + '号');
            } 
        });

        this.socket.on('teammates_target_fixed', function(targetIndex, submitterIndex) {
            if (submitterIndex != users_local.indexOf(myusername)) {
                cell_target = document.getElementById('target'+ submitterIndex);
                cell_target.innerHTML += '(submitted)';
            }
        });

        this.socket.on('target_fixed', function() {
            for (var i = 0; i < users_local.length; i++) {
                pickBtn = document.getElementById('pick' + i);
                pickBtn.disabled = true;
            }
            document.getElementById('target'+ users_local.indexOf(myusername)).innerHTML += '(submitted)';
        });        

        this.socket.on('waitforalltoRespond', function() {
            document.getElementById('confirmBtn').disabled = true;
            document.getElementById('gameInstructionContent').innerHTML = '等待其他人完成动作...';
        });

        this.socket.on('killerConfirm', function(isKiller, cops_target_name) {
            console.log("isKiller = " + isKiller);
            if (isKiller == 1) {
                that.systemLog(cops_target_name +'是杀手');
            } else {
                that.systemLog(cops_target_name +'不是是杀手');
            }
        });

        this.socket.on('disagreement', function(mutiTarget) {
            that.systemLog('目标：（' + mutiTarget + '），不一致，行动作废。');
        });

        this.socket.on('killConfirm', function(victim_name) {
            that.systemLog( '确认试图谋杀：'+ victim_name );
        });

        this.socket.on('snipeDone', function() {
            myAmmo = 0;
        });

        this.socket.on('deathReport', function(deathpool) {
            deathMsg = '昨晚死亡的是：';
            deathpool.forEach(function(i) {
                deathMsg += (i+1) + '号 ';
            });
            document.getElementById('gameInstructionContent').innerHTML = '请辩论后投票';
            that.systemLog(deathMsg);
            deathpool.forEach(function(i) {
                aliveIndex[i] = 0;
            });
            that.gameplay_showuserList_day(users_local);
            that.gameplay_addtargetCol(users_local);
        });

        this.socket.on('win', function(win_flag, playerList) {
            switch (win_flag) {
                case 1:
                    window.alert('正义胜利');
                    break;
                case 2:
                    window.alert('杀手胜利');
                    break;
                case 3:
                    window.alert('平局');
                    break;
                default :
            }
            debugger;
            that.endgame_showuserList(playerList);
        });

        document.getElementById('restartBtn').addEventListener('click',function() {
            that.socket.emit('amIroomhost');
            document.getElementById('historyMsg').innerHTML = '';
        },false);

        document.getElementById('voteBtn').addEventListener('click',function() {
            
            if (myTarget == -1) {
                window.alert('必须选择一个目标！');
            } else {
                that.systemLog('你选择了 ' + (myTarget+1) + '号');
                that.socket.emit('confirmVote', myTarget);
                console.log('submitted the vote:' + myTarget);
            }
        });

        document.getElementById('sawvoteresultBtn').addEventListener('click', function() {
            that.socket.emit('sawvoteResult');
        });

        this.socket.on('waitforotherVotes', function() {
            document.getElementById('voteBtn').disabled = true;
            document.getElementById('gameInstructionContent').innerHTML = '等待其他人投票...'; 
        });

        this.socket.on('voteResult', function(votes) {
            that.gameplay_showvoteResult(votes);
            document.getElementById('gameInstructionContent').innerHTML = '请确认投票结果';
        });

        this.socket.on('waitforothervoteResult', function() {
            document.getElementById('sawvoteresultBtn').disabled = true;
            document.getElementById('gameInstructionContent').innerHTML = '等待其他人确认投票结果...'; 
        });

        this.socket.on('revote', function(convict) {
            debugger;
            that.gameplay_showRevote(convict, users_local);
            document.getElementById('gameInstructionContent').innerHTML = '平票，辩论后再次投票'; 
        });

        this.socket.on('enterNight', function(convict) {
            convict.forEach(function(i) {
                that.systemLog(users_local[i]+ ' 被票死了。');
            });
            convict.forEach(function(i) {
                aliveIndex[i] = 0;
            });
            that.socket.emit('pullInstruction');
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

//  functions used in Game.init()

Game.prototype.systemLog = function(log, id) {
        var logmsg = document.createElement('p');
        container = document.getElementById('historyMsg');
        if (typeof id == 'undefined') {
            logmsg.innerHTML = 'SYSTEM: ' + log;
        } else {
            logmsg.innerHTML = 'SYSTEM: ' + '<span class = \'name\' >' + id + '</span> ' + log;
        }
        
        logmsg.style.color = '#6699ff';
        container.appendChild(logmsg);
        container.scrollTop = container.scrollHeight;
}

Game.prototype._displayNewMsg = function(user, msg, color) {
    var container = document.getElementById('historyMsg'),
            msgToDisplay = document.createElement('p'),
            date = new Date().toTimeString().substr(0, 8);
        msgToDisplay.style.color = color || '#000';
        msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
}

Game.prototype._displayDescription = function(gameMode) {
    var msgToDisplay = document.getElementById('gameDescription');
    this._debug_feedback('showing gameMode.description');
    this._debug_feedback('it should be ' + gameMode.description());
    msgToDisplay.innerHTML = gameMode.description();
}

Game.prototype.lobby_showgameInfo = function(gameMode) {
    if (flag_imroomhost == 1) {
        this._debug_feedback('I am host now, should display hostWrapper.');
        document.getElementById('roomhostWrapper').style.display = "block";
        document.getElementById('roomguestWrapper').style.display = "none";
        document.getElementById('option'+gameMode.name).setAttribute('selected','selected');
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

Game.prototype.lobby_showuserList = function(users) {
    var table = document.getElementById('playerList');
    var old_tableBody = table.children[1];
    var new_tableBody = document.createElement('tbody');
    var theadrow = table.children[0].children[0];
    if (typeof theadrow.children[3] != 'undefined') {
        theadrow.removeChild(theadrow.children[3]);
    }
    theadrow.children[2].innerHTML = 'Ops';

    that = this;
    if (flag_imroomhost == 1) {
        for (var i = 0; i < users.length; i++) {
            (function(i) { 
                var row = document.createElement('tr');
                
                var cell_number = document.createElement('td');
                cell_number.appendChild(document.createTextNode(i+1));
                row.appendChild(cell_number);
                
                var cell_id = document.createElement('td');
                cell_id.appendChild(document.createTextNode(users[i]));
                row.appendChild(cell_id);

                var cell_pickBtn = document.createElement('td');
                var pickBtn = document.createElement('button');
                pickBtn.innerHTML = 'kick';
                pickBtn.setAttribute("id","kick" + i);
                pickBtn.setAttribute("class","pickBtn");
                cell_pickBtn.appendChild(pickBtn);
                row.appendChild(cell_pickBtn);

                pickBtn.addEventListener('click', function() {
                   that.socket.emit('kickPlayer', i);
                },false);

                new_tableBody.appendChild(row);
            }(i));
        }
        table.replaceChild(new_tableBody,old_tableBody);
       
        if (users.length < gameMode.numberofPlayer()) {
            document.getElementById('startBtn').disabled = true;
            document.getElementById('gameInstructionContent').innerHTML = '人数未达到要求';
        } else {
            document.getElementById('startBtn').disabled = false;
            document.getElementById('gameInstructionContent').innerHTML = '人数已达到要求';
        }
        document.getElementById('startBtn').className = 'mainBtnOn';

    } else {
        for (var i = 0; i < users.length; i++) {
                var row = document.createElement('tr');
                
                var cell_number = document.createElement('td');
                cell_number.setAttribute("width","150px");
                cell_number.appendChild(document.createTextNode(i+1));
                row.appendChild(cell_number);
                
                var cell_id = document.createElement('td');
                cell_id.setAttribute("width","150px");
                cell_id.appendChild(document.createTextNode(users[i]));
                row.appendChild(cell_id);

                var cell_pickBtn = document.createElement('td');
                cell_pickBtn.setAttribute("width","150px");
                cell_pickBtn.appendChild(document.createTextNode('N/A'));
                row.appendChild(cell_pickBtn);

                new_tableBody.appendChild(row);
        }
        table.replaceChild(new_tableBody,old_tableBody);
        table.children[1].children[0].children[2].innerHTML = '房主';
        
        if (users.length < gameMode.numberofPlayer()) {
            document.getElementById('gameInstructionContent').innerHTML = '人数未达到要求';
        } else {
            document.getElementById('gameInstructionContent').innerHTML = '等待房主开始游戏';
        }
        document.getElementById('startBtn').className = 'mainBtnOff';
    }
    document.getElementById('confirmBtn').className = 'mainBtnOff';
    document.getElementById('restartBtn').className = 'mainBtnOff';
    document.getElementById('voteBtn').className = 'mainBtnOff';
    document.getElementById('sawvoteresultBtn').className = 'mainBtnOff';
}

Game.prototype._debug_feedback = function(log) {
    if (_debugOn == 1) {
        var logmsg = document.createElement('p');
        logmsg.innerHTML = log;
        document.getElementById('historyMsg').appendChild(logmsg);
    }
}



/*=======================================================================
    the Gameplay module

        it handles the gameplay functionality on the client/browser side.

=========================================================================*/


Game.prototype.gameplay_showgameInfo = function(gameMode) {

    document.getElementById('roomhostWrapper').style.display = "none";
    document.getElementById('roomguestWrapper').style.display = "block";
    
    var gameModeTitle = document.getElementById('roomguestWrapper').children[0];

    gameModeTitle.innerHTML = '游戏模式：' + gameMode.title();

    this._displayDescription(gameMode);
}

Game.prototype.gameplay_showuserList_night = function(users) {
    var table = document.getElementById('playerList');
        old_tableBody = table.children[1];
        new_tableBody = document.createElement('tbody');
        that = this;

    var theadrow = table.children[0].children[0];
        if (typeof theadrow.children[3] != 'undefined') {
           theadrow.removeChild(theadrow.children[3]);;
        }

    for (var i = 0; i < users.length; i++) {
        (function(i) {
            var row = document.createElement('tr');
        
            var cell_number = document.createElement('td');
            if (aliveIndex[i] == 1) {
                cell_number.appendChild(document.createTextNode(i+1));
            } else {
                cell_number.appendChild(document.createTextNode('X'));
            }
            row.appendChild(cell_number);

            var cell_id = document.createElement('td');
            cell_id.appendChild(document.createTextNode(users[i]));
            row.appendChild(cell_id);

            var cell_pickBtn = document.createElement('td');
            var pickBtn = document.createElement('button');
            if (aliveIndex[i] == 1) {
                pickBtn.innerHTML = '选择此人';

                pickBtn.addEventListener('click', function() {
                    that.socket.emit('pickTarget', i, myRole);
                    myTarget = i;
                },false);
                pickBtn.setAttribute("class","pickBtn");
            } else {
                pickBtn.innerHTML = '已死亡';
                pickBtn.disabled = true;
            }
            pickBtn.setAttribute("id","pick" + i);
            cell_pickBtn.appendChild(pickBtn);
            row.appendChild(cell_pickBtn);

            new_tableBody.appendChild(row);
        }(i));
    }

    document.getElementById('gameInstructionContent').innerHTML = gameMode.roleInstruction(myRole);
        
    table.replaceChild(new_tableBody,old_tableBody);
    document.getElementById('startBtn').className = 'mainBtnOff';
    document.getElementById('restartBtn').className = 'mainBtnOff';
    document.getElementById('voteBtn').className = 'mainBtnOff';
    document.getElementById('sawvoteresultBtn').className = 'mainBtnOff';

    if (aliveIndex[users_local.indexOf(myusername)] == 1) {
        document.getElementById('confirmBtn').className = 'mainBtnOn';
        document.getElementById('confirmBtn').disabled = false;
    } else {
        document.getElementById('confirmBtn').className = 'mainBtnOff';
        document.getElementById('gameInstructionContent').innerHTML = '你已经死了';
    }

    myTarget = -1;
}

Game.prototype.gameplay_showuserList_day = function(users) {
    var table = document.getElementById('playerList');
        old_tableBody = table.children[1];
        new_tableBody = document.createElement('tbody');
        that = this;

        var theadrow = table.children[0].children[0];
        if (typeof theadrow.children[3] != 'undefined') {
           theadrow.removeChild(theadrow.children[3]);;
        }

    for (var i = 0; i < users.length; i++) {
        (function(i) {
            var row = document.createElement('tr');
            
            var cell_number = document.createElement('td');
            if (aliveIndex[i] == 1) {
                cell_number.appendChild(document.createTextNode(i+1));
            } else {
                cell_number.appendChild(document.createTextNode('X'));
            }
            row.appendChild(cell_number);

            
            var cell_id = document.createElement('td');
            cell_id.appendChild(document.createTextNode(users[i]));
            row.appendChild(cell_id);

            var cell_pickBtn = document.createElement('td');
            var pickBtn = document.createElement('button');
            if (aliveIndex[i] == 1) {
                pickBtn.innerHTML = '选择此人';

                pickBtn.addEventListener('click', function() {
                    that.socket.emit('pickTarget', i, myRole);
                    myTarget = i;
                },false);
                pickBtn.setAttribute("class","pickBtn");
            } else {
                pickBtn.innerHTML = '已死亡';
                pickBtn.disabled = true;
            }
            pickBtn.setAttribute("id","pick" + i);

            cell_pickBtn.appendChild(pickBtn);
            row.appendChild(cell_pickBtn);

            new_tableBody.appendChild(row);
        }(i));
    }   
    table.replaceChild(new_tableBody,old_tableBody);

    document.getElementById('startBtn').className = 'mainBtnOff';
    document.getElementById('restartBtn').className = 'mainBtnOff';
    document.getElementById('confirmBtn').className = 'mainBtnOff';
    document.getElementById('sawvoteresultBtn').className = 'mainBtnOff';

    if (aliveIndex[users_local.indexOf(myusername)] == 1) {
        document.getElementById('voteBtn').className = 'mainBtnOn';
        document.getElementById('voteBtn').disabled = false;
    } else {
        document.getElementById('voteBtn').className = 'mainBtnOff';
        document.getElementById('gameInstructionContent').innerHTML = '你已经死了';
    }

    myTarget = -1;
    debugger;
}
            
Game.prototype.gameplay_addtargetCol = function(users) {

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

Game.prototype.gameplay_aliveIndex_init = function() {
    aliveIndex = [];
    for (var i = 0; i < users_local.length; i++) {
        aliveIndex.push(1);
    }
}

Game.prototype.endgame_showuserList = function(playerList) {
    var table = document.getElementById('playerList');
        old_tableBody = table.children[1];
        new_tableBody = document.createElement('tbody');
        that = this;

        table.children[0].children[0].children[2].innerHTML = '身份';
        var theadrow = table.children[0].children[0];
        if (typeof theadrow.children[3] != 'undefined') {
            theadrow.removeChild(theadrow.children[3]);
        }

    for (var i = 0; i < playerList.length; i++) {

        var row = document.createElement('tr');
    
        var cell_number = document.createElement('td');
        if (playerList[i].isAlive == 1) {
            cell_number.appendChild(document.createTextNode(i+1));
        } else {
            cell_number.appendChild(document.createTextNode('X'));
        }
        row.appendChild(cell_number);

        
        // <td width = "150px"> users[i] </td>
        var cell_id = document.createElement('td');
        cell_id.appendChild(document.createTextNode(playerList[i].name));
        row.appendChild(cell_id);

        // <td width = "150px"> <button id = "kicki"> kick </button> </td>
        var cell_role = document.createElement('td');
        cell_role.appendChild(document.createTextNode(gameMode.roleName(playerList[i].role)));
        row.appendChild(cell_role);

        new_tableBody.appendChild(row);

    }
        
    table.replaceChild(new_tableBody,old_tableBody);

    document.getElementById('gameInstructionContent').innerHTML = '确认游戏结果后返回准备界面';
    
    document.getElementById('restartBtn').className = 'mainBtnOn';
    document.getElementById('startBtn').className = 'mainBtnOff';
    document.getElementById('voteBtn').className = 'mainBtnOff';
    document.getElementById('confirmBtn').className = 'mainBtnOff';
    document.getElementById('sawvoteresultBtn').className = 'mainBtnOff';
}

Game.prototype.gameplay_showvoteResult = function(votes) {
    var that = this;
    for (var i = 0; i < votes.length; i++) {
        if (votes[i] != -1) {
            document.getElementById('target'+i).innerHTML = users_local[votes[i]];
        } else {
            document.getElementById('target'+i).innerHTML = 'N/A';
        }
    }
    
    if (aliveIndex[users_local.indexOf(myusername)] == 1) {
        document.getElementById('voteBtn').className = 'mainBtnOff';
        document.getElementById('sawvoteresultBtn').className = 'mainBtnOn';
        document.getElementById('sawvoteresultBtn').disabled = false;
    } else {
        document.getElementById('gameInstructionContent').innerHTML = '你已经死了';
    }
}

Game.prototype.gameplay_showRevote = function(convict, users) {
    var table = document.getElementById('playerList');
        old_tableBody = table.children[1];
        new_tableBody = document.createElement('tbody');
        that = this;

        var theadrow = table.children[0].children[0];
        if (typeof theadrow.children[3] != 'undefined') {
           theadrow.children[3].innerHTML = "TA的选择";
        }

    for (var i = 0; i < users.length; i++) {
        (function(i) {
            var row = document.createElement('tr');
            
            var cell_number = document.createElement('td');
            if (aliveIndex[i] == 1) {
                cell_number.appendChild(document.createTextNode(i+1));
            } else {
                cell_number.appendChild(document.createTextNode('X'));
            }
            row.appendChild(cell_number);

            
            var cell_id = document.createElement('td');
            cell_id.appendChild(document.createTextNode(users[i]));
            row.appendChild(cell_id);

            var cell_pickBtn = document.createElement('td');
            var pickBtn = document.createElement('button');
            if (convict.indexOf(i) != -1) {
                
                pickBtn.innerHTML = '选择此人';

                pickBtn.addEventListener('click', function() {
                    that.socket.emit('pickTarget', i, myRole);
                    myTarget = i;
                },false);
                pickBtn.setAttribute("class","pickBtn");
            } else {
                pickBtn.innerHTML = '';
                pickBtn.disabled = true;
            }
            pickBtn.setAttribute("id","pick" + i);
            cell_pickBtn.appendChild(pickBtn);
            row.appendChild(cell_pickBtn);

            var cell_target = document.createElement('td');
            cell_target.appendChild(document.createTextNode(' '));
            cell_target.setAttribute('id','target' + i);
            row.appendChild(cell_target);

            new_tableBody.appendChild(row);
        }(i));
    }   
    table.replaceChild(new_tableBody,old_tableBody);

    document.getElementById('startBtn').className = 'mainBtnOff';
    document.getElementById('restartBtn').className = 'mainBtnOff';
    document.getElementById('confirmBtn').className = 'mainBtnOff';
    document.getElementById('sawvoteresultBtn').className = 'mainBtnOff';

    if (aliveIndex[users_local.indexOf(myusername)] == 1) {
        document.getElementById('voteBtn').className = 'mainBtnOn';
        document.getElementById('voteBtn').disabled = false;
    } else {
        document.getElementById('voteBtn').className = 'mainBtnOff';
        document.getElementById('voteBtn').disabled = true;
        document.getElementById('gameInstructionContent').innerHTML = '你已经死了';
    }

    myTarget = -1;
}



