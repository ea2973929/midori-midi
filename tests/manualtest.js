
var midiRequest = new XMLHttpRequest();

midiRequest.open("GET", "./testfile.mid", true);
midiRequest.responseType = 'arraybuffer';
midiRequest.onload = function (e) {
    if (this.status == 200) {
        window.midi = MidiFile(midiRequest.response);
    }
};

midiRequest.send();
