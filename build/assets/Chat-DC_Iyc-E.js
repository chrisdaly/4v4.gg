import{J as ee,a as l,j as e,R as le,C as De,E as n,r as V,D as Ee,L as q,n as Re,u as Ge,M as Ve,K as ce,N as Ae,d as Xe,P as de,m as qe,Q as Qe}from"./index-DRkeA8z1.js";import{G as ie}from"./index-CiiLvZ-0.js";function We(t){return ee({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{fillRule:"evenodd",d:"M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z",clipRule:"evenodd"},child:[]}]})(t)}function Ze(t){return ee({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}function et(t){return ee({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{fill:"none",strokeMiterlimit:"10",strokeWidth:"32",d:"M430.11 347.9c-6.6-6.1-16.3-7.6-24.6-9-11.5-1.9-15.9-4-22.6-10-14.3-12.7-14.3-31.1 0-43.8l30.3-26.9c46.4-41 46.4-108.2 0-149.2-34.2-30.1-80.1-45-127.8-45-55.7 0-113.9 20.3-158.8 60.1-83.5 73.8-83.5 194.7 0 268.5 41.5 36.7 97.5 55 152.9 55.4h1.7c55.4 0 110-17.9 148.8-52.4 14.4-12.7 11.99-36.6.1-47.7z"},child:[]},{tag:"circle",attr:{cx:"144",cy:"208",r:"32"},child:[]},{tag:"circle",attr:{cx:"152",cy:"311",r:"32"},child:[]},{tag:"circle",attr:{cx:"224",cy:"144",r:"32"},child:[]},{tag:"circle",attr:{cx:"256",cy:"367",r:"48"},child:[]},{tag:"circle",attr:{cx:"328",cy:"144",r:"32"},child:[]}]})(t)}function pe(t){return ee({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8z"},child:[]}]})(t)}const re="https://4v4gg-chat-relay.fly.dev",ge=500;function tt(){const[t,r]=l.useState([]),[o,s]=l.useState("connecting"),[c,d]=l.useState([]),u=l.useRef(null),$=l.useCallback(i=>{r(g=>{const p=new Set(g.map(k=>k.id)),b=i.filter(k=>!p.has(k.id));if(b.length===0)return g;const j=[...g,...b];return j.length>ge?j.slice(j.length-ge):j})},[]);l.useEffect(()=>{let i=!1;fetch(`${re}/api/chat/messages?limit=100`).then(p=>p.json()).then(p=>{i||$(p.reverse())}).catch(()=>{});const g=new EventSource(`${re}/api/chat/stream`);return u.current=g,g.addEventListener("history",p=>{if(i)return;const b=JSON.parse(p.data);$(b)}),g.addEventListener("message",p=>{if(i)return;const b=JSON.parse(p.data);$([b])}),g.addEventListener("delete",p=>{if(i)return;const{id:b}=JSON.parse(p.data);r(j=>j.filter(k=>k.id!==b))}),g.addEventListener("bulk_delete",p=>{if(i)return;const{ids:b}=JSON.parse(p.data),j=new Set(b);r(k=>k.filter(M=>!j.has(M.id)))}),g.addEventListener("users_init",p=>{i||d(JSON.parse(p.data))}),g.addEventListener("user_joined",p=>{if(i)return;const b=JSON.parse(p.data);d(j=>j.some(k=>k.battleTag===b.battleTag)?j:[...j,b])}),g.addEventListener("user_left",p=>{if(i)return;const{battleTag:b}=JSON.parse(p.data);d(j=>j.filter(k=>k.battleTag!==b))}),g.addEventListener("status",p=>{if(i)return;const{state:b}=JSON.parse(p.data);s(b==="Connected"?"connected":b)}),g.addEventListener("heartbeat",()=>{i||s("connected")}),g.onopen=()=>{i||s("connected")},g.onerror=()=>{i||s("reconnecting")},()=>{i=!0,g.close()}},[$]);const m=l.useCallback(async(i,g)=>{const p=await fetch(`${re}/api/admin/send`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":g},body:JSON.stringify({message:i})});if(!p.ok){const b=await p.json().catch(()=>({}));throw new Error(b.error||`Send failed (${p.status})`)}},[]);return{messages:t,status:o,onlineUsers:c,sendMessage:m}}const oe={ironforge:{id:"ironforge",name:"Ironforge",desc:"Heavy dark metal with rivets",border:"16px solid transparent",borderImage:'url("/frames/launcher/Maon_Border.png") 120 / 16px stretch',bg:"rgba(10, 8, 6, 0.4)",headerBg:"rgba(10, 8, 6, 0.3)",blur:"blur(2px)",shadow:"none"},bevel:{id:"bevel",name:"Bevel",desc:"Raised gold-edged panel",border:"2px solid #b8860b",borderImage:"none",bg:"linear-gradient(180deg, rgba(252, 219, 51, 0.04) 0%, rgba(0, 0, 0, 0.12) 100%)",headerBg:"rgba(10, 8, 6, 0.3)",blur:"blur(1px)",shadow:"inset 1px 1px 0 rgba(252, 219, 51, 0.25), inset -1px -1px 0 rgba(0, 0, 0, 0.45), 0 2px 8px rgba(0, 0, 0, 0.5)"},human:{id:"human",name:"Human",desc:"Stone frame with gold trim",border:"28px solid transparent",borderImage:'url("/frames/fansite-kit/human-borders.png") 60 / 28px stretch',bg:"rgba(10, 8, 6, 0.45)",headerBg:"rgba(10, 8, 6, 0.35)",blur:"none",shadow:"none",backgroundImg:"/backgrounds/human.jpg"},orc:{id:"orc",name:"Orc",desc:"Dark wood with metal bolts",border:"30px solid transparent",borderImage:'url("/frames/fansite-kit/orb-borders.png") 65 / 30px stretch',bg:"rgba(10, 8, 6, 0.45)",headerBg:"rgba(10, 8, 6, 0.35)",blur:"none",shadow:"none",backgroundImg:"/backgrounds/orc.jpg"},nightElf:{id:"nightElf",name:"Night Elf",desc:"Green vine foliage frame",border:"30px solid transparent",borderImage:'url("/frames/fansite-kit/elf-borders.png") 65 / 30px stretch',bg:"rgba(10, 15, 8, 0.45)",headerBg:"rgba(10, 15, 8, 0.35)",blur:"none",shadow:"none",backgroundImg:"/backgrounds/nightelf.jpg"},undead:{id:"undead",name:"Undead",desc:"Ornate dark with purple gems",border:"30px solid transparent",borderImage:'url("/frames/fansite-kit/undead-borders.png") 65 / 30px stretch',bg:"rgba(12, 8, 15, 0.45)",headerBg:"rgba(12, 8, 15, 0.35)",blur:"none",shadow:"none",backgroundImg:"/backgrounds/undead.jpg"}},Le="chatBorderTheme",ae="ironforge";function rt(){try{return localStorage.getItem(Le)||ae}catch{return ae}}function nt(t){try{localStorage.setItem(Le,t)}catch{}}function ot(t){return oe[t]||oe[ae]}const at=Object.values(oe),se="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",it=n.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,st=n.div`
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
`,lt=n.div`
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
`,ct=n(q)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,dt=n.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,pt=n.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t=>t.$connected?"var(--green)":"var(--grey-mid)"};
  ${t=>t.$connected&&"animation: pulse 1.5s infinite;"}
`,gt=n.div`
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
`,ht=n.div`
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
`,mt=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,ft=n.div`
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
`,xt=n.span`
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
`,ut=n.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,he=n.img`
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
`,bt=n.div`
  min-width: 0;
`,vt=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,yt=n.span`
  display: inline-flex;
  align-items: center;
`,wt=n.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,jt=n(q)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,kt=n.div`
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
`,$t=n.div`
  position: relative;
  display: inline-block;
`,St=n.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,Mt=n.div`
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
`,Ct=n.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,Tt=n.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`,zt=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,It=n.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,Dt=n.span`
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
`,Et=n(ie)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`,me=n.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 14px;
    line-height: 1.5;
  }
`,Rt=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,At=n.button`
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
`,Lt=n.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,fe=n.div`
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
`,xe=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`,Ft=n.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,Bt=n.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-2);
  color: #e0e0e0;
  font-family: var(--font-body);
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }

  &:disabled {
    opacity: 0.5;
  }
