$( document ).ready(function() {

  var chip = new Chip8();

  // for now we will hardcode what file to load 

  // PLAYABLE!!! (doesn't mean 100% ...)
  // chip.loadProgram('MISSILE'); 
  // chip.loadProgram('MAZE'); 
  // chip.loadProgram('WIPEOFF'); 

  // close to maybe being playable
  // chip.loadProgram('CONNECT4'); 
  // chip.loadProgram('PONG'); 
  // chip.loadProgram('PUZZLE'); 
  // chip.loadProgram('VERS'); // stuck in small loop

  // gets to start screen
  // chip.loadProgram('BLITZ'); 
  // chip.loadProgram('15PUZZLE'); 
  // chip.loadProgram('BRIX'); 
  // chip.loadProgram('HIDDEN'); 
  // chip.loadProgram('INVADERS'); 
  // chip.loadProgram('VBRIX');  // stuck in small loop

  // completely broken
  // chip.loadProgram('BLINKY'); 
  // chip.loadProgram('GUESS'); 
  // chip.loadProgram('KALEID'); 
  // chip.loadProgram('MERLIN'); 
  // chip.loadProgram('PONG2'); 
  chip.loadProgram('pong2.c8'); 
  // chip.loadProgram('SYZGY'); // uses opcode 0nnn
  // chip.loadProgram('TANK'); 
  // chip.loadProgram('TETRIS'); // might be good for debugging, seems to be stuck in a small loop
  // chip.loadProgram('UFO'); 
  

  chip.loadFonts();

  var tick = function() {
    chip.setKeyBuffer();
    chip.run();
    chip.display.render(chip.screenBuffer);
    requestAnimationFrame(tick);
  };

  tick();

  // testing purposes
  // console.log(chip.memory);

});