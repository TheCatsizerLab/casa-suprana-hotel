// A light DOM-based editorial scene. Scrolling and photographs are never hijacked.
export function installAtelier(){
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 if(reduced.matches)return;
 document.documentElement.classList.add('atelier-motion');
 if(!('IntersectionObserver' in window))return;
 const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}},{threshold:.08,rootMargin:'0px 0px -25px 0px'});
 for(const node of document.querySelectorAll('[data-reveal]')){
  if(node.getBoundingClientRect().top<innerHeight)node.classList.add('is-revealed');else{node.classList.add('will-reveal');observer.observe(node);}
 }
 reduced.addEventListener('change',()=>{if(reduced.matches){document.documentElement.classList.remove('atelier-motion');for(const node of document.querySelectorAll('.will-reveal'))node.classList.add('is-revealed');observer.disconnect();}},{once:true});
}
