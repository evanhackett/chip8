/* global chip8, describe, it, expect, should */

describe('Chip8()', function () {
  'use strict';

  it('exists', function () {
    expect(Chip8).to.be.a('function');
  });

  describe('opcode 00EE should return from a subroutine', function() {
    var chip;

    beforeEach(function() {
      chip = Chip8();
    });

    it('sets the program counter to the address at the top of the stack', function () {
      chip.stack = ['a', 'b', 'c'];
      chip.opcodes['00EE'](0x00EE);
      expect(chip.pc).to.equal('c');
      expect(chip.stack.length).to.equal(2);
    });
  });

  describe('opcode 1nnn should jump to location nnn.', function() {
    var chip;

    beforeEach(function() {
      chip = Chip8();
    });

    it('sets the program counter to nnn.', function () {
      chip.opcodes['1nnn'](0x1234);
      expect(chip.pc).to.equal(0x0234);
    });
  });

  describe('opcode 2nnn should call subroutine at nnn.', function() {
    var chip;

    beforeEach(function() {
      chip = Chip8();
    });

    it('sets the program counter to nnn.', function () {
      chip.opcodes['2nnn'](0x2345);
      expect(chip.pc).to.equal(0x0345);
    });

    it('stores program counter in the stack.', function () {
      chip.pc = 'abc';
      var currentPC = chip.pc;
      chip.opcodes['2nnn'](0x2345);
      expect(chip.stack).to.contain(currentPC);
    });
  });



  describe('opcode Annn should set I to nnn.', function() {
    var chip;

    beforeEach(function() {
      chip = Chip8();
    });

    it('The value of register I is set to nnn.', function () {
      chip.opcodes['Annn'](0xA123);
      expect(chip.I).to.equal(0x0123);
    });
  });

  describe('opcode 6xkk should set Vx to kk.', function() {
    var chip;

    beforeEach(function() {
      chip = Chip8();
    });

    it('The value of register Vx is set to kk.', function () {
      chip.opcodes['6xkk'](0x6123);
      expect(chip.V[1]).to.equal(0x0023);
    });
  });

});








