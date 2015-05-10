$( document ).ready(function() {

  $('#romSelect').change( function(event) {
    var selectedROM = $("#romSelect option:selected").val();
    var chip = Chip8();
    chip.loadFonts();
    chip.loadProgram(selectedROM); 


    var process = function() {
      chip.setKeyBuffer();
      chip.run();
      // chip.run(); more of these makes it go faster, but too fast in some ways
      setTimeout(process, 0);
    };

   

    var draw = function() {
      chip.display.render(chip.screenBuffer);
      requestAnimationFrame(draw);
    };

   process();
   draw();
    
  });
});

