import{J as ke,a as d,j as e,R as ne,C as Se,E as n,r as H,D as Me,L as J,n as Ce,u as Ye,M as He,K as oe,N as Te,d as Pe,P as ae,m as Je,Q as Ge}from"./index-nDK_ViPy.js";import{G as Q}from"./index-Ntay8lko.js";function Ve(t){return ke({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}function We(t){return ke({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{fill:"none",strokeMiterlimit:"10",strokeWidth:"32",d:"M430.11 347.9c-6.6-6.1-16.3-7.6-24.6-9-11.5-1.9-15.9-4-22.6-10-14.3-12.7-14.3-31.1 0-43.8l30.3-26.9c46.4-41 46.4-108.2 0-149.2-34.2-30.1-80.1-45-127.8-45-55.7 0-113.9 20.3-158.8 60.1-83.5 73.8-83.5 194.7 0 268.5 41.5 36.7 97.5 55 152.9 55.4h1.7c55.4 0 110-17.9 148.8-52.4 14.4-12.7 11.99-36.6.1-47.7z"},child:[]},{tag:"circle",attr:{cx:"144",cy:"208",r:"32"},child:[]},{tag:"circle",attr:{cx:"152",cy:"311",r:"32"},child:[]},{tag:"circle",attr:{cx:"224",cy:"144",r:"32"},child:[]},{tag:"circle",attr:{cx:"256",cy:"367",r:"48"},child:[]},{tag:"circle",attr:{cx:"328",cy:"144",r:"32"},child:[]}]})(t)}const ie="http://localhost:3002",se=500;function Xe(){const[t,r]=d.useState([]),[a,s]=d.useState("connecting"),[c,l]=d.useState([]),m=d.useRef(null),$=d.useCallback(o=>{r(i=>{const p=new Set(i.map(j=>j.id)),g=o.filter(j=>!p.has(j.id));if(g.length===0)return i;const b=[...i,...g];return b.length>se?b.slice(b.length-se):b})},[]);return d.useEffect(()=>{let o=!1;fetch(`${ie}/api/chat/messages?limit=100`).then(p=>p.json()).then(p=>{o||$(p.reverse())}).catch(()=>{});const i=new EventSource(`${ie}/api/chat/stream`);return m.current=i,i.addEventListener("history",p=>{if(o)return;const g=JSON.parse(p.data);$(g)}),i.addEventListener("message",p=>{if(o)return;const g=JSON.parse(p.data);$([g])}),i.addEventListener("delete",p=>{if(o)return;const{id:g}=JSON.parse(p.data);r(b=>b.filter(j=>j.id!==g))}),i.addEventListener("bulk_delete",p=>{if(o)return;const{ids:g}=JSON.parse(p.data),b=new Set(g);r(j=>j.filter(F=>!b.has(F.id)))}),i.addEventListener("users_init",p=>{o||l(JSON.parse(p.data))}),i.addEventListener("user_joined",p=>{if(o)return;const g=JSON.parse(p.data);l(b=>b.some(j=>j.battleTag===g.battleTag)?b:[...b,g])}),i.addEventListener("user_left",p=>{if(o)return;const{battleTag:g}=JSON.parse(p.data);l(b=>b.filter(j=>j.battleTag!==g))}),i.addEventListener("status",p=>{if(o)return;const{state:g}=JSON.parse(p.data);s(g==="Connected"?"connected":g)}),i.addEventListener("heartbeat",()=>{o||s("connected")}),i.onopen=()=>{o||s("connected")},i.onerror=()=>{o||s("reconnecting")},()=>{o=!0,i.close()}},[$]),{messages:t,status:a,onlineUsers:c}}const K={classic:{id:"classic",name:"Classic",desc:"Clean silver frame",border:"8px solid transparent",borderImage:'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch',bg:"rgba(10, 8, 6, 0.25)",headerBg:"rgba(10, 8, 6, 0.2)",blur:"blur(1px)",shadow:"none"},ironforge:{id:"ironforge",name:"Ironforge",desc:"Heavy dark metal with rivets",border:"16px solid transparent",borderImage:'url("/frames/launcher/Maon_Border.png") 120 / 16px stretch',bg:"rgba(10, 8, 6, 0.4)",headerBg:"rgba(10, 8, 6, 0.3)",blur:"blur(2px)",shadow:"none"},royal:{id:"royal",name:"Royal",desc:"Ornate gold corners",border:"20px solid transparent",borderImage:'url("/frames/wc3-frame.png") 80 / 20px stretch',bg:"rgba(10, 8, 6, 0.35)",headerBg:"rgba(10, 8, 6, 0.25)",blur:"blur(2px)",shadow:"none"},goldDialog:{id:"goldDialog",name:"Gold Dialog",desc:"WC3 dialog gold frame",border:"12px solid transparent",borderImage:'url("/frames/dialog/Gold-Border.png") 28 / 12px stretch',bg:"rgba(10, 8, 6, 0.35)",headerBg:"rgba(10, 8, 6, 0.25)",blur:"blur(2px)",shadow:"none"},darkWood:{id:"darkWood",name:"Dark Wood",desc:"Tavern-style wood border",border:"14px solid transparent",borderImage:'url("/frames/wood/WoodBorder.png") 40 / 14px stretch',bg:"rgba(10, 8, 6, 0.35)",headerBg:"rgba(10, 8, 6, 0.25)",blur:"blur(1px)",shadow:"none"},goldTrim:{id:"goldTrim",name:"Gold Trim",desc:"CSS gradient gold border",border:"2px solid transparent",borderImage:"linear-gradient(135deg, #b8860b 0%, #fcdb33 25%, #b8860b 50%, #fcdb33 75%, #b8860b 100%) 1",bg:"rgba(10, 8, 6, 0.3)",headerBg:"rgba(10, 8, 6, 0.25)",blur:"blur(1px)",shadow:"inset 0 0 20px rgba(0, 0, 0, 0.3)"},subtle:{id:"subtle",name:"Subtle",desc:"Thin gold outline",border:"1px solid rgba(252, 219, 51, 0.2)",borderImage:"none",bg:"rgba(10, 8, 6, 0.25)",headerBg:"rgba(10, 8, 6, 0.2)",blur:"blur(1px)",shadow:"none"},tooltip:{id:"tooltip",name:"Tooltip",desc:"Thin minimal frame",border:"4px solid transparent",borderImage:'url("/frames/tooltips/Border.png") 4 / 4px stretch',bg:"rgba(10, 8, 6, 0.3)",headerBg:"rgba(10, 8, 6, 0.25)",blur:"blur(1px)",shadow:"none"},bevel:{id:"bevel",name:"Bevel",desc:"Raised gold-edged panel",border:"2px solid #b8860b",borderImage:"none",bg:"linear-gradient(180deg, rgba(252, 219, 51, 0.04) 0%, rgba(0, 0, 0, 0.12) 100%)",headerBg:"rgba(10, 8, 6, 0.3)",blur:"blur(1px)",shadow:"inset 1px 1px 0 rgba(252, 219, 51, 0.25), inset -1px -1px 0 rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.5)"},arcane:{id:"arcane",name:"Arcane",desc:"Inner gold glow",border:"2px solid #fcdb33",borderImage:"none",bg:"rgba(0, 0, 0, 0.8)",headerBg:"rgba(10, 8, 6, 0.3)",blur:"blur(1px)",shadow:"inset 0 0 15px rgba(252, 219, 51, 0.12), inset 0 0 3px rgba(252, 219, 51, 0.25), 0 0 10px rgba(252, 219, 51, 0.08)"},frost:{id:"frost",name:"Frost",desc:"Frosted glass panel",border:"1px solid rgba(255, 255, 255, 0.08)",borderImage:"none",bg:"rgba(20, 25, 35, 0.35)",headerBg:"rgba(20, 25, 35, 0.3)",blur:"blur(8px)",shadow:"inset 0 1px 0 rgba(255, 255, 255, 0.05)"},none:{id:"none",name:"None",desc:"No border, transparent",border:"none",borderImage:"none",bg:"rgba(10, 8, 6, 0.2)",headerBg:"rgba(10, 8, 6, 0.15)",blur:"blur(1px)",shadow:"none"}},ze="chatBorderTheme",q="classic";function Ke(){try{return localStorage.getItem(ze)||q}catch{return q}}function qe(t){try{localStorage.setItem(ze,t)}catch{}}function Qe(t){return K[t]||K[q]}const Ze=Object.values(K),Z="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",et=n.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,tt=n.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.bg)||"rgba(10, 8, 6, 0.25)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  border: ${t=>{var r;return((r=t.$theme)==null?void 0:r.border)||"8px solid transparent"}};
  border-image: ${t=>{var r;return((r=t.$theme)==null?void 0:r.borderImage)||'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'}};
  box-shadow: ${t=>{var r;return((r=t.$theme)==null?void 0:r.shadow)||"none"}};
