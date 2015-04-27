// core CPU

var Chip8 = function() {
  var chip = {};

  // initialize state variables
  chip.memory = new Uint8Array(4096);

  // CHIP-8 has 16 8-bit data registers named from V0 to VF. The VF register doubles as a carry flag.
  chip.V = new Uint8Array(16);
  // the address register, named 'I'
  chip.I = 0x0;
  // the program counter
  chip.pc = 0x200;

  // the stack stores return addresses. Supports 16 levels of nesting
  chip.stack = new Uint8Array(16);
  chip.stackPointer = 0;

  chip.delayTimer = 0;
  chip.soundTimer = 0;

  // the chip8 keypad supports 16 input buttons.
  chip.keys = new Uint8Array(16);

  // the screen buffer. The resolution of the chip8 is 64 x 32. 
  // If a bit is '1', the pixel should be white. If a bit is '0', the pixel should be black
  chip.screenBuffer = new Uint8Array(64 * 32); 

  // display provides utility functions for interfacing with a graphics api
  chip.display = new Display();

  chip.unsupportedOpcode = function(opcode) {
    console.log("Error: " + opcode.toString(16) + " is not a supported opcode.");
    throw 'unsupported opcode';
  };

  chip.run = function() {
    // fetch opcode
    // each opcode is 2 bytes. Here we grab 2 bytes from memory and merge them together with a left shift and a bitwise 'OR'.
    var opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    console.log(opcode.toString(16));
    // decode opcode
    switch(opcode & 0xF000) { // grab first nibble

      case 0x8000:
        switch(opcode & 0x000F) {

          // 8xy0 - LD Vx, Vy
          // Set Vx = Vy.
          // Stores the value of register Vy in register Vx.
          case 0x0000:
            default:
              this.unsupportedOpcode(opcode);
          


        }
        break;

      default:
        this.unsupportedOpcode(opcode);
    }
  };

  return chip;
};