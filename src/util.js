'use strict';
/**
 * QFighter.
 * Utility functions.
 * (C) 2012 Quoids
 */

/**
 * Prototypes.
 */
String.prototype.endsWith = function(suffix)
{
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

var params = require('./params.js').params;

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
 * Global to control if traces are logged.
 */
var traceEnabled = false;

/**
 * Log a message, with INFO priority.
 */
function log(message)
{
	console.log(iso(new Date()) + ' ' + message);
}

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

module.exports.parser = parser;
module.exports.trace = trace;
module.exports.enableTrace = enableTrace;
module.exports.log = log;

