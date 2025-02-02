#!/bin/bash

# Download the m3u8 stream to an mp4 file
ffmpeg -protocol_whitelist file,http,https,tcp,tls,crypto -i "$1" -c copy output.mp4

# Convert the downloaded mp4 file to mp3
ffmpeg -i output.mp4 -vn -acodec libmp3lame -ar 44100 -ac 2 -ab 192k "$2"

# Clean up the temporary mp4 file
rm output.mp4

