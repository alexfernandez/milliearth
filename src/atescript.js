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
var globalParams = require('./params.js').globalParams;
var util = require('./util.js');
var log = util.log;
var trace = util.trace;
var extend = util.extend;


/**
 * General parameters for scripting.
 */
var scriptingParams = new function()
{
	// self-reference
	var self = this;

	// attributes;
	self.terminators = /[\;\,\.\:]/;
	self.number = /\d+/;
}

/**
 * Created a generic storage of an array of things.
 */
function storage(contents)
{
	// self-reference
	var self = this;
	self.setSelf = function(that)
	{
		self = that;
	}

	// attributes
	self.position = 0;
	self.contents = contents;

	/**
	 * Add a new element.
	 */
	self.add = function(element)
	{
		self.contents.push(element);
	}

	/**
	 * Get the current element.
	 */
	self.current = function()
	{
		if (self.finished())
		{
			return null;
		}
		return self.contents[self.position];
	}

	/**
	 * Check that the current element is the given one and skip it.
	 * If it is different do not skip it and return false.
	 */
	self.checkSkip = function(element)
	{
		if (self.current() == element)
		{
			self.skip();
			return true;
		}
		log('Invalid element ' + self.current() + ', expecting: ' + element + ' in ' + self);
		return false;
	}

	/**
	 * Get the current element, skip it.
	 */
	self.currentSkip = function()
	{
		var c = self.current();
		self.skip();
		return c;
	}

	/**
	 * Skip the current element.
	 */
	self.skip = function()
	{
		self.position++;
	}

	/**
	 * Return true if the text is finished.
	 */
	self.finished = function()
	{
		return self.position >= self.contents.length;
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return self.contents.join(' ');
	}
}

/**
 * Object to assist in parsing a text: keeps the current position.
 */
function parsePosition(text)
{
	// self-reference
	var self = this;
	// extend storage
	extend(new storage(text), self);

	/**
	 * Skip any blank characters at pos.
	 */
	self.skipBlank = function()
	{
		while (isBlank())
		{
			self.skip();
		}
	}

	/**
	 * Parse the next token: alphanumeric or symbol.
	 */
	self.parseToken = function()
	{
		self.skipBlank();
		if (/\w/.test(self.current()))
		{
			return parseWord();
		}
		return self.currentSkip();
	}

	/**
	 * Skipt text until after the given character is found.
	 */
	self.skipPast = function(end)
	{
		var s = '';
		while (self.current() != end && !self.finished())
		{
			s += self.currentSkip();
		}
		return s;
	}

	/**
	 * Identify a blank character at pos.
	 */
	function isBlank()
	{
		return /\s/.test(self.current());
	}

	/**
	 * Parse a complete word.
	 */
	function parseWord()
	{
		var w = '';
		while (/\w/.test(self.current()) && !self.finished())
		{
			w += self.currentSkip();
		}
		return w;
	}
}

/**
 * A sentence (or statement) in the language.
 */
function scriptingSentence()
{
	// self-reference
	var self = this;
	// extend storage
	extend(new storage([]), self);

	// attributes

	/**
	 * Check for a block finisher.
	 */
	self.endsBlock = function()
	{
		var t;
		while (!self.finished())
		{
			t = self.currentSkip();
		}
		if (t == '.')
		{
			return true;
		}
		return false;
	}

	/**
	 * Skip terminator and check that the sentence finishes.
	 * If not present or there are tokens after the terminator, complain.
	 */
	self.skipTerminator = function()
	{
		if (!self.isTerminator())
		{
			log('Unexpected token ' + self.current() + ' instead of terminator');
			return false;
		};
		self.skip();
		if (!self.finished())
		{
			log('Sentence continues after terminator: ' + self);
		}
	}

	/**
	 * Find out if the current token is a terminator: ,;:.
	 */
	self.isTerminator = function()
	{
		return scriptingParams.terminators.test(self.current());
	}

	/**
	 * Reset the sentence to the beginning.
	 */
	self.reset = function()
	{
		self.position = 0;
	}
}

/**
 * Provide the context for the scripting engine.
 * Contains an array of sentences.
 */
