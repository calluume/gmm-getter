export default async function handler(req, res) {
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const { channelId } = req.query;

  if (!channelId) {
    return res.status(400).json({ error: "Missing channelId parameter" });
  }

  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10&type=video`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: "No videos found for this channel" });
    }

    const weekdayVideos = data.items.filter(item => {
      const day = new Date(item.snippet.publishedAt).getUTCDay();
      return day >= 1 && day <= 5; // Mon–Fri
    });

    if (weekdayVideos.length === 0) {
      return res.status(404).json({ error: "No weekday videos found." });
    }

    const video = weekdayVideos[0];
    const videoId = video.id.videoId;
    const title = video.snippet.title;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    res.status(200).json({ title, videoUrl });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong", details: err.message });
  }
}