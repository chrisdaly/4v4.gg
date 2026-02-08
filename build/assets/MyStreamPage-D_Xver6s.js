import{a as i,j as e,E as n}from"./index-BfWfxCZJ.js";const h=n.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  z-index: -1000;
`,u=n.video`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100vw;
  height: 100vh;
  object-fit: cover;
  transform: translate(-55%, -50%) scale(1); /* Slight scale to cover potential gaps */
`,p=n.div`
  position: relative;
  z-index: 1;
`,w=({children:r})=>{const t=i.useRef(null);return i.useEffect(()=>{const o=()=>{if(t.current){const{width:s,height:a}=t.current.getBoundingClientRect(),d=window.innerWidth,c=window.innerHeight,l=Math.max(d/s,c/a);t.current.style.transform=`translate(-50%, -50%) scale(${l})`}};return window.addEventListener("resize",o),o(),()=>window.removeEventListener("resize",o)},[]),e.jsxs(e.Fragment,{children:[e.jsx(h,{children:e.jsxs(u,{ref:t,autoPlay:!0,loop:!0,muted:!0,playsInline:!0,children:[e.jsx("source",{src:"/backgrounds/peace-in-ashenvale-world-of-warcraft-moewalls-com.mp4",type:"video/mp4"}),"Your browser does not support the video tag."]})}),e.jsx(p,{children:r})]})},f=()=>e.jsx(w,{children:'"FOALS"'});export{f as default};
