'use strict';
/**
 * MilliEarth log.
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
 * Message log.
 */
var log = new function()
{
	// self-reference
	var self = this;

	// attributes
	self.debugMode = false;

	/**
	 * Log an error message, with ERROR priority.
	 */
	self.e = function(message)
	{
		console.error('\u001b[31m' + iso(new Date()) + ' ' + message + '\u001b[0m');
	}

	/**
	 * Log a success message in green, for tests.
	 */
	self.success = function(message)
	{
		console.log('\u001b[32m' + iso(new Date()) + ' ' + message + '\u001b[0m');
	}

	/**
	 * Log a message with INFO priority.
	 */
	self.i = function(message)
	{
		console.log(iso(new Date()) + ' ' + message);
	}

	/**
	 * Log a trace message with DEBUG priority.
	 */
	self.d = function(message)
	{
		if (!self.debugMode)
		{
			return;
		}
		self.i(message);
	}
}

module.exports.log = log;

