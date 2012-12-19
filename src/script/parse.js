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
var util = require('../util/util.js');
var extend = util.extend;
var log = require('../util/log.js');
var error = log.error;
var debug = log.debug;


/**
 * General parameters for scripting.
 */
var scriptingParams = new function()
{
	// self-reference
	var self = this;

	// attributes;
	self.terminators = /[\;\,\.\:]/;
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
		error('Invalid element ' + self.current() + ', expecting: ' + element + ' in ' + self);
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
	 * Restart to the beginning.
	 */
	self.restart = function()
	{
		self.position = 0;
	}

	/**
	 * Find out if the storage is empty.
	 */
	self.isEmpty = function()
	{
		return (self.contents.length == 0);
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
	 * Get the current char.
	 */
	self.current = function()
	{
		if (self.position == self.contents.length)
		{
			return '';
		}
		return self.contents.slice(self.position, self.position + 1);
	}

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

	/**
	 * Printable representation, with context.
	 */
	self.toString = function()
	{
		var interval = 20;
		var start = Math.max(0, self.position - interval);
		var end = Math.min(self.contents.length, self.position + interval);
		var result = '';
		if (start > 0)
		{
			result += '…';
		}
		result += self.contents.slice(start, self.position);
		result += '> ' + self.current() + ' <';
		result += self.contents.slice(self.position + 1, end);
		if (end < self.contents.length)
		{
			result += '…';
		}
		return result;
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
	 * Get the terminator: the last token.
	 */
	self.getTerminator = function()
	{
		return self.contents[self.contents.length - 1];
	}

	/**
	 * Skip terminator and check that the sentence finishes.
	 * If not present or there are tokens after the terminator, complain.
	 */
	self.skipTerminator = function()
	{
		if (!self.isTerminator())
		{
			error('Unexpected token ' + self.current() + ' instead of terminator');
			return false;
		};
		self.skip();
		if (!self.finished())
		{
			error('Sentence continues after terminator: ' + self);
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
}


module.exports.parsePosition = parsePosition;
module.exports.storage = storage;
module.exports.scriptingParams = scriptingParams;
module.exports.scriptingSentence = scriptingSentence;

