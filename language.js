(() => {
  const supported=['pt','en'];
  const query=new URLSearchParams(location.search).get('lang');
  let saved;try {saved=localStorage.getItem('poiema-language');}catch{}
  const lang=supported.includes(query)?query:supported.includes(saved)?saved:'pt';
  try {localStorage.setItem('poiema-language',lang);}catch{}
  document.documentElement.lang=lang==='en'?'en':'pt-BR';
  if(lang==='en'){
    document.title='Poiema Bereanos · Bible study';
    document.querySelector('#app .loading').textContent='Opening your study space…';
    document.querySelector('meta[name="description"]').content='Explore every book of the Bible through scenes, maps, historical context and study notes.';
  }
  for(const name of ['app','portal']){
    const script=document.createElement('script');
    script.async=false;script.src=(lang==='en'?'./en/':'./')+name+'.js?v=library-6';
    document.head.append(script);
  }
})();
