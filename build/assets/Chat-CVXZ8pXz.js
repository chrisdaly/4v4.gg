import{K as re,a as i,j as e,R as Z,C as De,H as n,r as J,E as Le,L as X,G as ne,n as Ae,u as Ve,M as Ge,N as se,P as Ee,Q as Xe,d as qe,S as ie,m as Qe,T as We}from"./index-CAUlyqcI.js";function Ze(t){return re({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{fillRule:"evenodd",d:"M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z",clipRule:"evenodd"},child:[]}]})(t)}function et(t){return re({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}const ee="https://4v4gg-chat-relay.fly.dev",le=500;function tt(){const[t,r]=i.useState([]),[o,s]=i.useState("connecting"),[c,l]=i.useState([]),[b,I]=i.useState([]),h=i.useRef(null),x=i.useCallback(g=>{r(p=>{const d=new Set(p.map(j=>j.id)),u=g.filter(j=>!d.has(j.id));if(u.length===0)return p;const w=[...p,...u];return w.length>le?w.slice(w.length-le):w})},[]);i.useEffect(()=>{let g=!1;fetch(`${ee}/api/chat/messages?limit=100`).then(d=>d.json()).then(d=>{g||x(d.reverse())}).catch(()=>{});const p=new EventSource(`${ee}/api/chat/stream`);return h.current=p,p.addEventListener("history",d=>{if(g)return;const u=JSON.parse(d.data);x(u)}),p.addEventListener("message",d=>{if(g)return;const u=JSON.parse(d.data);x([u])}),p.addEventListener("delete",d=>{if(g)return;const{id:u}=JSON.parse(d.data);r(w=>w.filter(j=>j.id!==u))}),p.addEventListener("bulk_delete",d=>{if(g)return;const{ids:u}=JSON.parse(d.data),w=new Set(u);r(j=>j.filter(E=>!w.has(E.id)))}),p.addEventListener("users_init",d=>{g||l(JSON.parse(d.data))}),p.addEventListener("user_joined",d=>{if(g)return;const u=JSON.parse(d.data);l(w=>w.some(j=>j.battleTag===u.battleTag)?w:[...w,u])}),p.addEventListener("user_left",d=>{if(g)return;const{battleTag:u}=JSON.parse(d.data);l(w=>w.filter(j=>j.battleTag!==u))}),p.addEventListener("bot_response",d=>{if(g)return;const u=JSON.parse(d.data);I(w=>[...w.slice(-49),u])}),p.addEventListener("status",d=>{if(g)return;const{state:u}=JSON.parse(d.data);s(u==="Connected"?"connected":u)}),p.addEventListener("heartbeat",()=>{g||s("connected")}),p.onopen=()=>{g||s("connected")},p.onerror=()=>{g||s("reconnecting")},()=>{g=!0,p.close()}},[x]);const M=i.useCallback(async(g,p)=>{const d=await fetch(`${ee}/api/admin/send`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":p},body:JSON.stringify({message:g})});if(!d.ok){const u=await d.json().catch(()=>({}));throw new Error(u.error||`Send failed (${d.status})`)}},[]);return{messages:t,status:o,onlineUsers:c,botResponses:b,sendMessage:M}}function ce(t){return re({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8z"},child:[]}]})(t)}const oe="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",rt=n.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,nt=n.div`
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
`,ot=n.div`
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
`,at=n(X)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,st=n.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,it=n.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t=>t.$connected?"var(--green)":"var(--grey-mid)"};
  ${t=>t.$connected&&"animation: pulse 1.5s infinite;"}
`,lt=n.div`
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
`,ct=n.div`
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
`,dt=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,pt=n.div`
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
`,gt=n.span`
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
`,ht=n.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,de=n.img`
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
`,ft=n.div`
  min-width: 0;
`,mt=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,xt=n.span`
  display: inline-flex;
  align-items: center;