`,ue=n.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(160, 130, 80, 0.3);
  border-radius: var(--radius-sm);
  background: rgba(252, 219, 51, 0.08);
  color: var(--gold);
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.15);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
`,Ut=n.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  background: ${t=>t.$active?"rgba(252, 219, 51, 0.1)":"transparent"};
  color: ${t=>t.$active?"var(--gold)":"var(--grey-mid)"};
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: rgba(160, 130, 80, 0.4);
  }
`,_t=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,Nt=n.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2) var(--space-2);
  color: #e0e0e0;
  font-family: var(--font-mono);
  font-size: 12px;
  outline: none;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
  }
`,be=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  white-space: nowrap;
`,Ot=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Pt=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ve(t){const r=new Date(t),o=new Date;if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return"Today";const c=new Date(o);return c.setDate(c.getDate()-1),r.getDate()===c.getDate()&&r.getMonth()===c.getMonth()&&r.getFullYear()===c.getFullYear()?"Yesterday":r.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function ye(t){const r=new Date(t);return`${r.getFullYear()}-${r.getMonth()}-${r.getDate()}`}function Ht(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function Yt(t){const r=new Date(t),o=new Date,s=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return s;const d=new Date(o);return d.setDate(d.getDate()-1),r.getDate()===d.getDate()&&r.getMonth()===d.getMonth()&&r.getFullYear()===d.getFullYear()?`Yesterday ${s}`:`${r.getMonth()+1}/${r.getDate()}/${String(r.getFullYear()).slice(2)} ${s}`}function Kt(t,r,o){var u;const s=(u=r==null?void 0:r.get(t))==null?void 0:u.profilePicUrl;if(s)return e.jsx(ut,{src:s,alt:""});const c=o==null?void 0:o.get(t),d=(c==null?void 0:c.race)!=null?V[c.race]:null;return d?e.jsx(he,{src:d,alt:""}):e.jsx(he,{src:Ee.random,alt:"",$faded:!0})}const ne="chat_admin_key";function Jt({messages:t,status:r,avatars:o,stats:s,sessions:c,inGameTags:d,recentWinners:u,borderTheme:$,sendMessage:m}){const i=l.useRef(null),g=l.useRef(null),[p,b]=l.useState(!0),[j,k]=l.useState(!1),[M,O]=l.useState(()=>localStorage.getItem(ne)||""),[B,E]=l.useState(!1),[D,R]=l.useState(""),[L,x]=l.useState(!1),[w,C]=l.useState(null),S=l.useCallback(async T=>{var z;if(T.preventDefault(),!(!D.trim()||!M||L||!m)){x(!0),C(null);try{await m(D.trim(),M),R(""),(z=g.current)==null||z.focus()}catch(a){C(a.message)}finally{x(!1)}}},[D,M,L,m]);function U(T){var a,h,f;T.preventDefault();const z=(f=(h=(a=T.target.elements)==null?void 0:a.apiKeyInput)==null?void 0:h.value)==null?void 0:f.trim();z&&(localStorage.setItem(ne,z),O(z)),E(!1)}function H(){localStorage.removeItem(ne),O(""),E(!1)}const P=l.useMemo(()=>{const T=[];for(let z=0;z<t.length;z++){const a=t[z],h=a.battle_tag||a.battleTag;let f=z===0;if(!f){const v=t[z-1];if((v.battle_tag||v.battleTag)!==h)f=!0;else{const I=new Date(v.sent_at||v.sentAt).getTime();new Date(a.sent_at||a.sentAt).getTime()-I>120*1e3&&(f=!0)}}f?T.push({start:a,continuations:[]}):T.length>0&&T[T.length-1].continuations.push(a)}return T},[t]);l.useEffect(()=>{p&&i.current?i.current.scrollTop=i.current.scrollHeight:!p&&t.length>0&&k(!0)},[t,p]);function Y(){const T=i.current;if(!T)return;const z=T.scrollHeight-T.scrollTop-T.clientHeight<40;b(z),z&&k(!1)}function G(){i.current&&(i.current.scrollTop=i.current.scrollHeight),b(!0),k(!1)}return e.jsxs(it,{children:[e.jsxs(lt,{$theme:$,children:[e.jsx(ct,{to:"/",children:"4v4 Chat"}),e.jsxs(dt,{children:[e.jsx(pt,{$connected:r==="connected"}),r==="connected"?t.length:"Connecting..."]})]}),e.jsx(st,{$theme:$,children:t.length===0?e.jsx(Pt,{children:r==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(Lt,{children:[e.jsx(gt,{ref:i,onScroll:Y,children:P.map((T,z)=>{var _,K,X;const a=T.start,h=a.battle_tag||a.battleTag,f=a.user_name||a.userName,v=a.sent_at||a.sentAt,y=ye(v);let I=z===0;if(!I&&z>0){const N=P[z-1].start,A=N.sent_at||N.sentAt;I=ye(A)!==y}return!h||h==="system"?e.jsxs(le.Fragment,{children:[I&&e.jsx(fe,{children:e.jsx(xe,{children:ve(v)})}),e.jsx(Rt,{children:a.message})]},a.id):e.jsxs(le.Fragment,{children:[I&&e.jsx(fe,{children:e.jsx(xe,{children:ve(v)})}),e.jsxs(ht,{children:[e.jsxs(kt,{children:[e.jsxs($t,{children:[Kt(h,o,s),((_=o==null?void 0:o.get(h))==null?void 0:_.country)&&e.jsx(St,{children:e.jsx(De,{name:o.get(h).country.toLowerCase()})})]}),(((K=s==null?void 0:s.get(h))==null?void 0:K.mmr)!=null||(c==null?void 0:c.get(h)))&&e.jsxs(Mt,{children:[((X=s==null?void 0:s.get(h))==null?void 0:X.mmr)!=null&&e.jsxs(Ct,{children:[e.jsx(Tt,{children:Math.round(s.get(h).mmr)}),e.jsx(zt,{children:"MMR"})]}),(c==null?void 0:c.get(h))&&e.jsx(It,{children:c.get(h).map((N,A)=>e.jsx(Dt,{$win:N},A))})]})]}),e.jsx(mt,{children:e.jsxs(bt,{children:[e.jsx("div",{children:e.jsxs(yt,{children:[e.jsx(jt,{to:`/player/${encodeURIComponent(h)}`,children:f}),(d==null?void 0:d.has(h))&&e.jsx(Et,{}),(u==null?void 0:u.has(h))&&e.jsx(wt,{src:se,alt:""}),e.jsx(vt,{children:Yt(a.sent_at||a.sentAt)})]})}),e.jsx(me,{children:a.message})]})}),T.continuations.map(N=>e.jsxs(ft,{children:[e.jsx(xt,{className:"hover-timestamp",children:Ht(N.sent_at||N.sentAt)}),e.jsx(me,{children:N.message})]},N.id))]})]},a.id)})}),j&&e.jsx(At,{onClick:G,children:"New messages below"})]})}),m&&B&&!M&&e.jsxs(_t,{as:"form",onSubmit:U,children:[e.jsx(be,{children:"API Key:"}),e.jsx(Nt,{name:"apiKeyInput",type:"password",placeholder:"Enter admin API key",autoFocus:!0}),e.jsx(ue,{type:"submit",children:e.jsx(pe,{size:14})})]}),m&&(M||!B)&&e.jsxs(Ft,{onSubmit:S,children:[e.jsx(Ut,{type:"button",$active:!!M,onClick:()=>M?H():E(!0),title:M?"Clear API key":"Set API key",children:e.jsx(We,{size:16})}),M?e.jsxs(e.Fragment,{children:[e.jsx(Bt,{ref:g,type:"text",placeholder:"Send a message...",value:D,onChange:T=>{R(T.target.value),C(null)},disabled:L,maxLength:500}),w&&e.jsx(Ot,{title:w,children:"!"}),e.jsx(ue,{type:"submit",disabled:L||!D.trim(),children:e.jsx(pe,{size:14})})]}):e.jsx(be,{children:"Set API key to send messages"})]})]})}const Gt=n.aside`
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
`,Vt=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,Xt=n.div`
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
`,qt=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Qt=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Wt=n.button`
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
`,Zt=n.button`
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
`,er=n.div`
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
`,tr=n.div`
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
`,rr=n(q)`
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
`,Fe=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`,Be=n.img`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,Ue=n.div`
  flex: 1;
  min-width: 0;
