$( document ).ready(function() {

  var chip = new Chip8();

  // for now we will hardcode what file to load 
  chip.loadProgram('PONG2');

  var tick = function() {
    chip.run();
    requestAnimationFrame(tick);
  };

  tick();

  // testing purposes
  // console.log(chip.memory);

});