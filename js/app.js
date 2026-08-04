(function () {
  const DEFAULT_DESCRIPTION =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";

  const illustrations = Array.isArray(window.ILLUSTRATIONS)
    ? window.ILLUSTRATIONS.map((item) => ({
        tags: [],
        illustrator: null,
        description: DEFAULT_DESCRIPTION,
        previewUrl: null,
        imageDataUrl: null,
        sourceMime: null,
        rawSvg: null,
        hasUserUpload: false,
        ...item,
        status: item.status || "needed",
        originalPreviewUrl: item.originalPreviewUrl || item.previewUrl || null,
        hasUserUpload: Boolean(item.hasUserUpload || item.status === "done"),
      })).filter((item) => item.illustrator === "Kemal Sanli")
    : [];

  function sortIllustrations() {
    illustrations.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }

  sortIllustrations();

  const iconGrid = document.getElementById("icon-grid");
  const searchInput = document.getElementById("search-input");
  const addBtn = document.getElementById("add-btn");
  const addDialog = document.getElementById("add-dialog");
  const addForm = document.getElementById("add-form");
  const addName = document.getElementById("add-name");
  const addFile = document.getElementById("add-file");
  const addCancel = document.getElementById("add-cancel");
  const detailFileInput = document.getElementById("detail-file-input");

  const detailPanel = document.getElementById("detail-panel");
  const detailTitle = document.getElementById("detail-title");
  const detailCredit = document.getElementById("detail-credit");
  const detailDescription = document.getElementById("detail-description");
  const detailPreview = document.getElementById("detail-preview");
  const detailClose = document.getElementById("detail-close");
  const detailUpload = document.getElementById("detail-upload");
  const detailDownloadPng = document.getElementById("detail-download-png");

  let selectedId = null;

  function slugify(name) {
    return String(name)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function findById(id) {
    return illustrations.find((item) => item.id === id) || null;
  }

  function hasArtwork(item) {
    return Boolean(item && (item.imageDataUrl || item.previewUrl || item.rawSvg));
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function isSvgFile(file) {
    return (
      file.type === "image/svg+xml" ||
      /\.svg$/i.test(file.name || "")
    );
  }

  async function ingestFile(file) {
    const imageDataUrl = await readFileAsDataURL(file);
    const sourceMime = file.type || (isSvgFile(file) ? "image/svg+xml" : "image/*");
    let rawSvg = null;
    if (isSvgFile(file)) {
      rawSvg = await readFileAsText(file);
    }
    return {
      previewUrl: imageDataUrl,
      imageDataUrl,
      sourceMime,
      rawSvg,
      hasUpload: true,
    };
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }

  function triggerDownload(filename, blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function exportAsPng(item) {
    const src = item.imageDataUrl || item.previewUrl;
    if (!src && !item.rawSvg) {
      throw new Error("No artwork to download");
    }

    if (item.rawSvg && !src) {
      const svgBlob = new Blob([item.rawSvg], { type: "image/svg+xml" });
      const objectUrl = URL.createObjectURL(svgBlob);
      try {
        const img = await loadImage(objectUrl);
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 512;
        canvas.height = img.naturalHeight || 512;
        canvas.getContext("2d").drawImage(img, 0, 0);
        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(
            (result) => (result ? resolve(result) : reject(new Error("PNG export failed"))),
            "image/png"
          );
        });
        triggerDownload(`${slugify(item.name) || item.id}.png`, blob);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
      return;
    }

    const img = await loadImage(src);
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth || 512;
    canvas.height = img.naturalHeight || 512;
    canvas.getContext("2d").drawImage(img, 0, 0);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("PNG export failed"))),
        "image/png"
      );
    });
    triggerDownload(`${slugify(item.name) || item.id}.png`, blob);
  }

  function updateDownloadAvailability(item) {
    const ready = hasArtwork(item);
    detailDownloadPng.disabled = !ready;
    detailDownloadPng.title = ready ? "Download as PNG" : "Upload artwork first";
  }

  function placeholderEl(extraClass) {
    const el = document.createElement("span");
    el.className = extraClass ? `placeholder ${extraClass}` : "placeholder";
    el.setAttribute("aria-hidden", "true");
    return el;
  }

  function createThumb(item) {
    if (item.previewUrl || item.imageDataUrl) {
      const img = document.createElement("img");
      img.src = item.previewUrl || item.imageDataUrl;
      img.alt = "";
      img.className = "icon-card__thumb";
      return img;
    }
    return placeholderEl();
  }

  function createIconCard(item) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-card";
    button.dataset.id = item.id;
    button.setAttribute("aria-label", item.name);
    if (selectedId === item.id) {
      button.classList.add("is-selected");
    }

    button.appendChild(createThumb(item));

    const label = document.createElement("span");
    label.className = "icon-card__label";
    label.textContent = item.name;
    button.appendChild(label);

    button.addEventListener("click", () => openDetail(item.id));

    return button;
  }

  function renderIconGrid(target, items) {
    target.replaceChildren();
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No illustrations match.";
      target.appendChild(empty);
      return;
    }
    const fragment = document.createDocumentFragment();
    items.forEach((item) => fragment.appendChild(createIconCard(item)));
    target.appendChild(fragment);
  }

  function matchesQuery(item, query) {
    if (!query) {
      return true;
    }
    const q = query.toLowerCase();
    if (item.name.toLowerCase().includes(q)) {
      return true;
    }
    return (item.tags || []).some((tag) => String(tag).toLowerCase().includes(q));
  }

  function refresh() {
    const query = searchInput.value.trim().toLowerCase();
    const visible = query
      ? illustrations.filter((item) => matchesQuery(item, query))
      : illustrations;
    renderIconGrid(iconGrid, visible);
  }

  function setSelectedStyles() {
    document.querySelectorAll(".icon-card").forEach((el) => {
      el.classList.toggle("is-selected", el.dataset.id === selectedId);
    });
  }

  function openDetail(id) {
    const item = findById(id);
    if (!item) {
      return;
    }

    selectedId = id;
    detailTitle.textContent = item.name;

    detailCredit.textContent = item.illustrator
      ? `Illustrated by ${item.illustrator}`
      : "Not yet assigned";
    detailDescription.textContent = item.description || DEFAULT_DESCRIPTION;

    detailPreview.replaceChildren();
    if (item.previewUrl || item.imageDataUrl) {
      const img = document.createElement("img");
      img.src = item.previewUrl || item.imageDataUrl;
      img.alt = item.name;
      img.className = "detail-panel__image";
      detailPreview.appendChild(img);
    } else {
      detailPreview.appendChild(placeholderEl("placeholder--large"));
    }

    updateDownloadAvailability(item);
    detailPanel.classList.add("is-open");
    detailPanel.setAttribute("aria-hidden", "false");
    document.body.classList.add("detail-open");
    setSelectedStyles();
    detailClose.focus();
  }

  function closeDetail() {
    selectedId = null;
    detailPanel.classList.remove("is-open");
    detailPanel.setAttribute("aria-hidden", "true");
    document.body.classList.remove("detail-open");
    setSelectedStyles();
  }

  searchInput.addEventListener("input", () => {
    refresh();
  });

  detailClose.addEventListener("click", closeDetail);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && detailPanel.classList.contains("is-open")) {
      closeDetail();
    }
  });

  detailUpload.addEventListener("click", () => {
    if (!selectedId) {
      return;
    }
    detailFileInput.click();
  });

  detailFileInput.addEventListener("change", async () => {
    const file = detailFileInput.files && detailFileInput.files[0];
    const item = findById(selectedId);
    detailFileInput.value = "";
    if (!file || !item) {
      return;
    }

    try {
      const artwork = await ingestFile(file);
      Object.assign(item, artwork);
      item.hasUserUpload = true;
      item.status = "done";
      item.illustrator = "Kemal Sanli";
      refresh();
      openDetail(item.id);
    } catch (error) {
      console.error(error);
      window.alert("Could not read that file. Try another image or SVG.");
    }
  });

  detailDownloadPng.addEventListener("click", async () => {
    const item = findById(selectedId);
    if (!hasArtwork(item)) {
      window.alert("Upload artwork first to download.");
      return;
    }
    try {
      await exportAsPng(item);
    } catch (error) {
      console.error(error);
      window.alert("Could not export PNG. Try uploading the file again.");
    }
  });

  function closeAddDialog() {
    addForm.reset();
    if (typeof addDialog.close === "function") {
      addDialog.close();
    }
  }

  addBtn.addEventListener("click", () => {
    addForm.reset();
    if (typeof addDialog.showModal === "function") {
      addDialog.showModal();
      addName.focus();
    }
  });

  addCancel.addEventListener("click", closeAddDialog);

  addDialog.addEventListener("cancel", (event) => {
    // Escape key — allow native close, then reset
    event.preventDefault();
    closeAddDialog();
  });

  addDialog.addEventListener("click", (event) => {
    if (event.target === addDialog) {
      closeAddDialog();
    }
  });

  addForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = addName.value.trim();
    if (!name) {
      addName.focus();
      return;
    }

    const baseId = slugify(name) || "illustration";
    let id = baseId;
    let n = 2;
    while (illustrations.some((item) => item.id === id)) {
      id = `${baseId}-${n}`;
      n += 1;
    }

    const file = addFile.files && addFile.files[0];
    let artwork = {
      previewUrl: null,
      imageDataUrl: null,
      sourceMime: null,
      rawSvg: null,
      hasUpload: false,
    };

    if (file) {
      try {
        artwork = await ingestFile(file);
      } catch (error) {
        console.error(error);
        window.alert("Could not read that file. Try another image or SVG.");
        return;
      }
    }

    illustrations.push({
      id,
      name,
      tags: [],
      illustrator: artwork.hasUpload ? "Kemal Sanli" : null,
      description: DEFAULT_DESCRIPTION,
      status: artwork.hasUpload ? "done" : "needed",
      hasUserUpload: Boolean(artwork.hasUpload),
      originalPreviewUrl: artwork.previewUrl || null,
      ...artwork,
    });
    sortIllustrations();

    closeAddDialog();
    refresh();
    openDetail(id);
  });

  refresh();
})();
