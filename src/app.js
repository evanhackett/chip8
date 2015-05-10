$( document ).ready(function() {

  $('#romSelect').change( function(event) {
    var selectedROM = $("#romSelect option:selected").val();
    var chip = Chip8();
    chip.loadFonts();
    chip.loadProgram(selectedROM); 

    var tick = function() {
      chip.setKeyBuffer();
      chip.run();
      chip.display.render(chip.screenBuffer);
      requestAnimationFrame(tick);
    };

    tick();

  });
});

