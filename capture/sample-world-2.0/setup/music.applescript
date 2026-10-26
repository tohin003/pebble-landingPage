-- Run as the demo user: osascript music.applescript (Music asks once for permission).
-- Adds the four CC0 tracks in ~/Music/Studio playlist to Music's library and to a playlist named "Studio playlist".
-- Open Music once by hand first, and close its welcome screen; no Apple Account is needed for a local library.
set folderPath to (POSIX path of (path to home folder)) & "Music/Studio playlist/"
set trackFiles to {"01 Sweet Sun.mp3", "02 Softly.mp3", "03 Merfolks Song.mp3", "04 Old Key.mp3"}
tell application "Music"
	if not (exists user playlist "Studio playlist") then make new user playlist with properties {name:"Studio playlist"}
	set thePlaylist to user playlist "Studio playlist"
	if (count of tracks of thePlaylist) is 0 then
		repeat with f in trackFiles
			add (POSIX file (folderPath & f)) to thePlaylist
		end repeat
	end if
	return (count of tracks of thePlaylist) as text
end tell
