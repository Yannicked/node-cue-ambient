#!/usr/bin/env node

var cue = require('cue-sdk-node');
var path = require('path');
var screenres = require('node-win-screenres');
// var PNG = require('pngjs').PNG;
var gdi = require('node-win-gdigrab');

var fps = 30;

var l = null;
var c = null;


var buff = [];

var b = null;

var g = null;
var e = null;
var startingleft = 0;

function main() {
	//ffmpeg.setFfmpegPath(path.join(__dirname, 'bin', 'ffmpeg.exe'));
	c = new cue.CueSDK();
	var screenSize = getScreenSize();
	console.log(screenSize);
	l = c.getLeds();
	g = new gdi({OffsetY: Math.round(screenSize.y*0.75), ScaleX: getKeyboardSize(l).size, ScaleY: 1});
	startingleft = getKeyboardSize(l).min;
	console.log(getKeyboardSize(l))
	/*ffstream = ffmpeg()
		.input('desktop')
		.inputFormat('gdigrab')
		.inputOptions([
			'-offset_y', Math.round(screenSize.y*0.50),
			'-video_size', screenSize.x+'x'+Math.round(screenSize.y*0.50),
		])
		.outputOptions([
			'-f', 'image2pipe',
			'-c:v', 'png',
			'-vf', 'scale='+getKeyboardSize(l)+'x1'
		])
		.fps(fps)
		.on('error', function(err) {
            console.log('An error occurred: ' + err.message);
        })
		.on('start', function(cmd) {
            console.log('Started ' + cmd);
        })*/
	e = setInterval(function() {
		g.grab(printpixels);
	}, 1000/30);
	process.on('SIGINT', function() {
		c.close();
		clearInterval(e)
		g.destroy();
		process.exit();
	});
	console.log('Press CTRL-C to exit.\n');
}

function create() {
	c = new cue.CueSDK();
	var screenSize = getScreenSize();
	l = c.getLeds();
	startingleft = getKeyboardSize(l).min;
	g = new gdi({OffsetY: Math.round(screenSize.y*0.50), ScaleX: getKeyboardSize(l).size, ScaleY: 1});
	e = setInterval(function() {
		g.grab(printpixels);
	}, 1000/30);
}

function destroy() {
	c.close();
	clearInterval(e);
	g.destroy();
}

function printpixels(pixeldata) {
	/*if (buff.length >= fps) {
		buff.shift();
	}*/
	var leds = [];
	//console.log(pixeldata);
	for (var i = 0; i<l.length; i++) {
		var k = l[i];
		var s = k['left']-startingleft;
		var e = s+k['width'];
		leds.push([k['ledId']].concat(avgpixeldata(pixeldata, s, e)));
	}
	//buff.push(leds);
	b = c.set(leds, true);
}

function avgpixeldata(pixeldata, start, end) {
	var r = 0;
	var g = 0;
	var b = 0;
	for (var i = start; i<end; i++) {
		r+=Math.pow(pixeldata[i*3], 2);
		g+=Math.pow(pixeldata[(i*3)+1], 2);
		b+=Math.pow(pixeldata[(i*3)+2], 2);
	}
	return [Math.round(Math.sqrt(r/(end-start))), Math.round(Math.sqrt(g/(end-start))), Math.round(Math.sqrt(b/(end-start)))];
}

function getKeyboardSize(l) {
	var max = 0;
	var min = 999;
	for (var i = 0; i<l.length; i++) {
		max = Math.max(l[i]['width']+l[i]['left'], max);
		min = Math.min(l[i]['left'], min);
	}
	return {max: max, min: min, size: max-min};
}

function getScreenSize() {
	var s = screenres.monitors()[0];
	return {x:s.width, y:s.height}
}

process.on('exit', function() {
    b;
});

if(require.main === module) 
   { main(); }
else
   { module.exports = {create: create, destroy: destroy} }