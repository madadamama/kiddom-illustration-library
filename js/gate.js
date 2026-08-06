(function () {
  const SITE_PASSWORD = "missfrizzle";
  const STORAGE_KEY = "kiddom-site-unlocked";

  const gate = document.getElementById("site-gate");
  const form = document.getElementById("site-gate-form");
  const input = document.getElementById("site-gate-password");
  const error = document.getElementById("site-gate-error");

  if (!gate || !form || !input) {
    return;
  }

  function unlock() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    gate.hidden = true;
    document.body.classList.remove("is-locked");
  }

  if (sessionStorage.getItem(STORAGE_KEY) === "1") {
    unlock();
    return;
  }

  document.body.classList.add("is-locked");
  gate.hidden = false;
  input.focus();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value === SITE_PASSWORD) {
      if (error) {
        error.hidden = true;
      }
      unlock();
      return;
    }
    if (error) {
      error.hidden = false;
    }
    input.value = "";
    input.focus();
  });
})();
