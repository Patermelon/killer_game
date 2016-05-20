// the Player class to store the players' info used in GAME_CORE
var Player = function(playerId) {
    this.name = playerId;
    this.isAlive = 1;
    this.role = 0;
    this.toxincount = 0;
};

// method of Player
Player.prototype.kill = function(playerId) {
    // body...
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
	console.log(playerList);

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
	console.log(playerList);
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

exports.Player = Player;
exports.playerListInit = playerListInit;
exports.findTeammates = findTeammates;








