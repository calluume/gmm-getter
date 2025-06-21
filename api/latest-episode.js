let cachedVideo = null;
let cacheDate = null;

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  
  const API_KEY = process.env.YOUTUBE_API_KEY;
  const channelId = 'UC4PooiX37Pld1T8J5SYT-SQ'; // GMM channel ID

  const url = `https://www.googleapis.com/youtube/v3/search?key=${API_KEY}&channelId=${channelId}&part=snippet,id&order=date&maxResults=10&type=video`;

  // Get current date and check if it is a weekday
  const now = new Date();
  const today = now.toISOString().split("T")[0]; // e.g. "2025-06-20"
  const pacificTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "numeric",
    hour12: false
  }).formatToParts(now);

  const hour = Number(pacificTime.find(part => part.type === "hour").value);
  const minutes = Number(pacificTime.find(part => part.type === "minute").value);

  const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;

  // Should now always reset cache if:
  //   - The cache is not set OR
  //   - It is after 3:10AM pacific time
  //   - The cache has not been updated today
  //   - It is a weekday
  
  const shouldUpdate =
    today !== cacheDate &&
    isWeekday &&
    hour >= 3 &&
    minutes >= 10;
  
  console.log(hour, minutes, shouldUpdate)

  if (!shouldUpdate && cachedVideo) {
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