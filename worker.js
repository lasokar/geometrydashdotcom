let levelID = null;

self.addEventListener('message', event => {
  if (event.data.levelId) {
    levelID = event.data.levelId;
  }
});

self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);  
  if (levelID < 0) {
    if (url.pathname.includes("1.txt")) {
      event.respondWith(
        fetch(`./assets/levels/${levelID}.txt`)
      );
      return;
    }

    if (url.pathname.includes("StereoMadness.mp3")) {
      event.respondWith(
        fetch(`./assets/music/${levelID}.mp3`)
      );
      return;
    }
  }
  
  if (levelID >= 0) {
    if (url.pathname.includes("1.txt")) {
      event.respondWith(handleLevelRequest());
      return;
    }

    if (url.pathname.includes("StereoMadness.mp3")) {
      event.respondWith(
        fetch(`https://getlevelsong.lasokar.workers.dev?id=${levelID}`)
      );
      return;
    }
  }
});

async function handleLevelRequest() {
  const res = await fetch(
    `https://getleveldata.lasokar.workers.dev?id=${levelID}`
  );
  const text = await res.text();
  if (text.trim() === "-1") {
    self.clients.matchAll().then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "invalid-id" });
      }
    });
    return;
  }
  if (text.trim() === "error code: 1015") {
    self.clients.matchAll().then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: "rate-limit" });
      }
    });
    return;
  }
  return new Response(text);
}
