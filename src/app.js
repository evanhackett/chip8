$( document ).ready(function() {

  $('#romSelect').change( function(event) {
    var selectedROM = $("#romSelect option:selected").val();
    var chip = Chip8();
    chip.loadFonts();
    chip.loadProgram(selectedROM); 


    var process = function() {
      chip.setKeyBuffer();
      chip.run();
      setTimeout(process, 1);
    };

   

    var draw = function() {
      chip.display.render(chip.screenBuffer);
      requestAnimationFrame(draw);
    };

   process();
   draw();
    
  });
});

