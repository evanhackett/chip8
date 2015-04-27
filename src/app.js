$( document ).ready(function() {

  var chip = new Chip8();

  // test to see if pixel scaling and pixel placing work correctly on render
  var screenBuffer = new Uint8Array(64*32);
  screenBuffer[128] = 1;
  chip.display.render(screenBuffer);

});