function scriptingContext(params)
{
	// self-reference
	var self = this;
	// extend storage
	extend(new storage([]), self);

	// attributes
	self.ready = false;
	var robot = params.robot;
	var it = params.it;
	var linesRun = 0;
	var linesPending = 0;
	var pendingBlocks = 0;
	var marked = 0;

	/**
	 * Run the specified number of lines.
	 */
	self.run = function(lines)
	{
		if (!self.ready)
		{
			linesPending += lines;
			return;
		}
		while (!self.finished() && linesPending > 0)
		{
			runSentence();
			linesRun++;
			linesPending--;
		}
		log('Run ' + linesRun + ' lines');
		if (self.finished() && params.afterFinished)
		{
			params.afterFinished();
		}
	}

	function runSentence()
	{
		var sentence = self.current();
		var token = sentence.currentSkip();
		if (token == 'if')
		{
			doIf(sentence);
		}
		else if (token == 'repeat')
		{
			doRepeat(sentence);
		}
		else if (token == 'until')
		{
			doUntil(sentence);
		}
		else if (token == 'make')
		{
			doMake(sentence);
		}
		else if (checkCommand(token))
		{
			doCommand(token, sentence);
		}
		else
		{
			log('Invalid token ' + token + ' in sentence ' + sentence + '; skipping');
		}
		self.skip();
	}

	/**
	 * Run a make sentence.
	 */
	function doMake(sentence)
	{
		var variable = sentence.currentSkip();
		if (!sentence.checkSkip('='))
		{
			return;
		}
		var value = readValue(sentence);
		robot[variable] = value;
		sentence.skipTerminator();
	}

	/**
	 * Read the value for a variable.
	 */
	function readValue(sentence)
	{
		var value = null;
		while (!sentence.isTerminator() && !sentence.finished())
		{
			var token = sentence.currentSkip();
			if (isNumber(token))
			{
				value = readNumber(token);
			}
			else if (robot.hasOwnProperty(token))
			{
				value = robot[token];
			}
			else if (token == '+')
			{
				value += readValue(sentence);
			}
			else if (token == '-')
			{
				value -= readValue(sentence);
			}
			else if (token == '*')
			{
				value *= readValue(sentence);
			}
			else if (token == '/')
			{
				value /= readValue(sentence);
			}
			else
			{
				log('Invalid token ' + token + ' in value within ' + sentence);
			}
		}
		if (value === null)
		{
			log('No value');
		}
		return value;
	}

	/**
	 * Find out if the current token is a number.
	 */
	function isNumber(token)
	{
		return scriptingParams.number.test(token);
	}

	/**
	 * Read a numeric value.
	 */
	function readNumber(token)
	{
		return parseFloat(token);
	}

	/**
	 * Check if the token corresponds to any command.
	 */
	function checkCommand(token)
	{
		if (!token)
		{
			log('Empty token');
			return false;
		}
		if (robot.hasOwnProperty(token))
		{
			return true;
		}
		return findCommandStarts(token);
	}

	/**
	 * Do a robot command.
	 */
	function doCommand(command, sentence)
	{
		if (robot.hasOwnProperty(command))
		{
			var callback = robot[command];
			var parameter = null;
			if (!sentence.isTerminator())
			{
				parameter = readParameter(sentence);
			}
			callback(parameter);
			return;
		}
		if (findCommandStarts(command))
		{
			var trailing = sentence.currentSkip();
			command += trailing.charAt(0).toUpperCase() + trailing.slice(1);
			return doCommand(command, sentence);
		}
		log('Invalid command ' + command);
	}

	/**
	 * Return true if the robot has an attribute starting with command.
	 */
	function findCommandStarts(command)
	{
		for (var attribute in robot)
		{
			if (robot.hasOwnProperty(attribute) && attribute.startsWith(command))
			{
				return true;
			}
		}
		return false;
	}

	/**
	 * Read a parameter, like 'it'.
	 */
	function readParameter(sentence)
	{
		var token = sentence.currentSkip();
		if (token == 'it')
		{
			return it;
		}
		log('Invalid parameter ' + token);
		return null;
	}

	/**
	 * Run an if sentence.
	 */
	function doIf(sentence)
	{
		if (!evaluateCondition(sentence))
		{
			skipBlock();
			return false;
		}
		if (!sentence.checkSkip(':'))
		{
			return false;
		}
		return true;
	}

	/**
	 * Run a repeat sentence.
	 */
	function doRepeat(sentence)
	{
		if (!sentence.checkSkip(':'))
		{
			log('Invalid repeat sentence ' + sentence);
			return false;
		}
		marked = self.position + 1;
	}

	/**
	 * Run an until sentence.
	 */
	function doUntil(sentence)
	{
		var evaluation = evaluateCondition(sentence);
		if (!sentence.checkSkip('.'))
		{
			return false;
		}
		if (!evaluation)
		{
			self.goToMark();
			return;
		}
		return evaluation;
	}

	/**
	 * Go to the latest mark.
	 */
	self.goToMark = function()
	{
		if (!marked)
		{
			log('Invalid mark');
			return;
		}
		for (var i = marked; i <= self.position; i++)
		{
			var sentence = self.contents[i];
			sentence.reset();
		}
		self.position = marked;
	}

	/**
	 * Evaluate a condition.
	 */
	function evaluateCondition(sentence)
	{
		var subject = sentence.currentSkip();
		if (subject == 'it')
		{
			return evaluateIt(sentence);
		}
		var particle = sentence.currentSkip();
		if (particle == 'in')
		{
			return evaluateIn(sentence, subject);
		}
		if (particle == '=')
		{
			return evaluateValue(sentence, subject);
		}
		log('Invalid particle ' + particle);
		return false;
	}

	/**
	 * Evaluate an 'in' condition: container has an element with the given attribute.
	 */
	function evaluateIn(sentence, elementAttribute)
	{
		var containerAttribute = sentence.currentSkip();
		var container = robot[containerAttribute];
		if (!container)
		{
			log('Invalid container ' + containerAttribute);
			return false;
		}
		for (var key in container)
		{
			var element = container[key];
			if (element[elementAttribute])
			{
				it = element;
				return true;
			}
		}
		return false;
	}

	/**
	 * Evaluate an 'it' condition: something about it.
	 */
	function evaluateIt(sentence)
	{
		if (!sentence.checkSkip('is'))
		{
			return false;
		}
		var attribute = sentence.currentSkip();
		return it[attribute];
	}

	/**
	 * Evaluate that the given attribute holds the given value.
	 */
	function evaluateValue(sentence, attribute)
	{
		if (!(attribute in robot))
		{
			return false;
		}
		var value = readValue(sentence);
		return (value == robot[attribute]);
	}

	/**
	 * Skip a whole block of code (until the next period '.').
	 */
	function skipBlock()
	{
		var sentence = self.current();
		while (!sentence.endsBlock() && !self.finished())
		{
			sentence = self.currentSkip();
		}
	}
}

