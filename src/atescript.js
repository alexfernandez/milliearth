'use strict';
/**
 * MilliEarth atescript scripting engine.
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
var fs = require('fs');
var parsePosition = require('./script/parse.js').parsePosition;
var scriptingParams = require('./script/parse.js').scriptingParams;
var scriptingSentence = require('./script/parse.js').scriptingSentence;
var scriptingContext = require('./script/context.js').scriptingContext;
var util = require('./util.js');
var log = util.log;
var extend = util.extend;
var concurrencyLock = util.concurrencyLock;


/**
 * A scripting engine.
 */
function scriptingEngine(params)
{
	// self-reference
	var self = this;

	// attributes
	self.file = params.file;
	self.ready = false;
	var computer = params.computer;
	var linesRun = 0;
	var intervalPending = 0;
	var callbacks = [];
	var semaphor = new concurrencyLock();
	var context = new scriptingContext(params);

	readScript(self.file);

	/**
	 * Read a script file and interpret it.
	 */
	function readScript(file)
	{
		fs.readFile('src/script/' + file, function(err, data) {
			if (err)
			{
				log.e('Invalid script file ' + file);
				return;
			}
			prepare(data.toString());
		});
	}

	/**
	 * Prepare a text file for interpretation.
	 */
	function prepare(text)
	{
		var pos = new parsePosition(text);
		var sentence = new scriptingSentence();
		while (!pos.finished())
		{
			var t = pos.parseToken();
			if (t == '#')
			{
				pos.skipPast('\n');
			}
			else if (scriptingParams.terminators.test(t))
			{
				sentence.add(t);
				context.addSentence(sentence);
				sentence = new scriptingSentence();
			}
			else
			{
				sentence.add(t);
			}
		}
		self.ready = true;
		// run any pending interval
		self.run(0);
	}

	/**
	 * Run the script for a number of seconds.
	 */
	self.run = function(interval, callback)
	{
		if (callback)
		{
			callbacks.push(callback);
		}
		intervalPending += interval;
		if (!self.ready)
		{
			return;
		}
		if (!semaphor.check(self))
		{
			// semaphor closed
			return;
		}
		if (context.finished())
		{
			log.d('Context finished');
			context.restart();
		}
		var run = context.run(intervalPending, callback);
		linesRun += run;
		intervalPending = 0;
		semaphor.release();
		runCallbacks();
	}

	/**
	 * Run all pending callbacks.
	 */
	function runCallbacks()
	{
		var callback = callbacks.shift();
		while (callback)
		{
			callback(computer);
			callback = callbacks.shift();
		}
	}
}

module.exports.scriptingEngine = scriptingEngine;

/**
 * Arithmetic test.
 */
function testArithmetic()
{
	var engine = new scriptingEngine({
		file: 'test/test-arithmetic.8s',
		computer: {},
	});
	engine.run(0.1, function(computer) {
		if (!computer.finished)
		{
			log.e('Script not finished');
			return;
		}
		if (computer.x != 10)
		{
			log.e('x should be 10, not ' + computer.x);
		}
		log.success('Scripting arithmetic: OK');
	});
}

/**
 * Test a basic enemy.
 */
function testBasicEnemy()
{
	var enemy = {
		enemy: true,
		shots: 0,
		dead: false,
		toString: function() { return 'Me bad'; },
	};
	var basicComputer = {
		view: {
			id: enemy,
		},
		scope: {},
		map: {
			id: {
				enemy: false,
			},
			od: enemy,
		},
		pointAt: function(object) {
			basicComputer.scope.id = object;
		},
		shoot: function() {
			enemy.shots ++;
			if (enemy.shots == 3)
			{
				enemy.dead = true;
			}
		},
		accelerate: function() {
		},

	};
	var engine = new scriptingEngine({
		computer: basicComputer,
		file: 'basic-enemy.8s',
	});
	var iterations = 0;
	var expected = 8;
	var callback = null;
	var iterate = function() {
		engine.run(0.01, callback);
	};
	var callback = function(computer) {
		if (!computer.finished)
		{
			if (iterations < expected)
			{
				iterations ++;
				iterate();
				return;
			}
			log.e('Script not finished');
			return;
		}
		else
		{
			if (iterations < expected)
			{
				log.e('Finished too soon: ' + iterations + ' iterations');
			}
		}
		if (!enemy.dead)
		{
			log.e('Enemy should be dead by now');
		}
		log.success('Scripting basic enemy: OK');
	};
	iterate();
}



module.exports.test = function()
{
	testArithmetic();
	testBasicEnemy();
}


