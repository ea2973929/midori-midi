# midori-midi
A MIDI package for dealing with most thing MIDI in Javascript

## Introduction
This package was born from the need to create a competent online MIDI player in Javascript. Initially this player was based on
MIDI.js (and the underlying Jasmid) library. These are fine all on their own, but as the project grew I just found more and 
more occasions where their general architecture and in some cases unfinished features would leave me short. I could of course go 
along and try to fix these issues in each respective library, but I realized at some point that I would rather make major 
architectural changes than continue to produce monkey patches. 

At the same time I thought that the project(s) could do with a major modernification so ES6 and packaging with Bower are also
goals of the project.
