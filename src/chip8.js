// core CPU

var Chip8 = function() {
  var chip = {};

  /* initialize state variables */

  // the chip8 has 4096 bytes of ram, but I am adding an extra byte to be used as a flag for async stuff. see loadProgram
  chip.memory = new Uint8Array(4097);

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
      memory[4096] = true;
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


  chip.loadFonts = function() {
      var fonts = [
        0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
        0x20, 0x60, 0x20, 0x20, 0x70, // 1
        0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
        0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
        0x90, 0x90, 0xF0, 0x10, 0x10, // 4
        0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
        0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
        0xF0, 0x10, 0x20, 0x40, 0x40, // 7
        0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
        0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
        0xF0, 0x90, 0xF0, 0x90, 0x90, // A
        0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
        0xF0, 0x80, 0x80, 0x80, 0xF0, // C
        0xE0, 0x90, 0x90, 0x90, 0xE0, // D
        0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
        0xF0, 0x80, 0xF0, 0x80, 0x80  // F
      ];

      for (var i = 0; i < fonts.length; i++) {
        this.memory[i] = fonts[i];
      }
    };

  /*
    Documentation for all opcodes was found here: http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#8xy0
    I copy/pasted the opcode descriptions as comments above each case in the switch below
  */

  chip.run = function() {
    // check loaded flag
    if(!this.memory[4096]) {
      setTimeout(this.run.bind(this), 1000);
      return;
    }


    // fetch opcode
    // each opcode is 2 bytes. Here we grab 2 bytes from memory and merge them together with a left shift and a bitwise 'OR'.
    var opcode = (this.memory[this.pc] << 8) | this.memory[this.pc + 1];
    console.log('opcode: ' + opcode.toString(16));

    console.log('pc: ' + this.pc);
    // console.log('memory[pc]: ' + this.memory[this.pc]);
    // console.log('memory[pc] << 8: ' + this.memory[this.pc] << 8);
    // console.log('(memory[pc] << 8) | memory[pc + 1]: ' + (this.memory[this.pc] << 8) | this.memory[this.pc + 1]);

    
    var x, y, n;

    // decode opcode
    switch(opcode & 0xF000) { // grab first nibble

      // mulit-case
      case 0x0000:
        switch(opcode & 0x00FF) {

          // clear screen
          case 0x00E0:
            this.unsupportedOpcode(opcode);
            break;

          // 00EE - RET
          // Return from a subroutine.
          case 0x00EE:
            // Set the program counter to the address at the top of the stack, then subtracts 1 from the stack pointer.
            this.stackPointer--;
            this.pc = this.stack[this.stackPointer] + 2;
            console.log('Returning to ' + this.pc.toString(16));
            break;

          // 0NNN (don't need to implement this)
          default:
            this.unsupportedOpcode(opcode);
            break;
        }
        break;

      

      // 1nnn - JP addr
      // Jump to location nnn.
      case 0x1000:
        n = opcode & 0x0FFF;
        this.pc = n;
        break;

      // 2nnn - CALL addr
      // Call subroutine at nnn.
      case 0x2000:
        // The interpreter increments the stack pointer, then puts the current PC on the top of the stack. The PC is then set to nnn.
        this.stack[this.stackPointer] = this.pc;
        this.stackPointer++;
        this.pc = opcode & 0x0FFF;
        console.log("Calling " + this.pc.toString(16));
        break;

      // 3xkk - SE Vx, byte
      // Skip next instruction if Vx = kk.
      case 0x3000:
        x = (opcode & 0x0F00) >> 8;
        n = (opcode & 0x00FF);
        if (this.V[x] === n) {
          this.pc += 4;
          console.log('Skipping next instruction, V['+x+'] === ' + n);
        } else {
          this.pc += 2;
          console.log('Not skipping next instruction, V['+x+'] !== ' + n);
        }
        break;

      // 4xkk - SNE Vx, byte
      // Skip next instruction if Vx != kk.
      case 0x4000:
      this.unsupportedOpcode(opcode);
        break;

      // 5xy0 - SE Vx, Vy
      // Skip next instruction if Vx = Vy.
      case 0x5000:
      this.unsupportedOpcode(opcode);
        break;

      // 6xkk - LD Vx, byte
      // Set Vx = kk.
      case 0x6000:
        // The interpreter puts the value kk into register Vx.
        x = (opcode & 0x0F00) >> 8;
        console.log('x: ' + x);
        this.V[x] = opcode & 0x00FF;
        this.pc += 2;
        console.log("Setting V["+x+"] to " + this.V[x]);
        break;

      // 7xkk - ADD Vx, byte
      // Set Vx = Vx + kk.
      case 0x7000:
        // Adds the value kk to the value of register Vx, then stores the result in Vx. 
        x = (opcode & 0x0F00) >> 8;
        this.V[x] += opcode & 0x00FF;
        this.pc += 2;
        console.log("Adding " + (opcode & 0x00FF) + " to  V["+x+"] = " + this.V[x]);
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
        console.log("Setting I to " + this.I.toString(16));
        break;

      // Dxyn - DRW Vx, Vy, nibble
      // Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
      case 0xD000:
      // The interpreter reads n bytes from memory, starting at the address stored in I. 
      // These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). 
      // Sprites are XORed onto the existing screen. If this causes any pixels to be erased, VF is set to 1, 
      // otherwise it is set to 0. If the sprite is positioned so part of it is outside the coordinates of the display, 
      // it wraps around to the opposite side of the screen.

        x = this.V[(opcode & 0x0F00) >> 8];
        y = this.V[(opcode & 0x00F0) >> 4];
        n = opcode & 0x000F;

        this.V[0xF] = 0;

        for (var i = 0; i < n; i++) {
          var line = this.memory[this.I + i];
          for (var j = 0; j < 8; j++) {
            var pixel = line & (0x80 >> j);
            if (pixel !== 0) {
              var totalX = x + j;
              var totalY = y + i;
              var index = totalY * 64 + totalX;

              if (this.screenBuffer[index] === 1) {
                this.V[0xF] = 1;
              }

              this.screenBuffer[index] ^= 1;
            }
          }
        }

        this.pc += 2;
        console.log('Drawing at V['+((opcode & 0x0F00) >> 8)+'] = ' + x + ', V['+((opcode & 0x00F0) >> 4)+'] = ' + y);
        break;

      // multi-case
      case 0xF000:
        switch(opcode & 0x00FF) {

          // Fx29 - LD F, Vx
          // Set I = location of sprite for digit Vx.
          case 0x29:
            // The value of I is set to the location for the hexadecimal sprite corresponding to the value of Vx. 
            x = (opcode & 0x0F00) >> 8;
            var character = this.V[x];
            this.I = character * 5;
            console.log("setting I to character V["+x+'] = ' + this.V[x] + ' offset to 0x' + this.I.toString(16));
            break;

          // Fx33 - LD B, Vx
          // Store BCD representation of Vx in memory locations I, I+1, and I+2.
          case 0x033:
            // takes the decimal value of Vx, and places the hundreds digit in memory at 
            // location in I, the tens digit at location I+1, and the ones digit at location I+2.
            x = (opcode & 0x0F00) >> 8;
            var value = V[x];


            var hundreds = (value - (value % 100)) / 100;
            value -= hundreds * 100;
            var tens = (value - (value % 10)) / 10;
            value -= tens * 10;
            var ones = value;
            this.memory[this.I] = hundreds;
            this.memory[this.I + 1] = tens;
            this.memory[this.I + 2] = ones;
            this.pc += 2;
            console.log('Storing binary-encoded decimal V['+x+'] = '+this.V[(opcode & 0x0F00) >> 8] + 'as {' + hundreds + ', ' + tens + ' , ' + ones + '}');
            break;

          // Fx65 - LD Vx, [I]
          // Read registers V0 through Vx from memory starting at location I.
          case 0x065:
          // read values from memory starting at location I into registers V0 through Vx.
            x = (opcode & 0x0F00) >> 8;
            for (i = 0; i < x; i++) {
              this.V[i] = this.memory[this.I + i];
            }
            console.log('Setting V[0] to V['+x+'] to the values in memory[0x'+(this.I & 0xFFFF).toString(16)+']');
            this.pc += 2;
            break;

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



