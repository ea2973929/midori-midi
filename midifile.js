/*
  class to parse the .mid file format
*/

function MidiFile(arrayBuffer) {
    
    var formatType = '';
    var trackCount = -1;
    var ticksPerBeat = -1;
    
    var tracks = [];

    function MidiStream(arrayBuffer) {
        this.arrayBuffer = arrayBuffer;
        this.index = 0;
    }

    MidiStream.prototype.popAscii = function (length) {        
	    var ascii = String.fromCharCode.apply(this, new Uint8Array(this.arrayBuffer.slice(this.index, this.index + length)));
        this.index += length;

        return ascii;
    };

    MidiStream.prototype.popUint8 = function () {
        var uint8 = new DataView(this.arrayBuffer.slice(this.index, this.index + 1)).getUint8(0);
        this.index += 1;
        
        return uint8;
    };

    MidiStream.prototype.popInt8 = function () {
        var uint8 = new DataView(this.arrayBuffer.slice(this.index, this.index + 1)).getInt8(0);
        this.index += 1;
        
        return uint8;
    };

    
    MidiStream.prototype.popUint16 = function () {
        var uint16 = new DataView(this.arrayBuffer.slice(this.index, this.index + 2)).getUint16(0);
        this.index += 2;
        
        return uint16;
    };

    MidiStream.prototype.popUint32 = function () {
        var uint32 = new DataView(this.arrayBuffer.slice(this.index, this.index + 4)).getUint32(0);
        this.index += 4;
        
        return uint32;
    };

    MidiStream.prototype.popVarUint = function () {
        // Returns special MIDI variable length integers.
		var result = 0;

        var nextByte = this.popUint8();
        
        do {
            var continues = nextByte & 0x80;

            if (continues) {
                result += (nextByte & 0x7f);
                result <<= 7;
            }
            else {
                result += nextByte;
            }
        }
        while (continues);

        return result;
    };

    MidiStream.prototype.isEndOfFile = function () {
        return this.index === this.arrayBuffer.byteLength - 1;
    };
    
    function readHeader(midiStream) {
		var id = midiStream.popAscii(4);
		var length = midiStream.popUint32();

	    if (id != 'MThd' || length != 6) {
		    throw "Bad .mid file - header not found";
	    }

        formatType = midiStream.popUint16();
	    trackCount = midiStream.popUint16();

        var timeDivision = midiStream.popUint16();
	
	    if (timeDivision & 0x8000) {
		    throw "Expressing time division in SMTPE frames is not supported yet";
	    } else {
		    ticksPerBeat = timeDivision;
	    }

        var formatTypeDescription = "Single track (0)";

        if (formatType === 1) {
            formatTypeDescription = "Multi track (1)";
        }
        else if (formatType === 2) {
            formatTypeDescription = "Multi song (2)";
        }
        console.info("Read header of midi file, formatType: " + formatTypeDescription + 
                     ", trackCount: " + trackCount +
                     ", ticksPerBeat: " + ticksPerBeat);
	}


    function readTrack(midiStream) {
		var id = midiStream.popAscii(4);
		if (id != 'MTrk') {
			throw "Unexpected chunk - expected MTrk, got " + id; 
		}

        var length = midiStream.popUint32();
        
        readEvent(midiStream);        
    }

    function readTracks(midiStream) {        
        for (var i = 0; i < trackCount; i++) {
            tracks.push(readTrack(midiStream));
	    }
    }
	var lastEventTypeByte;


    var subtypeTable = {
        0x00: 'sequenceNumber',
        0x01: 'text',
        0x02: 'copyrightNotice',
        0x03: 'trackName',
        0x04: 'instrumentName',
        0x05: 'lyrics',
        0x06: 'marker',
        0x07: 'cuePoint',
        0x20: 'midiChannelPrefix',
        0x2f: 'endOfTrack',
        0x51: 'setTempo',
        0x54: 'smpteOffset',
        0x58: 'timeSignature',
        0x59: 'keySignature',
        0x7f: 'sequencerSpecific'
    };    

    function readMetaEvent(midiStream, event) {
		event.type = 'meta';
		var subtypeByte = midiStream.popUint8();
		var length = midiStream.popVarUint();
        
        if (!subtypeByte in subtypeTable) {
            event.subtype = 'unknown';
            event.data = midiStream.popAscii(length);
            
            return event;
        }

        event.subtype = subtypeTable[subtypeByte];

        function assertLength(length, expectedLength, type) {
            if (length != expectedLength) {
                throw "Expected length for " + type + " event is " + expectedLength + ", got " + length;
            }
        }

		switch(event.subtype) {
		case 'sequenceNumber': 
			assertLength(length, 2, event.subtype);
			event.number = midiStream.popUint16();
			return event;
		case 'text':
        case 'copyrightNotice':
		case 'trackName':
        case 'instrumentName':
        case 'lyrics':
        case 'marker':
        case 'cuePoint':            
			event.text = midiStream.popAscii(length);
			return event;
		case 'midiChannelPrefix':
            assertLength(length, 1, event.subtype);
			event.channel = midiStream.popUint8();
			return event;
		case 'endOfTrack':
            assertLength(length, 0, event.subtype);
			return event;
		case 'setTempo':
            assertLength(length, 3, event.subtype);
			event.microsecondsPerBeat = (
				(midiStream.popUint8()) << 16) + 
				+ (midiStream.popUint8() << 8)
				+ midiStream.popUint8();
			return event;
		case 'smpteOffset':
            assertLength(length, 5, event.subtype);
			var hourByte = midiStream.popUint8();
			event.frameRate = {
				0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30
			}[hourByte & 0x60];
			event.hour = hourByte & 0x1f;
			event.min = midiStream.popUint8();
			event.sec = midiStream.popUint8();
			event.frame = midiStream.popUint8();
			event.subframe = midiStream.popUint8();
			return event;
		case 'timeSignature':
            assertLength(length, 4, event.subtype);
			event.numerator = midiStream.popUint8();
			event.denominator = midiStream.popUint8();
			event.metronome = midiStream.popUint8();
			event.thirtyseconds = midiStream.popUint8();
			return event;
		case 'keySignature':
            assertLength(length, 2, event.subtype);
			event.key = midiStream.popInt8();
			event.scale = midiStream.popUint8();
			return event;
		case 'sequencerSpecific':
			event.data = midiStream.popAscii(length);
			return event;
		}

        return event;
    }

	function readEvent(midiStream) {
		var event = {};
        var deltaTime = midiStream.popVarUint();
        
		var eventTypeByte = midiStream.popUint8();
		if (eventTypeByte == 0xff) {
            event = readMetaEvent(midiStream);
			return event;
		} else if (eventTypeByte == 0xf0) {
			event.type = 'sysEx';
			var length = stream.readVarInt();
			event.data = stream.read(length);
			return event;
		} else if (eventTypeByte == 0xf7) {
			event.type = 'dividedSysEx';
			var length = stream.readVarInt();
			event.data = stream.read(length);
			return event;
		} else if ((eventTypeByte & 0xF0) == 0xF0) {
			throw "Unrecognised MIDI event type byte: " + eventTypeByte;
		} else {
			/* channel event */
			var param1;
			if ((eventTypeByte & 0x80) == 0) {
				/* running status - reuse lastEventTypeByte as the event type.
				   eventTypeByte is actually the first parameter
				*/
				param1 = eventTypeByte;
				eventTypeByte = lastEventTypeByte;
			} else {
				param1 = stream.readInt8();
				lastEventTypeByte = eventTypeByte;
			}
			var eventType = eventTypeByte >> 4;
			event.channel = eventTypeByte & 0x0f;
			event.type = 'channel';
			switch (eventType) {
			case 0x08:
				event.subtype = 'noteOff';
				event.noteNumber = param1;
				event.velocity = stream.readInt8();
				return event;
			case 0x09:
				event.noteNumber = param1;
				event.velocity = stream.readInt8();
				if (event.velocity == 0) {
					event.subtype = 'noteOff';
				} else {
					event.subtype = 'noteOn';
				}
				return event;
			case 0x0a:
				event.subtype = 'noteAftertouch';
				event.noteNumber = param1;
				event.amount = stream.readInt8();
				return event;
			case 0x0b:
				event.subtype = 'controller';
				event.controllerType = param1;
				event.value = stream.readInt8();
				return event;
			case 0x0c:
				event.subtype = 'programChange';
				event.programNumber = param1;
				return event;
			case 0x0d:
				event.subtype = 'channelAftertouch';
				event.amount = param1;
				return event;
			case 0x0e:
				event.subtype = 'pitchBend';
				event.value = param1 + (stream.readInt8() << 7);
				return event;
			default:
				throw "Unrecognised MIDI event type: " + eventType;
			}
		}
	}

    var midiStream = new MidiStream(arrayBuffer);
    
	readHeader(midiStream);
    readTracks(midiStream);
    
	for (var i = 0; i < trackCount; i++) {
		tracks[i] = [];
		var trackChunk = readChunk(stream);
		if (trackChunk.id != 'MTrk') {
			throw "Unexpected chunk - expected MTrk, got "+ trackChunk.id;
		}
		var trackStream = Stream(trackChunk.data);
		while (!trackStream.eof()) {
			var event = readEvent(trackStream);
			tracks[i].push(event);
			//console.log(event);
		}
	}
	
	return {
		'header': header,
		'tracks': tracks
	};
}

if (typeof module !== 'undefined') module.exports = MidiFile;
