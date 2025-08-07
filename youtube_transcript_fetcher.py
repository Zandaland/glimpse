# youtube_transcript_fetcher.py
"""
Fetches the transcript for a given YouTube video using youtube-transcript-api.
Usage:
    python youtube_transcript_fetcher.py VIDEO_ID
"""
import sys
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound

def fetch_transcript(video_id):
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id)
        for entry in transcript:
            print(entry.text)
    except TranscriptsDisabled:
        print('Transcripts are disabled for this video.')
    except NoTranscriptFound:
        print('No transcript found for this video.')
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python youtube_transcript_fetcher.py VIDEO_ID')
    else:
        fetch_transcript(sys.argv[1])
