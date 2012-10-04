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
 * Parser for JSON or compact messages.
 */
var parser = new function()
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
function concurrencyLock()
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
 * Log an error message, with ERROR priority.
 */
function error(message)
{
	console.error('\u001b[31m' + iso(new Date()) + ' ' + message + '\u001b[0m');
}

/**
 * Log a success message in green, for tests.
 */
function success(message)
{
	console.error('\u001b[32m' + iso(new Date()) + ' ' + message + '\u001b[0m');
}

/**
 * Log a message, with INFO priority.
 */
function log(message)
{
	console.log(iso(new Date()) + ' ' + message);
}

/**
 * Global to control if traces are logged.
 */
var traceEnabled = false;

/**
 * Log a trace message, with DEBUG priority.
 */
function trace(message)
{
	if (!traceEnabled)
	{
		return;
	}
	log(message);
}

/**
 * Enable trace messages.
 */
function enableTrace()
{
	traceEnabled = true;
}

/**
 * Pad a number to the given digits.
 */
function pad(n, digits)
{
	var padded = n.toString();
	while (padded.length < digits)
	{
		padded = '0' + padded;
	}
	return padded;
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
 * Return an ISO8601 formatted date.
 * From https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Date#Example.3a_ISO_8601_formatted_dates
 */
function iso(date)
{
	return date.getUTCFullYear() + '-'
	+ pad(date.getUTCMonth() + 1, 2) + '-'
	+ pad(date.getUTCDate(), 2) + 'T'
	+ pad(date.getUTCHours(), 2) + ':'
	+ pad(date.getUTCMinutes(), 2) + ':'
	+ pad(date.getUTCSeconds(), 2) + '.'
	+ pad(date.getUTCMilliseconds(), 3) + 'Z'
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

module.exports.parser = parser;
module.exports.trace = trace;
module.exports.enableTrace = enableTrace;
module.exports.log = log;
module.exports.error = error;
module.exports.success = success;
module.exports.extend = extend;
module.exports.concurrencyLock = concurrencyLock;

