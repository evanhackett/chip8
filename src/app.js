$( document ).ready(function() {
  var chip = new Chip8();
  var screenBuffer = new Uint8Array(64*32);
  chip.display.render(screenBuffer);
});