`,rt=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);

  @media (max-width: 480px) {
    padding: 10px var(--space-2);
  }
`,nt=n(J)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,ot=n.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,at=n.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t=>t.$connected?"var(--green)":"var(--grey-mid)"};
  ${t=>t.$connected&&"animation: pulse 1.5s infinite;"}
`,it=n.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2);
  }

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: 3px;
  }
`,st=n.div`
  position: relative;
  min-height: 90px;
  margin-top: 20px;
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }

  @media (max-width: 480px) {
    min-height: 74px;
    margin-top: 14px;
  }
`,lt=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,ct=n.div`
  position: relative;
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  &:hover > .hover-timestamp {
    opacity: 0.5;
  }
`,dt=n.span`
  position: absolute;
  right: var(--space-4);
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
`,pt=n.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,le=n.img`
  width: 60px;
  height: 60px;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.3:.85};

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
    padding: 6px;
  }
`,gt=n.div`
  min-width: 0;
`,ht=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,xt=n.span`
  display: inline-flex;
  align-items: center;
`,mt=n.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,ft=n(J)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,ut=n.div`
  position: absolute;
  left: var(--space-2);
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;

  @media (max-width: 480px) {
    width: 44px;
  }
`,bt=n.div`
  position: relative;
  display: inline-block;
`,vt=n.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,wt=n.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 2px;
  line-height: 1;
  gap: 4px;
