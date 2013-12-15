#!/usr/bin/env node
'use strict';

/**
 * MilliEarth.
 * Binary to start MilliEarth.
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
 * Constants.
 */
process.title = 'milliearth';

/**
 * Requirements.
 */
var milliearth = require('../src/milliearth.js');
var globalParams = require('../src/params.js').globalParams;
var log = require('../src/util/log.js');
var isNumber = require('../src/util/util.js').isNumber;

// globals
var port = globalParams.port;

// init
processArguments(process.argv.slice(2));
milliearth.start(port);

/**
 * Process command line arguments.
 */
function processArguments(args)
{
	while (args.length > 0)
	{
		var arg = args.shift();
		if (arg == '-d')
		{
			log.activateDebugMode();
			log.debug('Debug mode on');
		}
		else if (isNumber(arg))
		{
			port = arg;
		}
		else
		{
			log.error('Usage: milliearth [-d] [port]');
			return;
		}
	}
}

