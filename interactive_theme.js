(function(){
  const THEME_KEY = "mlsboc_theme";
  const INTERACTIVE_HREF = "index.html#interactive";

  function getTheme(){
    try{return localStorage.getItem(THEME_KEY) || "light";}catch(e){return "light";}
  }

  function setTheme(theme){
    const next = theme === "dark" ? "dark" : "light";
    document.documentElement.dataset.mlsTheme = next;
    try{localStorage.setItem(THEME_KEY,next);}catch(e){}
    updateThemeButton();
  }

  function updateThemeButton(){
    const theme = document.documentElement.dataset.mlsTheme || getTheme();
    document.querySelectorAll(".mls-theme-btn").forEach(btn=>{
      btn.textContent = theme === "dark" ? "☀ Switch to light" : "☾ Switch to dark";
      btn.title = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
    });
    if(typeof window.syncCaseThemeButton === "function"){
      window.syncCaseThemeButton();
    }
  }

  function toggleInteractiveTheme(){
    setTheme((document.documentElement.dataset.mlsTheme || getTheme()) === "dark" ? "light" : "dark");
  }

  function rewriteBackLinks(){
    document.querySelectorAll("a.mls-home-btn, a.home").forEach(link=>{
      const text = (link.textContent || "").toLowerCase();
      const href = link.getAttribute("href") || "";
      if(text.includes("home") || href === "index.html" || href === "./index.html"){
        link.href = INTERACTIVE_HREF;
        link.textContent = "← Interactive Tools";
        link.setAttribute("aria-label","Back to Interactive Learning");
      }
    });
  }

  function installThemeButton(){
    if(document.querySelector(".mls-theme-btn") || document.getElementById("caseThemeBtn"))return;
    const host = document.querySelector(".site-header") || document.querySelector(".topbar");
    if(!host)return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mls-theme-btn";
    btn.onclick = toggleInteractiveTheme;
    host.appendChild(btn);
    updateThemeButton();
  }

  setTheme(getTheme());
  window.toggleInteractiveTheme = toggleInteractiveTheme;
  window.updateInteractiveThemeButton = updateThemeButton;

  document.addEventListener("DOMContentLoaded",function(){
    rewriteBackLinks();
    installThemeButton();
    updateThemeButton();
  });
})();
