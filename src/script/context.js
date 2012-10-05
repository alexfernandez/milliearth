'use strict';
/**
 * MilliEarth atescript.
 * Script context.
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
 * Requirements.
 */
var parsePosition = require('./parse.js').parsePosition;
var scriptingParams = require('./parse.js').scriptingParams;
var scriptingSentence = require('./parse.js').scriptingSentence;
var storage = require('./parse.js').storage;
var util = require('../util.js');
var log = util.log;
var extend = util.extend;


/**
 * Provide the context for the scripting engine.
 * Contains an array of sentences.
 */
function scriptingContext(params)
{
	// self-reference
	var self = this;
	// extend storage
	extend(new storage([]), self);

	// attributes
	var computer = params.computer;
	self.it = params.it;
	var marked = 0;
	var interrupt = false;
	var stack = [self];

	/**
	 * Add a new sentence. Instantiates new contexts as necessary.
	 * Does not use recursion.
	 */
	self.addSentence = function(sentence)
	{
		if (sentence.getTerminator() == ':')
		{
			addNewContext();
		}
		var context = stack[stack.length - 1];
		context.add(sentence);
		var token = sentence.current();
		if (token == 'until' || sentence.getTerminator() == '.')
		{
			stack.pop();
		}
	}

	/**
	 * Create a new context inside the current one.
	 */
	function addNewContext()
	{
		var context = stack[stack.length - 1];
		var newContext = new scriptingContext(params);
		context.add(newContext);
		stack.push(newContext);
	}

	/**
	 * Run the specified number of lines, or less.
	 */
	self.run = function(lines)
	{
		var run = 0;
		while (run < lines && !self.finished() && !interrupt)
		{
			self.runSentence();
			run++;
		}
		if (interrupt)
		{
			interrupt = false;
		}
		log.d('Run ' + run + ' lines');
	}

	/**
	 * Run a single sentence. Uses recursion to get into embedded contexts.
	 */
	self.runSentence = function()
	{
		var sentence = self.current();
		if (sentence instanceof scriptingContext)
		{
			var context = sentence;
			if (self.it)
			{
				context.it = self.it;
			}
			context.runSentence();
			if (context.finished())
			{
				self.skip();
			}
			return;
		}
		log.d('Running: ' + sentence);
		var token = sentence.currentSkip();
		if (token == 'if')
		{
			doIf(sentence);
		}
		else if (token == 'repeat')
		{
			doRepeat(sentence);
		}
		else if (token == 'until')
		{
			doUntil(sentence);
		}
		else if (token == 'make')
		{
			doMake(sentence);
		}
		else if (checkCommand(token))
		{
			doCommand(token, sentence);
		}
		else
		{
			log.e('Invalid token ' + token + ' in sentence ' + sentence + '; skipping');
		}
		self.skip();
	}

	/**
	 * Run a make sentence.
	 */
	function doMake(sentence)
	{
		var variable = sentence.currentSkip();
		if (!sentence.checkSkip('='))
		{
			return;
		}
		var value = readValue(sentence);
		computer[variable] = value;
		sentence.skipTerminator();
	}

	/**
	 * Read the value for a variable.
	 */
	function readValue(sentence)
	{
		var value = null;
		while (!sentence.isTerminator() && !sentence.finished())
		{
			var token = sentence.currentSkip();
			if (isNumber(token))
			{
				value = readNumber(token);
			}
			else if (token == 'true')
			{
				value = true;
			}
			else if (token == 'false')
			{
				value = false;
			}
			else if (computer.hasOwnProperty(token))
			{
				value = computer[token];
			}
			else if (token == '+')
			{
				value += readValue(sentence);
			}
			else if (token == '-')
			{
				value -= readValue(sentence);
			}
			else if (token == '*')
			{
				value *= readValue(sentence);
			}
			else if (token == '/')
			{
				value /= readValue(sentence);
			}
			else
			{
				log.e('Invalid token ' + token + ' in value within ' + sentence);
			}
		}
		if (value === null)
		{
			log.e('No value');
		}
		return value;
	}

	/**
	 * Find out if the current token is a number.
	 */
	function isNumber(token)
	{
		return scriptingParams.number.test(token);
	}

	/**
	 * Read a numeric value.
	 */
	function readNumber(token)
	{
		return parseFloat(token);
	}

	/**
	 * Check if the token corresponds to any command.
	 */
	function checkCommand(token)
	{
		if (!token)
		{
			log.e('Empty token');
			return false;
		}
		if (computer.hasOwnProperty(token))
		{
			return true;
		}
		return findCommandStarts(token);
	}

	/**
	 * Do a computer command.
	 */
	function doCommand(command, sentence)
	{
		if (computer.hasOwnProperty(command))
		{
			var callback = computer[command];
			var parameter = readParameter(sentence);
			callback(parameter);
			interrupt = true;
			return;
		}
		if (findCommandStarts(command))
		{
			var trailing = sentence.currentSkip();
			command += trailing.charAt(0).toUpperCase() + trailing.slice(1);
			return doCommand(command, sentence);
		}
		log.e('Invalid command ' + command);
	}

	/**
	 * Return true if the computer has an attribute starting with command.
	 */
	function findCommandStarts(command)
	{
		for (var attribute in computer)
		{
			if (computer.hasOwnProperty(attribute) && attribute.startsWith(command))
			{
				return true;
			}
		}
		return false;
	}

	/**
	 * Read a parameter, like 'it'.
	 */
	function readParameter(sentence)
	{
		var parameter = null;
		while (!sentence.isTerminator())
		{
			var token = sentence.currentSkip();
			if (token == 'it')
			{
				parameter = self.it;
			}
			else
			{
				log.e('Invalid parameter ' + token);
			}
		}
		return parameter;
	}

	/**
	 * Run an if sentence.
	 */
	function doIf(sentence)
	{
		if (!evaluateCondition(sentence))
		{
			skipBlock();
			return false;
		}
		if (!sentence.checkSkip(':'))
		{
			return false;
		}
		return true;
	}

	/**
	 * Run a repeat sentence.
	 */
	function doRepeat(sentence)
	{
		if (!sentence.checkSkip(':'))
		{
			log.e('Invalid repeat sentence ' + sentence);
			return false;
		}
		marked = self.position + 1;
	}

	/**
	 * Run an until sentence.
	 */
	function doUntil(sentence)
	{
		var evaluation = evaluateCondition(sentence);
		sentence.skipTerminator();
		if (!evaluation)
		{
			self.goToMark();
			return;
		}
		return evaluation;
	}

	/**
	 * Go to the latest mark.
	 */
	self.goToMark = function()
	{
		if (!marked)
		{
			log.e('Invalid mark');
			return;
		}
		for (var i = marked; i <= self.position; i++)
		{
			var sentence = self.contents[i];
			sentence.reset();
		}
		self.position = marked - 1;
	}

	/**
	 * Evaluate a condition.
	 */
	function evaluateCondition(sentence)
	{
		var subject = sentence.currentSkip();
		if (subject == 'it')
		{
			return evaluateIt(sentence);
		}
		var particle = sentence.currentSkip();
		if (particle == 'in')
		{
			return evaluateIn(sentence, subject);
		}
		if (particle == '=')
		{
			return evaluateValue(sentence, subject);
		}
		log.e('Invalid particle ' + particle);
		return false;
	}

	/**
	 * Evaluate an 'in' condition: container has an element with the given attribute.
	 */
	function evaluateIn(sentence, elementAttribute)
	{
		return evaluateContainer(sentence, function(element) {
			var evaluation = element[elementAttribute];
			if (evaluation)
			{
				self.it = element;
			}
			return evaluation;
		});
	}

	/**
	 * Evaluate some callback inside every element of a container attribute.
	 */
	function evaluateContainer(sentence, callback)
	{
		var containerAttribute = sentence.currentSkip();
		var container = computer[containerAttribute];
		if (!container)
		{
			log.e('Invalid container attribute ' + containerAttribute);
			return false;
		}
		for (var key in container)
		{
			var element = container[key];
			if (callback(element))
			{
				return true;
			}
		}
		return false;
	}

	/**
	 * Evaluate an 'it' condition: something about it.
	 */
	function evaluateIt(sentence)
	{
		if (!self.it)
		{
			log.e('Invalid reference to it');
			return;
		}
		if (!sentence.checkSkip('is'))
		{
			return false;
		}
		var attribute = sentence.currentSkip();
		if (attribute == 'in')
		{
			return evaluateItIn(sentence);
		}
		return self.it[attribute];
	}

	/**
	 * Evaluate an 'it' 'in' condition: 'it' is in some attribute.
	 */
	function evaluateItIn(sentence)
	{
		return evaluateContainer(sentence, function(element) {
			return (self.it == element);
		});
	}

	/**
	 * Evaluate that the given attribute holds the given value.
	 */
	function evaluateValue(sentence, attribute)
	{
		if (!(attribute in computer))
		{
			return false;
		}
		var value = readValue(sentence);
		return (value == computer[attribute]);
	}

	/**
	 * Skip a whole block of code (until the next period '.').
	 */
	function skipBlock()
	{
		var sentence = self.current();
		while (!endsBlock(sentence) && !self.finished())
		{
			log.d('Skipping ' + sentence);
			sentence = self.currentSkip();
		}
	}

	/**
	 * Find out if a sentence marks a block.
	 */
	function endsBlock(sentence)
	{
		if (sentence instanceof scriptingContext)
		{
			return false;
		}
		return sentence.getTerminator() == '.';
	}

	/**
	 * Reset: make all contained elements reset.
	 */
	self.oldReset = self.reset;
	self.reset = function()
	{
		for (var index in self.contents)
		{
			self.contents[index].reset();
		}
		self.oldReset();
	}

	/**
	 * Printable representation.
	 */
	self.oldToString = self.toString;
	self.toString = function()
	{
		return '[' + self.oldToString() + ']';
	}
}

module.exports.scriptingContext = scriptingContext;

