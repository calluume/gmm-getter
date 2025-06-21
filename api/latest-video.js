let cachedVideo = null;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const channelId = 'UC4PooiX37Pld1T8J5SYT-SQ';

  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10&type=video`;

  if (cachedVideo) {
    return res.status(200).json({ ...cachedVideo, returnedCache: true });
  }

  try {
    const response = await fetch(url);
    const data = await response.json();

    const weekdayVideos = data.items.filter(item => {
      const day = new Date(item.snippet.publishedAt).getUTCDay();
      return day >= 1 && day <= 5;
    });

    const videoIds = weekdayVideos.map(v => v.id.videoId).join(',');

    const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${API_KEY}`;
    const detailsRes = await fetch(detailsUrl);
    const detailsData = await detailsRes.json();

    const videosWithDuration = weekdayVideos.map(video => {
      const detail = detailsData.items.find(d => d.id === video.id.videoId);
      return {
        ...video,
        duration: detail?.contentDetails?.duration || null,
      };
    });

    const nonShorts = videosWithDuration.filter(video => {
      const match = video.duration?.match(/PT(?:(\d+)M)?(?:(\d+)S)?/);
      const minutes = match?.[1] ? parseInt(match[1]) : 0;
      const seconds = match?.[2] ? parseInt(match[2]) : 0;
      const totalSeconds = (minutes * 60) + seconds;
      return totalSeconds > 180;
    });

    if (nonShorts.length === 0) {
      return res.status(404).json({ error: "No suitable weekday episode found." });
    }

    const video = nonShorts[0];
    const videoId = video.id.videoId;
    const title = video.snippet.title;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    cachedVideo = { title, videoUrl };
    res.status(200).json({ title, videoUrl, returnedCache: false });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong." });
  }
}