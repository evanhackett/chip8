// the Display class provides functions to interface between the chip8's screenBuffer and an html canvas
var Display = function() {
  var display = {};

  // this function takes the screenBuffer and draws white pixels where 1's occur and Black pixels where 0's occur
  display.render = function(screenBuffer) {

    var canvas = $('#chip8Screen')[0];
    var ctx = canvas.getContext('2d');
    var width = canvas.width;
    var height = canvas.height;
    // since 64 x 32 is really small, we made a 640 x 320 canvas. This means we have to scale up our pixels
    var scaleFactor = Math.floor(width / 64);

    // we want 'on' pixels to be white
    // and 'off' pixels to be black
    
    // first we reset the screen to all black
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    // loop through the screenBuffer, if the bit is white, draw a white rect
    ctx.fillStyle = "#fff";
    var x, y;
    for (var i = 0; i < screenBuffer.length; i++) {
      x = (i % 64) * scaleFactor;
      y = Math.floor(i / 64) * scaleFactor;
      if (screenBuffer[i]) {
        ctx.fillRect(x, y, scaleFactor, scaleFactor);
      }
    }
  };


  return display;
};