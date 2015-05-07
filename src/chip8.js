// core CPU

var Chip8 = function() {
  var chip = {};

  // keyboard testing
  chip.keyboarder = new Keyboarder();

  // the chip8 keypad supports 16 input buttons.
  chip.keyBuffer = new Uint8Array(16);

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
  chip.stack = [];
  // chip.stackPointer = 0;

  chip.delayTimer = 0;
  chip.soundTimer = 0;


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

  chip.setKeyBuffer = function() {
    for(var key in this.keyboarder.KEYS) {
      // check if the key is being pressed, if it is, set the corresponding key in keybuffer to 1.
      if (this.keyboarder.isDown(this.keyboarder.KEYS[key])) {
        this.keyBuffer[key] = 1;
        console.log('PRESSED KEY: ' + key.toString(16));
      } else {
        this.keyBuffer[key] = 0;
      }
    }
  };

  // used to extract the 'x' portion of an opcode
  chip.getX = function(opcode) {
    return (opcode & 0x0F00) >> 8;
  };

  // used to extract the 'y' portion of an opcode
  chip.getY = function(opcode) {
    return (opcode & 0x00F0) >> 4;
  };

  // used to extract the 'kk' portion of an opcode
  chip.getKK = function(opcode) {
    return opcode & 0x00FF;
  };

  // used to increment the program counter when ready for next instruction
  chip.incrementPC = function() {
    this.pc += 2;
  };

  /*
    Documentation for all opcodes was found here: http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#8xy0
    I copy/pasted the opcode descriptions as comments above each case in the main run switch
  */

  // object that stores all opcodes with their corresponding function
  chip.opcodes = {
    '00E0': function(opcode) {
      for (i = 0; i < this.screenBuffer.length; i++) {
        this.screenBuffer[i] = 0;
      }
      this.incrementPC();
    }.bind(chip),

    '00EE': function(opcode) {
      // LOOK INTO THIS:
      // console.log(this.stack); // stack is totally empty... so pc gets set to 0 + 2 = 2
      this.pc = this.stack.pop();
      console.log('Returning to ' + this.pc.toString(16));
    }.bind(chip),

    '1nnn': function(opcode) {
      n = opcode & 0x0FFF;
      this.pc = n;
      console.log('Jumping to ' + this.pc.toString(16));
    }.bind(chip),

    '2nnn': function(opcode) {
      console.log('PC: ' + this.pc);
      this.stack.push(this.pc);
      this.pc = opcode & 0x0FFF;
      console.log("Calling " + this.pc.toString(16) + ' from ' + this.stack[this.stack.length-1].toString(16));
    }.bind(chip),

    '3xkk': function(opcode) {
      var x = this.getX(opcode);
      var kk = this.getKK(opcode);
      if (this.V[x] === kk) {
        this.incrementPC();
        this.incrementPC();
        console.log('Skipping next instruction, V['+x+'] === ' + kk);
      } else {
        this.incrementPC();
        console.log('Not skipping next instruction, V['+x+'] !== ' + kk);
      }
    }.bind(chip),

    '4xkk': function(opcode) {
      var x = this.getX(opcode);
      var kk = this.getKK(opcode);
      if (this.V[x] !== kk) {
        this.incrementPC();
      }
      this.incrementPC();
    }.bind(chip),

    '5xy0': function(opcode) {
      var x = this.getX(opcode);
      var y = this.getY(opcode);
      if (this.V[x] === this.V[y]) {
        this.incrementPC();
      }
    }.bind(chip),

    '6xkk': function(opcode) {
      var x = this.getX(opcode);
      this.V[x] = this.getKK(opcode);
      this.incrementPC();
      console.log("Setting V["+x+"] to " + this.V[x]);
    }.bind(chip),

    '7xkk': function(opcode) {
      var x = this.getX(opcode);
      this.V[x] += this.getKK(opcode);
      this.incrementPC();
      console.log("Adding " + (this.getKK(opcode)) + " to  V["+x+"] = " + this.V[x]);
    }.bind(chip),

    '8xy0': function(opcode) {
      var x = this.getX(opcode);
      var y = this.getY(opcode);
      this.V[x] = this.V[y];
      this.incrementPC();
    }.bind(chip),

    '8xy1': function(opcode) {
      var x = this.getX(opcode);
      var y = this.getY(opcode);
      this.V[x] = this.V[x] | this.V[y];
      this.incrementPC();
    }.bind(chip),

    '8xy2': function(opcode) {
      var x = this.getX(opcode);
      var y = this.getY(opcode);
      this.V[x] = this.V[x] & this.V[y];
      this.incrementPC();
    }.bind(chip),

    '8xy3': function(opcode) {
      var x = this.getX(opcode);
      var y = this.getY(opcode);
      this.V[x] = this.V[x] ^ this.V[y];
      this.incrementPC();
    }.bind(chip),

    '8xy4': function(opcode) {
        var x = this.getX(opcode);
        var y = this.getY(opcode);

        if (this.V[x] + this.V[y] > 255) {
          this.V[0xF] = 1;
        } else {
          this.V[0xF] = 0;
        }
        // this will drop bits that are higher than 255
        this.V[x] = (this.V[x] + this.V[y]) & 0xFF;
        this.incrementPC();
    }.bind(chip),

    '8xy5': function(opcode) {
      var x = this.getX(opcode);
      var y = this.getY(opcode);

      if (this.V[x] > this.V[y]) {
        this.V[0xF] = 1;
      } else {
        this.V[0xF] = 0;
      }

      this.V[x] = (this.V[x] - this.V[y]) & 0xFF;

      this.incrementPC();
    }.bind(chip),

    '8xy6': function(opcode) {
      var x = this.getX(opcode);
      this.V[0xF] = this.V[x] & 0x01;
      this.V[x] = this.V[x] >> 1;
      this.incrementPC();
    }.bind(chip),

    '8xy7': function(opcode) {
      var x = this.getX(opcode);
      var y = this.getY(opcode);
      if (this.V[x] > this.V[y]) {
        this.V[0xF] = 0;
      } else {
        this.V[0xF] = 1;
      }

      this.V[x] = this.V[y] - this.V[x];
      this.incrementPC();
    }.bind(chip),

    '8xyE': function(opcode) {
      var x = this.getX(opcode);
      this.V[0xF] = this.V[x] & 0x80;
      this.V[x] = this.V[x] << 1;
      this.incrementPC();
    }.bind(chip),

    '9xy0': function(opcode) {
      var x = this.getX(opcode);
      if (this.V[x] != this.V[y]) {
        this.incrementPC();
      }
      this.incrementPC();
    }.bind(chip),

    'Annn': function(opcode) {
      this.I = opcode & 0x0FFF;
      this.incrementPC();
      console.log("Setting I to " + this.I.toString(16));
    }.bind(chip),

    'Bnnn': function(opcode) {
      var n = (opcode & 0x0FFF);
      this.pc = n + this.V[0];
    }.bind(chip),

    'Cxkk': function(opcode) {
      var x = this.getX(opcode);
      var kk = this.getKK(opcode);
      var randomNum = Math.floor((Math.random() * 255)) & kk;
      this.V[x] = randomNum;
      this.incrementPC();
      console.log('random number generated: ' + randomNum);
    }.bind(chip),

    'Dxyn': function(opcode) {
      var x = this.V[this.getX(opcode)];
      var y = this.V[this.getY(opcode)];
      var n = opcode & 0x000F;

      this.V[0xF] = 0;

      for (var i = 0; i < n; i++) {
        var line = this.memory[this.I + i];
        for (var j = 0; j < 8; j++) {
          var pixel = line & (0x80 >> j);
          if (pixel !== 0) {
            var totalX = x + j;
            var totalY = y + i;

            // screen wrap
            totalX = totalX % 64;
            totalY = totalY % 32;

            var index = totalY * 64 + totalX;

            if (this.screenBuffer[index] === 1) {
              this.V[0xF] = 1;
            }

            this.screenBuffer[index] ^= 1;
          }
        }
      }

      this.incrementPC();
      console.log('Drawing at V['+(this.getX(opcode))+'] = ' + x + ', V['+(this.getY(opcode))+'] = ' + y);
    }.bind(chip),

    'Ex9E': function(opcode) {
      var x = this.getX(opcode);
      key = this.V[x];
      if (this.keyBuffer[key] === 1) {
        this.incrementPC();
      }
      this.incrementPC();
    }.bind(chip),

    'ExA1': function(opcode) {
      var x = this.getX(opcode);
      var key = this.V[x];
      if (this.keyBuffer[key] === 0) {
        this.incrementPC();
      }
      this.incrementPC();
    }.bind(chip),

    'Fx07': function(opcode) {
      var x = this.getX(opcode);
      this.V[x] = this.delayTimer;
      this.incrementPC();
      console.log("V["+x+'] has been set to ' + this.delayTimer);
    }.bind(chip),

    'Fx0A': function(opcode) {
      var x = this.getX(opcode);
      for(var i = 0; i < this.keyBuffer.length; i++) {
        if(this.keyBuffer[i] === 1) {
          this.V[x] = i;
          this.incrementPC();
          break;
        }
      }
    }.bind(chip),

    'Fx15': function(opcode) {
      var x = opcode & 0x0F00;
      this.delayTimer = this.V[x];
      this.incrementPC();
      console.log("setting DT to V["+x+'] = ' + this.V[x]);
    }.bind(chip),

    'Fx18': function(opcode) {
      var x = this.getX(opcode);
      this.soundTimer = this.V[x];
      this.incrementPC();
    }.bind(chip),

    'Fx1E': function(opcode) {
      var x = this.getX(opcode);
      this.I += this.V[x];
      this.incrementPC();
    }.bind(chip),

    'Fx29': function(opcode) {
      var x = this.getX(opcode);
      var character = this.V[x];
      this.I = character * 5;
      console.log("setting I to character V["+x+'] = ' + this.V[x] + ' offset to 0x' + this.I.toString(16));
      this.incrementPC();
    }.bind(chip),

    'Fx33': function(opcode) {
      var x = this.getX(opcode);
      var value = this.V[x];

      var hundreds = (value - (value % 100)) / 100;
      value -= hundreds * 100;
      var tens = (value - (value % 10)) / 10;
      value -= tens * 10;
      var ones = value;
      this.memory[this.I] = hundreds;
      this.memory[this.I + 1] = tens;
      this.memory[this.I + 2] = ones;
      this.incrementPC();
      console.log('Storing binary-encoded decimal V['+x+'] = '+this.V[this.getX(opcode)] + 'as {' + hundreds + ', ' + tens + ' , ' + ones + '}');
    }.bind(chip),

    'Fx55': function(opcode) {
      var x = this.getX(opcode);
      for (var i = 0; i <= x; i++) {
        this.memory[this.I + i] = this.V[i];
      }
      this.incrementPC();
    }.bind(chip),

    'Fx65': function(opcode) {
      var x = this.getX(opcode);
      // note: <= not <
      for (var i = 0; i <= x; i++) {
        this.V[i] = this.memory[this.I + i];
      }
      console.log('Setting V[0] to V['+x+'] to the values in memory[0x'+(this.I & 0xFFFF).toString(16)+']');

      // not sure if this is needed
      this.I += x + 1;

      this.incrementPC();
    }.bind(chip)

  };

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

    // decode opcode
    switch(opcode & 0xF000) { // grab first nibble

      // mulit-case
      case 0x0000:
        switch(opcode & 0x00FF) {

          // 00E0 - CLS
          // clear screen
          case 0x00E0:
            this.opcodes['00E0'](opcode);
            break;

          // 00EE - RET
          // Return from a subroutine.
          case 0x00EE:
            this.opcodes['00EE'](opcode);
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
        this.opcodes['1nnn'](opcode);
        break;

      // 2nnn - CALL addr
      // Call subroutine at nnn.
      case 0x2000:
        this.opcodes['2nnn'](opcode);
        break;

      // 3xkk - SE Vx, byte
      // Skip next instruction if Vx = kk.
      case 0x3000:
        this.opcodes['3xkk'](opcode);
        break;

      // 4xkk - SNE Vx, byte
      // Skip next instruction if Vx != kk.
      case 0x4000:
        this.opcodes['4xkk'](opcode);
        break;

      // 5xy0 - SE Vx, Vy
      // Skip next instruction if Vx = Vy.
      case 0x5000:
        this.opcodes['5xy0'](opcode);
        break;

      // 6xkk - LD Vx, byte
      // Set Vx = kk.
      case 0x6000:
        this.opcodes['6xkk'](opcode);
        break;

      // 7xkk - ADD Vx, byte
      // Set Vx = Vx + kk.
      case 0x7000:
        this.opcodes['7xkk'](opcode);
        break;

      // more data in last nibble, could be one of many instructions
      case 0x8000: 
        switch(opcode & 0x000F) {

          // 8xy0 - LD Vx, Vy
          // Set Vx = Vy.
          case 0x0000:
            this.opcodes['8xy0'](opcode);
            break;

          // 8xy1 - OR Vx, Vy
          // Set Vx = Vx OR Vy.
          case 0x0001:
            this.opcodes['8xy1'](opcode);
            break;

          // 8xy2 - AND Vx, Vy
          // Set Vx = Vx AND Vy.
          case 0x0002:
            this.opcodes['8xy2'](opcode);
            break;

          // 8xy3 - XOR Vx, Vy
          // Set Vx = Vx XOR Vy.
          case 0x0003:
            this.opcodes['8xy3'](opcode);
            break;

          // 8xy4 - ADD Vx, Vy
          // Set Vx = Vx + Vy, set VF = carry.
          case 0x0004:
            this.opcodes['8xy4'](opcode);
            break;

          // 8xy5 - SUB Vx, Vy
          // Set Vx = Vx - Vy, set VF = NOT borrow.
          case 0x0005:
            this.opcodes['8xy5'](opcode);
            break;

          // 8xy6 - SHR Vx {, Vy}
          // Set Vx = Vx SHR 1.
          case 0x0006:
            this.opcodes['8xy6'](opcode);
            break;

          // 8xy7 - SUBN Vx, Vy
          // Set Vx = Vy - Vx, set VF = NOT borrow.
          case 0x0007:
            this.opcodes['8xy7'](opcode);
            break;

          // 8xyE - SHL Vx {, Vy}
          // Set Vx = Vx SHL 1.
          case 0x000E:
            this.opcodes['8xyE'](opcode);
            break;


          default:
            this.unsupportedOpcode(opcode);
            break;
        }
        break;

      // 9xy0 - SNE Vx, Vy
      // Skip next instruction if Vx != Vy.
      case 0x9000:
        this.opcodes['9xy0'](opcode);
        break;

      // Annn - LD I, addr
      // Set I = nnn.
      case 0xA000:
        this.opcodes['Annn'](opcode);
        break;

      // Bnnn - JP V0, addr
      // Jump to location nnn + V0.
      case 0xB000:
        this.opcodes['Bnnn'](opcode);
        break;

      // Cxkk - RND Vx, byte
      // Set Vx = random byte AND kk.
      case 0xC000:
        this.opcodes['Cxkk'](opcode);
        break;

      // Dxyn - DRW Vx, Vy, nibble
      // Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
      case 0xD000:
        this.opcodes['Dxyn'](opcode);
        break;

      // multi-case
      case 0xE000:
        switch(this.getKK(opcode)) {

          // Ex9E - SKP Vx
          // Skip next instruction if key with the value of Vx is pressed.
          case 0x009E:
            this.opcodes['Ex9E'](opcode);
            break;

          // ExA1 - SKNP Vx
          // Skip next instruction if key with the value of Vx is not pressed.
          case 0x00A1:
            this.opcodes['ExA1'](opcode);
            break;

          default:
            this.unsupportedOpcode();
            break;
        }
        break;

      // multi-case
      case 0xF000:
        switch(this.getKK(opcode)) {


          // Fx07 - LD Vx, DT
          // Set Vx = delay timer value.
          case 0x0007:
            this.opcodes['Fx07'](opcode);
            break;

          // Fx0A - LD Vx, K
          // Wait for a key press, store the value of the key in Vx.
          case 0x000A:
            this.opcodes['Fx0A'](opcode);
            break;


          // Fx15 - LD DT, Vx
          // Set delay timer = Vx.
          case 0x0015:
            this.opcodes['Fx15'](opcode);
            break;

          // Fx18 - LD ST, Vx
          // Set sound timer = Vx.
          case 0x0018:
            this.opcodes['Fx18'](opcode);
            break;

          // Fx1E - ADD I, Vx
          // Set I = I + Vx.
          case 0x001E:
            this.opcodes['Fx1E'](opcode);
            break;

          // Fx29 - LD F, Vx
          // Set I = location of sprite for digit Vx.
          case 0x0029:
            this.opcodes['Fx29'](opcode);
            break;

          // Fx33 - LD B, Vx
          // Store BCD representation of Vx in memory locations I, I+1, and I+2.
          case 0x0033:
            this.opcodes['Fx33'](opcode);
            break;


          // Fx55 - LD [I], Vx
          // Store registers V0 through Vx in memory starting at location I.
          case 0x0055:
            this.opcodes['Fx55'](opcode);
            break;

          // Fx65 - LD Vx, [I]
          // Read registers V0 through Vx from memory starting at location I.
          case 0x065:
            this.opcodes['Fx65'](opcode);
            break;

          default:
            this.unsupportedOpcode(opcode);
        }
        break;

      default:
        this.unsupportedOpcode(opcode);
    }
  
    if (this.soundTimer > 0) {
      this.soundTimer--;
      // this is where you would play a beep sound
    }
    if (this.delayTimer > 0) {
      this.delayTimer--;
    }
  };

  return chip;
};



