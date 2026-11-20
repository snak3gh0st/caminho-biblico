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
  for(const name of ['notes-core','practice-guides','study-practice','guide-content','discovery-content','discoveries','study-guide','guide-reader']){
    const script=document.createElement('script');
    script.async=false;script.src='./'+name+'.js?v=practice-2';
    document.head.append(script);
  }
  for(const name of ['app','portal']){
    const script=document.createElement('script');
    script.async=false;script.src=(lang==='en'?'./en/':'./')+name+'.js?v=practice-2';
    document.head.append(script);
  }
  // The notes area is language-neutral code; it reads the page language itself.
  for(const name of ['notes','graph']){
    const script=document.createElement('script');
    script.async=false;script.src='./'+name+'.js?v=practice-2';
    document.head.append(script);
  }
})();
