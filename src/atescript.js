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
var vector = require('./vector.js').vector;
var util = require('./util.js');
var parser = util.parser;
var log = util.log;
var trace = util.trace;
var extend = util.extend;


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
	var index = 0;

	/**
	 * Add a new element.
	 */
	self.add = function(element)
	{
		contents.push(element);
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
		return contents[index];
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
		index++;
	}

	/**
	 * Return true if the text is finished.
	 */
	self.finished = function()
	{
		return index >= contents.length;
	}

	/**
	 * Printable representation.
	 */
	self.toString = function()
	{
		return contents.toString();
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
 * Provide the context for the scripting engine.
 * Contains an array of sentences.
 */
function scriptingContext()
{
	// self-reference
	var self = this;
	// extend storage
	extend(new storage([]), self);

	// attributes
	self.it = null;
	var deferred = 0;
	var pendingBlocks = 0;

	/**
	 * Run any deferred lines pending.
	 */
	self.runDeferred = function()
	{
		var load = deferred;
		while (load > 0)
		{
			console.log('Running deferred ' + load);
			self.run(load);
			deferred -= load;
			load = deferred;
		}
	}

	/**
	 * Defer execution of a number of lines.
	 */
	self.defer = function(lines)
	{
		deferred += lines;
		console.log('Deferred ' + deferred + ' lines');
	}

	/**
	 * Run the specified number of lines.
	 */
	self.run = function(lines)
	{
		var sentence = self.current();
		while (sentence && !sentence.finished())
		{
			var token = sentence.current();
			if (token == 'if')
			{
				doIf(sentence);
			}
			else if (token == 'repeat')
			{
				doRepeat(sentence);
			}
			else if (checkCommand(token))
			{
				doCommand(sentence);
			}
			else
			{
				log('Invalid sentence ' + sentence);
			}
			self.skip();
		}
	}

	/**
	 * Check if the token corresponds to any command.
	 */
	function checkCommand(token)
	{
		return false;
	}

	/**
	 * Run an if sentence.
	 */
	function doIf(sentence)
	{
		sentence.skip();
		if (!checkCondition(sentence))
		{
			skipBlock();
		}
		pendingBlocks++;
		return true;
	}

	/**
	 * Run a repeat sentence.
	 */
	function doRepeat(sentence)
	{
		sentence.skip();
		if (!checkCondition(sentence))
		{
			skipBlock();
		}
		pendingBlocks++;
		return true;
	}

	/**
	 * Check a condition.
	 */
	function checkCondition(sentence)
	{
		return false;
	}

	/**
	 * Skip a whole block of code (until the next period '.').
	 */
	function skipBlock()
	{
		var sentence = self.current();
		while (!sentence.isBlock() || self.finished())
		{
			sentence = self.currentSkip();
		}
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

	self.isBlock = function()
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
	self.robot = params.robot;
	var context = new scriptingContext();
	var ready = false;

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
			else if (/[\;\,\.\:]/.test(t))
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
		ready = true;
		console.log('context: ' + context);
		context.runDeferred();
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
		if (!ready)
		{
			context.defer(lines);
			return;
		}
		context.run(lines);
	}
}

module.test = function()
{
	var engine = new scriptingEngine({
		file: 'basic-enemy.8s',
		robot: {
			view: {
				id: {
					enemy: true,
					dead: true,
				},
			},
			map: {
				id: {
					enemy: false,
				},
				od: {
					enemy: true,
				},
			},
			pointAt: function(object) { },
			shoot: function() { },
			accelerateTowards: function(object) { },

		},
	});
	engine.run(10);
}

module.test();

