var test = require('tape');
var fs = require('fs');

var midifile = require('../midifile.js');
 
test('timing test', function (t) {
    var midiFile = fs.readFileSync('./testfile.mid');

    var midiArrayBuffer = new Uint8Array(midiFile).buffer;
    
    midifile(midiArrayBuffer);
    
    t.plan(2);
    
    t.equal(typeof Date.now, 'function');
    var start = Date.now();
    
    setTimeout(function () {
        t.equal(Date.now() - start, 100);
    }, 100);
});
