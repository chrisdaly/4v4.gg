import{r,j as e,y as n}from"./index-6R-bl_KJ.js";import"./Game-B1z5RLXK.js";import"./index-DTdtBFkc.js";import"./iconBase-V32KN-Z0.js";import"./MmrComparison-q21iWuSw.js";import"./formatters-C0HfR3L6.js";import"./FormDots-DxrKurhi.js";const p=n.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: -1000;
`,h=n.video`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  transform: translate(-55%, -50%) scale(1); /* Slight scale to cover potential gaps */
`,u=n.div`
  position: relative;
  z-index: 1;
`,w=({children:i})=>{const t=r.useRef(null);return r.useEffect(()=>{const o=()=>{if(t.current){const{width:s,height:d}=t.current.getBoundingClientRect(),a=window.innerWidth,c=window.innerHeight,l=Math.max(a/s,c/d);t.current.style.transform=`translate(-50%, -50%) scale(${l})`}};return window.addEventListener("resize",o),o(),()=>window.removeEventListener("resize",o)},[]),e.jsxs(e.Fragment,{children:[e.jsx(p,{children:e.jsxs(h,{ref:t,autoPlay:!0,loop:!0,muted:!0,playsInline:!0,children:[e.jsx("source",{src:"/backgrounds/peace-in-ashenvale-world-of-warcraft-moewalls-com.mp4",type:"video/mp4"}),"Your browser does not support the video tag."]})}),e.jsx(u,{children:i})]})},y=()=>e.jsx(w,{children:'"FOALS"'});export{y as default};
