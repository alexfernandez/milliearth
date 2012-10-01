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
var log = require('./util.js').log;
var trace = require('./util.js').trace;
var gameSelector = require('./game.js').gameSelector;

/**
 * Globals.
 */
var port = globalParams.port;
if (process.argv.length > 2)
{
	port = process.argv[2];
}
var clients = [];
var server = http.createServer(serve).listen(port, function() {
	log('Server running at http://127.0.0.1:' + port + '/');
});

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
	trace('Connection to ' + url.pathname);
	if (url.pathname != '/serve')
	{
		log('Invalid URL ' + url.pathname);
		return;
	}
	// check client parameters
	var gameId = url.query.game;
	var playerId = url.query.player;
	if (!gameId || !playerId)
	{
		log('Invalid parameters: game ' + gameId + ', player ' + playerId);
		return;
	}
	var connection = request.accept(null, request.origin);
	var game = gameSelector.find(gameId);
	game.connect(playerId, connection);
	log('Connection from ' + connection.remoteAddress + ' accepted');
});

/**
 * Serve contents.
 */
function serve(request, response)
{
	var url = urlParser.parse(request.url, true);
	if (url.pathname == '/')
	{
		serve_home(request, response);
		return;
	};
	if (url.pathname == '/serve')
	{
		// will serve websocket
		return;
	}
	// avoid going out of the home dir
	if (url.pathname.contains('..'))
	{
		serve_file(404, 'not_found.html', response);
		return;
	}
	if (url.pathname.startsWith('/src/'))
	{
		serve_file(200, '..' + url.pathname, response);
		return;
	}
	serve_file(200, url.pathname, response);
}

/**
 * Serve the home page.
 */
function serve_home(request, response)
{
	serve_file(200, 'index.html', response);
}

/*
 * Serve a file.
 */
function serve_file(status, file, response)
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
		response.writeHead(status, {
			'Content-Length': data.length,
			'Content-Type': type
		});
		response.end(data);
	});
}


