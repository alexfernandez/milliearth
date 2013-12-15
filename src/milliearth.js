'use strict';
/**
 * MilliEarth.
 * Backend: serve websockets.
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
var webSocketServer = require('websocket').server;
var http = require('http');
var urlParser = require('url');
var fs = require('fs');
var globalParams = require('./params.js').globalParams;
var isNumber = require('./util/util.js').isNumber;
var playerSelector = require('./connect/player.js').playerSelector;
var log = require('./util/log.js');
var debug = log.debug;
var info = log.info;
var error = log.error;

/**
 * Globals.
 */
var port = globalParams.port;
processArguments(process.argv.slice(2));
var server = http.createServer(serve).listen(port, function() {
	info('Server running at http://127.0.0.1:' + port + '/');
});

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
			debug('Debug mode on');
		}
		else if (isNumber(arg))
		{
			port = arg;
		}
		else
		{
			error('Usage: milliearth [-d] [port]');
			return;
		}
	}
}

/**
 * WebSocket server
 */
var wsServer = new webSocketServer({
	// WebSocket server is tied to a HTTP server
	httpServer: server
});

/**
 *  This callback function is called every time someone
 *   tries to connect to the WebSocket server
 */
wsServer.on('request', function(request) {
	var url = urlParser.parse(request.resource, true);
	debug('Connection to ' + url.pathname);
	if (url.pathname != '/serve')
	{
		error('Invalid URL ' + url.pathname);
		return;
	}
	// check client parameters
	var playerId = url.query.player;
	if (!playerId)
	{
		var message = 'Missing player id';
		error(message);
		request.reject(401, message);
		return;
	}
	var connection = request.accept(null, request.origin);
	playerSelector.add(playerId, connection);
	info('Connection from ' + connection.remoteAddress + ' accepted');
});

/**
 * Serve contents.
 */
function serve(request, response)
{
	var url = urlParser.parse(request.url, true);
	if (url.pathname == '/')
	{
		serveHome(request, response);
		return;
	}
	if (url.pathname == '/serve')
	{
		// will serve websocket
		return;
	}
	// avoid going out of the home dir
	if (url.pathname.contains('..'))
	{
		serveFile(404, 'not_found.html', response);
		return;
	}
	if (url.pathname.startsWith('/src/'))
	{
		serveFile(200, '..' + url.pathname, response);
		return;
	}
	serveFile(200, url.pathname, response);
}

/**
 * Serve the home page.
 */
function serveHome(request, response)
{
	serveFile(200, 'index.html', response);
}

/*
 * Serve a file.
 */
function serveFile(status, file, response)
{
	fs.readFile('html/' + file, function(err, data) {
		if (err)
		{
			response.writeHead(404, {
				'Content-Type': 'text/plain'
			});
			response.end('Page not found');
			return;
		}
		var type = 'text/html';
		if (file.endsWith('.js'))
		{
			type = 'text/javascript';
		}
		if (file.endsWith('.css'))
		{
			type = 'text/css';
		}
		response.writeHead(status, {
			'Content-Length': data.length,
			'Content-Type': type
		});
		response.end(data);
	});
}


