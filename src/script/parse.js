'use strict';
/**
 * MilliEarth atescript.
 * Parse functions.
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
var util = require('../util.js');
var log = util.log;
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
		log.e('Invalid element ' + self.current() + ', expecting: ' + element + ' in ' + self);
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
			log.e('Unexpected token ' + self.current() + ' instead of terminator');
			return false;
		};
		self.skip();
		if (!self.finished())
		{
			log.e('Sentence continues after terminator: ' + self);
		}
		return true;
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


module.exports.parsePosition = parsePosition;
module.exports.storage = storage;
module.exports.scriptingParams = scriptingParams;
module.exports.scriptingSentence = scriptingSentence;