`,yt=n.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,jt=n.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`,$t=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,kt=n.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,St=n.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${t=>t.$win?"var(--green)":"var(--red)"};
  opacity: 0.8;

  @media (max-width: 480px) {
    width: 5px;
    height: 5px;
  }
`,Mt=n(Q)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`,ce=n.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 14px;
    line-height: 1.5;
  }
`,Ct=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,Tt=n.button`
  position: absolute;
  bottom: var(--space-1);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: linear-gradient(180deg, rgba(30, 24, 16, 0.95) 0%, rgba(15, 12, 8, 0.98) 100%);
  border: 1px solid rgba(252, 219, 51, 0.4);
  border-radius: var(--radius-md);
  color: var(--gold);
  font-family: var(--font-display);
  font-size: var(--text-xxs);
  letter-spacing: 0.5px;
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(252, 219, 51, 0.1);
  transition: all 0.2s ease;

  &::after {
    content: "▼";
    font-size: 9px;
  }

  &:hover {
    border-color: var(--gold);
    background: linear-gradient(180deg, rgba(252, 219, 51, 0.12) 0%, rgba(252, 219, 51, 0.04) 100%);
    box-shadow: 0 2px 16px rgba(252, 219, 51, 0.15), inset 0 1px 0 rgba(252, 219, 51, 0.15);
  }
`,zt=n.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,de=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin: var(--space-6) 0 var(--space-2);
  padding: 0 var(--space-4);

  &:first-child {
    margin-top: var(--space-2);
  }

  &::before,
  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: rgba(160, 130, 80, 0.15);
  }
`,pe=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`,It=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ge(t){const r=new Date(t),a=new Date;if(r.getDate()===a.getDate()&&r.getMonth()===a.getMonth()&&r.getFullYear()===a.getFullYear())return"Today";const c=new Date(a);return c.setDate(c.getDate()-1),r.getDate()===c.getDate()&&r.getMonth()===c.getMonth()&&r.getFullYear()===c.getFullYear()?"Yesterday":r.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function he(t){const r=new Date(t);return`${r.getFullYear()}-${r.getMonth()}-${r.getDate()}`}function Dt(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function Ft(t){const r=new Date(t),a=new Date,s=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(r.getDate()===a.getDate()&&r.getMonth()===a.getMonth()&&r.getFullYear()===a.getFullYear())return s;const l=new Date(a);return l.setDate(l.getDate()-1),r.getDate()===l.getDate()&&r.getMonth()===l.getMonth()&&r.getFullYear()===l.getFullYear()?`Yesterday ${s}`:`${r.getMonth()+1}/${r.getDate()}/${String(r.getFullYear()).slice(2)} ${s}`}function Rt(t,r,a){var m;const s=(m=r==null?void 0:r.get(t))==null?void 0:m.profilePicUrl;if(s)return e.jsx(pt,{src:s,alt:""});const c=a==null?void 0:a.get(t),l=(c==null?void 0:c.race)!=null?H[c.race]:null;return l?e.jsx(le,{src:l,alt:""}):e.jsx(le,{src:Me.random,alt:"",$faded:!0})}function Bt({messages:t,status:r,avatars:a,stats:s,sessions:c,inGameTags:l,recentWinners:m,borderTheme:$}){const o=d.useRef(null),[i,p]=d.useState(!0),[g,b]=d.useState(!1),j=d.useMemo(()=>{const M=[];for(let C=0;C<t.length;C++){const u=t[C],v=u.battle_tag||u.battleTag;let D=C===0;if(!D){const I=t[C-1];if((I.battle_tag||I.battleTag)!==v)D=!0;else{const x=new Date(I.sent_at||I.sentAt).getTime();new Date(u.sent_at||u.sentAt).getTime()-x>120*1e3&&(D=!0)}}D?M.push({start:u,continuations:[]}):M.length>0&&M[M.length-1].continuations.push(u)}return M},[t]);d.useEffect(()=>{i&&o.current?o.current.scrollTop=o.current.scrollHeight:!i&&t.length>0&&b(!0)},[t,i]);function F(){const M=o.current;if(!M)return;const C=M.scrollHeight-M.scrollTop-M.clientHeight<40;p(C),C&&b(!1)}function N(){o.current&&(o.current.scrollTop=o.current.scrollHeight),p(!0),b(!1)}return e.jsxs(et,{children:[e.jsxs(rt,{$theme:$,children:[e.jsx(nt,{to:"/",children:"4v4 Chat"}),e.jsxs(ot,{children:[e.jsx(at,{$connected:r==="connected"}),r==="connected"?t.length:"Connecting..."]})]}),e.jsx(tt,{$theme:$,children:t.length===0?e.jsx(It,{children:r==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(zt,{children:[e.jsx(it,{ref:o,onScroll:F,children:j.map((M,C)=>{var z,k,R;const u=M.start,v=u.battle_tag||u.battleTag,D=u.user_name||u.userName,I=u.sent_at||u.sentAt,h=he(I);let x=C===0;if(!x&&C>0){const B=j[C-1].start,A=B.sent_at||B.sentAt;x=he(A)!==h}return!v||v==="system"?e.jsxs(ne.Fragment,{children:[x&&e.jsx(de,{children:e.jsx(pe,{children:ge(I)})}),e.jsx(Ct,{children:u.message})]},u.id):e.jsxs(ne.Fragment,{children:[x&&e.jsx(de,{children:e.jsx(pe,{children:ge(I)})}),e.jsxs(st,{children:[e.jsxs(ut,{children:[e.jsxs(bt,{children:[Rt(v,a,s),((z=a==null?void 0:a.get(v))==null?void 0:z.country)&&e.jsx(vt,{children:e.jsx(Se,{name:a.get(v).country.toLowerCase()})})]}),(((k=s==null?void 0:s.get(v))==null?void 0:k.mmr)!=null||(c==null?void 0:c.get(v)))&&e.jsxs(wt,{children:[((R=s==null?void 0:s.get(v))==null?void 0:R.mmr)!=null&&e.jsxs(yt,{children:[e.jsx(jt,{children:Math.round(s.get(v).mmr)}),e.jsx($t,{children:"MMR"})]}),(c==null?void 0:c.get(v))&&e.jsx(kt,{children:c.get(v).map((B,A)=>e.jsx(St,{$win:B},A))})]})]}),e.jsx(lt,{children:e.jsxs(gt,{children:[e.jsx("div",{children:e.jsxs(xt,{children:[e.jsx(ft,{to:`/player/${encodeURIComponent(v)}`,children:D}),(l==null?void 0:l.has(v))&&e.jsx(Mt,{}),(m==null?void 0:m.has(v))&&e.jsx(mt,{src:Z,alt:""}),e.jsx(ht,{children:Ft(u.sent_at||u.sentAt)})]})}),e.jsx(ce,{children:u.message})]})}),M.continuations.map(B=>e.jsxs(ct,{children:[e.jsx(dt,{className:"hover-timestamp",children:Dt(B.sent_at||B.sentAt)}),e.jsx(ce,{children:B.message})]},B.id))]})]},u.id)})}),g&&e.jsx(Tt,{onClick:N,children:"New messages below"})]})})]})}const Et=n.aside`
  width: 460px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100vh;
    z-index: var(--z-overlay);
    transform: ${t=>t.$mobileVisible?"translateY(0)":"translateY(100%)"};
    transition: transform 0.25s ease;
  }
