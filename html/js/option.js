"use strict";
/**
 * MilliEarth options.
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
 * Selector for the options on the right.
 */
var optionSelector = new function()
{
	// self-reference
	var self = this;

	// attributes
	self.debugShown = false;

	/**
	 * Initialize the options.
	 */
	self.init = function()
	{
		$('.option').each(initOption);
		if (!localStorage['milliEarthOption'])
		{
			localStorage['milliEarthOption'] = $('.option').attr('id');
		}
	}

	/**
	 * Init each option in the list.
	 */
	function initOption(index, element)
	{
		var id = $(element).attr('id');
		$(element).click(function() {
			self.select(id);
		});
	}

	/**
	 * Select one option.
	 */
	self.select = function(option)
	{
		$('.option').removeClass('selected');
		$('#' + option).addClass('selected');
		$('#content').empty();
		self.debugShown = false;
		var name = 'show' + option.charAt(0).toUpperCase() + option.slice(1);
		var callback = self[name];
		callback();
		localStorage['milliEarthOption'] = option;
	}

	/**
	 * Select the last option selected.
	 */
	self.selectLast = function()
	{
		self.select(localStorage['milliEarthOption']);
	}

	/**
	 * Show the keymap in the content.
	 */
	self.showKeymap = function()
	{
		keymap.display($('#content'));
	}

	/**
	 * Show the rivals in the content.
	 */
	self.showRivals = function()
	{
		rivalList.requestRivals();
	}

	/**
	 * Show the current code in the content.
	 */
	self.showCode = function()
	{
		codeEditor.display($('#content'));
	}

	/**
	 * Debug messages from the server.
	 */
	self.showDebug = function()
	{
		self.debugShown = true;
	}

	/**
	 * Display the given contents.
	 */
	self.display = function(contents)
	{
		if (!self.debugShown)
		{
			return;
		}
		$('#content').html(contents);
	}
}

