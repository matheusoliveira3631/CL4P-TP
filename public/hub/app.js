function setStatus(tile, up) {
  const dot = tile.querySelector("[data-status]");
  if (!dot) {
    return;
  }
  dot.classList.remove("up", "down");
  dot.classList.add(up ? "up" : "down");
}

async function loadLinks() {
  try {
    const response = await fetch("/status");
    if (!response.ok) {
      throw new Error("status_unavailable");
    }
    const status = await response.json();
    const links = status.links || {};

    const fileBrowserTile = document.getElementById("fileBrowserLink");
    if (links.fileBrowser) {
      fileBrowserTile.href = links.fileBrowser;
      fileBrowserTile.classList.remove("is-disabled");
      setStatus(fileBrowserTile, true);
    }

    const jellyfinTile = document.getElementById("jellyfinLink");
    if (links.jellyfin) {
      jellyfinTile.href = links.jellyfin;
      jellyfinTile.classList.remove("is-disabled");
      setStatus(jellyfinTile, true);
    }

    document.getElementById("summary").textContent = `online em ${status.network.bind.host}:${status.network.bind.port}`;
    document.getElementById("meta").textContent = `atualizado às ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    document.getElementById("summary").textContent = "status indisponível no momento";
  }
}

loadLinks();
