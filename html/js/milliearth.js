"use strict";
/**
 * MilliEarth simulation.
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
 * Main MilliEarth object.
 */
var milliEarth = new function()
{
	// self-reference
	var self = this;

	/**
	 * Initialize the simulation.
	 */
	self.init = function()
	{
		$('#status').html('Starting');

		// if user is running mozilla then use it's built-in WebSocket
		window.WebSocket = window.WebSocket || window.MozWebSocket;

		// if browser doesn't support WebSocket, just show some notification and exit
		if (!window.WebSocket)
		{
			$('#status1').html('Browser error');
			$('#status2').html('Browser error');
			$('#message').html('<p>Sorry, but your browser doesn\'t support WebSockets.</p>' );
			$('#submit').hide();
			$('input').hide();
			return;
		}

		$(document).keydown(keymap.keydown);
		$(document).keyup(keymap.keyup);
		$(document).blur(keymap.blur);

		$('#connect').click(clickButton);
		var canvas = $('#simulation');
		canvas.click(clickCanvas);
		clientPlayer.init(createViewLayer(canvas), createGlobalLayer(canvas));
		optionSelector.init();
		self.connect(optionSelector.selectLast);
	}

	/**
	 * Create the view layer.
	 */
	function createViewLayer(canvas)
	{
		var width = canvas.width();
		var height = canvas.height();
		var viewParams = {
			canvas: canvas,
			name: 'view',
			origin: new vector(width / 2, height / 2, 0),
			scale: 4/5 * height,
			opacity: 1.0,
		};
		return new paintingLayer(viewParams);
	}

	/**
	 * Create the global layer.
	 */
	function createGlobalLayer(canvas)
	{
		var width = canvas.width();
		var height = canvas.height();
		var globalWidth = height / 3;
		var margin = 20;
		var globalParams = {
			canvas: canvas,
			name: 'global',
			origin: new vector(width - globalWidth / 2 - margin, globalWidth / 2 + margin, 0),
			scale: 1/3 * globalWidth / 6312,
			planar: true,
			start: new planarPoint(width - globalWidth - margin, margin),
			end: new planarPoint(width - margin, globalWidth + margin),
			autoscale: true,
			opacity: 0.5,
		};
		return new paintingLayer(globalParams);
	}

	/**
	 * Click on the connect or disconnect button.
	 */
	function clickButton()
	{
		if (serverConnection.isConnected())
		{
			self.disconnect();
		}
		else
		{
			self.connect();
		}
	}

	/**
	 * Manage a click on the canvas: restart the game if connected.
	 */
	function clickCanvas()
	{
		if (!serverConnection.isConnected())
		{
			return;
		}
		if (clientPlayer.isPlaying())
		{
			return;
		}
		clientPlayer.connect();
	}

	/**
	 * Connect using a websocket.
	 */
	self.connect = function(callback)
	{
		serverConnection.connect(callback);
	}

	/**
	 * Disconnect from the game.
	 */
	self.disconnect = function()
	{
		serverConnection.disconnect();
	}
}