`,Lt=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,At=n.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.bg)||"rgba(10, 8, 6, 0.25)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  border: ${t=>{var r;return((r=t.$theme)==null?void 0:r.border)||"8px solid transparent"}};
  border-image: ${t=>{var r;return((r=t.$theme)==null?void 0:r.borderImage)||'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'}};
  box-shadow: ${t=>{var r;return((r=t.$theme)==null?void 0:r.shadow)||"none"}};
`,Ut=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Nt=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,_t=n.button`
  background: none;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  padding: 3px 8px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: rgba(160, 130, 80, 0.4);
  }
`,Ot=n.button`
  display: none;
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: #fff;
  }

  @media (max-width: 768px) {
    display: block;
  }
`,Yt=n.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: 3px;
  }
`,Ht=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: var(--space-4);
`,Pt=n(J)`
  display: block;
  text-decoration: none;
  color: inherit;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  overflow: hidden;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(160, 130, 80, 0.25);
  }
`,Ie=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`,De=n.img`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,Fe=n.div`
  flex: 1;
  min-width: 0;
`,Re=n.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Be=n.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
`,Ee=n.span`
  font-family: var(--font-mono);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
`,Le=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`,Ae=n.div`
  width: 80px;
  flex-shrink: 0;
  align-self: stretch;
  padding: var(--space-2) 0;
  box-sizing: border-box;
`,Ue=n.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
`,Jt=n.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,Ne=n.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-6) var(--space-3);
  gap: 0;
`,xe=n.div`
  flex: 1;
  min-width: 0;
`,G=n.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-direction: ${t=>t.$reverse?"row-reverse":"row"};

  &:last-child {
    margin-bottom: 0;
  }
