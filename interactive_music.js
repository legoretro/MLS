(function(){
  const MUSIC_DB = "mlsboc_quiz_media";
  const MUSIC_STORE = "files";
  const MUSIC_KEY = "quiz_music";
  const VOLUME_KEY = "mlsboc_quiz_music_volume";
  const enabledSelector = "body.bb-theme";
  const state = {audio:null, url:null, on:false, ready:false};

  function getVolume(){
    const saved = Number(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 0.35;
  }

  function musicStore(mode, fn){
    return new Promise((resolve, reject) => {
      if(!window.indexedDB){
        reject(new Error("Music storage is unavailable."));
        return;
      }
      const req = indexedDB.open(MUSIC_DB, 1);
      req.onerror = () => reject(req.error || new Error("Music storage failed."));
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(MUSIC_STORE))db.createObjectStore(MUSIC_STORE);
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(MUSIC_STORE, mode);
        const store = tx.objectStore(MUSIC_STORE);
        let innerReq;
        try{ innerReq = fn(store); }
        catch(error){ reject(error); return; }
        innerReq.onsuccess = () => resolve(innerReq.result);
        innerReq.onerror = () => reject(innerReq.error || new Error("Music storage failed."));
        tx.oncomplete = () => db.close();
        tx.onerror = () => reject(tx.error || new Error("Music storage failed."));
      };
    });
  }

  async function loadMusicUrl(){
    if(state.url)return state.url;
    const record = await musicStore("readonly", store => store.get(MUSIC_KEY));
    const file = record && (record.blob || record.file);
    if(!file)return "";
    state.url = URL.createObjectURL(file);
    return state.url;
  }

  function button(){
    return document.getElementById("mlsMusicBtn");
  }

  function updateButton(){
    const btn = button();
    if(!btn)return;
    btn.textContent = state.on ? "Music On" : "Music Off";
    btn.classList.toggle("is-on", state.on);
  }

  async function startMusic(){
    const btn = button();
    if(btn)btn.disabled = true;
    try{
      const url = await loadMusicUrl();
      if(!url){
        alert("No quiz music is saved yet. Add music in the quiz area first, then this button will use it here too.");
        return;
      }
      stopMusic(false);
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = getVolume();
      audio.preload = "auto";
      await audio.play();
      state.audio = audio;
      state.on = true;
    }catch(error){
      alert("Music could not start in this browser. The game still works without it.");
    }finally{
      if(btn)btn.disabled = false;
      updateButton();
    }
  }

  function stopMusic(update = true){
    if(state.audio){
      try{
        state.audio.pause();
        state.audio.currentTime = 0;
      }catch(error){}
      state.audio = null;
    }
    state.on = false;
    if(update)updateButton();
  }

  function toggleMusic(){
    if(state.on)stopMusic();
    else startMusic();
  }

  function mountButton(){
    if(!document.querySelector(enabledSelector) || button())return;
    const mount = document.querySelector(".site-header") ||
      document.querySelector(".topbar") ||
      document.querySelector(".toolbar") ||
      document.querySelector(".controls") ||
      document.body;
    const btn = document.createElement("button");
    btn.id = "mlsMusicBtn";
    btn.className = "mls-audio-btn";
    btn.type = "button";
    btn.textContent = "Music Off";
    btn.addEventListener("click", toggleMusic);
    mount.appendChild(btn);
  }

  window.addEventListener("beforeunload", () => {
    stopMusic(false);
    if(state.url)URL.revokeObjectURL(state.url);
  });

  if(document.readyState === "loading"){
    document.addEventListener("DOMContentLoaded", mountButton);
  }else{
    mountButton();
  }
})();