`,_e=n.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Ne=n.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
`,Oe=n.span`
  font-family: var(--font-mono);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
`,Pe=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`,He=n.div`
  width: 80px;
  flex-shrink: 0;
  align-self: stretch;
  padding: var(--space-2) 0;
  box-sizing: border-box;
`,Ye=n.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
`,nr=n.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,Ke=n.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-6) var(--space-3);
  gap: 0;
`,we=n.div`
  flex: 1;
  min-width: 0;
`,Q=n.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-direction: ${t=>t.$reverse?"row-reverse":"row"};

  &:last-child {
    margin-bottom: 0;
  }
`,W=n.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`,Z=n.span`
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
`,or=Ae`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,ar=Ae`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,ir=n(q)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${or} 8s ease forwards;
`,sr=n.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${ar} 2s ease-out forwards;
`,lr=n.div`
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
`,je=n.div`
  flex: 1;
  min-width: 0;
`,ke=n.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function $e(t){var s;const o=(t.teams||((s=t.match)==null?void 0:s.teams)||[]).flatMap(c=>{var d;return((d=c.players)==null?void 0:d.map(u=>u.oldMmr||0))||[]});return o.length>0?o.reduce((c,d)=>c+d,0)/o.length:0}function cr({startTime:t}){const[r,o]=l.useState(()=>ce(t));return l.useEffect(()=>{const s=setInterval(()=>{o(ce(t))},1e3);return()=>clearInterval(s)},[t]),e.jsxs(Ye,{children:[e.jsx(nr,{}),r]})}function dr({match:t}){var M,O,B,E,D,R,L,x;const r=Ge(),o=t.mapName||((M=t.match)==null?void 0:M.mapName),s=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",c=Re(o),d=t.teams||((O=t.match)==null?void 0:O.teams)||[],u=t.startTime||((B=t.match)==null?void 0:B.startTime),$=d[0],m=d[1],i=((E=$==null?void 0:$.players)==null?void 0:E.map(w=>w.oldMmr||0))||[],g=((D=m==null?void 0:m.players)==null?void 0:D.map(w=>w.oldMmr||0))||[],p=[...i,...g],b=p.length>0?Math.round(p.reduce((w,C)=>w+C,0)/p.length):null,j={teamOneMmrs:i,teamTwoMmrs:g},k=t.id||((R=t.match)==null?void 0:R.id);return e.jsxs(rr,{to:k?`/match/${k}`:"/",children:[e.jsxs(Fe,{children:[c&&e.jsx(Be,{src:c,alt:""}),e.jsxs(Ue,{children:[e.jsx(_e,{children:s}),b!=null&&e.jsxs(Ne,{children:[e.jsx(Oe,{children:b}),e.jsx(Pe,{children:"MMR"})]}),u&&e.jsx(cr,{startTime:u})]})]}),e.jsxs(Ke,{children:[e.jsx(we,{$team:1,children:(L=$==null?void 0:$.players)==null?void 0:L.map((w,C)=>e.jsxs(Q,{children:[e.jsx(W,{src:V[w.race],alt:""}),e.jsx(Z,{onClick:S=>{S.preventDefault(),S.stopPropagation(),r.push(`/player/${encodeURIComponent(w.battleTag)}`)},children:w.name})]},C))}),e.jsx(He,{children:e.jsx(Ve,{data:j,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(we,{$team:2,children:(x=m==null?void 0:m.players)==null?void 0:x.map((w,C)=>e.jsxs(Q,{$reverse:!0,children:[e.jsx(W,{src:V[w.race],alt:""}),e.jsx(Z,{$right:!0,onClick:S=>{S.preventDefault(),S.stopPropagation(),r.push(`/player/${encodeURIComponent(w.battleTag)}`)},children:w.name})]},C))})]})]})}function pr({match:t}){var E,D,R,L,x,w,C;const r=t.mapName||((E=t.match)==null?void 0:E.mapName),o=(r==null?void 0:r.replace(/^\(\d\)\s*/,""))||"Unknown",s=Re(r),c=t.teams||((D=t.match)==null?void 0:D.teams)||[],d=t._winnerTeam,u=t.durationInSeconds,$=u?`${Math.floor(u/60)}:${String(u%60).padStart(2,"0")}`:null,m=c[0],i=c[1],g=((R=m==null?void 0:m.players)==null?void 0:R.map(S=>S.oldMmr||0))||[],p=((L=i==null?void 0:i.players)==null?void 0:L.map(S=>S.oldMmr||0))||[],b=[...g,...p],j=b.length>0?Math.round(b.reduce((S,U)=>S+U,0)/b.length):null,k=t.id||((x=t.match)==null?void 0:x.id),M=d===0?je:ke,O=d===1?je:ke,B=d===0?"25%":"75%";return e.jsxs(ir,{to:k?`/match/${k}`:"/",style:{"--crown-end-x":B},children:[e.jsx(lr,{}),d!=null&&e.jsx(sr,{src:se,alt:""}),e.jsxs(Fe,{children:[s&&e.jsx(Be,{src:s,alt:""}),e.jsxs(Ue,{children:[e.jsx(_e,{children:o}),j!=null&&e.jsxs(Ne,{children:[e.jsx(Oe,{children:j}),e.jsx(Pe,{children:"MMR"})]}),$&&e.jsx(Ye,{children:$})]})]}),e.jsxs(Ke,{children:[e.jsx(M,{children:(w=m==null?void 0:m.players)==null?void 0:w.map((S,U)=>e.jsxs(Q,{children:[e.jsx(W,{src:V[S.race],alt:""}),e.jsx(Z,{children:S.name})]},U))}),e.jsx(He,{}),e.jsx(O,{children:(C=i==null?void 0:i.players)==null?void 0:C.map((S,U)=>e.jsxs(Q,{$reverse:!0,children:[e.jsx(W,{src:V[S.race],alt:""}),e.jsx(Z,{$right:!0,children:S.name})]},U))})]})]})}function gr({matches:t=[],finishedMatches:r=[],$mobileVisible:o,onClose:s,borderTheme:c}){const[d,u]=l.useState("mmr"),$=l.useMemo(()=>{const m=[...t];return d==="mmr"?m.sort((i,g)=>$e(g)-$e(i)):m.sort((i,g)=>{var j,k;const p=new Date(i.startTime||((j=i.match)==null?void 0:j.startTime)||0).getTime();return new Date(g.startTime||((k=g.match)==null?void 0:k.startTime)||0).getTime()-p}),m},[t,d]);return e.jsx(Gt,{$mobileVisible:o,children:e.jsxs(Xt,{$theme:c,children:[e.jsxs(Vt,{$theme:c,children:[e.jsx(qt,{children:"Active Games"}),e.jsx(Qt,{children:t.length}),e.jsx(Wt,{onClick:()=>u(m=>m==="mmr"?"recent":"mmr"),children:d==="mmr"?"MMR":"Recent"}),e.jsx(Zt,{onClick:s,children:"×"})]}),$.length===0&&r.length===0?e.jsx(tr,{children:"No active games"}):e.jsxs(er,{children:[r.map(m=>e.jsx(pr,{match:m},`fin-${m.id}`)),$.map(m=>{var i;return e.jsx(dr,{match:m},m.id||((i=m.match)==null?void 0:i.id))})]})]})})}const hr=n.aside`
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
`,mr=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,fr=n.div`
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
`,xr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,ur=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,br=n.button`
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
`,vr=n.div`
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
`,yr=n.input`
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
`,wr=n.button`
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
`,jr=n.div`
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
`,Je=n.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,kr=n(Je)`
  flex: 1;
