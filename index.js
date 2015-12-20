#!/usr/bin/env node

var ffmpeg = require('fluent-ffmpeg');
var traceur = require('traceur');
var cue = traceur.require('cue-sdk-node');
var path = require('path');
var screenres = require('node-win-screenres');
var PNG = require('pngjs').PNG;

var fps = 30;

var l = null;
var c = null;

var buff = [];

var b = null;

function main() {
	ffmpeg.setFfmpegPath(path.join(__dirname, 'bin', 'ffmpeg.exe'));
	c = new cue.CueSDK();
	var screenSize = getScreenSize();
	l = c.getLeds();
	var ffstream = ffmpeg()
		.input('desktop')
		.inputFormat('gdigrab')
		.inputOptions([
			'-offset_y', Math.round(screenSize.y*0.95),
			'-video_size', screenSize.x+'x'+Math.round(screenSize.y*0.05),
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
            //console.log('Started ' + cmd);
        })
	var stdin = process.stdin;
	stdin.setRawMode( true );
	stdin.resume();
	stdin.setEncoding( 'utf8' );
	stdin.on( 'data', function( key ){
	  if ( key === '\u001B' ) {
		c.close();
		ffstream.kill();
		process.exit();
	  }
	});
	console.log('Press ESC to exit.\n');
	ffstream.pipe().on('data', parsevideo);
}

function parsevideo(chunk) {
	var pixeldata = [];
	new PNG().parse(chunk, function(err, p) {
		if (err) {
			console.log(err);
		}
		for (var i = 0; i<p.data.length; i+=4) {
			var r = p.data[i];
			var g = p.data[i+1];
			var b = p.data[i+2];
			pixeldata.push([r, g, b]);
		}
		printpixels(pixeldata);
    });
}

function printpixels(pixeldata) {
	if (buff.length >= fps) {
		buff.shift();
	}
	var leds = [];
	for (var i = 0; i<l.length; i++) {
		var k = l[i];
		var s = k['left']-10
		var e = s+k['width'];
		leds.push([k['ledId']].concat(avgpixeldata(pixeldata, s, e)));
	}
	buff.push(leds);
	b = c.set(leds, true);
}

function soften(ledmap) {
	if (buff.length < 1) {
		return ledmap;
	}
	for (var i = 0; i<buff.length; i++) {
		for (var j = 0; j<ledmap.length; j++) {
			ledmap[j][1] = (buff[i][j][1]+ledmap[j][1])/2
			ledmap[j][2] = (buff[i][j][2]+ledmap[j][2])/2
			ledmap[j][3] = (buff[i][j][3]+ledmap[j][3])/2
		}
	}
	return ledmap;
}

function avgpixeldata(pixeldata, start, end) {
	var r = 0;
	var g = 0;
	var b = 0;
	for (var i = start; i<end; i++) {
		r+=pixeldata[i][0];
		g+=pixeldata[i][1];
		b+=pixeldata[i][2];
	}
	return [r/(end-start), g/(end-start), b/(end-start)];
}

function getKeyboardSize(l) {
	var max = 0;
	for (var i = 0; i<l.length; i++) {
		max = Math.max(l[i]['width']+l[i]['left'], max);
	}
	return max-10;
}

function getScreenSize() {
	var s = screenres.monitors()[0];
	return {x:s.width, y:s.height}
}

process.on('exit', function() {
    b;
});

main();