module.exports = function() {
  var keyState = {};

  window.onkeydown = function(e) {
    keyState[e.keyCode] = true;
  };

  window.onkeyup = function(e) {
    keyState[e.keyCode] = false;
  };

  this.isDown = function(keyCode) {
    return keyState[keyCode] === true;
  };

  this.KEYS = {
    0x1: 49, // "1",
    0x2: 50, // "2",
    0x3: 51, // "3",
    0xC: 52, // "4",
    0x4: 81, // "Q",
    0x5: 87, // "W",
    0x6: 69, // "E",
    0xD: 82, // "R",
    0x7: 65, // "A",
    0x8: 83, // "S",
    0x9: 68, // "D",
    0xE: 70, // "F",
    0xA: 90, // "Z",
    0x0: 88, // "X",
    0xB: 67, // "C",
    0xF: 86, // "V"
  };
};
