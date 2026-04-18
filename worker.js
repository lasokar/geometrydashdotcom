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
  const id = levelID ?? 1;
  
  // Intercept level data requests
  if (url.pathname.endsWith("1.txt") || url.pathname.includes("/1.txt")) {
    // Built-in levels (negative IDs) or default level
    if (id < 0 || levelID === null || levelID === 1) {
      event.respondWith(handleBuiltInLevelRequest(id));
    } else {
      // Online levels (positive IDs > 1)
      event.respondWith(handleLevelRequest(id));
    }
    return;
  }

  // Intercept music requests
  if (url.pathname.endsWith("StereoMadness.mp3") || url.pathname.includes("/StereoMadness.mp3")) {
    event.respondWith(handleMusicRequest(id));
    return;
  }
});

async function handleBuiltInLevelRequest(id) {
  try {
    // Map positive level ID to negative for file lookup
    // Level 1 -> -1.txt, Level 2 -> -2.txt, etc.
    const fileId = id > 0 ? -id : id;
    const res = await fetch(`/game/assets/levels/${fileId}.txt`);
    if (res.ok) {
      return res;
    }
    // Try alternative path without leading slash
    const res2 = await fetch(`./game/assets/levels/${fileId}.txt`);
    if (res2.ok) {
      return res2;
    }
  } catch (e) {
    console.error('Failed to fetch built-in level:', e);
  }
  return new Response("-1", { status: 400 });
}

async function handleLevelRequest(id) {
  try {
    const res = await fetch(
      `https://getleveldata.lasokar.workers.dev?id=${id}`
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
  } catch (e) {
    console.error('Failed to fetch level:', e);
    return new Response("-1", { status: 500 });
  }
}

async function handleMusicRequest(id) {
  try {
    let res;
    if (id < 0 || id === 1) {
      // For built-in levels, use the matching music file
      const fileId = id > 0 ? -id : id;
      res = await fetch(`/game/assets/music/${fileId}.mp3`);
      if (!res.ok) {
        // Try alternative path
        res = await fetch(`./game/assets/music/${fileId}.mp3`);
      }
    } else {
      // For online levels, try to get custom music from server
      try {
        res = await fetch(`https://getlevelsong.lasokar.workers.dev?id=${id}`);
        if (res.ok) {
          return res;
        }
      } catch (e) {
        console.error('Failed to fetch custom music:', e);
      }
      // Fall back to default music
      res = await fetch(`/game/assets/music/-1.mp3`);
      if (!res.ok) {
        // Try alternative path
        res = await fetch(`./game/assets/music/-1.mp3`);
      }
    }
    
    if (res.ok && res.body) {
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: new Headers({
          'Content-Type': 'audio/mpeg',
          'Content-Length': res.headers.get('Content-Length') || '',
        })
      });
    } else {
      throw new Error('Failed to fetch music file');
    }
  } catch (e) {
    console.error('Failed to fetch music:', e);
    // Return empty response as fallback
    return new Response(null, { status: 404 });
  }
}
