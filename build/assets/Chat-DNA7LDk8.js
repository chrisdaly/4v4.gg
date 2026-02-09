import{u as Je,r as a,j as e,R as te,C as Re,v as n,h as V,t as De,L as Z,G as se,w as Ie,x as Ke,M as Ve,y as de,z as Le,A as Ge,m as Xe,B as pe,s as qe,D as We}from"./index-DgCB13An.js";function Qe(t){return Je({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}const re="https://4v4gg-chat-relay.fly.dev",ge=500;function Ze(){const[t,r]=a.useState([]),[o,s]=a.useState("connecting"),[l,i]=a.useState([]),[x,L]=a.useState([]),p=a.useRef(null),m=a.useCallback(g=>{r(d=>{const c=new Set(d.map(D=>D.id)),h=g.filter(D=>!c.has(D.id));if(h.length===0)return d;const b=[...d,...h];return b.length>ge?b.slice(b.length-ge):b})},[]);a.useEffect(()=>{let g=!1;fetch(`${re}/api/chat/messages?limit=100`).then(c=>c.json()).then(c=>{g||m(c.reverse())}).catch(()=>{});const d=new EventSource(`${re}/api/chat/stream`);return p.current=d,d.addEventListener("history",c=>{if(g)return;const h=JSON.parse(c.data);m(h)}),d.addEventListener("message",c=>{if(g)return;const h=JSON.parse(c.data);m([h])}),d.addEventListener("delete",c=>{if(g)return;const{id:h}=JSON.parse(c.data);r(b=>b.filter(D=>D.id!==h))}),d.addEventListener("bulk_delete",c=>{if(g)return;const{ids:h}=JSON.parse(c.data),b=new Set(h);r(D=>D.filter(U=>!b.has(U.id)))}),d.addEventListener("users_init",c=>{g||i(JSON.parse(c.data))}),d.addEventListener("user_joined",c=>{if(g)return;const h=JSON.parse(c.data);i(b=>b.some(D=>D.battleTag===h.battleTag)?b:[...b,h])}),d.addEventListener("user_left",c=>{if(g)return;const{battleTag:h}=JSON.parse(c.data);i(b=>b.filter(D=>D.battleTag!==h))}),d.addEventListener("bot_response",c=>{if(g)return;const h=JSON.parse(c.data);L(b=>[...b.slice(-49),h])}),d.addEventListener("status",c=>{if(g)return;const{state:h}=JSON.parse(c.data);s(h==="Connected"?"connected":h)}),d.addEventListener("heartbeat",()=>{g||s("connected")}),d.onopen=()=>{g||s("connected")},d.onerror=()=>{g||s("reconnecting")},()=>{g=!0,d.close()}},[m]);const M=a.useCallback(async(g,d)=>{const c=await fetch(`${re}/api/admin/send`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":d},body:JSON.stringify({message:g})});if(!c.ok){const h=await c.json().catch(()=>({}));throw new Error(h.error||`Send failed (${c.status})`)}},[]);return{messages:t,status:o,onlineUsers:l,botResponses:x,sendMessage:M}}const ie="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",et=n.div`
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
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;

  @media (max-width: 480px) {
    padding: 10px var(--space-2);
  }
`,nt=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
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
`,st=n.div`
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
`,it=n.div`
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
`,gt=n.div`
  min-width: 0;
`,ht=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,ft=n.span`
  display: inline-flex;
  align-items: center;
`,mt=n.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,xt=n(Z)`
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
`,vt=n.div`
  position: relative;
  display: inline-block;
`,bt=n.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,yt=n.div`
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
`,wt=n.div`
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
`,Mt=n(se)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`,fe=n.span`
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
`,me=n.div`
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
`;n.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;n.input`
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
`;n.button`
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
`;n.button`
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
`;n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`;n.input`
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
`;n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  white-space: nowrap;
`;n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;const ne=n.div`
  margin: 4px 0 4px 84px;
  padding: 6px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(252, 219, 51, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;

  @media (max-width: 480px) {
    margin-left: 66px;
  }
`,oe=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
`,X=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.7;
`,ae=n.pre`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #ccc;
  margin: 2px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
`;n.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  background: rgba(252, 219, 51, 0.03);
  border-top: 1px solid rgba(252, 219, 51, 0.1);
  flex-shrink: 0;
`;n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--gold);
  opacity: 0.7;
`;n.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(252, 219, 51, 0.15);
  border-radius: var(--radius-sm);
  padding: 5px var(--space-2);
  color: #e0e0e0;
  font-family: var(--font-mono);
  font-size: 13px;
  outline: none;
  transition: border-color 0.15s;

  &:focus {
    border-color: rgba(252, 219, 51, 0.4);
  }

  &::placeholder {
    color: var(--grey-mid);
    font-size: 11px;
  }

  &:disabled {
    opacity: 0.5;
  }
`;const Rt=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ue(t){const r=new Date(t),o=new Date;if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return"Today";const l=new Date(o);return l.setDate(l.getDate()-1),r.getDate()===l.getDate()&&r.getMonth()===l.getMonth()&&r.getFullYear()===l.getFullYear()?"Yesterday":r.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function ve(t){const r=new Date(t);return`${r.getFullYear()}-${r.getMonth()}-${r.getDate()}`}function Dt(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function It(t){const r=new Date(t),o=new Date,s=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return s;const i=new Date(o);return i.setDate(i.getDate()-1),r.getDate()===i.getDate()&&r.getMonth()===i.getMonth()&&r.getFullYear()===i.getFullYear()?`Yesterday ${s}`:`${r.getMonth()+1}/${r.getDate()}/${String(r.getFullYear()).slice(2)} ${s}`}function Lt(t,r,o){var x;const s=(x=r==null?void 0:r.get(t))==null?void 0:x.profilePicUrl;if(s)return e.jsx(pt,{src:s,alt:""});const l=o==null?void 0:o.get(t),i=(l==null?void 0:l.race)!=null?V[l.race]:null;return i?e.jsx(he,{src:i,alt:""}):e.jsx(he,{src:De.random,alt:"",$faded:!0})}const Et="https://4v4gg-chat-relay.fly.dev",be="chat_admin_key";function Ft({messages:t,status:r,avatars:o,stats:s,sessions:l,inGameTags:i,recentWinners:x,botResponses:L=[],borderTheme:p,sendMessage:m}){const M=a.useRef(null),g=a.useRef(null),[d,c]=a.useState(!0),[h,b]=a.useState(!1),[D,U]=a.useState(()=>localStorage.getItem(be)||""),[N,_]=a.useState(!1),[A,O]=a.useState(""),[f,v]=a.useState(!1),[E,C]=a.useState(null),[F,G]=a.useState(""),[P,T]=a.useState(!1);a.useCallback(async u=>{var j;if(u.preventDefault(),!(!A.trim()||!D||f||!m)){v(!0),C(null);try{await m(A.trim(),D),O(""),(j=g.current)==null||j.focus()}catch($){C($.message)}finally{v(!1)}}},[A,D,f,m]),a.useCallback(async u=>{u.preventDefault();const j=F.trim();if(!j||P)return;const $=j.startsWith("!")?j:`!${j}`;T(!0);try{const k=D||localStorage.getItem(be)||"",I=await fetch(`${Et}/api/admin/bot/test`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":k},body:JSON.stringify({command:$})});if(!I.ok){const S=await I.json().catch(()=>({}));throw new Error(S.error||`Failed (${I.status})`)}G("")}catch(k){C(k.message)}finally{T(!1)}},[F,D,P]);const{botResponseMap:z,unmatchedBotResponses:y}=a.useMemo(()=>{const u=new Map,j=new Set;for(const k of L)for(let I=t.length-1;I>=0;I--){const S=t[I];if((S.battle_tag||S.battleTag)===k.triggeredByTag&&S.message.toLowerCase().startsWith(k.command)){u.set(S.id,k),j.add(k);break}}const $=L.filter(k=>!j.has(k));return{botResponseMap:u,unmatchedBotResponses:$}},[L,t]),R=a.useMemo(()=>{const u=[];for(let j=0;j<t.length;j++){const $=t[j],k=$.battle_tag||$.battleTag;let I=j===0;if(!I){const S=t[j-1];if((S.battle_tag||S.battleTag)!==k)I=!0;else{const H=new Date(S.sent_at||S.sentAt).getTime();new Date($.sent_at||$.sentAt).getTime()-H>120*1e3&&(I=!0)}}I?u.push({start:$,continuations:[]}):u.length>0&&u[u.length-1].continuations.push($)}return u},[t]);a.useEffect(()=>{d&&M.current?M.current.scrollTop=M.current.scrollHeight:!d&&t.length>0&&b(!0)},[t,d]);function w(){const u=M.current;if(!u)return;const j=u.scrollHeight-u.scrollTop-u.clientHeight<40;c(j),j&&b(!1)}function B(){M.current&&(M.current.scrollTop=M.current.scrollHeight),c(!0),b(!1)}return e.jsxs(et,{children:[e.jsxs(tt,{$theme:p,children:[e.jsxs(rt,{$theme:p,children:[e.jsx(nt,{children:"4v4 Chat"}),e.jsxs(ot,{children:[e.jsx(at,{$connected:r==="connected"}),r==="connected"?t.length:"Connecting..."]})]}),t.length===0?e.jsx(Rt,{children:r==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(zt,{children:[e.jsxs(st,{ref:M,onScroll:w,children:[R.map((u,j)=>{var ee,le,ce;const $=u.start,k=$.battle_tag||$.battleTag,I=$.user_name||$.userName,S=$.sent_at||$.sentAt,Y=ve(S);let H=j===0;if(!H&&j>0){const J=R[j-1].start,K=J.sent_at||J.sentAt;H=ve(K)!==Y}return!k||k==="system"?e.jsxs(te.Fragment,{children:[H&&e.jsx(me,{children:e.jsx(xe,{children:ue(S)})}),e.jsx(Ct,{children:$.message})]},$.id):e.jsxs(te.Fragment,{children:[H&&e.jsx(me,{children:e.jsx(xe,{children:ue(S)})}),e.jsxs(it,{children:[e.jsxs(ut,{children:[e.jsxs(vt,{children:[Lt(k,o,s),((ee=o==null?void 0:o.get(k))==null?void 0:ee.country)&&e.jsx(bt,{children:e.jsx(Re,{name:o.get(k).country.toLowerCase()})})]}),(((le=s==null?void 0:s.get(k))==null?void 0:le.mmr)!=null||(l==null?void 0:l.get(k)))&&e.jsxs(yt,{children:[((ce=s==null?void 0:s.get(k))==null?void 0:ce.mmr)!=null&&e.jsxs(wt,{children:[e.jsx(jt,{children:Math.round(s.get(k).mmr)}),e.jsx($t,{children:"MMR"})]}),(l==null?void 0:l.get(k))&&e.jsx(kt,{children:l.get(k).map((J,K)=>e.jsx(St,{$win:J},K))})]})]}),e.jsx(lt,{children:e.jsxs(gt,{children:[e.jsx("div",{children:e.jsxs(ft,{children:[e.jsx(xt,{to:`/player/${encodeURIComponent(k)}`,children:I}),(i==null?void 0:i.has(k))&&e.jsx(Mt,{}),(x==null?void 0:x.has(k))&&e.jsx(mt,{src:ie,alt:""}),e.jsx(ht,{children:It($.sent_at||$.sentAt)})]})}),e.jsx(fe,{children:$.message})]})}),z.has($.id)&&e.jsxs(ne,{children:[e.jsx(oe,{children:"BOT"}),!z.get($.id).botEnabled&&e.jsx(X,{children:"(preview)"}),e.jsx(ae,{children:z.get($.id).response})]}),u.continuations.map(J=>{const K=z.get(J.id);return e.jsxs(te.Fragment,{children:[e.jsxs(ct,{children:[e.jsx(dt,{className:"hover-timestamp",children:Dt(J.sent_at||J.sentAt)}),e.jsx(fe,{children:J.message})]}),K&&e.jsxs(ne,{children:[e.jsx(oe,{children:"BOT"}),!K.botEnabled&&e.jsx(X,{children:"(preview)"}),e.jsx(ae,{children:K.response})]})]},J.id)})]})]},$.id)}),y.map((u,j)=>e.jsxs(ne,{style:{marginLeft:"var(--space-4)"},children:[e.jsx(oe,{children:"BOT"}),!u.botEnabled&&e.jsx(X,{children:"(preview)"}),e.jsx(X,{style:{marginLeft:6},children:u.command}),e.jsx(ae,{children:u.response})]},`bot-${j}`))]}),h&&e.jsx(Tt,{onClick:B,children:"New messages below"})]})]}),!1,!1,!1]})}const At=n.aside`
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
`,Bt=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,Ut=n.div`
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
`,Ot=n.span`
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
`,Yt=n.button`
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
`,Pt=n.div`
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
`,Jt=n(Z)`
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
`,Ee=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`,Fe=n.img`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,Ae=n.div`
  flex: 1;
  min-width: 0;
`,Be=n.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Ue=n.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
`,Oe=n.span`
  font-family: var(--font-mono);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
`,Ne=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`,_e=n.div`
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
`,Kt=n.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,Pe=n.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-6) var(--space-3);
  gap: 0;
`,ye=n.div`
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
`,W=n.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`,Q=n.span`
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
`,Vt=Le`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,Gt=Le`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,Xt=n(Z)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${Vt} 8s ease forwards;
`,qt=n.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${Gt} 2s ease-out forwards;
`,Wt=n.div`
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
`,we=n.div`
  flex: 1;
  min-width: 0;
`,je=n.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function $e(t){var s;const o=(t.teams||((s=t.match)==null?void 0:s.teams)||[]).flatMap(l=>{var i;return((i=l.players)==null?void 0:i.map(x=>x.oldMmr||0))||[]});return o.length>0?o.reduce((l,i)=>l+i,0)/o.length:0}function Qt({startTime:t}){const[r,o]=a.useState(()=>de(t));return a.useEffect(()=>{const s=setInterval(()=>{o(de(t))},1e3);return()=>clearInterval(s)},[t]),e.jsxs(Ye,{children:[e.jsx(Kt,{}),r]})}function Zt({match:t}){var b,D,U,N,_,A,O,f;const r=Ke(),o=t.mapName||((b=t.match)==null?void 0:b.mapName),s=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",l=Ie(o),i=t.teams||((D=t.match)==null?void 0:D.teams)||[],x=t.startTime||((U=t.match)==null?void 0:U.startTime),L=i[0],p=i[1],m=((N=L==null?void 0:L.players)==null?void 0:N.map(v=>v.oldMmr||0))||[],M=((_=p==null?void 0:p.players)==null?void 0:_.map(v=>v.oldMmr||0))||[],g=[...m,...M],d=g.length>0?Math.round(g.reduce((v,E)=>v+E,0)/g.length):null,c={teamOneMmrs:m,teamTwoMmrs:M},h=t.id||((A=t.match)==null?void 0:A.id);return e.jsxs(Jt,{to:h?`/match/${h}`:"/",children:[e.jsxs(Ee,{children:[l&&e.jsx(Fe,{src:l,alt:""}),e.jsxs(Ae,{children:[e.jsx(Be,{children:s}),d!=null&&e.jsxs(Ue,{children:[e.jsx(Oe,{children:d}),e.jsx(Ne,{children:"MMR"})]}),x&&e.jsx(Qt,{startTime:x})]})]}),e.jsxs(Pe,{children:[e.jsx(ye,{$team:1,children:(O=L==null?void 0:L.players)==null?void 0:O.map((v,E)=>e.jsxs(q,{children:[e.jsx(W,{src:V[v.race],alt:""}),e.jsx(Q,{onClick:C=>{C.preventDefault(),C.stopPropagation(),r.push(`/player/${encodeURIComponent(v.battleTag)}`)},children:v.name})]},E))}),e.jsx(_e,{children:e.jsx(Ve,{data:c,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(ye,{$team:2,children:(f=p==null?void 0:p.players)==null?void 0:f.map((v,E)=>e.jsxs(q,{$reverse:!0,children:[e.jsx(W,{src:V[v.race],alt:""}),e.jsx(Q,{$right:!0,onClick:C=>{C.preventDefault(),C.stopPropagation(),r.push(`/player/${encodeURIComponent(v.battleTag)}`)},children:v.name})]},E))})]})]})}function er({match:t}){var N,_,A,O,f,v,E;const r=t.mapName||((N=t.match)==null?void 0:N.mapName),o=(r==null?void 0:r.replace(/^\(\d\)\s*/,""))||"Unknown",s=Ie(r),l=t.teams||((_=t.match)==null?void 0:_.teams)||[],i=t._winnerTeam,x=t.durationInSeconds,L=x?`${Math.floor(x/60)}:${String(x%60).padStart(2,"0")}`:null,p=l[0],m=l[1],M=((A=p==null?void 0:p.players)==null?void 0:A.map(C=>C.oldMmr||0))||[],g=((O=m==null?void 0:m.players)==null?void 0:O.map(C=>C.oldMmr||0))||[],d=[...M,...g],c=d.length>0?Math.round(d.reduce((C,F)=>C+F,0)/d.length):null,h=t.id||((f=t.match)==null?void 0:f.id),b=i===0?we:je,D=i===1?we:je,U=i===0?"25%":"75%";return e.jsxs(Xt,{to:h?`/match/${h}`:"/",style:{"--crown-end-x":U},children:[e.jsx(Wt,{}),i!=null&&e.jsx(qt,{src:ie,alt:""}),e.jsxs(Ee,{children:[s&&e.jsx(Fe,{src:s,alt:""}),e.jsxs(Ae,{children:[e.jsx(Be,{children:o}),c!=null&&e.jsxs(Ue,{children:[e.jsx(Oe,{children:c}),e.jsx(Ne,{children:"MMR"})]}),L&&e.jsx(Ye,{children:L})]})]}),e.jsxs(Pe,{children:[e.jsx(b,{children:(v=p==null?void 0:p.players)==null?void 0:v.map((C,F)=>e.jsxs(q,{children:[e.jsx(W,{src:V[C.race],alt:""}),e.jsx(Q,{children:C.name})]},F))}),e.jsx(_e,{}),e.jsx(D,{children:(E=m==null?void 0:m.players)==null?void 0:E.map((C,F)=>e.jsxs(q,{$reverse:!0,children:[e.jsx(W,{src:V[C.race],alt:""}),e.jsx(Q,{$right:!0,children:C.name})]},F))})]})]})}function tr({matches:t=[],finishedMatches:r=[],$mobileVisible:o,onClose:s,borderTheme:l}){const[i,x]=a.useState("mmr"),L=a.useMemo(()=>{const p=[...t];return i==="mmr"?p.sort((m,M)=>$e(M)-$e(m)):p.sort((m,M)=>{var c,h;const g=new Date(m.startTime||((c=m.match)==null?void 0:c.startTime)||0).getTime();return new Date(M.startTime||((h=M.match)==null?void 0:h.startTime)||0).getTime()-g}),p},[t,i]);return e.jsx(At,{$mobileVisible:o,children:e.jsxs(Ut,{$theme:l,children:[e.jsxs(Bt,{$theme:l,children:[e.jsx(Ot,{children:"Active Games"}),e.jsx(Nt,{children:t.length}),e.jsx(_t,{onClick:()=>x(p=>p==="mmr"?"recent":"mmr"),children:i==="mmr"?"MMR":"Recent"}),e.jsx(Yt,{onClick:s,children:"×"})]}),L.length===0&&r.length===0?e.jsx(Ht,{children:"No active games"}):e.jsxs(Pt,{children:[r.map(p=>e.jsx(er,{match:p},`fin-${p.id}`)),L.map(p=>{var m;return e.jsx(Zt,{match:p},p.id||((m=p.match)==null?void 0:m.id))})]})]})})}const rr=n.aside`
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
`,nr=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,or=n.div`
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
`,ar=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,sr=n.span`
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
`,lr=n.div`
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
`,cr=n.input`
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
`,dr=n.button`
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
`,pr=n.div`
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
`,He=n.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,gr=n(He)`
  flex: 1;
`,hr=n(He)`
  flex-shrink: 0;
`,fr=n.div`
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
`,mr=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,xr=n(Z)`
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
`,ur=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,vr=n.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,br=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,ke=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,yr=n(se)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,wr=n.img.attrs({src:ie,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,jr=n.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,$r=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,kr=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,Se=n.div`
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
`,Me=n.span`
  color: var(--gold);
`,Ce=n.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function Sr(t,r,o){var x;const s=(x=r==null?void 0:r.get(t))==null?void 0:x.profilePicUrl;if(s)return e.jsx(br,{src:s,alt:""});const l=o==null?void 0:o.get(t),i=(l==null?void 0:l.race)!=null?V[l.race]:null;return i?e.jsx(ke,{src:i,alt:""}):e.jsx(ke,{src:De.random,alt:"",$faded:!0})}function Te({user:t,avatars:r,stats:o,inGame:s,matchUrl:l,isRecentWinner:i}){var g;const x=o==null?void 0:o.get(t.battleTag),L=x==null?void 0:x.mmr,p=(x==null?void 0:x.race)!=null?V[x.race]:null,m=(g=r==null?void 0:r.get(t.battleTag))==null?void 0:g.country,M=e.jsxs(e.Fragment,{children:[e.jsxs(ur,{children:[Sr(t.battleTag,r,o),m&&e.jsx(vr,{children:e.jsx(Re,{name:m.toLowerCase(),style:{width:14,height:10}})})]}),s&&e.jsx(yr,{}),i&&e.jsx(wr,{}),p&&e.jsx(jr,{src:p,alt:""}),e.jsx($r,{children:t.name}),L!=null&&e.jsx(kr,{children:Math.round(L)})]});return l?e.jsx(xr,{to:l,children:M}):e.jsx(mr,{children:M})}function Mr({users:t,avatars:r,stats:o,inGameTags:s,inGameMatchMap:l,recentWinners:i,$mobileVisible:x,onClose:L,borderTheme:p}){const[m,M]=a.useState(""),[g,d]=a.useState("mmr"),[c,h]=a.useState(!0),[b,D]=a.useState(!0);function U(f){d(f)}const N=a.useMemo(()=>[...t].sort((f,v)=>{var F,G;if(g==="live"){const P=s!=null&&s.has(f.battleTag)?1:0,T=s!=null&&s.has(v.battleTag)?1:0;if(P!==T)return T-P}if(g==="name"){const P=(f.name||"").localeCompare(v.name||"",void 0,{sensitivity:"base"});if(P!==0)return P}const E=((F=o==null?void 0:o.get(f.battleTag))==null?void 0:F.mmr)??-1,C=((G=o==null?void 0:o.get(v.battleTag))==null?void 0:G.mmr)??-1;return E!==C?C-E:(f.name||"").localeCompare(v.name||"",void 0,{sensitivity:"base"})}),[t,o,s,g]),_=a.useMemo(()=>{if(!m.trim())return N;const f=m.toLowerCase();return N.filter(v=>(v.name||"").toLowerCase().includes(f))},[N,m]),{inGameUsers:A,onlineUsers:O}=a.useMemo(()=>{const f=[],v=[];for(const E of _)s!=null&&s.has(E.battleTag)?f.push(E):v.push(E);return{inGameUsers:f,onlineUsers:v}},[_,s]);return e.jsx(rr,{$mobileVisible:x,children:e.jsxs(or,{$theme:p,children:[e.jsxs(nr,{$theme:p,children:[e.jsx(ar,{children:"Channel"}),e.jsx(sr,{children:t.length}),e.jsx(ir,{onClick:L,children:"×"})]}),e.jsxs(lr,{children:[e.jsx(cr,{type:"text",placeholder:"Search players...",value:m,onChange:f=>M(f.target.value)}),m&&e.jsx(dr,{onClick:()=>M(""),children:"×"})]}),e.jsxs(pr,{children:[e.jsx(gr,{$active:g==="name",onClick:()=>U("name"),children:"Player"}),e.jsx(hr,{$active:g==="mmr",onClick:()=>U("mmr"),children:"MMR"})]}),e.jsxs(fr,{children:[A.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(Se,{onClick:()=>h(f=>!f),children:[e.jsx(Ce,{$open:c,children:"▶"}),"In Game — ",e.jsx(Me,{children:A.length})]}),c&&A.map(f=>e.jsx(Te,{user:f,avatars:r,stats:o,inGame:!0,matchUrl:l==null?void 0:l.get(f.battleTag),isRecentWinner:i==null?void 0:i.has(f.battleTag)},f.battleTag))]}),e.jsxs(Se,{onClick:()=>D(f=>!f),children:[e.jsx(Ce,{$open:b,children:"▶"}),"Online — ",e.jsx(Me,{children:O.length})]}),b&&O.map(f=>e.jsx(Te,{user:f,avatars:r,stats:o,inGame:!1,matchUrl:null,isRecentWinner:i==null?void 0:i.has(f.battleTag)},f.battleTag))]})]})})}const Cr=n.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  @media (max-width: 768px) {
    padding: 0;
  }
`,Tr=n.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - 52px);

  @media (max-width: 768px) {
    gap: 0;
    height: calc(100vh - 46px);
  }
`,ze=n.button`
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
`,Rr=()=>{const{messages:t,status:r,onlineUsers:o,botResponses:s,sendMessage:l}=Ze(),{borderTheme:i}=Ge(),[x,L]=a.useState(new Map),[p,m]=a.useState(new Map),[M,g]=a.useState(new Map),[d,c]=a.useState([]),[h,b]=a.useState(!1),[D,U]=a.useState(!1),[N,_]=a.useState([]),[A,O]=a.useState(new Set),f=a.useRef(new Set),v=a.useRef(new Set),E=a.useRef(new Set),C=a.useCallback(async()=>{try{const T=await Xe();c(T.matches||[])}catch{}},[]);a.useEffect(()=>{C();const T=setInterval(C,3e4);return()=>clearInterval(T)},[C]),a.useEffect(()=>{const T=new Set(d.map(w=>{var B;return w.id||((B=w.match)==null?void 0:B.id)})),y=[...E.current].filter(w=>w&&!T.has(w));if(E.current=T,y.length===0)return;console.log("[GameEnd] Detected ended matches:",y);async function R(w,B=0){var $,k;console.log(`[GameEnd] Fetching result for ${w}, attempt ${B}`);let u;try{const I=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(w)}`);if(!I.ok)return;const S=await I.json();u=S==null?void 0:S.match}catch{return}if(!u)return;const j=($=u.teams)==null?void 0:$.findIndex(I=>{var S;return(S=I.players)==null?void 0:S.some(Y=>Y.won===!0||Y.won===1)});if(j<0&&B<3){setTimeout(()=>R(w,B+1),5e3);return}if(j>=0){const I=((k=u.teams[j].players)==null?void 0:k.map(S=>S.battleTag).filter(Boolean))||[];I.length>0&&(O(S=>{const Y=new Set(S);return I.forEach(H=>Y.add(H)),Y}),setTimeout(()=>{O(S=>{const Y=new Set(S);return I.forEach(H=>Y.delete(H)),Y})},12e4))}_(I=>[...I,{...u,id:w,_winnerTeam:j>=0?j:null,_finishedAt:Date.now()}]),setTimeout(()=>{_(I=>I.filter(S=>S.id!==w))},8e3)}for(const w of y)setTimeout(()=>R(w),5e3)},[d]);const F=a.useMemo(()=>{const T=new Set;for(const y of d)for(const R of y.teams)for(const w of R.players)w.battleTag&&T.add(w.battleTag);const z=Date.now();for(let y=t.length-1;y>=0;y--){const R=t[y],w=new Date(R.sent_at||R.sentAt).getTime();if(z-w>6e4)break;const B=R.battle_tag||R.battleTag;B&&T.delete(B)}return T},[d,t]),G=a.useMemo(()=>{const T=new Map;for(const z of d)for(const y of z.teams)for(const R of y.players)R.battleTag&&T.set(R.battleTag,`/player/${encodeURIComponent(R.battleTag)}`);return T},[d]);a.useEffect(()=>{const z=[...v.current].filter(y=>!F.has(y));v.current=new Set(F);for(const y of z)pe(y).then(R=>{var w;(w=R==null?void 0:R.session)!=null&&w.form&&g(B=>{const u=new Map(B);return u.set(y,R.session.form),u})})},[F]);const P=a.useMemo(()=>{const T=new Set;for(const z of t){const y=z.battle_tag||z.battleTag;y&&T.add(y)}for(const z of o)z.battleTag&&T.add(z.battleTag);return T},[t,o]);return a.useEffect(()=>{const T=[];for(const z of P)f.current.has(z)||(f.current.add(z),T.push(z));if(T.length!==0)for(const z of T)qe(z).then(y=>{L(R=>{const w=new Map(R);return w.set(z,y),w})}),We(z).then(y=>{y&&m(R=>{const w=new Map(R);return w.set(z,y),w})}),pe(z).then(y=>{var R;(R=y==null?void 0:y.session)!=null&&R.form&&g(w=>{const B=new Map(w);return B.set(z,y.session.form),B})})},[P]),e.jsxs(Cr,{children:[e.jsxs(Tr,{children:[e.jsx(tr,{matches:d,finishedMatches:N,$mobileVisible:D,onClose:()=>U(!1),borderTheme:i}),e.jsx(Ft,{messages:t,status:r,avatars:x,stats:p,sessions:M,inGameTags:F,recentWinners:A,botResponses:s,borderTheme:i,sendMessage:l}),e.jsx(Mr,{users:o,avatars:x,stats:p,inGameTags:F,inGameMatchMap:G,recentWinners:A,$mobileVisible:h,onClose:()=>b(!1),borderTheme:i})]}),!D&&!h&&e.jsxs(e.Fragment,{children:[e.jsx(ze,{$left:"var(--space-4)",onClick:()=>U(!0),children:e.jsx(se,{})}),e.jsx(ze,{$right:"var(--space-4)",onClick:()=>b(!0),children:e.jsx(Qe,{})})]})]})};export{Rr as default};
