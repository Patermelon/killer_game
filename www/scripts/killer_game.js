window.onload = function() {
    var hichat = new Game();
    hichat.init();
};
var Game = function() {
    this.socket = null;
};
Game.prototype = {
    init: function() {
        var that = this;
        this.socket = io.connect();
        this.socket.on('connect', function() {
            document.getElementById('info').textContent = 'Please pick an ID';
            document.getElementById('nickWrapper').style.display = 'block';
            document.getElementById('nicknameInput').focus();
        });

		this.socket.on('nickExisted',function(){
			document.getElementById('info').textContent = 'This ID already exists.';
		});

		this.socket.on('loginSuccess',function(){
			document.title = '游戏中| ' + document.getElementById('nicknameInput').value;
			document.getElementById('loginWrapper').style.display = 'none';
			document.getElementById('messageInput').focus();
		});

		this.socket.on('system',function(nickName,userCount,type){
			var msg = nickName + (type == 'login' ? ' joined' : ' left');
			var p = document.createElement('p');
			p.textContent = msg;
			document.getElementById('historyMsg').appendChild(p);
			document.getElementById('status').textContent = userCount + (userCount > 1 ? ' users' : ' user') + ' online';
		});

		//this.socket.on('newMsg',function(user,msg,color){
		//	that._displayNewMsg(user,msg,color);
		//});
	}
	/*
	_displayNewMsg: function(user, msg, color){
		var container = document.getElementById('historyMsg');
		msgToDisplay = document.createElement('p');
		date = new Date().toTimeString().substr(0,8);

		msgToDisplay.style.color = color || '#000';
		msgToDisplay.innerHTML = user + '<span class="timespan">(' + date + '): </span>' + msg;
        container.appendChild(msgToDisplay);
        container.scrollTop = container.scrollHeight;
	};*/
}





