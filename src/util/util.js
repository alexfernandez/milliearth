'use strict';
/**
 * MilliEarth utility functions.
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
 * Modify javascript prototypes.
 */

/**
 * Find out if the string has the argument at the beginning.
 */
String.prototype.startsWith = function (str)
{
	return this.slice(0, str.length) == str;
};

/**
 * Find out if the string has the argument at the end.
 */
String.prototype.endsWith = function (str)
{
	return this.slice(this.length - str.length) == str;
};

/**
 * Find out if the string contains the argument at any position.
 */
String.prototype.contains = function(str)
{
	return this.indexOf(str) != -1;
};

/**
 * Return the piece of string until the argument is found.
 * 'hi.there'.substringUpTo('.') => 'hi'
 */
String.prototype.substringUpTo = function(str)
{
	if (!this.contains(str))
	{
		return this;
	}
	return this.slice(0, this.indexOf(str));
};

/**
 * Return the piece of string starting with the argument; empty string if not found.
 * 'hi.there'.substringFrom('.') => 'there'
 */
String.prototype.substringFrom = function(str)
{
	if (!this.contains(str))
	{
		return '';
	}
	return this.slice(this.indexOf(str) + str.length);
};

/**
 * Parser for JSON.
 */
exports.parser = new function()
{
	// self-reference
	var self = this;

	/**
	 * Parse a JSON or compact message into an object.
	 */
	self.parse = function(message)
	{
		return JSON.parse(message);
	}

	/**
	 * Convert an object into a string.
	 */
	self.convert = function(object)
	{
		return JSON.stringify(object);
	}
}

/**
 * Lock to avoid two processes at the same time.
 */
exports.concurrencyLock = function()
{
	// self-reference
	var self = this;

	var locks = [];

	/**
	 * Check out if the lock is busy; if free, return true and lock it.
	 */
	self.check = function(object)
	{
		var index = locks.push(object) - 1;
		if (index != 0)
		{
			locks.splice(index, 1);
			return false;
		}
		return true;
	}

	/**
	 * Release the lock, by whoever was holding it. Should be used responsibly.
	 */
	self.release = function()
	{
		locks.splice(0, 1);
	}
}

/**
 * A high resolution timer.
 */
exports.highResolutionTimer = function(delay, callback)
{
	// self-reference
	var self = this;

	// attributes
	var counter = 0;
	var start = Date.now();

	/**
	 * Delayed running of the callback.
	 */
	function delayed()
	{
		callback(delay);
		counter ++;
		var diff = (Date.now() - start) - counter * delay;
		setTimeout(delayed, delay - diff);
	}

	/**
	 * Show the drift of the timer.
	 */
	self.traceDrift = function()
	{
		var diff = Date.now() - start;
		var drift = diff / delay - counter;
		log.d('Seconds: ' + Math.round(diff / 1000) + ', counter: ' + counter + ', drift: ' + drift);
	}

	// start timer
	delayed();
	setTimeout(delayed, delay);
}

/**
 * Generate a random id in base 36 with length 8.
 */
function randomId()
{
	var random = Math.abs(Math.floor(Math.random() * 0x100000000000));
	var result = random.toString(36).slice(-8);
	while (result.length < 8)
	{
		result = '0' + result;
	}
	return result;

}

/**
 * Find out if a value is a number.
 */
function isNumber(n)
{
	return !isNaN(parseFloat(n)) && isFinite(n);
}

/**
 * Read a number from a string, starting in start and with digits.
 */
function read(string, start, digits)
{
	var substring = string.substring(start, start + digits);
	return parseInt(substring);
}

/**
 * Make the child function extend the parent function.
 */
function extend(parent, child)
{
	parent.setSelf(child);
	for (var property in parent)
	{
		if (!(child.hasOwnProperty(property)))
		{
			child[property] = parent[property];
		}
	}
}

module.exports.randomId = randomId;
module.exports.extend = extend;
module.exports.isNumber = isNumber;

