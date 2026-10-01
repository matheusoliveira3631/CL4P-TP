async function loadLinks() {
  try {
    const response = await fetch("/status");
    if (!response.ok) {
      throw new Error("status_unavailable");
    }
    const status = await response.json();
    const links = status.links || {};

    const fileBrowserLink = document.getElementById("fileBrowserLink");
    if (links.fileBrowser) {
      fileBrowserLink.href = links.fileBrowser;
      fileBrowserLink.classList.remove("disabled");
    }

    const jellyfinLink = document.getElementById("jellyfinLink");
    if (links.jellyfin) {
      jellyfinLink.href = links.jellyfin;
      jellyfinLink.classList.remove("disabled");
    }

    document.getElementById("summary").textContent = `API em ${status.network.bind.host}:${status.network.bind.port}`;
  } catch (error) {
    document.getElementById("summary").textContent = "Status indisponível no momento.";
  }
}

loadLinks();
