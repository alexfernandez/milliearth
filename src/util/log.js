'use strict';
/**
 * MilliEarth log functions.
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


// debug mode: set to true to show debug messages.
var debugMode = false;

/**
 * Find out if we are in a browser.
 */
function inBrowser()
{
	return (typeof window != 'undefined');
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
 * Return an ISO8601 formatted date for now.
 * From https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Date#Example.3a_ISO_8601_formatted_dates
 */
function isoDate()
{
	var date = new Date();
	return date.getUTCFullYear() + '-'
		+ pad(date.getUTCMonth() + 1, 2) + '-'
		+ pad(date.getUTCDate(), 2) + 'T'
		+ pad(date.getUTCHours(), 2) + ':'
		+ pad(date.getUTCMinutes(), 2) + ':'
		+ pad(date.getUTCSeconds(), 2) + '.'
		+ pad(date.getUTCMilliseconds(), 3) + 'Z'
}

/**
 * Show a debug message.
 */
function debug(message)
{
	if (!debugMode)
	{
		return;
	}
	console.log(message);
}

/**
 * Show an info message.
 */
function info(message)
{
	if (!inBrowser())
	{
		// on node, add date to trace
		message = isoDate() + ' ' + message;
	}
	console.log(message);
}

/**
 * Log an error message, with ERROR priority.
 */
function error(message)
{
	if (typeof(message) == 'object')
	{
		message = 'Error';
	}
	if (inBrowser())
	{
		// on browser show on message panel
		console.error(message);
		$('#message').html($('<span class="error">').text(message));
	}
	else
	{
		// on node show in red with date
		console.error('\u001b[31m' + isoDate() + ' ' + message + '\u001b[0m');
	}
}

/**
 * Log a success message in green, for tests.
 */
function success(message)
{
	// only on node; show in green
	console.log('\u001b[32m' + isoDate() + ' ' + message + '\u001b[0m');
}

module.exports.debugMode = debugMode;
module.exports.debug = debug;
module.exports.info = info;
module.exports.error = error;
module.exports.success = success;

