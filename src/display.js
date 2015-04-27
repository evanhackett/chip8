// the Display class provides functions to interface between the chip8's screenBuffer and an html canvas
var Display = function() {
  var display = {};

  display.render = function(screenBuffer) {
    var canvas = $('#chip8Screen')[0];
    var ctx = canvas.getContext('2d');

    // we want 'on' pixels to be white
    ctx.fillStyle = "#000";
    ctx.fillRect(10,10,55,50);
  };


  return display;
};