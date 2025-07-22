# Development packages

## Phase 1

* Browse music library **done**
* Start playback **done**
* Now-playing **done**
* Player controls **done**

# Phase 2

* DSP management
  - deploy DSP profile
  - interactive filter UI
  - Room equalisation wizard

# Phase 3

* Player change in audiocontrol (another player becomes active) **tested**
* Queue management (clear queue, add album, add song, ...) **done**
* Web radio browser **done**
* like/unlike song **started, Spotify to do**
* Improve album view (e.g. /library/albums/10518654235945294040) **done**
  - if the artist isn't the same at the album artist, display artist name on the song **done**
  - remove the icon on each song **done**
* Scroll bar with letters on the right for album and artist view **done**
* Sorting & filtering for albums & artists **done**
* Volume control **done**
* Auto detect volume control and sound card **done**

# Phase 4


* Settings/Services
  * connect Spotify **done**
  * connect LastFM **done**
* Settings/Music library
  * mount SMB share **done**
  * use local music files 
  * update library 
* Settings/Players **done**
  * enable/disable players **done**
  * service existence detection **done**
  * forbidden operation handling **done**
  * visual state management **done**
  * error handling and user feedback **done**
* Settings/Others
  * change system name **done**
  * System Information **done**
  * reset system
 
# Phase 5

* Reset systen
* Force sound card detection or select sound card
* log, loglog, lin volume control settings
* Support for additional meta data in "Now playing" (format, sample rate, ...)
* volume limit, mono/stereo, ... (using Pipewire and ALSA)
* Show library loading progress
* Lyrics support - display lyrics in "Now playing"
* Enable user to upload artist/album art
* Add (optional) password verification to use the UI, also add some kind of authorisation to API calls
* Improve icons
* Bluetooth
  * Pair device
  * remove paired device

 
# Later

* Playlist management
* More settings
* Integrate PlexAmp