(function(){
  try{
    document.documentElement.dataset.mlsTheme = localStorage.getItem("mlsboc_theme") || "light";
  }catch(e){
    document.documentElement.dataset.mlsTheme = "light";
  }
})();