`,V=n.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`,W=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
  text-align: ${t=>t.$right?"right":"left"};
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`,Gt=Te`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,Vt=Te`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,Wt=n(J)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${Gt} 8s ease forwards;
`,Xt=n.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${Vt} 2s ease-out forwards;
`,Kt=n.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background: rgba(0, 0, 0, 0.5);
  animation: backdropFade 2s ease-out forwards;

  @keyframes backdropFade {
    0% { opacity: 0; }
    20% { opacity: 1; }
    50% { opacity: 1; }
    100% { opacity: 0; }
  }
`,me=n.div`
  flex: 1;
  min-width: 0;
`,fe=n.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function ue(t){var s;const a=(t.teams||((s=t.match)==null?void 0:s.teams)||[]).flatMap(c=>{var l;return((l=c.players)==null?void 0:l.map(m=>m.oldMmr||0))||[]});return a.length>0?a.reduce((c,l)=>c+l,0)/a.length:0}function qt({startTime:t}){const[r,a]=d.useState(()=>oe(t));return d.useEffect(()=>{const s=setInterval(()=>{a(oe(t))},1e3);return()=>clearInterval(s)},[t]),e.jsxs(Ue,{children:[e.jsx(Jt,{}),r]})}function Qt({match:t}){var N,M,C,u,v,D,I,h;const r=Ye(),a=t.mapName||((N=t.match)==null?void 0:N.mapName),s=(a==null?void 0:a.replace(/^\(\d\)\s*/,""))||"Unknown",c=Ce(a),l=t.teams||((M=t.match)==null?void 0:M.teams)||[],m=t.startTime||((C=t.match)==null?void 0:C.startTime),$=l[0],o=l[1],i=((u=$==null?void 0:$.players)==null?void 0:u.map(x=>x.oldMmr||0))||[],p=((v=o==null?void 0:o.players)==null?void 0:v.map(x=>x.oldMmr||0))||[],g=[...i,...p],b=g.length>0?Math.round(g.reduce((x,z)=>x+z,0)/g.length):null,j={teamOneMmrs:i,teamTwoMmrs:p},F=t.id||((D=t.match)==null?void 0:D.id);return e.jsxs(Pt,{to:F?`/match/${F}`:"/",children:[e.jsxs(Ie,{children:[c&&e.jsx(De,{src:c,alt:""}),e.jsxs(Fe,{children:[e.jsx(Re,{children:s}),b!=null&&e.jsxs(Be,{children:[e.jsx(Ee,{children:b}),e.jsx(Le,{children:"MMR"})]}),m&&e.jsx(qt,{startTime:m})]})]}),e.jsxs(Ne,{children:[e.jsx(xe,{$team:1,children:(I=$==null?void 0:$.players)==null?void 0:I.map((x,z)=>e.jsxs(G,{children:[e.jsx(V,{src:H[x.race],alt:""}),e.jsx(W,{onClick:k=>{k.preventDefault(),k.stopPropagation(),r.push(`/player/${encodeURIComponent(x.battleTag)}`)},children:x.name})]},z))}),e.jsx(Ae,{children:e.jsx(He,{data:j,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(xe,{$team:2,children:(h=o==null?void 0:o.players)==null?void 0:h.map((x,z)=>e.jsxs(G,{$reverse:!0,children:[e.jsx(V,{src:H[x.race],alt:""}),e.jsx(W,{$right:!0,onClick:k=>{k.preventDefault(),k.stopPropagation(),r.push(`/player/${encodeURIComponent(x.battleTag)}`)},children:x.name})]},z))})]})]})}function Zt({match:t}){var u,v,D,I,h,x,z;const r=t.mapName||((u=t.match)==null?void 0:u.mapName),a=(r==null?void 0:r.replace(/^\(\d\)\s*/,""))||"Unknown",s=Ce(r),c=t.teams||((v=t.match)==null?void 0:v.teams)||[],l=t._winnerTeam,m=t.durationInSeconds,$=m?`${Math.floor(m/60)}:${String(m%60).padStart(2,"0")}`:null,o=c[0],i=c[1],p=((D=o==null?void 0:o.players)==null?void 0:D.map(k=>k.oldMmr||0))||[],g=((I=i==null?void 0:i.players)==null?void 0:I.map(k=>k.oldMmr||0))||[],b=[...p,...g],j=b.length>0?Math.round(b.reduce((k,R)=>k+R,0)/b.length):null,F=t.id||((h=t.match)==null?void 0:h.id),N=l===0?me:fe,M=l===1?me:fe,C=l===0?"25%":"75%";return e.jsxs(Wt,{to:F?`/match/${F}`:"/",style:{"--crown-end-x":C},children:[e.jsx(Kt,{}),l!=null&&e.jsx(Xt,{src:Z,alt:""}),e.jsxs(Ie,{children:[s&&e.jsx(De,{src:s,alt:""}),e.jsxs(Fe,{children:[e.jsx(Re,{children:a}),j!=null&&e.jsxs(Be,{children:[e.jsx(Ee,{children:j}),e.jsx(Le,{children:"MMR"})]}),$&&e.jsx(Ue,{children:$})]})]}),e.jsxs(Ne,{children:[e.jsx(N,{children:(x=o==null?void 0:o.players)==null?void 0:x.map((k,R)=>e.jsxs(G,{children:[e.jsx(V,{src:H[k.race],alt:""}),e.jsx(W,{children:k.name})]},R))}),e.jsx(Ae,{}),e.jsx(M,{children:(z=i==null?void 0:i.players)==null?void 0:z.map((k,R)=>e.jsxs(G,{$reverse:!0,children:[e.jsx(V,{src:H[k.race],alt:""}),e.jsx(W,{$right:!0,children:k.name})]},R))})]})]})}function er({matches:t=[],finishedMatches:r=[],$mobileVisible:a,onClose:s,borderTheme:c}){const[l,m]=d.useState("mmr"),$=d.useMemo(()=>{const o=[...t];return l==="mmr"?o.sort((i,p)=>ue(p)-ue(i)):o.sort((i,p)=>{var j,F;const g=new Date(i.startTime||((j=i.match)==null?void 0:j.startTime)||0).getTime();return new Date(p.startTime||((F=p.match)==null?void 0:F.startTime)||0).getTime()-g}),o},[t,l]);return e.jsx(Et,{$mobileVisible:a,children:e.jsxs(At,{$theme:c,children:[e.jsxs(Lt,{$theme:c,children:[e.jsx(Ut,{children:"Active Games"}),e.jsx(Nt,{children:t.length}),e.jsx(_t,{onClick:()=>m(o=>o==="mmr"?"recent":"mmr"),children:l==="mmr"?"MMR":"Recent"}),e.jsx(Ot,{onClick:s,children:"×"})]}),$.length===0&&r.length===0?e.jsx(Ht,{children:"No active games"}):e.jsxs(Yt,{children:[r.map(o=>e.jsx(Zt,{match:o},`fin-${o.id}`)),$.map(o=>{var i;return e.jsx(Qt,{match:o},o.id||((i=o.match)==null?void 0:i.id))})]})]})})}const tr=n.aside`
  width: 268px;
  height: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100vh;
    z-index: var(--z-overlay);
    transform: ${t=>t.$mobileVisible?"translateY(0)":"translateY(100%)"};
    transition: transform 0.25s ease;
  }
`,rr=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,nr=n.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.bg)||"rgba(10, 8, 6, 0.25)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  border: ${t=>{var r;return((r=t.$theme)==null?void 0:r.border)||"8px solid transparent"}};
  border-image: ${t=>{var r;return((r=t.$theme)==null?void 0:r.borderImage)||'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'}};
  box-shadow: ${t=>{var r;return((r=t.$theme)==null?void 0:r.shadow)||"none"}};
`,or=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,ar=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,ir=n.button`
  display: none;
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: #fff;
  }

  @media (max-width: 768px) {
    display: block;
  }
`,sr=n.div`
  position: relative;
  margin: 12px var(--space-2);

  &::before {
    content: "⌕";
    position: absolute;
    left: 10px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--grey-light);
    font-size: 15px;
    pointer-events: none;
  }
`,lr=n.input`
  width: 100%;
  padding: 10px 32px 10px 30px;
  font-family: var(--font-display);
  font-size: var(--text-xs);
  letter-spacing: 0.3px;
  color: #fff;
  background: linear-gradient(180deg, rgba(25, 20, 15, 0.9) 0%, rgba(12, 10, 8, 0.95) 100%);
  border: 1px solid rgba(160, 130, 80, 0.25);
  border-radius: var(--radius-md);
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--grey-light);
    font-size: var(--text-xxs);
  }

  &:focus {
    border-color: var(--gold);
    box-shadow: 0 0 8px rgba(252, 219, 51, 0.15);
  }
