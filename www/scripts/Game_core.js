// the Player class to store the players' info used in GAME_CORE
var Player = function(playerId) {
    this.name = playerId;
    this.isAlive = 1;
    this.role = 0;
    this.toxincount = 0;
};

// method of Player
Player.prototype.kill = function() {
    this.isAlive = 0;
};


Array.prototype.shuffle = function() {
	var input = this;

	for (var i = input.length -1 ; i >= 0; i--) {

		var randomIndex = Math.floor(Math.random()*(i+1));
		var pickedItem = input[randomIndex];

		input[randomIndex] = input[i];
		input[i] = pickedItem;
	}

	return input;
}

function playerListInit(users, gameModeIndicator) {
	
	var playerList = [];
	var indexArray = [];

	for (var i = 0 ; i < gameModeIndicator.numberofPlayer(); i++) {
		indexArray.push(i);
	}
	
	for (var i = 0 ; i < indexArray.length; i++) {
		var newplayer = new Player(users[i]);
		playerList.push(newplayer);
	}

	indexArray = indexArray.shuffle();
	//console.log(playerList);

	switch (gameModeIndicator.name) {
		case '3' :
			playerList[indexArray[0]].role = 0;
			playerList[indexArray[1]].role = 1;
			playerList[indexArray[2]].role = 2;
			return playerList;
		case '7' :
			playerList[indexArray[0]].role = 0;
			playerList[indexArray[1]].role = 0;
			playerList[indexArray[2]].role = 1;
			playerList[indexArray[3]].role = 1;
			playerList[indexArray[4]].role = 2;
			playerList[indexArray[5]].role = 2;
			playerList[indexArray[6]].role = 3;
			return playerList;
		case '8' :
			playerList[indexArray[0]].role = 0;
			playerList[indexArray[1]].role = 0;
			playerList[indexArray[2]].role = 1;
			playerList[indexArray[3]].role = 1;
			playerList[indexArray[4]].role = 2;
			playerList[indexArray[5]].role = 2;
			playerList[indexArray[6]].role = 3;
			playerList[indexArray[7]].role = 4;
			return playerList;
		default :
			return playerList;
	//console.log(playerList);
	}
}

function findTeammates(gameModeIndicator, playerList, myIndex) {
	var teammateId = [];
		myrole = playerList[myIndex].role;

	switch (gameModeIndicator.name) {
		default :
			for (var i = 0; i < playerList.length; i++) {
				if (playerList[i].role == myrole && i != myIndex) {
					teammateId.push(playerList[i].name);
				}
			}
			return teammateId;
		}
}

function whoisAlive(playerList) {
	var theLiving = [];

	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].isAlive == 1) {
			theLiving.push(i);
		}
	}
	return theLiving;
}

function checkWin(gameModeIndicator,playerList) {
	//0 undertermined
	//1 cops
	//2 killer
	//3 tie

	var win_flag = 0;
		copsRemain = 0;
		killersRemain = 0;
		civilianRemain = 0;

	for (var i = 0; i < playerList.length; i++) {
		if (playerList[i].isAlive == 1) {
			switch (playerList[i].role) {
				case 0:
					civilianRemain++;
					break;
				case 1:
					copsRemain++;
					break;
				case 2:
					killersRemain++;
					break;
				default :
			}
		}
	}

	switch (gameModeIndicator) {
		default :
			if (killersRemain == 0) {
				if (copsRemain == 0 || civilianRemain == 0) {
					win_flag = 3;
				} else {
					win_flag = 1;
				}
			} else {
				if (copsRemain == 0 || civilianRemain == 0) {
					win_flag = 2;
				} else {
					win_flag = 0;
				}
			}
	}
	return win_flag;
}



module.exports.Player = Player;
exports.playerListInit = playerListInit;
exports.findTeammates = findTeammates;
exports.whoisAlive = whoisAlive;
exports.checkWin = checkWin;