/**
 * A scripting engine.
 */
function scriptingEngine(params)
{
	// self-reference
	var self = this;

	// attributes
	self.file = params.file;
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
				log('Invalid script file ' + file);
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
				context.add(sentence);
				sentence = new scriptingSentence();
			}
			else
			{
				sentence.add(t);
			}
		}
		context.ready = true;
		// run any pending lines
		context.run(0);
	}

	/**
	 * Run the script for a number of lines.
	 */
	self.run = function(lines)
	{
		if (!lines)
		{
			log('No lines run');
			return;
		}
		context.run(lines);
	}
}

module.exports.scriptingEngine = scriptingEngine;

module.test = function()
{
	var enemy = {
		enemy: true,
		shots: 0,
		dead: false,
		toString: function() { return 'Me bad'; },
	};
	var engine = new scriptingEngine({
		file: 'basic-enemy.8s',
		robot: {
			view: {
				id: enemy,
			},
			map: {
				id: {
					enemy: false,
				},
				od: enemy,
			},
			pointAt: function(object) {
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

		},
	});
	engine.run(10);
	var robot = {};
	engine = new scriptingEngine({
		file: 'test-arithmetic.8s',
		robot: robot,
		afterFinished: function() {
			if (robot.x != 10)
			{
				log('x should be 10, not ' + robot.x);
			}
		},
	});
	engine.run(100);
}

module.test();