`,ut=n.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,vt=n(X)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,bt=n.div`
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
`,yt=n.div`
  position: relative;
  display: inline-block;
`,wt=n.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,jt=n.div`
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
`,$t=n.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,St=n.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`,kt=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,Mt=n.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,Ct=n.span`
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
`,Tt=n(ne)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`,pe=n.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 14px;
    line-height: 1.5;
  }
`,zt=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,It=n.button`
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
`,Rt=n.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,ge=n.div`
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
`,he=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`,Dt=n.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,Lt=n.input`
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
`,fe=n.button`
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
`,At=n.button`
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
`,Et=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,Ft=n.input`
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
`,me=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  white-space: nowrap;
`,Bt=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,xe=n.div`
  margin: 4px 0 4px 84px;
  padding: 6px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(252, 219, 51, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;

  @media (max-width: 480px) {
    margin-left: 66px;
  }
`,ue=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
`,ve=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.7;
`,be=n.pre`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #ccc;
  margin: 2px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
`,Ut=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ye(t){const r=new Date(t),o=new Date;if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return"Today";const c=new Date(o);return c.setDate(c.getDate()-1),r.getDate()===c.getDate()&&r.getMonth()===c.getMonth()&&r.getFullYear()===c.getFullYear()?"Yesterday":r.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function we(t){const r=new Date(t);return`${r.getFullYear()}-${r.getMonth()}-${r.getDate()}`}function Nt(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function _t(t){const r=new Date(t),o=new Date,s=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return s;const l=new Date(o);return l.setDate(l.getDate()-1),r.getDate()===l.getDate()&&r.getMonth()===l.getMonth()&&r.getFullYear()===l.getFullYear()?`Yesterday ${s}`:`${r.getMonth()+1}/${r.getDate()}/${String(r.getFullYear()).slice(2)} ${s}`}function Ot(t,r,o){var b;const s=(b=r==null?void 0:r.get(t))==null?void 0:b.profilePicUrl;if(s)return e.jsx(ht,{src:s,alt:""});const c=o==null?void 0:o.get(t),l=(c==null?void 0:c.race)!=null?J[c.race]:null;return l?e.jsx(de,{src:l,alt:""}):e.jsx(de,{src:Le.random,alt:"",$faded:!0})}const te="chat_admin_key";function Pt({messages:t,status:r,avatars:o,stats:s,sessions:c,inGameTags:l,recentWinners:b,botResponses:I=[],borderTheme:h,sendMessage:x}){const M=i.useRef(null),g=i.useRef(null),[p,d]=i.useState(!0),[u,w]=i.useState(!1),[j,E]=i.useState(()=>localStorage.getItem(te)||""),[U,F]=i.useState(!1),[L,N]=i.useState(""),[f,y]=i.useState(!1),[R,C]=i.useState(null),A=i.useCallback(async a=>{var v;if(a.preventDefault(),!(!L.trim()||!j||f||!x)){y(!0),C(null);try{await x(L.trim(),j),N(""),(v=g.current)==null||v.focus()}catch(m){C(m.message)}finally{y(!1)}}},[L,j,f,x]);function V(a){var m,k,_;a.preventDefault();const v=(_=(k=(m=a.target.elements)==null?void 0:m.apiKeyInput)==null?void 0:k.value)==null?void 0:_.trim();v&&(localStorage.setItem(te,v),E(v)),F(!1)}function Y(){localStorage.removeItem(te),E(""),F(!1)}const S=i.useMemo(()=>{const a=new Map;for(const v of I)for(let m=t.length-1;m>=0;m--){const k=t[m];if((k.battle_tag||k.battleTag)===v.triggeredByTag&&k.message.toLowerCase().startsWith(v.command)){a.set(k.id,v);break}}return a},[I,t]),z=i.useMemo(()=>{const a=[];for(let v=0;v<t.length;v++){const m=t[v],k=m.battle_tag||m.battleTag;let _=v===0;if(!_){const P=t[v-1];if((P.battle_tag||P.battleTag)!==k)_=!0;else{const D=new Date(P.sent_at||P.sentAt).getTime();new Date(m.sent_at||m.sentAt).getTime()-D>120*1e3&&(_=!0)}}_?a.push({start:m,continuations:[]}):a.length>0&&a[a.length-1].continuations.push(m)}return a},[t]);i.useEffect(()=>{p&&M.current?M.current.scrollTop=M.current.scrollHeight:!p&&t.length>0&&w(!0)},[t,p]);function $(){const a=M.current;if(!a)return;const v=a.scrollHeight-a.scrollTop-a.clientHeight<40;d(v),v&&w(!1)}function T(){M.current&&(M.current.scrollTop=M.current.scrollHeight),d(!0),w(!1)}return e.jsxs(rt,{children:[e.jsxs(ot,{$theme:h,children:[e.jsx(at,{to:"/",children:"4v4 Chat"}),e.jsxs(st,{children:[e.jsx(it,{$connected:r==="connected"}),r==="connected"?t.length:"Connecting..."]})]}),e.jsx(nt,{$theme:h,children:t.length===0?e.jsx(Ut,{children:r==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(Rt,{children:[e.jsx(lt,{ref:M,onScroll:$,children:z.map((a,v)=>{var O,G,ae;const m=a.start,k=m.battle_tag||m.battleTag,_=m.user_name||m.userName,P=m.sent_at||m.sentAt,B=we(P);let D=v===0;if(!D&&v>0){const H=z[v-1].start,K=H.sent_at||H.sentAt;D=we(K)!==B}return!k||k==="system"?e.jsxs(Z.Fragment,{children:[D&&e.jsx(ge,{children:e.jsx(he,{children:ye(P)})}),e.jsx(zt,{children:m.message})]},m.id):e.jsxs(Z.Fragment,{children:[D&&e.jsx(ge,{children:e.jsx(he,{children:ye(P)})}),e.jsxs(ct,{children:[e.jsxs(bt,{children:[e.jsxs(yt,{children:[Ot(k,o,s),((O=o==null?void 0:o.get(k))==null?void 0:O.country)&&e.jsx(wt,{children:e.jsx(De,{name:o.get(k).country.toLowerCase()})})]}),(((G=s==null?void 0:s.get(k))==null?void 0:G.mmr)!=null||(c==null?void 0:c.get(k)))&&e.jsxs(jt,{children:[((ae=s==null?void 0:s.get(k))==null?void 0:ae.mmr)!=null&&e.jsxs($t,{children:[e.jsx(St,{children:Math.round(s.get(k).mmr)}),e.jsx(kt,{children:"MMR"})]}),(c==null?void 0:c.get(k))&&e.jsx(Mt,{children:c.get(k).map((H,K)=>e.jsx(Ct,{$win:H},K))})]})]}),e.jsx(dt,{children:e.jsxs(ft,{children:[e.jsx("div",{children:e.jsxs(xt,{children:[e.jsx(vt,{to:`/player/${encodeURIComponent(k)}`,children:_}),(l==null?void 0:l.has(k))&&e.jsx(Tt,{}),(b==null?void 0:b.has(k))&&e.jsx(ut,{src:oe,alt:""}),e.jsx(mt,{children:_t(m.sent_at||m.sentAt)})]})}),e.jsx(pe,{children:m.message})]})}),S.has(m.id)&&e.jsxs(xe,{children:[e.jsx(ue,{children:"BOT"}),!S.get(m.id).botEnabled&&e.jsx(ve,{children:"(preview)"}),e.jsx(be,{children:S.get(m.id).response})]}),a.continuations.map(H=>{const K=S.get(H.id);return e.jsxs(Z.Fragment,{children:[e.jsxs(pt,{children:[e.jsx(gt,{className:"hover-timestamp",children:Nt(H.sent_at||H.sentAt)}),e.jsx(pe,{children:H.message})]}),K&&e.jsxs(xe,{children:[e.jsx(ue,{children:"BOT"}),!K.botEnabled&&e.jsx(ve,{children:"(preview)"}),e.jsx(be,{children:K.response})]})]},H.id)})]})]},m.id)})}),u&&e.jsx(It,{onClick:T,children:"New messages below"})]})}),x&&U&&!j&&e.jsxs(Et,{as:"form",onSubmit:V,children:[e.jsx(me,{children:"API Key:"}),e.jsx(Ft,{name:"apiKeyInput",type:"password",placeholder:"Enter admin API key",autoFocus:!0}),e.jsx(fe,{type:"submit",children:e.jsx(ce,{size:14})})]}),x&&(j||!U)&&e.jsxs(Dt,{onSubmit:A,children:[e.jsx(At,{type:"button",$active:!!j,onClick:()=>j?Y():F(!0),title:j?"Clear API key":"Set API key",children:e.jsx(Ze,{size:16})}),j?e.jsxs(e.Fragment,{children:[e.jsx(Lt,{ref:g,type:"text",placeholder:"Send a message...",value:L,onChange:a=>{N(a.target.value),C(null)},disabled:f,maxLength:500}),R&&e.jsx(Bt,{title:R,children:"!"}),e.jsx(fe,{type:"submit",disabled:f||!L.trim(),children:e.jsx(ce,{size:14})})]}):e.jsx(me,{children:"Set API key to send messages"})]})]})}const Yt=n.aside`
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
`,Ht=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,Kt=n.div`
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
`,Jt=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Vt=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Gt=n.button`
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
`,Xt=n.button`
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
`,qt=n.div`
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
`,Qt=n.div`
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
`,Wt=n(X)`
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
`,Ne=n.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,_e=n.div`
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
`,Ye=n.div`
  width: 80px;
  flex-shrink: 0;
  align-self: stretch;
  padding: var(--space-2) 0;
  box-sizing: border-box;
`,He=n.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
`,Zt=n.span`
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
`,je=n.div`
  flex: 1;
  min-width: 0;
`,q=n.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-direction: ${t=>t.$reverse?"row-reverse":"row"};

  &:last-child {
    margin-bottom: 0;
  }
`,Q=n.img`
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
`,er=Ee`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,tr=Ee`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,rr=n(X)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${er} 8s ease forwards;
`,nr=n.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${tr} 2s ease-out forwards;
`,or=n.div`
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
`,$e=n.div`
  flex: 1;
  min-width: 0;
`,Se=n.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function ke(t){var s;const o=(t.teams||((s=t.match)==null?void 0:s.teams)||[]).flatMap(c=>{var l;return((l=c.players)==null?void 0:l.map(b=>b.oldMmr||0))||[]});return o.length>0?o.reduce((c,l)=>c+l,0)/o.length:0}function ar({startTime:t}){const[r,o]=i.useState(()=>se(t));return i.useEffect(()=>{const s=setInterval(()=>{o(se(t))},1e3);return()=>clearInterval(s)},[t]),e.jsxs(He,{children:[e.jsx(Zt,{}),r]})}function sr({match:t}){var w,j,E,U,F,L,N,f;const r=Ve(),o=t.mapName||((w=t.match)==null?void 0:w.mapName),s=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",c=Ae(o),l=t.teams||((j=t.match)==null?void 0:j.teams)||[],b=t.startTime||((E=t.match)==null?void 0:E.startTime),I=l[0],h=l[1],x=((U=I==null?void 0:I.players)==null?void 0:U.map(y=>y.oldMmr||0))||[],M=((F=h==null?void 0:h.players)==null?void 0:F.map(y=>y.oldMmr||0))||[],g=[...x,...M],p=g.length>0?Math.round(g.reduce((y,R)=>y+R,0)/g.length):null,d={teamOneMmrs:x,teamTwoMmrs:M},u=t.id||((L=t.match)==null?void 0:L.id);return e.jsxs(Wt,{to:u?`/match/${u}`:"/",children:[e.jsxs(Fe,{children:[c&&e.jsx(Be,{src:c,alt:""}),e.jsxs(Ue,{children:[e.jsx(Ne,{children:s}),p!=null&&e.jsxs(_e,{children:[e.jsx(Oe,{children:p}),e.jsx(Pe,{children:"MMR"})]}),b&&e.jsx(ar,{startTime:b})]})]}),e.jsxs(Ke,{children:[e.jsx(je,{$team:1,children:(N=I==null?void 0:I.players)==null?void 0:N.map((y,R)=>e.jsxs(q,{children:[e.jsx(Q,{src:J[y.race],alt:""}),e.jsx(W,{onClick:C=>{C.preventDefault(),C.stopPropagation(),r.push(`/player/${encodeURIComponent(y.battleTag)}`)},children:y.name})]},R))}),e.jsx(Ye,{children:e.jsx(Ge,{data:d,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(je,{$team:2,children:(f=h==null?void 0:h.players)==null?void 0:f.map((y,R)=>e.jsxs(q,{$reverse:!0,children:[e.jsx(Q,{src:J[y.race],alt:""}),e.jsx(W,{$right:!0,onClick:C=>{C.preventDefault(),C.stopPropagation(),r.push(`/player/${encodeURIComponent(y.battleTag)}`)},children:y.name})]},R))})]})]})}function ir({match:t}){var U,F,L,N,f,y,R;const r=t.mapName||((U=t.match)==null?void 0:U.mapName),o=(r==null?void 0:r.replace(/^\(\d\)\s*/,""))||"Unknown",s=Ae(r),c=t.teams||((F=t.match)==null?void 0:F.teams)||[],l=t._winnerTeam,b=t.durationInSeconds,I=b?`${Math.floor(b/60)}:${String(b%60).padStart(2,"0")}`:null,h=c[0],x=c[1],M=((L=h==null?void 0:h.players)==null?void 0:L.map(C=>C.oldMmr||0))||[],g=((N=x==null?void 0:x.players)==null?void 0:N.map(C=>C.oldMmr||0))||[],p=[...M,...g],d=p.length>0?Math.round(p.reduce((C,A)=>C+A,0)/p.length):null,u=t.id||((f=t.match)==null?void 0:f.id),w=l===0?$e:Se,j=l===1?$e:Se,E=l===0?"25%":"75%";return e.jsxs(rr,{to:u?`/match/${u}`:"/",style:{"--crown-end-x":E},children:[e.jsx(or,{}),l!=null&&e.jsx(nr,{src:oe,alt:""}),e.jsxs(Fe,{children:[s&&e.jsx(Be,{src:s,alt:""}),e.jsxs(Ue,{children:[e.jsx(Ne,{children:o}),d!=null&&e.jsxs(_e,{children:[e.jsx(Oe,{children:d}),e.jsx(Pe,{children:"MMR"})]}),I&&e.jsx(He,{children:I})]})]}),e.jsxs(Ke,{children:[e.jsx(w,{children:(y=h==null?void 0:h.players)==null?void 0:y.map((C,A)=>e.jsxs(q,{children:[e.jsx(Q,{src:J[C.race],alt:""}),e.jsx(W,{children:C.name})]},A))}),e.jsx(Ye,{}),e.jsx(j,{children:(R=x==null?void 0:x.players)==null?void 0:R.map((C,A)=>e.jsxs(q,{$reverse:!0,children:[e.jsx(Q,{src:J[C.race],alt:""}),e.jsx(W,{$right:!0,children:C.name})]},A))})]})]})}function lr({matches:t=[],finishedMatches:r=[],$mobileVisible:o,onClose:s,borderTheme:c}){const[l,b]=i.useState("mmr"),I=i.useMemo(()=>{const h=[...t];return l==="mmr"?h.sort((x,M)=>ke(M)-ke(x)):h.sort((x,M)=>{var d,u;const g=new Date(x.startTime||((d=x.match)==null?void 0:d.startTime)||0).getTime();return new Date(M.startTime||((u=M.match)==null?void 0:u.startTime)||0).getTime()-g}),h},[t,l]);return e.jsx(Yt,{$mobileVisible:o,children:e.jsxs(Kt,{$theme:c,children:[e.jsxs(Ht,{$theme:c,children:[e.jsx(Jt,{children:"Active Games"}),e.jsx(Vt,{children:t.length}),e.jsx(Gt,{onClick:()=>b(h=>h==="mmr"?"recent":"mmr"),children:l==="mmr"?"MMR":"Recent"}),e.jsx(Xt,{onClick:s,children:"×"})]}),I.length===0&&r.length===0?e.jsx(Qt,{children:"No active games"}):e.jsxs(qt,{children:[r.map(h=>e.jsx(ir,{match:h},`fin-${h.id}`)),I.map(h=>{var x;return e.jsx(sr,{match:h},h.id||((x=h.match)==null?void 0:x.id))})]})]})})}const cr=n.aside`
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
`,dr=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,pr=n.div`
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
`,gr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,hr=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,fr=n.button`
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
`,mr=n.div`
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
`,xr=n.input`
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
`,ur=n.button`
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
`,vr=n.div`
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
`,br=n(Je)`
  flex: 1;
`,yr=n(Je)`
  flex-shrink: 0;
`,wr=n.div`
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
`,jr=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,$r=n(X)`
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
`,Sr=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,kr=n.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,Mr=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,Me=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,Cr=n(ne)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,Tr=n.img.attrs({src:oe,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,zr=n.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,Ir=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,Rr=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,Ce=n.div`
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
`,Te=n.span`
  color: var(--gold);
`,ze=n.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function Dr(t,r,o){var b;const s=(b=r==null?void 0:r.get(t))==null?void 0:b.profilePicUrl;if(s)return e.jsx(Mr,{src:s,alt:""});const c=o==null?void 0:o.get(t),l=(c==null?void 0:c.race)!=null?J[c.race]:null;return l?e.jsx(Me,{src:l,alt:""}):e.jsx(Me,{src:Le.random,alt:"",$faded:!0})}function Ie({user:t,avatars:r,stats:o,inGame:s,matchUrl:c,isRecentWinner:l}){var g;const b=o==null?void 0:o.get(t.battleTag),I=b==null?void 0:b.mmr,h=(b==null?void 0:b.race)!=null?J[b.race]:null,x=(g=r==null?void 0:r.get(t.battleTag))==null?void 0:g.country,M=e.jsxs(e.Fragment,{children:[e.jsxs(Sr,{children:[Dr(t.battleTag,r,o),x&&e.jsx(kr,{children:e.jsx(De,{name:x.toLowerCase(),style:{width:14,height:10}})})]}),s&&e.jsx(Cr,{}),l&&e.jsx(Tr,{}),h&&e.jsx(zr,{src:h,alt:""}),e.jsx(Ir,{children:t.name}),I!=null&&e.jsx(Rr,{children:Math.round(I)})]});return c?e.jsx($r,{to:c,children:M}):e.jsx(jr,{children:M})}function Lr({users:t,avatars:r,stats:o,inGameTags:s,inGameMatchMap:c,recentWinners:l,$mobileVisible:b,onClose:I,borderTheme:h}){const[x,M]=i.useState(""),[g,p]=i.useState("mmr"),[d,u]=i.useState(!0),[w,j]=i.useState(!0);function E(f){p(f)}const U=i.useMemo(()=>[...t].sort((f,y)=>{var A,V;if(g==="live"){const Y=s!=null&&s.has(f.battleTag)?1:0,S=s!=null&&s.has(y.battleTag)?1:0;if(Y!==S)return S-Y}if(g==="name"){const Y=(f.name||"").localeCompare(y.name||"",void 0,{sensitivity:"base"});if(Y!==0)return Y}const R=((A=o==null?void 0:o.get(f.battleTag))==null?void 0:A.mmr)??-1,C=((V=o==null?void 0:o.get(y.battleTag))==null?void 0:V.mmr)??-1;return R!==C?C-R:(f.name||"").localeCompare(y.name||"",void 0,{sensitivity:"base"})}),[t,o,s,g]),F=i.useMemo(()=>{if(!x.trim())return U;const f=x.toLowerCase();return U.filter(y=>(y.name||"").toLowerCase().includes(f))},[U,x]),{inGameUsers:L,onlineUsers:N}=i.useMemo(()=>{const f=[],y=[];for(const R of F)s!=null&&s.has(R.battleTag)?f.push(R):y.push(R);return{inGameUsers:f,onlineUsers:y}},[F,s]);return e.jsx(cr,{$mobileVisible:b,children:e.jsxs(pr,{$theme:h,children:[e.jsxs(dr,{$theme:h,children:[e.jsx(gr,{children:"Channel"}),e.jsx(hr,{children:t.length}),e.jsx(fr,{onClick:I,children:"×"})]}),e.jsxs(mr,{children:[e.jsx(xr,{type:"text",placeholder:"Search players...",value:x,onChange:f=>M(f.target.value)}),x&&e.jsx(ur,{onClick:()=>M(""),children:"×"})]}),e.jsxs(vr,{children:[e.jsx(br,{$active:g==="name",onClick:()=>E("name"),children:"Player"}),e.jsx(yr,{$active:g==="mmr",onClick:()=>E("mmr"),children:"MMR"})]}),e.jsxs(wr,{children:[L.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(Ce,{onClick:()=>u(f=>!f),children:[e.jsx(ze,{$open:d,children:"▶"}),"In Game — ",e.jsx(Te,{children:L.length})]}),d&&L.map(f=>e.jsx(Ie,{user:f,avatars:r,stats:o,inGame:!0,matchUrl:c==null?void 0:c.get(f.battleTag),isRecentWinner:l==null?void 0:l.has(f.battleTag)},f.battleTag))]}),e.jsxs(Ce,{onClick:()=>j(f=>!f),children:[e.jsx(ze,{$open:w,children:"▶"}),"Online — ",e.jsx(Te,{children:N.length})]}),w&&N.map(f=>e.jsx(Ie,{user:f,avatars:r,stats:o,inGame:!1,matchUrl:null,isRecentWinner:l==null?void 0:l.has(f.battleTag)},f.battleTag))]})]})})}const Ar=n.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  @media (max-width: 768px) {
    padding: 0;
  }
`,Er=n.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`,Re=n.button`
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
`,Br=()=>{const{messages:t,status:r,onlineUsers:o,botResponses:s,sendMessage:c}=tt(),{borderTheme:l}=Xe(),[b,I]=i.useState(new Map),[h,x]=i.useState(new Map),[M,g]=i.useState(new Map),[p,d]=i.useState([]),[u,w]=i.useState(!1),[j,E]=i.useState(!1),[U,F]=i.useState([]),[L,N]=i.useState(new Set),f=i.useRef(new Set),y=i.useRef(new Set),R=i.useRef(new Set),C=i.useCallback(async()=>{try{const S=await qe();d(S.matches||[])}catch{}},[]);i.useEffect(()=>{C();const S=setInterval(C,3e4);return()=>clearInterval(S)},[C]),i.useEffect(()=>{const S=new Set(p.map(a=>{var v;return a.id||((v=a.match)==null?void 0:v.id)})),$=[...R.current].filter(a=>a&&!S.has(a));if(R.current=S,$.length===0)return;console.log("[GameEnd] Detected ended matches:",$);async function T(a,v=0){var _,P;console.log(`[GameEnd] Fetching result for ${a}, attempt ${v}`);let m;try{const B=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(a)}`);if(!B.ok)return;const D=await B.json();m=D==null?void 0:D.match}catch{return}if(!m)return;const k=(_=m.teams)==null?void 0:_.findIndex(B=>{var D;return(D=B.players)==null?void 0:D.some(O=>O.won===!0||O.won===1)});if(k<0&&v<3){setTimeout(()=>T(a,v+1),5e3);return}if(k>=0){const B=((P=m.teams[k].players)==null?void 0:P.map(D=>D.battleTag).filter(Boolean))||[];B.length>0&&(N(D=>{const O=new Set(D);return B.forEach(G=>O.add(G)),O}),setTimeout(()=>{N(D=>{const O=new Set(D);return B.forEach(G=>O.delete(G)),O})},12e4))}F(B=>[...B,{...m,id:a,_winnerTeam:k>=0?k:null,_finishedAt:Date.now()}]),setTimeout(()=>{F(B=>B.filter(D=>D.id!==a))},8e3)}for(const a of $)setTimeout(()=>T(a),5e3)},[p]);const A=i.useMemo(()=>{const S=new Set;for(const $ of p)for(const T of $.teams)for(const a of T.players)a.battleTag&&S.add(a.battleTag);const z=Date.now();for(let $=t.length-1;$>=0;$--){const T=t[$],a=new Date(T.sent_at||T.sentAt).getTime();if(z-a>6e4)break;const v=T.battle_tag||T.battleTag;v&&S.delete(v)}return S},[p,t]),V=i.useMemo(()=>{const S=new Map;for(const z of p)for(const $ of z.teams)for(const T of $.players)T.battleTag&&S.set(T.battleTag,`/player/${encodeURIComponent(T.battleTag)}`);return S},[p]);i.useEffect(()=>{const z=[...y.current].filter($=>!A.has($));y.current=new Set(A);for(const $ of z)ie($).then(T=>{var a;(a=T==null?void 0:T.session)!=null&&a.form&&g(v=>{const m=new Map(v);return m.set($,T.session.form),m})})},[A]);const Y=i.useMemo(()=>{const S=new Set;for(const z of t){const $=z.battle_tag||z.battleTag;$&&S.add($)}for(const z of o)z.battleTag&&S.add(z.battleTag);return S},[t,o]);return i.useEffect(()=>{const S=[];for(const z of Y)f.current.has(z)||(f.current.add(z),S.push(z));if(S.length!==0)for(const z of S)Qe(z).then($=>{I(T=>{const a=new Map(T);return a.set(z,$),a})}),We(z).then($=>{$&&x(T=>{const a=new Map(T);return a.set(z,$),a})}),ie(z).then($=>{var T;(T=$==null?void 0:$.session)!=null&&T.form&&g(a=>{const v=new Map(a);return v.set(z,$.session.form),v})})},[Y]),e.jsxs(Ar,{children:[e.jsxs(Er,{children:[e.jsx(lr,{matches:p,finishedMatches:U,$mobileVisible:j,onClose:()=>E(!1),borderTheme:l}),e.jsx(Pt,{messages:t,status:r,avatars:b,stats:h,sessions:M,inGameTags:A,recentWinners:L,botResponses:s,borderTheme:l,sendMessage:c}),e.jsx(Lr,{users:o,avatars:b,stats:h,inGameTags:A,inGameMatchMap:V,recentWinners:L,$mobileVisible:u,onClose:()=>w(!1),borderTheme:l})]}),!j&&!u&&e.jsxs(e.Fragment,{children:[e.jsx(Re,{$left:"var(--space-4)",onClick:()=>E(!0),children:e.jsx(ne,{})}),e.jsx(Re,{$right:"var(--space-4)",onClick:()=>w(!0),children:e.jsx(et,{})})]})]})};export{Br as default};
