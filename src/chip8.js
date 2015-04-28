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

  // display an error and stop program execution when an unsupported opcode is encountered
  chip.unsupportedOpcode = function(opcode) {
    console.log("Error: " + opcode.toString(16) + " is not a supported opcode.");
    throw 'unsupported opcode';
  };

  // loads a ROM into memory
  // currently I'm using "python -m SimpleHTTPServer" to serve up files
  chip.loadProgram = function(fileName) {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "ROMs/"+fileName, true);
    xhr.responseType = "arraybuffer";

    // to get around 'this' binding issues
    memory = this.memory;

    xhr.onload = function () {
      // loaded flag to prevent async from ruining my day
      memory[0] = true;
       var program = new Uint8Array(xhr.response);
       for (var i = 0; i < program.length; i++) {
        // load program into memory, starting at address 0x200
        // this is a convention from old times when chip8's typically stored the interpreter itself in memory from 0x0-0x200
        memory[0x200 + i] = program[i];
      }
    };

    xhr.send();
    console.log('Loaded ' + fileName + ' into memory.');
    // console.log(memory);
  };

  /*
    Documentation for all opcodes was found here: http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#8xy0
    I copy/pasted the opcode descriptions as comments above each case in the switch below
  */

  chip.run = function() {
    // check loaded flag
    if(!this.memory[0]) {
      setTimeout(this.run.bind(this), 1000);
      return;
    }
    console.log('running...');
    

    // fetch opcode
    // each opcode is 2 bytes. Here we grab 2 bytes from memory and merge them together with a left shift and a bitwise 'OR'.
    var opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    console.log('opcode: ' + opcode.toString(16));

    console.log('pc: ' + this.pc);
    // console.log('memory[pc]: ' + this.memory[this.pc]);
    // console.log('memory[pc] << 8: ' + this.memory[this.pc] << 8);
    // console.log('(memory[pc] << 8) | memory[pc + 1]: ' + (this.memory[this.pc] << 8) | this.memory[this.pc + 1]);

    
    var x; // to be used to index a register - V[x]

    // decode opcode
    switch(opcode & 0xF000) { // grab first nibble

      // 1nnn - JP addr
      // Jump to location nnn.
      case 0x1000:
        break;

      // 2nnn - CALL addr
      // Call subroutine at nnn.
      case 0x2000:
        // The interpreter increments the stack pointer, then puts the current PC on the top of the stack. The PC is then set to nnn.
        this.stack[this.stackPointer] = this.pc;
        this.stackPointer++;
        this.pc = opcode & 0x0FFF;
        break;

      // 3xkk - SE Vx, byte
      // Skip next instruction if Vx = kk.
      case 0x3000:
        break;

      // 4xkk - SNE Vx, byte
      // Skip next instruction if Vx != kk.
      case 0x4000:
        break;

      // 5xy0 - SE Vx, Vy
      // Skip next instruction if Vx = Vy.
      case 0x5000:
        break;

      // 6xkk - LD Vx, byte
      // Set Vx = kk.
      case 0x6000:
        // The interpreter puts the value kk into register Vx.
        x = opcode & 0x0F00;
        this.V[x] = opcode & 0x00FF;
        this.pc += 2;
        break;

      // 7xkk - ADD Vx, byte
      // Set Vx = Vx + kk.
      case 0x7000:
        // Adds the value kk to the value of register Vx, then stores the result in Vx. 
        x = opcode & 0x0F00;
        this.V[x] += opcode & 0x00FF;
        this.pc += 2;
        break;

      // more data in last nibble, could be one of many instructions
      case 0x8000: 
        switch(opcode & 0x000F) {

          // 8xy0 - LD Vx, Vy
          // Set Vx = Vy.
          case 0x0000:
            default:
              this.unsupportedOpcode(opcode);
        }
        break;

      // Annn - LD I, addr
      // Set I = nnn.
      case 0xA000:
        // The value of register I is set to nnn.
        this.I = opcode & 0x0FFF;
        this.pc += 2;
        break;

      // Dxyn - DRW Vx, Vy, nibble
      // Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
      case 0xD000:
      // The interpreter reads n bytes from memory, starting at the address stored in I. 
      // These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). 
      // Sprites are XORed onto the existing screen. If this causes any pixels to be erased, VF is set to 1, 
      // otherwise it is set to 0. If the sprite is positioned so part of it is outside the coordinates of the display, 
      // it wraps around to the opposite side of the screen.
        break;

      default:
        this.unsupportedOpcode(opcode);
    }
  };

  return chip;
};