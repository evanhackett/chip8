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

  
  // chip.keys = new Uint8Array(16);

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
    // console.log(this.stack);
    // console.log('stackPointer: ' + this.stackPointer);
    // console.log('pc: ' + this.pc);
    

    var x, y, n, key, kk;

    // decode opcode
    switch(opcode & 0xF000) { // grab first nibble

      // mulit-case
      case 0x0000:
        switch(opcode & 0x00FF) {

          // clear screen
          case 0x00E0:
            for (i = 0; i < this.screenBuffer.length; i++) {
              this.screenBuffer[i] = 0;
            }
            this.pc += 2;
            break;

          // 00EE - RET
          // Return from a subroutine.
          case 0x00EE:
            // Set the program counter to the address at the top of the stack, then subtracts 1 from the stack pointer.
            // console.log('INSIDE RET');
            // console.log('stackPointer: ' + this.stackPointer);
            // console.log(this.stack); // stack is totally empty... so pc gets set to 0 + 2 = 2

            // this.stackPointer--;
            // this.pc = this.stack[this.stackPointer] + 2;
            this.pc = this.stack.pop();
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
        console.log('Jumping to ' + this.pc.toString(16));
        break;

      // 2nnn - CALL addr
      // Call subroutine at nnn.
      case 0x2000:
        // The interpreter increments the stack pointer, then puts the current PC on the top of the stack. The PC is then set to nnn.
        console.log(this.pc);
        // this.stack[this.stackPointer] = this.pc;
        // this.stackPointer++;
        this.stack.push(this.pc);
        this.pc = opcode & 0x0FFF;
        console.log("Calling " + this.pc.toString(16) + ' from ' + this.stack[this.stack.length-1].toString(16));
        // debugger;
        break;

      // 3xkk - SE Vx, byte
      // Skip next instruction if Vx = kk.
      case 0x3000:
        x = this.getX(opcode);
        kk = this.getKK(opcode);
        if (this.V[x] === kk) {
          this.pc += 4;
          console.log('Skipping next instruction, V['+x+'] === ' + kk);
        } else {
          this.pc += 2;
          console.log('Not skipping next instruction, V['+x+'] !== ' + kk);
        }
        break;

      // 4xkk - SNE Vx, byte
      // Skip next instruction if Vx != kk.
      case 0x4000:
        // compares register Vx to kk, and if they are not equal, increments the program counter by 2.
        x = this.getX(opcode);
        kk = this.getKK(opcode);
        if (this.V[x] !== kk) {
          this.pc += 2;
        }
        this.pc += 2;
        break;

      // 5xy0 - SE Vx, Vy
      // Skip next instruction if Vx = Vy.
      case 0x5000:
        x = this.getX(opcode);
        y = this.getY(opcode);
        if (this.V[x] === this.V[y]) {
          this.pc += 2;
        }
        break;

      // 6xkk - LD Vx, byte
      // Set Vx = kk.
      case 0x6000:
        // The interpreter puts the value kk into register Vx.
        x = this.getX(opcode);
        this.V[x] = this.getKK(opcode);
        this.pc += 2;
        console.log("Setting V["+x+"] to " + this.V[x]);
        break;

      // 7xkk - ADD Vx, byte
      // Set Vx = Vx + kk.
      case 0x7000:
        // Adds the value kk to the value of register Vx, then stores the result in Vx. 
        x = this.getX(opcode);
        this.V[x] += this.getKK(opcode);
        this.pc += 2;
        console.log("Adding " + (this.getKK(opcode)) + " to  V["+x+"] = " + this.V[x]);
        break;

      // more data in last nibble, could be one of many instructions
      case 0x8000: 
        switch(opcode & 0x000F) {

          // 8xy0 - LD Vx, Vy
          // Set Vx = Vy.
          case 0x0000:
            x = this.getX(opcode);
            y = this.getY(opcode);
            this.V[x] = this.V[y];
            this.pc += 2;
            break;

          // 8xy1 - OR Vx, Vy
          // Set Vx = Vx OR Vy.
          case 0x0001:
            x = this.getX(opcode);
            y = this.getY(opcode);
            this.V[x] = this.V[x] | this.V[y];
            this.pc += 2;
            break;

          // 8xy2 - AND Vx, Vy
          // Set Vx = Vx AND Vy.
          case 0x0002:
            x = this.getX(opcode);
            y = this.getY(opcode);
            this.V[x] = this.V[x] & this.V[y];
            this.pc += 2;
            break;

          // 8xy3 - XOR Vx, Vy
          // Set Vx = Vx XOR Vy.
          case 0x0003:
            x = this.getX(opcode);
            y = this.getY(opcode);
            this.V[x] = this.V[x] ^ this.V[y];
            this.pc += 2;
            break;

          // 8xy4 - ADD Vx, Vy
          // Set Vx = Vx + Vy, set VF = carry.
          case 0x0004:
          // The values of Vx and Vy are added together. If the result is greater than 8 bits (i.e., > 255,) VF is set to 1,
          // otherwise 0. Only the lowest 8 bits of the result are kept, and stored in Vx.
            x = this.getX(opcode);
            y = this.getY(opcode);

            if (this.V[x] + this.V[y] > 255) {
              this.V[0xF] = 1;
            } else {
              this.V[0xF] = 0;
            }

            // this will drop bits that are higher than 255
            this.V[x] = (this.V[x] + this.V[y]) & 0xFF;
            this.pc += 2;
            break;

          // 8xy5 - SUB Vx, Vy
          // Set Vx = Vx - Vy, set VF = NOT borrow.
          case 0x0005:
            // If Vx > Vy, then VF is set to 1, otherwise 0. Then Vy is subtracted from Vx, and the results stored in Vx.
            x = this.getX(opcode);
            y = this.getY(opcode);

            if (this.V[x] > this.V[y]) {
              this.V[0xF] = 1;
            } else {
              this.V[0xF] = 0;
            }

            this.V[x] = (this.V[x] - this.V[y]) & 0xFF;

            this.pc += 2;
            break;

          // 8xy6 - SHR Vx {, Vy}
          // Set Vx = Vx SHR 1.
          case 0x0006:
            x = this.getX(opcode);
            this.V[0xF] = this.V[x] & 0x01;
            this.V[x] = this.V[x] >> 1;
            this.pc += 2;
            break;

          // 8xy7 - SUBN Vx, Vy
          // Set Vx = Vy - Vx, set VF = NOT borrow.
          case 0x0007:
            x = this.getX(opcode);
            y = this.getY(opcode);
            if (this.V[x] > this.V[y]) {
              this.V[0xF] = 0;
            } else {
              this.V[0xF] = 1;
            }

            this.V[x] = this.V[y] - this.V[x];
            this.pc += 2;
            break;

          // 8xyE - SHL Vx {, Vy}
          // Set Vx = Vx SHL 1.
          case 0x000E:
          // If the most-significant bit of Vx is 1, then VF is set to 1, otherwise to 0. Then Vx is multiplied by 2.
            x = this.getX(opcode);
            this.V[0xF] = this.V[x] & 0x80;
            this.V[x] = this.V[x] << 1;
            this.pc += 2;
            break;


          default:
            this.unsupportedOpcode(opcode);
            break;
        }
        break;

      // 9xy0 - SNE Vx, Vy
      // Skip next instruction if Vx != Vy.
      case 0x9000:
        x = this.getX(opcode);
        if (this.V[x] != this.V[y]) {
          this.pc += 2;
        }
        this.pc += 2;
        break;

      // Annn - LD I, addr
      // Set I = nnn.
      case 0xA000:
        // The value of register I is set to nnn.
        this.I = opcode & 0x0FFF;
        this.pc += 2;
        console.log("Setting I to " + this.I.toString(16));
        break;

      // Bnnn - JP V0, addr
      // Jump to location nnn + V0.
      case 0xB000:
        n = (opcode & 0x0FFF);
        this.pc = n + this.V[0];
        break;

      // Cxkk - RND Vx, byte
      // Set Vx = random byte AND kk.
      case 0xC000:
      // generates a random number from 0 to 255, which is then ANDed with the value kk. The results are stored in Vx.
        x = this.getX(opcode);
        kk = this.getKK(opcode);
        var randomNum = Math.floor((Math.random() * 255)) & kk;
        this.V[x] = randomNum;
        this.pc += 2;
        console.log('random number generated: ' + randomNum);
        break;

      // Dxyn - DRW Vx, Vy, nibble
      // Display n-byte sprite starting at memory location I at (Vx, Vy), set VF = collision.
      case 0xD000:
      // The interpreter reads n bytes from memory, starting at the address stored in I. 
      // These bytes are then displayed as sprites on screen at coordinates (Vx, Vy). 
      // Sprites are XORed onto the existing screen. If this causes any pixels to be erased, VF is set to 1, 
      // otherwise it is set to 0. If the sprite is positioned so part of it is outside the coordinates of the display, 
      // it wraps around to the opposite side of the screen.

        x = this.V[this.getX(opcode)];
        y = this.V[this.getY(opcode)];
        n = opcode & 0x000F;

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

        this.pc += 2;
        console.log('Drawing at V['+(this.getX(opcode))+'] = ' + x + ', V['+(this.getY(opcode))+'] = ' + y);
        break;

      // multi-case
      case 0xE000:
        switch(this.getKK(opcode)) {

          // Ex9E - SKP Vx
          // Skip next instruction if key with the value of Vx is pressed.
          case 0x009E:
            // Checks the keyboard, and if the key corresponding to the value of Vx is currently in the down position, PC is increased by 2.
            x = this.getX(opcode);
            key = this.V[x];
            if (this.keyBuffer[key] === 1) {
              this.pc += 2;
            }
            this.pc += 2;
            break;

          // ExA1 - SKNP Vx
          // Skip next instruction if key with the value of Vx is not pressed.
          case 0x00A1:
            // Checks the keyboard, and if the key corresponding to the value of Vx is currently in the up position, PC is increased by 2.
            x = this.getX(opcode);
            key = this.V[x];
            if (this.keyBuffer[key] === 0) {
              this.pc += 2;
            }
            this.pc += 2;
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
            // The value of DT is placed into Vx.
            x = this.getX(opcode);
            this.V[x] = this.delayTimer;
            this.pc += 2;
            console.log("V["+x+'] has been set to ' + this.delayTimer);
            break;

          // Fx0A - LD Vx, K
          // Wait for a key press, store the value of the key in Vx.
          case 0x000A:
            x = this.getX(opcode);
            for(i = 0; i < this.keyBuffer.length; i++) {
              if(this.keyBuffer[i] === 1) {
                this.V[x] = i;
                this.pc += 2;
                break;
              }
            }
            break;


          // Fx15 - LD DT, Vx
          // Set delay timer = Vx.
          case 0x0015:
          // DT is set equal to the value of Vx.
            x = opcode & 0x0F00;
            this.delayTimer = this.V[x];
            this.pc += 2;
            console.log("setting DT to V["+x+'] = ' + this.V[x]);
            break;

          // Fx18 - LD ST, Vx
          // Set sound timer = Vx.
          case 0x0018:
            x = this.getX(opcode);
            this.soundTimer = this.V[x];
            this.pc += 2;
            break;

          // Fx1E - ADD I, Vx
          // Set I = I + Vx.
          case 0x001E:
            x = this.getX(opcode);
            this.I += this.V[x];
            this.pc += 2;
            break;

          // Fx29 - LD F, Vx
          // Set I = location of sprite for digit Vx.
          case 0x0029:
            // The value of I is set to the location for the hexadecimal sprite corresponding to the value of Vx. 
            x = this.getX(opcode);
            var character = this.V[x];
            this.I = character * 5;
            console.log("setting I to character V["+x+'] = ' + this.V[x] + ' offset to 0x' + this.I.toString(16));
            this.pc += 2;
            break;

          // Fx33 - LD B, Vx
          // Store BCD representation of Vx in memory locations I, I+1, and I+2.
          case 0x0033:
            // takes the decimal value of Vx, and places the hundreds digit in memory at 
            // location in I, the tens digit at location I+1, and the ones digit at location I+2.
            x = this.getX(opcode);
            var value = this.V[x];


            var hundreds = (value - (value % 100)) / 100;
            value -= hundreds * 100;
            var tens = (value - (value % 10)) / 10;
            value -= tens * 10;
            var ones = value;
            this.memory[this.I] = hundreds;
            this.memory[this.I + 1] = tens;
            this.memory[this.I + 2] = ones;
            this.pc += 2;
            console.log('Storing binary-encoded decimal V['+x+'] = '+this.V[this.getX(opcode)] + 'as {' + hundreds + ', ' + tens + ' , ' + ones + '}');
            break;


          // Fx55 - LD [I], Vx
          // Store registers V0 through Vx in memory starting at location I.
          case 0x0055:
            x = this.getX(opcode);
            for (i = 0; i <= x; i++) {
              this.memory[this.I + i] = this.V[i];
            }
            this.pc += 2;
            break;

          // Fx65 - LD Vx, [I]
          // Read registers V0 through Vx from memory starting at location I.
          case 0x065:
          // read values from memory starting at location I into registers V0 through Vx.
            x = this.getX(opcode);
            for (i = 0; i <= x; i++) {
              this.V[i] = this.memory[this.I + i];
            }
            console.log('Setting V[0] to V['+x+'] to the values in memory[0x'+(this.I & 0xFFFF).toString(16)+']');

            // not sure if this is needed
            this.I += x + 1;

            this.pc += 2;
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



