	var GameMode = function(name) {
	    this.name = name;					// By default, gameMode is 8
	}

	GameMode.prototype.numberofPlayer = function() {
		switch (this.name) {
			case '8':
				return 2;
			case '7':
				return 7;
			default :
				return 0;
		}
	}

	GameMode.prototype.title = function() {
		switch (this.name) {
			case '8':
				return '8人局';
			case '7':
				return '7人局';
			default :
				return '游戏模式标题';
		}
	}

	GameMode.prototype.description = function() {
		switch (this.name) {
			case '8':
				return '2警2杀1医2平';
			case '7':
				return '2警2杀1医1狙2平';
			default :
				return '游戏模式说明';
		}
	}

if (typeof module != 'undefined' && module.exports) {
	module.exports = GameMode;
} else {
	//this.gameMode = new GameMode();
}
