`,cr=n.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: 18px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;

  &:hover {
    color: #fff;
  }
`,dr=n.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-2);
  padding-left: calc(var(--space-2) + 28px + var(--space-2));
  border-bottom: 1px solid rgba(160, 130, 80, 0.2);
  background: rgba(20, 16, 12, 0.6);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`,_e=n.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,pr=n(_e)`
  flex: 1;
`,gr=n(_e)`
  flex-shrink: 0;
`,hr=n.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-1) 0;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: var(--grey-mid);
    border-radius: 3px;
  }
`,xr=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,mr=n(J)`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,fr=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,ur=n.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,br=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,be=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,vr=n(Q)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,wr=n.img.attrs({src:Z,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,yr=n.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,jr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,$r=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,ve=n.div`
  padding: 12px var(--space-2) var(--space-2);
  margin-top: var(--space-1);
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  border-top: 1px solid rgba(160, 130, 80, 0.12);

  &:first-child {
    border-top: none;
    margin-top: 0;
  }

  &:hover {
    color: #fff;
  }
`,we=n.span`
  color: var(--gold);
`,ye=n.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function kr(t,r,a){var m;const s=(m=r==null?void 0:r.get(t))==null?void 0:m.profilePicUrl;if(s)return e.jsx(br,{src:s,alt:""});const c=a==null?void 0:a.get(t),l=(c==null?void 0:c.race)!=null?H[c.race]:null;return l?e.jsx(be,{src:l,alt:""}):e.jsx(be,{src:Me.random,alt:"",$faded:!0})}function je({user:t,avatars:r,stats:a,inGame:s,matchUrl:c,isRecentWinner:l}){var g;const m=a==null?void 0:a.get(t.battleTag),$=m==null?void 0:m.mmr,o=(m==null?void 0:m.race)!=null?H[m.race]:null,i=(g=r==null?void 0:r.get(t.battleTag))==null?void 0:g.country,p=e.jsxs(e.Fragment,{children:[e.jsxs(fr,{children:[kr(t.battleTag,r,a),i&&e.jsx(ur,{children:e.jsx(Se,{name:i.toLowerCase(),style:{width:14,height:10}})})]}),s&&e.jsx(vr,{}),l&&e.jsx(wr,{}),o&&e.jsx(yr,{src:o,alt:""}),e.jsx(jr,{children:t.name}),$!=null&&e.jsx($r,{children:Math.round($)})]});return c?e.jsx(mr,{to:c,children:p}):e.jsx(xr,{children:p})}function Sr({users:t,avatars:r,stats:a,inGameTags:s,inGameMatchMap:c,recentWinners:l,$mobileVisible:m,onClose:$,borderTheme:o}){const[i,p]=d.useState(""),[g,b]=d.useState("mmr"),[j,F]=d.useState(!0),[N,M]=d.useState(!0);function C(h){b(h)}const u=d.useMemo(()=>[...t].sort((h,x)=>{var R,B;if(g==="live"){const A=s!=null&&s.has(h.battleTag)?1:0,_=s!=null&&s.has(x.battleTag)?1:0;if(A!==_)return _-A}if(g==="name"){const A=(h.name||"").localeCompare(x.name||"",void 0,{sensitivity:"base"});if(A!==0)return A}const z=((R=a==null?void 0:a.get(h.battleTag))==null?void 0:R.mmr)??-1,k=((B=a==null?void 0:a.get(x.battleTag))==null?void 0:B.mmr)??-1;return z!==k?k-z:(h.name||"").localeCompare(x.name||"",void 0,{sensitivity:"base"})}),[t,a,s,g]),v=d.useMemo(()=>{if(!i.trim())return u;const h=i.toLowerCase();return u.filter(x=>(x.name||"").toLowerCase().includes(h))},[u,i]),{inGameUsers:D,onlineUsers:I}=d.useMemo(()=>{const h=[],x=[];for(const z of v)s!=null&&s.has(z.battleTag)?h.push(z):x.push(z);return{inGameUsers:h,onlineUsers:x}},[v,s]);return e.jsx(tr,{$mobileVisible:m,children:e.jsxs(nr,{$theme:o,children:[e.jsxs(rr,{$theme:o,children:[e.jsx(or,{children:"Channel"}),e.jsx(ar,{children:t.length}),e.jsx(ir,{onClick:$,children:"×"})]}),e.jsxs(sr,{children:[e.jsx(lr,{type:"text",placeholder:"Search players...",value:i,onChange:h=>p(h.target.value)}),i&&e.jsx(cr,{onClick:()=>p(""),children:"×"})]}),e.jsxs(dr,{children:[e.jsx(pr,{$active:g==="name",onClick:()=>C("name"),children:"Player"}),e.jsx(gr,{$active:g==="mmr",onClick:()=>C("mmr"),children:"MMR"})]}),e.jsxs(hr,{children:[D.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(ve,{onClick:()=>F(h=>!h),children:[e.jsx(ye,{$open:j,children:"▶"}),"In Game — ",e.jsx(we,{children:D.length})]}),j&&D.map(h=>e.jsx(je,{user:h,avatars:r,stats:a,inGame:!0,matchUrl:c==null?void 0:c.get(h.battleTag),isRecentWinner:l==null?void 0:l.has(h.battleTag)},h.battleTag))]}),e.jsxs(ve,{onClick:()=>M(h=>!h),children:[e.jsx(ye,{$open:N,children:"▶"}),"Online — ",e.jsx(we,{children:I.length})]}),N&&I.map(h=>e.jsx(je,{user:h,avatars:r,stats:a,inGame:!1,matchUrl:null,isRecentWinner:l==null?void 0:l.has(h.battleTag)},h.battleTag))]})]})})}const Mr=n.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background: url("/frames/launcher/Static_Background.png") center / cover no-repeat fixed;
    z-index: -2;
  }

  &::after {
    content: "";
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: -1;
  }

  @media (max-width: 768px) {
    padding: 0;
  }
`,Cr=n.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`,$e=n.button`
  display: none;
  position: fixed;
  bottom: var(--space-4);
  z-index: calc(var(--z-overlay) - 1);
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  border: 1px solid var(--gold);
  background: var(--grey-dark);
  color: var(--gold);
  font-size: 20px;
  cursor: pointer;
  align-items: center;
  justify-content: center;
  right: ${t=>t.$right||"auto"};
  left: ${t=>t.$left||"auto"};

  @media (max-width: 768px) {
    display: flex;
  }
