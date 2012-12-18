'use strict';
/**
 * MilliEarth robot players.
 * (C) 2012 Alex Fernández.
 *
 * This file is part of MilliEarth.
 *
 * MilliEarth is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * MilliEarth is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with MilliEarth.  If not, see <http://www.gnu.org/licenses/>.
 */


/**
 * Requirements.
 */
var gamePlayer = require('../player.js').gamePlayer;
var autoComputer = require('./computer.js').autoComputer;
var util = require('../util/util.js');
var extend = util.extend;
var log = require('../util/log.js');
var debug = log.debug;
var error = log.error;


/**
 * An auto player.
 */
function autoPlayer(params)
{
	// self-reference
	var self = this;
	// extend gamePlayer
	extend(new gamePlayer(params), self);

	// attributes
	self.computer = null;
	var engine = null;

	/**
	 * Do any initialization after the game has started.
	 */
	self.postStart = function(game)
	{
		var script = getFilename(params);
		self.computer = new autoComputer(self.robot, script);
		engine = self.computer.getEngine();
	}

	/**
	 * Get the current code for the computer.
	 */
	self.getCode = function()
	{
		return engine.get();
	}

	/**
	 * Set the code for the engine.
	 */
	self.installCode = function(code, playerId, callback)
	{
		engine.writeScript('custom-' + playerId + '.8s', code, callback);
	}

	/**
	 * Run some instructions on our engine.
	 */
	self.shortLoop = function(delay)
	{
		var interval = delay / 1000;
		self.computer.update(interval, self.game.world.bodiesExcept(self.playerId));
		engine.run(interval);
	}

	/**
	 * Get the correct filename for the given params.
	 */
	function getFilename(params)
	{
		if ('scriptId' in params)
		{
			return 'custom-' + params.scriptId + '.8s';
		}
		return 'basic-enemy.8s';
	}
}

/**
 * A selector for auto players.
 */
var autoSelector = new function()
{
	// self-reference
	var self = this;

	// attributes
	var scripts = {};

	/**
	 * Add a new script to the server.
	 */
	self.add = function(scriptId, code)
	{
		var script = new robotScript({
			scriptId: scriptId,
			code: code,
		});
		scripts[scriptId] = script;
		return script;
	}

	/**
	 * Send the list of scripts to the given player.
	 */
	self.getScripts = function()
	{
		var list = [];
		for (var scriptId in scripts)
		{
			list.push({
				scriptId: scriptId,
			});
		}
		return list;
	}

	/**
	 * Get an auto player. If it does not exist, return null.
	 */
	self.getAuto = function()
	{
		var player = new autoPlayer({
			playerId: 'computer1',
		});
		return player;
	}
}

module.exports.autoSelector = autoSelector;