`,$r=n(Je)`
  flex-shrink: 0;
`,Sr=n.div`
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
`,Mr=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,Cr=n(q)`
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
`,Tr=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,zr=n.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,Ir=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,Se=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,Dr=n(ie)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,Er=n.img.attrs({src:se,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,Rr=n.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,Ar=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,Lr=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,Me=n.div`
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
`,Ce=n.span`
  color: var(--gold);
`,Te=n.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function Fr(t,r,o){var u;const s=(u=r==null?void 0:r.get(t))==null?void 0:u.profilePicUrl;if(s)return e.jsx(Ir,{src:s,alt:""});const c=o==null?void 0:o.get(t),d=(c==null?void 0:c.race)!=null?V[c.race]:null;return d?e.jsx(Se,{src:d,alt:""}):e.jsx(Se,{src:Ee.random,alt:"",$faded:!0})}function ze({user:t,avatars:r,stats:o,inGame:s,matchUrl:c,isRecentWinner:d}){var p;const u=o==null?void 0:o.get(t.battleTag),$=u==null?void 0:u.mmr,m=(u==null?void 0:u.race)!=null?V[u.race]:null,i=(p=r==null?void 0:r.get(t.battleTag))==null?void 0:p.country,g=e.jsxs(e.Fragment,{children:[e.jsxs(Tr,{children:[Fr(t.battleTag,r,o),i&&e.jsx(zr,{children:e.jsx(De,{name:i.toLowerCase(),style:{width:14,height:10}})})]}),s&&e.jsx(Dr,{}),d&&e.jsx(Er,{}),m&&e.jsx(Rr,{src:m,alt:""}),e.jsx(Ar,{children:t.name}),$!=null&&e.jsx(Lr,{children:Math.round($)})]});return c?e.jsx(Cr,{to:c,children:g}):e.jsx(Mr,{children:g})}function Br({users:t,avatars:r,stats:o,inGameTags:s,inGameMatchMap:c,recentWinners:d,$mobileVisible:u,onClose:$,borderTheme:m}){const[i,g]=l.useState(""),[p,b]=l.useState("mmr"),[j,k]=l.useState(!0),[M,O]=l.useState(!0);function B(x){b(x)}const E=l.useMemo(()=>[...t].sort((x,w)=>{var U,H;if(p==="live"){const P=s!=null&&s.has(x.battleTag)?1:0,Y=s!=null&&s.has(w.battleTag)?1:0;if(P!==Y)return Y-P}if(p==="name"){const P=(x.name||"").localeCompare(w.name||"",void 0,{sensitivity:"base"});if(P!==0)return P}const C=((U=o==null?void 0:o.get(x.battleTag))==null?void 0:U.mmr)??-1,S=((H=o==null?void 0:o.get(w.battleTag))==null?void 0:H.mmr)??-1;return C!==S?S-C:(x.name||"").localeCompare(w.name||"",void 0,{sensitivity:"base"})}),[t,o,s,p]),D=l.useMemo(()=>{if(!i.trim())return E;const x=i.toLowerCase();return E.filter(w=>(w.name||"").toLowerCase().includes(x))},[E,i]),{inGameUsers:R,onlineUsers:L}=l.useMemo(()=>{const x=[],w=[];for(const C of D)s!=null&&s.has(C.battleTag)?x.push(C):w.push(C);return{inGameUsers:x,onlineUsers:w}},[D,s]);return e.jsx(hr,{$mobileVisible:u,children:e.jsxs(fr,{$theme:m,children:[e.jsxs(mr,{$theme:m,children:[e.jsx(xr,{children:"Channel"}),e.jsx(ur,{children:t.length}),e.jsx(br,{onClick:$,children:"×"})]}),e.jsxs(vr,{children:[e.jsx(yr,{type:"text",placeholder:"Search players...",value:i,onChange:x=>g(x.target.value)}),i&&e.jsx(wr,{onClick:()=>g(""),children:"×"})]}),e.jsxs(jr,{children:[e.jsx(kr,{$active:p==="name",onClick:()=>B("name"),children:"Player"}),e.jsx($r,{$active:p==="mmr",onClick:()=>B("mmr"),children:"MMR"})]}),e.jsxs(Sr,{children:[R.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(Me,{onClick:()=>k(x=>!x),children:[e.jsx(Te,{$open:j,children:"▶"}),"In Game — ",e.jsx(Ce,{children:R.length})]}),j&&R.map(x=>e.jsx(ze,{user:x,avatars:r,stats:o,inGame:!0,matchUrl:c==null?void 0:c.get(x.battleTag),isRecentWinner:d==null?void 0:d.has(x.battleTag)},x.battleTag))]}),e.jsxs(Me,{onClick:()=>O(x=>!x),children:[e.jsx(Te,{$open:M,children:"▶"}),"Online — ",e.jsx(Ce,{children:L.length})]}),M&&L.map(x=>e.jsx(ze,{user:x,avatars:r,stats:o,inGame:!1,matchUrl:null,isRecentWinner:d==null?void 0:d.has(x.battleTag)},x.battleTag))]})]})})}const Ur="/frames/launcher/Static_Background.png",_r=n.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background: url(${t=>t.$bgImg||Ur}) center / cover no-repeat fixed;
    z-index: -2;
    transition: background-image 0.4s ease;
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
`,Nr=n.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`,Ie=n.button`
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
`,Or=n.button`
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
`,Pr=n.div`
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
`,Hr=n.button`
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
`,Yr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-xxs);
`,Kr=n.span`
  font-size: 10px;
  opacity: 0.6;
`,Vr=()=>{const{messages:t,status:r,onlineUsers:o,sendMessage:s}=tt(),[c,d]=l.useState(new Map),[u,$]=l.useState(new Map),[m,i]=l.useState(new Map),[g,p]=l.useState([]),[b,j]=l.useState(!1),[k,M]=l.useState(!1),[O,B]=l.useState([]),[E,D]=l.useState(new Set),[R,L]=l.useState(rt),[x,w]=l.useState(!1),C=l.useRef(new Set),S=l.useRef(new Set),U=l.useRef(new Set),H=l.useMemo(()=>ot(R),[R]);function P(a){L(a),nt(a)}const Y=l.useCallback(async()=>{try{const a=await Xe();p(a.matches||[])}catch{}},[]);l.useEffect(()=>{Y();const a=setInterval(Y,3e4);return()=>clearInterval(a)},[Y]),l.useEffect(()=>{const a=new Set(g.map(y=>{var I;return y.id||((I=y.match)==null?void 0:I.id)})),f=[...U.current].filter(y=>y&&!a.has(y));if(U.current=a,f.length===0)return;console.log("[GameEnd] Detected ended matches:",f);async function v(y,I=0){var X,N;console.log(`[GameEnd] Fetching result for ${y}, attempt ${I}`);let _;try{const A=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(y)}`);if(!A.ok)return;const F=await A.json();_=F==null?void 0:F.match}catch{return}if(!_)return;const K=(X=_.teams)==null?void 0:X.findIndex(A=>{var F;return(F=A.players)==null?void 0:F.some(J=>J.won===!0||J.won===1)});if(K<0&&I<3){setTimeout(()=>v(y,I+1),5e3);return}if(K>=0){const A=((N=_.teams[K].players)==null?void 0:N.map(F=>F.battleTag).filter(Boolean))||[];A.length>0&&(D(F=>{const J=new Set(F);return A.forEach(te=>J.add(te)),J}),setTimeout(()=>{D(F=>{const J=new Set(F);return A.forEach(te=>J.delete(te)),J})},12e4))}B(A=>[...A,{..._,id:y,_winnerTeam:K>=0?K:null,_finishedAt:Date.now()}]),setTimeout(()=>{B(A=>A.filter(F=>F.id!==y))},8e3)}for(const y of f)setTimeout(()=>v(y),5e3)},[g]);const G=l.useMemo(()=>{const a=new Set;for(const f of g)for(const v of f.teams)for(const y of v.players)y.battleTag&&a.add(y.battleTag);const h=Date.now();for(let f=t.length-1;f>=0;f--){const v=t[f],y=new Date(v.sent_at||v.sentAt).getTime();if(h-y>6e4)break;const I=v.battle_tag||v.battleTag;I&&a.delete(I)}return a},[g,t]),T=l.useMemo(()=>{const a=new Map;for(const h of g)for(const f of h.teams)for(const v of f.players)v.battleTag&&a.set(v.battleTag,`/player/${encodeURIComponent(v.battleTag)}`);return a},[g]);l.useEffect(()=>{const h=[...S.current].filter(f=>!G.has(f));S.current=new Set(G);for(const f of h)de(f).then(v=>{var y;(y=v==null?void 0:v.session)!=null&&y.form&&i(I=>{const _=new Map(I);return _.set(f,v.session.form),_})})},[G]);const z=l.useMemo(()=>{const a=new Set;for(const h of t){const f=h.battle_tag||h.battleTag;f&&a.add(f)}for(const h of o)h.battleTag&&a.add(h.battleTag);return a},[t,o]);return l.useEffect(()=>{const a=[];for(const h of z)C.current.has(h)||(C.current.add(h),a.push(h));if(a.length!==0)for(const h of a)qe(h).then(f=>{d(v=>{const y=new Map(v);return y.set(h,f),y})}),Qe(h).then(f=>{f&&$(v=>{const y=new Map(v);return y.set(h,f),y})}),de(h).then(f=>{var v;(v=f==null?void 0:f.session)!=null&&v.form&&i(y=>{const I=new Map(y);return I.set(h,f.session.form),I})})},[z]),e.jsxs(_r,{$bgImg:H.backgroundImg,children:[e.jsxs(Nr,{children:[e.jsx(gr,{matches:g,finishedMatches:O,$mobileVisible:k,onClose:()=>M(!1),borderTheme:H}),e.jsx(Jt,{messages:t,status:r,avatars:c,stats:u,sessions:m,inGameTags:G,recentWinners:E,borderTheme:H,sendMessage:s}),e.jsx(Br,{users:o,avatars:c,stats:u,inGameTags:G,inGameMatchMap:T,recentWinners:E,$mobileVisible:b,onClose:()=>j(!1),borderTheme:H})]}),e.jsx(Or,{onClick:()=>w(a=>!a),title:"Change border theme",children:e.jsx(et,{})}),x&&e.jsx(Pr,{children:at.map(a=>e.jsxs(Hr,{$active:a.id===R,onClick:()=>P(a.id),children:[e.jsx(Yr,{children:a.name}),e.jsx(Kr,{children:a.desc})]},a.id))}),!k&&!b&&e.jsxs(e.Fragment,{children:[e.jsx(Ie,{$left:"var(--space-4)",onClick:()=>M(!0),children:e.jsx(ie,{})}),e.jsx(Ie,{$right:"var(--space-4)",onClick:()=>j(!0),children:e.jsx(Ze,{})})]})]})};export{Vr as default};
