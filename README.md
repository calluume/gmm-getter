# GMM Episode Getter

Uses the YouTube API to fetch a link to the most recent episode of [Good Mythical Morning](https://www.youtube.com/@GoodMythicalMorning).

I have created a website that will use this project to redirect to the latest episode at: [callum-evans.co.uk/gmm.html](https://callum-evans.co.uk/gmm.html). This means you can bookmark the site so you can always access the latest episode in one click!


`gmm-getter` will fetch the most recent video (that is not a YouTube short) published on a weekday. To reduce the amount of API calls, the latest episode result is cached. The cache is only updated if:

  - The cache is not set, OR
  - It is currently after 3:10AM pacific time, AND
  - It is a weekday, AND
  - The cache has not been updated today.

This means it may take 10 minutes for the update to redirect.