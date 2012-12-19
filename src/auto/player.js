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
var info = log.info;
var error = log.error;
var fs = require('fs');


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
		var scriptId = params.scriptId;
		self.computer = new autoComputer(self.robot, scriptId);
		engine = self.computer.getEngine();
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
	var scriptDir = './script/';

	/**
	 * Read all scripts in the given directory.
	 */
	function readDirectory(directory)
	{
		fs.readdir(scriptDir + directory, function(err, files) {
			if (err)
			{
				error(err.message);
				return;
			}
			for (var index in files)
			{
				var file = files[index];
				fs.stat(scriptDir + directory + file, statsCreator(directory + file));
			}
		});
	}

	/**
	 * Create a function that reads the stats for a file and adds the script if correct.
	 */
	function statsCreator(file)
	{
		return function(err, stats)
		{
			if (err)
			{
				error(err.message);
				return;
			}
			if (stats.isFile())
			{
				fs.readFile(scriptDir + file, readerCreator(file));
				return;
			}
			if (stats.isDirectory())
			{
				info('Loading dir: ' + file);
				readDirectory(file + '/');
			}
		}
	}

	/**
	 Create a function that reads the whole file and adds it to the current scripts.
	 */
	function readerCreator(file)
	{
		return function(err, contents)
		{
			scripts[file] = {
				scriptId: file,
				code: contents,
			};
			info('Loaded script: ' + file);
		}
	}

	/**
	 * Load all scripts.
	 */
	function loadScripts()
	{
		readDirectory('');
	}
	loadScripts();

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
			scriptId: 'basic-enemy.8s',
		});
		return player;
	}

	/**
	 * Get the code for the script.
	 */
	self.getScript = function(message)
	{
		if (!message.scriptId)
		{
			return { error: 'No script id' };
		}
		if (!(message.scriptId in scripts))
		{
			return { error: 'Invalid script id' };
		}
		return scripts[message.scriptId];
	}

	/**
	 * Set the code for the engine.
	 */
	self.installCode = function(code, playerId, callback)
	{
		engine.writeScript('custom-' + playerId + '.8s', code, callback);
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

module.exports.autoSelector = autoSelector;

