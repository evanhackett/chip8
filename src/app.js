const select = document.getElementById("romSelect")

select.addEventListener("change", event => {
  const selectedROM = select.value

  const chip = require('./chip8')(document.getElementById('chip8Screen'))

  chip.loadFonts();
  chip.loadProgram(selectedROM);

  const tick = function() {
    chip.setKeyBuffer();
    chip.run();
    chip.display.render(chip.screenBuffer);
    requestAnimationFrame(tick);
  };

  tick();
})