`,Tr=n.button`
  position: fixed;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  z-index: calc(var(--z-overlay) - 1);
  width: 40px;
  height: 40px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(160, 130, 80, 0.3);
  background: rgba(20, 16, 12, 0.8);
  color: var(--grey-light);
  font-size: 18px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  backdrop-filter: blur(4px);

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`,zr=n.div`
  position: fixed;
  bottom: 60px;
  left: 50%;
  transform: translateX(-50%);
  z-index: var(--z-overlay);
  display: flex;
  gap: 6px;
  padding: var(--space-2);
  background: rgba(15, 12, 8, 0.95);
  border: 1px solid rgba(160, 130, 80, 0.3);
  border-radius: var(--radius-md);
  backdrop-filter: blur(8px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
`,Ir=n.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  background: ${t=>t.$active?"rgba(252, 219, 51, 0.1)":"transparent"};
  border: 1px solid ${t=>t.$active?"var(--gold)":"rgba(160, 130, 80, 0.15)"};
  border-radius: var(--radius-sm);
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;

  &:hover {
    color: var(--gold);
    border-color: rgba(252, 219, 51, 0.3);
    background: rgba(252, 219, 51, 0.05);
  }
`,Dr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
`,Fr=n.span`
  font-size: 10px;
  opacity: 0.6;
`,Er=()=>{const{messages:t,status:r,onlineUsers:a}=Xe(),[s,c]=d.useState(new Map),[l,m]=d.useState(new Map),[$,o]=d.useState(new Map),[i,p]=d.useState([]),[g,b]=d.useState(!1),[j,F]=d.useState(!1),[N,M]=d.useState([]),[C,u]=d.useState(new Set),[v,D]=d.useState(Ke),[I,h]=d.useState(!1),x=d.useRef(new Set),z=d.useRef(new Set),k=d.useRef(new Set),R=d.useMemo(()=>Qe(v),[v]);function B(f){D(f),qe(f)}const A=d.useCallback(async()=>{try{const f=await Pe();p(f.matches||[])}catch{}},[]);d.useEffect(()=>{A();const f=setInterval(A,3e4);return()=>clearInterval(f)},[A]),d.useEffect(()=>{const f=new Set(i.map(y=>{var E;return y.id||((E=y.match)==null?void 0:E.id)})),w=[...k.current].filter(y=>y&&!f.has(y));if(k.current=f,w.length===0)return;console.log("[GameEnd] Detected ended matches:",w);async function S(y,E=0){var te,re;console.log(`[GameEnd] Fetching result for ${y}, attempt ${E}`);let O;try{const U=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(y)}`);if(!U.ok)return;const L=await U.json();O=L==null?void 0:L.match}catch{return}if(!O)return;const P=(te=O.teams)==null?void 0:te.findIndex(U=>{var L;return(L=U.players)==null?void 0:L.some(Y=>Y.won===!0||Y.won===1)});if(P<0&&E<3){setTimeout(()=>S(y,E+1),5e3);return}if(P>=0){const U=((re=O.teams[P].players)==null?void 0:re.map(L=>L.battleTag).filter(Boolean))||[];U.length>0&&(u(L=>{const Y=new Set(L);return U.forEach(X=>Y.add(X)),Y}),setTimeout(()=>{u(L=>{const Y=new Set(L);return U.forEach(X=>Y.delete(X)),Y})},12e4))}M(U=>[...U,{...O,id:y,_winnerTeam:P>=0?P:null,_finishedAt:Date.now()}]),setTimeout(()=>{M(U=>U.filter(L=>L.id!==y))},8e3)}for(const y of w)setTimeout(()=>S(y),5e3)},[i]);const _=d.useMemo(()=>{const f=new Set;for(const w of i)for(const S of w.teams)for(const y of S.players)y.battleTag&&f.add(y.battleTag);const T=Date.now();for(let w=t.length-1;w>=0;w--){const S=t[w],y=new Date(S.sent_at||S.sentAt).getTime();if(T-y>6e4)break;const E=S.battle_tag||S.battleTag;E&&f.delete(E)}return f},[i,t]),Oe=d.useMemo(()=>{const f=new Map;for(const T of i)for(const w of T.teams)for(const S of w.players)S.battleTag&&f.set(S.battleTag,`/player/${encodeURIComponent(S.battleTag)}`);return f},[i]);d.useEffect(()=>{const T=[...z.current].filter(w=>!_.has(w));z.current=new Set(_);for(const w of T)ae(w).then(S=>{var y;(y=S==null?void 0:S.session)!=null&&y.form&&o(E=>{const O=new Map(E);return O.set(w,S.session.form),O})})},[_]);const ee=d.useMemo(()=>{const f=new Set;for(const T of t){const w=T.battle_tag||T.battleTag;w&&f.add(w)}for(const T of a)T.battleTag&&f.add(T.battleTag);return f},[t,a]);return d.useEffect(()=>{const f=[];for(const T of ee)x.current.has(T)||(x.current.add(T),f.push(T));if(f.length!==0)for(const T of f)Je(T).then(w=>{c(S=>{const y=new Map(S);return y.set(T,w),y})}),Ge(T).then(w=>{w&&m(S=>{const y=new Map(S);return y.set(T,w),y})}),ae(T).then(w=>{var S;(S=w==null?void 0:w.session)!=null&&S.form&&o(y=>{const E=new Map(y);return E.set(T,w.session.form),E})})},[ee]),e.jsxs(Mr,{children:[e.jsxs(Cr,{children:[e.jsx(er,{matches:i,finishedMatches:N,$mobileVisible:j,onClose:()=>F(!1),borderTheme:R}),e.jsx(Bt,{messages:t,status:r,avatars:s,stats:l,sessions:$,inGameTags:_,recentWinners:C,borderTheme:R}),e.jsx(Sr,{users:a,avatars:s,stats:l,inGameTags:_,inGameMatchMap:Oe,recentWinners:C,$mobileVisible:g,onClose:()=>b(!1),borderTheme:R})]}),e.jsx(Tr,{onClick:()=>h(f=>!f),title:"Change border theme",children:e.jsx(We,{})}),I&&e.jsx(zr,{children:Ze.map(f=>e.jsxs(Ir,{$active:f.id===v,onClick:()=>B(f.id),children:[e.jsx(Dr,{children:f.name}),e.jsx(Fr,{children:f.desc})]},f.id))}),!j&&!g&&e.jsxs(e.Fragment,{children:[e.jsx($e,{$left:"var(--space-4)",onClick:()=>F(!0),children:e.jsx(Q,{})}),e.jsx($e,{$right:"var(--space-4)",onClick:()=>b(!0),children:e.jsx(Ve,{})})]})]})};export{Er as default};
