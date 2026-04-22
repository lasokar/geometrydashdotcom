let levelID = null;
let levelString = null;
let songID = null;
let isLocal;

if (event.data.levelId == undefined && event.data.levelString){
  isLocal = true;
} else{
  isLocal = false;
}

self.addEventListener('message', event => {
  if (!isLocal) {
    levelID = event.data.levelId;
  } else {
    levelString = event.data.levelString;
    songID = event.data.songID;
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
        fetch(`/geometrydashdotcom/game/assets/levels/${levelID}.txt`)
      );
      return;
    }

    if (url.pathname.includes("StereoMadness.mp3")) {
      event.respondWith(
        fetch(`/geometrydashdotcom/game/assets/music/${levelID}.mp3`)
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

  if (isLocal) {
    if (url.pathname.includes("1.txt")) {
      event.respondWith(new Response(levelString), {
        headers: { "Content-Type": "text/plain" },
      });
      return;
    }

    if (url.pathname.includes("StereoMadness.mp3")) {
      event.respondWith(
        fetch(`https://fetchsongid.lasokar.workers.dev?id=${songID}`),
      );
      return;
    }
  }
});

async function handleLevelRequest() {
  const res = await fetch(
    `https://getleveldata.lasokar.workers.dev?id=${levelID}`
  );
  
  const data = await res.json();

  if (data.error) {
    self.clients.matchAll().then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: data.error === "rate-limit" ? "rate-limit" : "invalid-id" });
      }
    });
    return new Response("-1");
  }

  self.clients.matchAll().then((clients) => {
    for (const client of clients) {
      client.postMessage({ 
        type: "set-level-name", 
        name: data["name"] 
      });
    }
  });

  return new Response(data["data"]);
}
