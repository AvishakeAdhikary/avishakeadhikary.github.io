/** Server-safe (no React): the localStorage key and the pre-paint <head> script. */
export const SETTINGS_KEY = "avishake-settings";

/**
 * Inline <head> script: applies visual settings and decides boot/animation
 * classes before first paint. Keep in sync with applyToDocument() in settings.ts.
 */
export const SETTINGS_SCRIPT = `try{var d=document.documentElement,s={};try{s=JSON.parse(localStorage.getItem("${SETTINGS_KEY}")||"{}")}catch(e){}var rm=s.motion==="reduced"||(s.motion==="system"&&matchMedia("(prefers-reduced-motion: reduce)").matches);d.dataset.crt=s.crt===false?"off":"on";d.dataset.cursor=s.cursor===false?"off":"on";d.dataset.motion=rm?"reduced":"full";if(s.theme==="phosphor")d.dataset.theme="phosphor";if(!rm)d.classList.add("js");if(!rm&&s.boot!==false&&location.pathname==="/"&&!sessionStorage.getItem("booted")){d.classList.add("booting");sessionStorage.setItem("booted","1")}}catch(e){}`;
