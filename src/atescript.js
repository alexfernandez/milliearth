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
 * Object to assist in parsing a text: keeps the current position.
 */
function parsePosition(text)
{
	// self-reference
	var self = this;

	// attributes
	var pos = 0;

	/**
	 * Skip any blank characters at pos.
	 */
	self.skipBlank = function()
	{
		while (isBlank())
		{
			pos++;
		}
	}

	/**
	 * Parse the next token: alphanumeric or symbol.
	 */
	self.parseToken = function()
	{
		self.skipBlank();
		if (/\w/.test(current()))
		{
			return parseWord();
		}
		return currentSkip();
	}

	/**
	 * Skipt text until after the given character is found.
	 */
	self.skipPast = function(end)
	{
		var s = '';
		while (current() != end && !self.finished())
		{
			s += currentSkip();
		}
		return s;
	}

	/**
	 * Identify a blank character at pos.
	 */
	function isBlank()
	{
		return /\s/.test(current());
	}

	/**
	 * Parse a complete word.
	 */
	function parseWord()
	{
		var w = '';
		while (/\w/.test(current()) && !self.finished())
		{
			w += currentSkip();
		}
		return w;
	}

	/**
	 * Get the current character.
	 */
	function current()
	{
		if (self.finished())
		{
			return '';
		}
		return text.charAt(pos);
	}

	/**
	 * Get the current character, skip it.
	 */
	function currentSkip()
	{
		var c = current();
		pos++;
		return c;
	}

	/**
	 * Return true if the text is finished.
	 */
	self.finished = function()
	{
		return pos >= text.length;
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
	var instructions = []

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
		var sentence = [];
		while (!pos.finished())
		{
			var t = pos.parseToken();
			if (t == '#')
			{
				pos.skipPast('\n');
			}
			else if (/[\;\,\.\:]/.test(t))
			{
				sentence.push(t);
				instructions.push(sentence);
				sentence = [];
			}
			else
			{
				sentence.push(t);
			}
		}
		console.log(instructions);
	}
}

module.test = function()
{
	var engine = new scriptingEngine({
		file: 'basic-enemy.8s',
		robot: {},
	});
}

module.test();

