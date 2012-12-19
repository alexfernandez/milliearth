"use strict";
/**
 * MilliEarth code editor.
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
 * Code editor.
 */
var codeEditor = new function()
{
	// self-reference
	var self = this;

	// current code
	var contents = 'Fetching code from server';
	var initialized = false;

	/**
	 * Display the code editor.
	 */
	self.display = function(element)
	{
		element.append($('<div class="heading">').html('Scripts'));
		element.append($('<div id="scriptList">'));
		element.append($('<div class="heading">').html('Code Editor'));
		var edit = $('<textarea>').attr('id', 'editor').attr('name', 'code');
		edit.attr('placeholder', 'Select a script').attr('rows', '20').attr('cols', '60');
		var send = $('<input type="button" id="sendCode" value="Send code">');
		element.append(edit);
		element.append($('<br>'));
		element.append(send);
		self.requestScripts();
		$('#sendCode').click(self.sendCode);
	}

	/**
	 * Request all available scripts from the server.
	 */
	self.requestScripts = function()
	{
		debug('Requesting scripts');
		serverConnection.send({
			type: 'getScripts',
		});
	}

	/**
	 * Receive the list of scripts from the server.
	 */
	self.receiveScripts = function(message)
	{
		debug('Receiving scripts');
		for (var index in message.scripts)
		{
			var script = message.scripts[index];
			var element = $('<span class="script">').html(script.scriptId);
			element.click( function() {
				var scriptId = script.scriptId;
				self.requestCode(scriptId);
			});
			$('#scriptList').append(element);
		}
	}

	/**
	 * Request the code for a given script.
	 */
	self.requestCode = function(scriptId)
	{
		debug('Requesting code for ' + scriptId);
		serverConnection.send({
			type: 'getCode',
			scriptId: scriptId,
		});
	}

	/**
	 * Show the code for a computer player.
	 */
	self.showCode = function(message)
	{
		$('#editor').val(message.code);
	}

	/**
	 * Send the code for a computer player.
	 */
	self.sendCode = function()
	{
		debug('Sending code');
		serverConnection.send({
			type: 'install',
			contents: $('#editor').val(),
		});
	}
}

