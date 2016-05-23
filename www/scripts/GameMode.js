var GameMode = function(name) {
    this.name = name;
}

GameMode.prototype.numberofPlayer = function() {
	switch (this.name) {
		case '8':
			return 8;
		case '7':
			return 7;
		case '3':
			return 3;
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
		case '3':
			return '3人测试局';
		default :
			return '游戏模式标题';
	}
}

GameMode.prototype.description = function() {
	switch (this.name) {
		case '8':
			return '2警2杀1医1狙2平';
		case '7':
			return '2警2杀1医2平';
		case '3':
			return '1警1杀1平';
		default :
			return '游戏模式说明';
	}
}

GameMode.prototype.roleName = function(role) {
	switch (this.name) {
		default :
			switch (role) {
				case 0 :
					return '平民';
				case 1 :
					return '警察';
				case 2 :
					return '杀手';
				case 3 :
					return '医生';
				case 4 :
					return '狙击手';
				default :
					return ' ';
			}
	}
}

GameMode.prototype.roleInstruction = function(role) {
	switch (this.name) {
		default :
			switch (role) {
				case 0 :
					return '你是平民。 随便点一下吧。';
				case 1 :
					return '你是警察。 请选择要验的人，然后确定 &#13;（意见不统一则行动作废）。';
				case 2 :
					return '你是杀手。 请选择要杀的人，然后确定 &#13;（意见不统一则行动作废）。';
				case 3 :
					return '你是医生。 请选择要用药的人，然后确定。';
				case 4 :
					return '你是狙击手。 请选择要狙的人，然后确定。';
				default :
					return ' ';
			}
	}
}

if (typeof module != 'undefined' && module.exports) {
	module.exports = GameMode;
} else {
  this.gameMode = GameMode;
}

























