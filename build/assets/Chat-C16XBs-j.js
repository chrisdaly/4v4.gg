import{u as Ge,r as a,j as e,R as re,C as Ie,v as n,h as X,t as Le,L as ee,G as ie,w as Fe,x as Xe,M as qe,y as pe,z as Ae,A as We,m as Qe,B as ge,s as Ze,D as et}from"./index-CKqM6WhI.js";function tt(t){return Ge({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}const ne="https://4v4gg-chat-relay.fly.dev",he=500;function rt(){const[t,r]=a.useState([]),[o,s]=a.useState("connecting"),[i,l]=a.useState([]),[h,D]=a.useState([]),[p,u]=a.useState(new Map),L=a.useRef(null),y=a.useCallback(c=>{r(f=>{const d=new Set(f.map(z=>z.id)),g=c.filter(z=>!d.has(z.id));if(g.length===0)return f;const x=[...f,...g];return x.length>he?x.slice(x.length-he):x})},[]);a.useEffect(()=>{let c=!1;fetch(`${ne}/api/chat/messages?limit=100`).then(d=>d.json()).then(d=>{c||y(d.reverse())}).catch(()=>{});const f=new EventSource(`${ne}/api/chat/stream`);return L.current=f,f.addEventListener("history",d=>{if(c)return;const g=JSON.parse(d.data);y(g)}),f.addEventListener("message",d=>{if(c)return;const g=JSON.parse(d.data);y([g])}),f.addEventListener("delete",d=>{if(c)return;const{id:g}=JSON.parse(d.data);r(x=>x.filter(z=>z.id!==g))}),f.addEventListener("bulk_delete",d=>{if(c)return;const{ids:g}=JSON.parse(d.data),x=new Set(g);r(z=>z.filter(O=>!x.has(O.id)))}),f.addEventListener("users_init",d=>{c||l(JSON.parse(d.data))}),f.addEventListener("user_joined",d=>{if(c)return;const g=JSON.parse(d.data);l(x=>x.some(z=>z.battleTag===g.battleTag)?x:[...x,g])}),f.addEventListener("user_left",d=>{if(c)return;const{battleTag:g}=JSON.parse(d.data);l(x=>x.filter(z=>z.battleTag!==g))}),f.addEventListener("bot_response",d=>{if(c)return;const g=JSON.parse(d.data);D(x=>[...x.slice(-49),g])}),f.addEventListener("translation",d=>{if(c)return;const{id:g,translated:x}=JSON.parse(d.data);u(z=>new Map(z).set(g,x))}),f.addEventListener("status",d=>{if(c)return;const{state:g}=JSON.parse(d.data);s(g==="Connected"?"connected":g)}),f.addEventListener("heartbeat",()=>{c||s("connected")}),f.onopen=()=>{c||s("connected")},f.onerror=()=>{c||s("reconnecting")},()=>{c=!0,f.close()}},[y]);const A=a.useCallback(async(c,f)=>{const d=await fetch(`${ne}/api/admin/send`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":f},body:JSON.stringify({message:c})});if(!d.ok){const g=await d.json().catch(()=>({}));throw new Error(g.error||`Send failed (${d.status})`)}},[]);return{messages:t,status:o,onlineUsers:i,botResponses:h,translations:p,sendMessage:A}}const le="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",nt=n.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,ot=n.div`
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
`,at=n.div`
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
`,st=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,it=n.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,lt=n.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t=>t.$connected?"var(--green)":"var(--grey-mid)"};
  ${t=>t.$connected&&"animation: pulse 1.5s infinite;"}
`,ct=n.div`
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
`,dt=n.div`
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
`,pt=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,gt=n.div`
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
`,ht=n.span`
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
`,ft=n.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,fe=n.img`
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
`,mt=n.div`
  min-width: 0;
`,xt=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,ut=n.span`
  display: inline-flex;
  align-items: center;
`,vt=n.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,bt=n(ee)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,yt=n.div`
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
`,wt=n.div`
  position: relative;
  display: inline-block;
`,jt=n.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,$t=n.div`
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
`,kt=n.div`
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
`,Mt=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,Ct=n.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,Tt=n.span`
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
`,zt=n(ie)`
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
`,Dt=n.button`
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
`,Et=n.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,xe=n.div`
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
`,ue=n.span`
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
`;const ve=n.div`
  margin: 2px 0 2px 84px;
  padding: 2px 10px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.8;
  line-height: 1.4;

  @media (max-width: 480px) {
    margin-left: 66px;
  }
`,be=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
  font-style: normal;
  opacity: 0.6;
`,oe=n.div`
  margin: 4px 0 4px 84px;
  padding: 6px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(252, 219, 51, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;

  @media (max-width: 480px) {
    margin-left: 66px;
  }
`,ae=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
`,q=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.7;
`,se=n.pre`
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
`;const It=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ye(t){const r=new Date(t),o=new Date;if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return"Today";const i=new Date(o);return i.setDate(i.getDate()-1),r.getDate()===i.getDate()&&r.getMonth()===i.getMonth()&&r.getFullYear()===i.getFullYear()?"Yesterday":r.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function we(t){const r=new Date(t);return`${r.getFullYear()}-${r.getMonth()}-${r.getDate()}`}function Lt(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function Ft(t){const r=new Date(t),o=new Date,s=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return s;const l=new Date(o);return l.setDate(l.getDate()-1),r.getDate()===l.getDate()&&r.getMonth()===l.getMonth()&&r.getFullYear()===l.getFullYear()?`Yesterday ${s}`:`${r.getMonth()+1}/${r.getDate()}/${String(r.getFullYear()).slice(2)} ${s}`}function At(t,r,o){var h;const s=(h=r==null?void 0:r.get(t))==null?void 0:h.profilePicUrl;if(s)return e.jsx(ft,{src:s,alt:""});const i=o==null?void 0:o.get(t),l=(i==null?void 0:i.race)!=null?X[i.race]:null;return l?e.jsx(fe,{src:l,alt:""}):e.jsx(fe,{src:Le.random,alt:"",$faded:!0})}const Bt="https://4v4gg-chat-relay.fly.dev",je="chat_admin_key";function Ut({messages:t,status:r,avatars:o,stats:s,sessions:i,inGameTags:l,recentWinners:h,botResponses:D=[],translations:p=new Map,borderTheme:u,sendMessage:L}){const y=a.useRef(null),A=a.useRef(null),[c,f]=a.useState(!0),[d,g]=a.useState(!1),[x,z]=a.useState(()=>localStorage.getItem(je)||""),[O,_]=a.useState(!1),[N,m]=a.useState(""),[w,F]=a.useState(!1),[I,B]=a.useState(null),[H,K]=a.useState(""),[V,E]=a.useState(!1);a.useCallback(async v=>{var k;if(v.preventDefault(),!(!N.trim()||!x||w||!L)){F(!0),B(null);try{await L(N.trim(),x),m(""),(k=A.current)==null||k.focus()}catch(b){B(b.message)}finally{F(!1)}}},[N,x,w,L]),a.useCallback(async v=>{v.preventDefault();const k=H.trim();if(!k||V)return;const b=k.startsWith("!")?k:`!${k}`;E(!0);try{const S=x||localStorage.getItem(je)||"",R=await fetch(`${Bt}/api/admin/bot/test`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":S},body:JSON.stringify({command:b})});if(!R.ok){const M=await R.json().catch(()=>({}));throw new Error(M.error||`Failed (${R.status})`)}K("")}catch(S){B(S.message)}finally{E(!1)}},[H,x,V]);const{botResponseMap:C,unmatchedBotResponses:j}=a.useMemo(()=>{const v=new Map,k=new Set;for(const S of D)for(let R=t.length-1;R>=0;R--){const M=t[R];if((M.battle_tag||M.battleTag)===S.triggeredByTag&&M.message.toLowerCase().startsWith(S.command)){v.set(M.id,S),k.add(S);break}}const b=D.filter(S=>!k.has(S));return{botResponseMap:v,unmatchedBotResponses:b}},[D,t]),T=a.useMemo(()=>{const v=[];for(let k=0;k<t.length;k++){const b=t[k],S=b.battle_tag||b.battleTag;let R=k===0;if(!R){const M=t[k-1];if((M.battle_tag||M.battleTag)!==S)R=!0;else{const J=new Date(M.sent_at||M.sentAt).getTime();new Date(b.sent_at||b.sentAt).getTime()-J>120*1e3&&(R=!0)}}R?v.push({start:b,continuations:[]}):v.length>0&&v[v.length-1].continuations.push(b)}return v},[t]);a.useEffect(()=>{c&&y.current?y.current.scrollTop=y.current.scrollHeight:!c&&t.length>0&&g(!0)},[t,c]);function $(){const v=y.current;if(!v)return;const k=v.scrollHeight-v.scrollTop-v.clientHeight<40;f(k),k&&g(!1)}function U(){y.current&&(y.current.scrollTop=y.current.scrollHeight),f(!0),g(!1)}return e.jsxs(nt,{children:[e.jsxs(ot,{$theme:u,children:[e.jsxs(at,{$theme:u,children:[e.jsx(st,{children:"4v4 Chat"}),e.jsxs(it,{children:[e.jsx(lt,{$connected:r==="connected"}),r==="connected"?t.length:"Connecting..."]})]}),t.length===0?e.jsx(It,{children:r==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(Et,{children:[e.jsxs(ct,{ref:y,onScroll:$,children:[T.map((v,k)=>{var te,ce,de;const b=v.start,S=b.battle_tag||b.battleTag,R=b.user_name||b.userName,M=b.sent_at||b.sentAt,Y=we(M);let J=k===0;if(!J&&k>0){const P=T[k-1].start,G=P.sent_at||P.sentAt;J=we(G)!==Y}return!S||S==="system"?e.jsxs(re.Fragment,{children:[J&&e.jsx(xe,{children:e.jsx(ue,{children:ye(M)})}),e.jsx(Rt,{children:b.message})]},b.id):e.jsxs(re.Fragment,{children:[J&&e.jsx(xe,{children:e.jsx(ue,{children:ye(M)})}),e.jsxs(dt,{children:[e.jsxs(yt,{children:[e.jsxs(wt,{children:[At(S,o,s),((te=o==null?void 0:o.get(S))==null?void 0:te.country)&&e.jsx(jt,{children:e.jsx(Ie,{name:o.get(S).country.toLowerCase()})})]}),(((ce=s==null?void 0:s.get(S))==null?void 0:ce.mmr)!=null||(i==null?void 0:i.get(S)))&&e.jsxs($t,{children:[((de=s==null?void 0:s.get(S))==null?void 0:de.mmr)!=null&&e.jsxs(kt,{children:[e.jsx(St,{children:Math.round(s.get(S).mmr)}),e.jsx(Mt,{children:"MMR"})]}),(i==null?void 0:i.get(S))&&e.jsx(Ct,{children:i.get(S).map((P,G)=>e.jsx(Tt,{$win:P},G))})]})]}),e.jsx(pt,{children:e.jsxs(mt,{children:[e.jsx("div",{children:e.jsxs(ut,{children:[e.jsx(bt,{to:`/player/${encodeURIComponent(S)}`,children:R}),(l==null?void 0:l.has(S))&&e.jsx(zt,{}),(h==null?void 0:h.has(S))&&e.jsx(vt,{src:le,alt:""}),e.jsx(xt,{children:Ft(b.sent_at||b.sentAt)})]})}),e.jsx(me,{children:b.message}),p.has(b.id)&&e.jsxs(ve,{style:{margin:"2px 0",padding:"2px 0"},children:[e.jsx(be,{children:"EN"}),p.get(b.id)]})]})}),C.has(b.id)&&e.jsxs(oe,{children:[e.jsx(ae,{children:"BOT"}),!C.get(b.id).botEnabled&&e.jsx(q,{children:"(preview)"}),e.jsx(se,{children:C.get(b.id).response})]}),v.continuations.map(P=>{const G=C.get(P.id);return e.jsxs(re.Fragment,{children:[e.jsxs(gt,{children:[e.jsx(ht,{className:"hover-timestamp",children:Lt(P.sent_at||P.sentAt)}),e.jsx(me,{children:P.message})]}),p.has(P.id)&&e.jsxs(ve,{children:[e.jsx(be,{children:"EN"}),p.get(P.id)]}),G&&e.jsxs(oe,{children:[e.jsx(ae,{children:"BOT"}),!G.botEnabled&&e.jsx(q,{children:"(preview)"}),e.jsx(se,{children:G.response})]})]},P.id)})]})]},b.id)}),j.map((v,k)=>e.jsxs(oe,{style:{marginLeft:"var(--space-4)"},children:[e.jsx(ae,{children:"BOT"}),!v.botEnabled&&e.jsx(q,{children:"(preview)"}),e.jsx(q,{style:{marginLeft:6},children:v.command}),e.jsx(se,{children:v.response})]},`bot-${k}`))]}),d&&e.jsx(Dt,{onClick:U,children:"New messages below"})]})]}),!1,!1,!1]})}const Nt=n.aside`
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
`,Ot=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,_t=n.div`
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
`,Yt=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Pt=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Ht=n.button`
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
`,Jt=n.button`
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
`,Kt=n.div`
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
`,Vt=n.div`
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
`,Gt=n(ee)`
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
`,Be=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`,Ue=n.img`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,Ne=n.div`
  flex: 1;
  min-width: 0;
`,Oe=n.div`
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
`,Ye=n.span`
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
`,Je=n.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
`,Xt=n.span`
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
`,$e=n.div`
  flex: 1;
  min-width: 0;
`,W=n.div`
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
`,qt=Ae`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,Wt=Ae`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,Qt=n(ee)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${qt} 8s ease forwards;
`,Zt=n.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${Wt} 2s ease-out forwards;
`,er=n.div`
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
`,ke=n.div`
  flex: 1;
  min-width: 0;
`,Se=n.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function Me(t){var s;const o=(t.teams||((s=t.match)==null?void 0:s.teams)||[]).flatMap(i=>{var l;return((l=i.players)==null?void 0:l.map(h=>h.oldMmr||0))||[]});return o.length>0?o.reduce((i,l)=>i+l,0)/o.length:0}function tr({startTime:t}){const[r,o]=a.useState(()=>pe(t));return a.useEffect(()=>{const s=setInterval(()=>{o(pe(t))},1e3);return()=>clearInterval(s)},[t]),e.jsxs(Je,{children:[e.jsx(Xt,{}),r]})}function rr({match:t}){var d,g,x,z,O,_,N,m;const r=Xe(),o=t.mapName||((d=t.match)==null?void 0:d.mapName),s=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",i=Fe(o),l=t.teams||((g=t.match)==null?void 0:g.teams)||[],h=t.startTime||((x=t.match)==null?void 0:x.startTime),D=l[0],p=l[1],u=((z=D==null?void 0:D.players)==null?void 0:z.map(w=>w.oldMmr||0))||[],L=((O=p==null?void 0:p.players)==null?void 0:O.map(w=>w.oldMmr||0))||[],y=[...u,...L],A=y.length>0?Math.round(y.reduce((w,F)=>w+F,0)/y.length):null,c={teamOneMmrs:u,teamTwoMmrs:L},f=t.id||((_=t.match)==null?void 0:_.id);return e.jsxs(Gt,{to:f?`/match/${f}`:"/",children:[e.jsxs(Be,{children:[i&&e.jsx(Ue,{src:i,alt:""}),e.jsxs(Ne,{children:[e.jsx(Oe,{children:s}),A!=null&&e.jsxs(_e,{children:[e.jsx(Ye,{children:A}),e.jsx(Pe,{children:"MMR"})]}),h&&e.jsx(tr,{startTime:h})]})]}),e.jsxs(Ke,{children:[e.jsx($e,{$team:1,children:(N=D==null?void 0:D.players)==null?void 0:N.map((w,F)=>e.jsxs(W,{children:[e.jsx(Q,{src:X[w.race],alt:""}),e.jsx(Z,{onClick:I=>{I.preventDefault(),I.stopPropagation(),r.push(`/player/${encodeURIComponent(w.battleTag)}`)},children:w.name})]},F))}),e.jsx(He,{children:e.jsx(qe,{data:c,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx($e,{$team:2,children:(m=p==null?void 0:p.players)==null?void 0:m.map((w,F)=>e.jsxs(W,{$reverse:!0,children:[e.jsx(Q,{src:X[w.race],alt:""}),e.jsx(Z,{$right:!0,onClick:I=>{I.preventDefault(),I.stopPropagation(),r.push(`/player/${encodeURIComponent(w.battleTag)}`)},children:w.name})]},F))})]})]})}function nr({match:t}){var z,O,_,N,m,w,F;const r=t.mapName||((z=t.match)==null?void 0:z.mapName),o=(r==null?void 0:r.replace(/^\(\d\)\s*/,""))||"Unknown",s=Fe(r),i=t.teams||((O=t.match)==null?void 0:O.teams)||[],l=t._winnerTeam,h=t.durationInSeconds,D=h?`${Math.floor(h/60)}:${String(h%60).padStart(2,"0")}`:null,p=i[0],u=i[1],L=((_=p==null?void 0:p.players)==null?void 0:_.map(I=>I.oldMmr||0))||[],y=((N=u==null?void 0:u.players)==null?void 0:N.map(I=>I.oldMmr||0))||[],A=[...L,...y],c=A.length>0?Math.round(A.reduce((I,B)=>I+B,0)/A.length):null,f=t.id||((m=t.match)==null?void 0:m.id),d=l===0?ke:Se,g=l===1?ke:Se,x=l===0?"25%":"75%";return e.jsxs(Qt,{to:f?`/match/${f}`:"/",style:{"--crown-end-x":x},children:[e.jsx(er,{}),l!=null&&e.jsx(Zt,{src:le,alt:""}),e.jsxs(Be,{children:[s&&e.jsx(Ue,{src:s,alt:""}),e.jsxs(Ne,{children:[e.jsx(Oe,{children:o}),c!=null&&e.jsxs(_e,{children:[e.jsx(Ye,{children:c}),e.jsx(Pe,{children:"MMR"})]}),D&&e.jsx(Je,{children:D})]})]}),e.jsxs(Ke,{children:[e.jsx(d,{children:(w=p==null?void 0:p.players)==null?void 0:w.map((I,B)=>e.jsxs(W,{children:[e.jsx(Q,{src:X[I.race],alt:""}),e.jsx(Z,{children:I.name})]},B))}),e.jsx(He,{}),e.jsx(g,{children:(F=u==null?void 0:u.players)==null?void 0:F.map((I,B)=>e.jsxs(W,{$reverse:!0,children:[e.jsx(Q,{src:X[I.race],alt:""}),e.jsx(Z,{$right:!0,children:I.name})]},B))})]})]})}function or({matches:t=[],finishedMatches:r=[],$mobileVisible:o,onClose:s,borderTheme:i}){const[l,h]=a.useState("mmr"),D=a.useMemo(()=>{const p=[...t];return l==="mmr"?p.sort((u,L)=>Me(L)-Me(u)):p.sort((u,L)=>{var c,f;const y=new Date(u.startTime||((c=u.match)==null?void 0:c.startTime)||0).getTime();return new Date(L.startTime||((f=L.match)==null?void 0:f.startTime)||0).getTime()-y}),p},[t,l]);return e.jsx(Nt,{$mobileVisible:o,children:e.jsxs(_t,{$theme:i,children:[e.jsxs(Ot,{$theme:i,children:[e.jsx(Yt,{children:"Active Games"}),e.jsx(Pt,{children:t.length}),e.jsx(Ht,{onClick:()=>h(p=>p==="mmr"?"recent":"mmr"),children:l==="mmr"?"MMR":"Recent"}),e.jsx(Jt,{onClick:s,children:"×"})]}),D.length===0&&r.length===0?e.jsx(Vt,{children:"No active games"}):e.jsxs(Kt,{children:[r.map(p=>e.jsx(nr,{match:p},`fin-${p.id}`)),D.map(p=>{var u;return e.jsx(rr,{match:p},p.id||((u=p.match)==null?void 0:u.id))})]})]})})}const ar=n.aside`
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
`,sr=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,ir=n.div`
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
`,lr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,cr=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,dr=n.button`
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
`,pr=n.div`
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
`,gr=n.input`
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
`,hr=n.button`
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
`,fr=n.div`
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
`,Ve=n.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,mr=n(Ve)`
  flex: 1;
`,xr=n(Ve)`
  flex-shrink: 0;
`,ur=n.div`
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
`,vr=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,br=n(ee)`
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
`,yr=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,wr=n.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,jr=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,Ce=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,$r=n(ie)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,kr=n.img.attrs({src:le,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,Sr=n.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,Mr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,Cr=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,Te=n.div`
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
`,ze=n.span`
  color: var(--gold);
`,Re=n.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function Tr(t,r,o){var h;const s=(h=r==null?void 0:r.get(t))==null?void 0:h.profilePicUrl;if(s)return e.jsx(jr,{src:s,alt:""});const i=o==null?void 0:o.get(t),l=(i==null?void 0:i.race)!=null?X[i.race]:null;return l?e.jsx(Ce,{src:l,alt:""}):e.jsx(Ce,{src:Le.random,alt:"",$faded:!0})}function De({user:t,avatars:r,stats:o,inGame:s,matchUrl:i,isRecentWinner:l}){var y;const h=o==null?void 0:o.get(t.battleTag),D=h==null?void 0:h.mmr,p=(h==null?void 0:h.race)!=null?X[h.race]:null,u=(y=r==null?void 0:r.get(t.battleTag))==null?void 0:y.country,L=e.jsxs(e.Fragment,{children:[e.jsxs(yr,{children:[Tr(t.battleTag,r,o),u&&e.jsx(wr,{children:e.jsx(Ie,{name:u.toLowerCase(),style:{width:14,height:10}})})]}),s&&e.jsx($r,{}),l&&e.jsx(kr,{}),p&&e.jsx(Sr,{src:p,alt:""}),e.jsx(Mr,{children:t.name}),D!=null&&e.jsx(Cr,{children:Math.round(D)})]});return i?e.jsx(br,{to:i,children:L}):e.jsx(vr,{children:L})}function zr({users:t,avatars:r,stats:o,inGameTags:s,inGameMatchMap:i,recentWinners:l,$mobileVisible:h,onClose:D,borderTheme:p}){const[u,L]=a.useState(""),[y,A]=a.useState("mmr"),[c,f]=a.useState(!0),[d,g]=a.useState(!0);function x(m){A(m)}const z=a.useMemo(()=>[...t].sort((m,w)=>{var B,H;if(y==="live"){const K=s!=null&&s.has(m.battleTag)?1:0,V=s!=null&&s.has(w.battleTag)?1:0;if(K!==V)return V-K}if(y==="name"){const K=(m.name||"").localeCompare(w.name||"",void 0,{sensitivity:"base"});if(K!==0)return K}const F=((B=o==null?void 0:o.get(m.battleTag))==null?void 0:B.mmr)??-1,I=((H=o==null?void 0:o.get(w.battleTag))==null?void 0:H.mmr)??-1;return F!==I?I-F:(m.name||"").localeCompare(w.name||"",void 0,{sensitivity:"base"})}),[t,o,s,y]),O=a.useMemo(()=>{if(!u.trim())return z;const m=u.toLowerCase();return z.filter(w=>(w.name||"").toLowerCase().includes(m))},[z,u]),{inGameUsers:_,onlineUsers:N}=a.useMemo(()=>{const m=[],w=[];for(const F of O)s!=null&&s.has(F.battleTag)?m.push(F):w.push(F);return{inGameUsers:m,onlineUsers:w}},[O,s]);return e.jsx(ar,{$mobileVisible:h,children:e.jsxs(ir,{$theme:p,children:[e.jsxs(sr,{$theme:p,children:[e.jsx(lr,{children:"Channel"}),e.jsx(cr,{children:t.length}),e.jsx(dr,{onClick:D,children:"×"})]}),e.jsxs(pr,{children:[e.jsx(gr,{type:"text",placeholder:"Search players...",value:u,onChange:m=>L(m.target.value)}),u&&e.jsx(hr,{onClick:()=>L(""),children:"×"})]}),e.jsxs(fr,{children:[e.jsx(mr,{$active:y==="name",onClick:()=>x("name"),children:"Player"}),e.jsx(xr,{$active:y==="mmr",onClick:()=>x("mmr"),children:"MMR"})]}),e.jsxs(ur,{children:[_.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(Te,{onClick:()=>f(m=>!m),children:[e.jsx(Re,{$open:c,children:"▶"}),"In Game — ",e.jsx(ze,{children:_.length})]}),c&&_.map(m=>e.jsx(De,{user:m,avatars:r,stats:o,inGame:!0,matchUrl:i==null?void 0:i.get(m.battleTag),isRecentWinner:l==null?void 0:l.has(m.battleTag)},m.battleTag))]}),e.jsxs(Te,{onClick:()=>g(m=>!m),children:[e.jsx(Re,{$open:d,children:"▶"}),"Online — ",e.jsx(ze,{children:N.length})]}),d&&N.map(m=>e.jsx(De,{user:m,avatars:r,stats:o,inGame:!1,matchUrl:null,isRecentWinner:l==null?void 0:l.has(m.battleTag)},m.battleTag))]})]})})}const Rr=n.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  @media (max-width: 768px) {
    padding: 0;
  }
`,Dr=n.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - 52px);

  @media (max-width: 768px) {
    gap: 0;
    height: calc(100vh - 46px);
  }
`,Ee=n.button`
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
`,Ir=()=>{const{messages:t,status:r,onlineUsers:o,botResponses:s,translations:i,sendMessage:l}=rt(),{borderTheme:h}=We(),[D,p]=a.useState(new Map),[u,L]=a.useState(new Map),[y,A]=a.useState(new Map),[c,f]=a.useState([]),[d,g]=a.useState(!1),[x,z]=a.useState(!1),[O,_]=a.useState([]),[N,m]=a.useState(new Set),w=a.useRef(new Set),F=a.useRef(new Set),I=a.useRef(new Set),B=a.useCallback(async()=>{try{const E=await Qe();f(E.matches||[])}catch{}},[]);a.useEffect(()=>{B();const E=setInterval(B,3e4);return()=>clearInterval(E)},[B]),a.useEffect(()=>{const E=new Set(c.map($=>{var U;return $.id||((U=$.match)==null?void 0:U.id)})),j=[...I.current].filter($=>$&&!E.has($));if(I.current=E,j.length===0)return;console.log("[GameEnd] Detected ended matches:",j);async function T($,U=0){var b,S;console.log(`[GameEnd] Fetching result for ${$}, attempt ${U}`);let v;try{const R=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent($)}`);if(!R.ok)return;const M=await R.json();v=M==null?void 0:M.match}catch{return}if(!v)return;const k=(b=v.teams)==null?void 0:b.findIndex(R=>{var M;return(M=R.players)==null?void 0:M.some(Y=>Y.won===!0||Y.won===1)});if(k<0&&U<3){setTimeout(()=>T($,U+1),5e3);return}if(k>=0){const R=((S=v.teams[k].players)==null?void 0:S.map(M=>M.battleTag).filter(Boolean))||[];R.length>0&&(m(M=>{const Y=new Set(M);return R.forEach(J=>Y.add(J)),Y}),setTimeout(()=>{m(M=>{const Y=new Set(M);return R.forEach(J=>Y.delete(J)),Y})},12e4))}_(R=>[...R,{...v,id:$,_winnerTeam:k>=0?k:null,_finishedAt:Date.now()}]),setTimeout(()=>{_(R=>R.filter(M=>M.id!==$))},8e3)}for(const $ of j)setTimeout(()=>T($),5e3)},[c]);const H=a.useMemo(()=>{const E=new Set;for(const j of c)for(const T of j.teams)for(const $ of T.players)$.battleTag&&E.add($.battleTag);const C=Date.now();for(let j=t.length-1;j>=0;j--){const T=t[j],$=new Date(T.sent_at||T.sentAt).getTime();if(C-$>6e4)break;const U=T.battle_tag||T.battleTag;U&&E.delete(U)}return E},[c,t]),K=a.useMemo(()=>{const E=new Map;for(const C of c)for(const j of C.teams)for(const T of j.players)T.battleTag&&E.set(T.battleTag,`/player/${encodeURIComponent(T.battleTag)}`);return E},[c]);a.useEffect(()=>{const C=[...F.current].filter(j=>!H.has(j));F.current=new Set(H);for(const j of C)ge(j).then(T=>{var $;($=T==null?void 0:T.session)!=null&&$.form&&A(U=>{const v=new Map(U);return v.set(j,T.session.form),v})})},[H]);const V=a.useMemo(()=>{const E=new Set;for(const C of t){const j=C.battle_tag||C.battleTag;j&&E.add(j)}for(const C of o)C.battleTag&&E.add(C.battleTag);return E},[t,o]);return a.useEffect(()=>{const E=[];for(const C of V)w.current.has(C)||(w.current.add(C),E.push(C));if(E.length!==0)for(const C of E)Ze(C).then(j=>{p(T=>{const $=new Map(T);return $.set(C,j),$})}),et(C).then(j=>{j&&L(T=>{const $=new Map(T);return $.set(C,j),$})}),ge(C).then(j=>{var T;(T=j==null?void 0:j.session)!=null&&T.form&&A($=>{const U=new Map($);return U.set(C,j.session.form),U})})},[V]),e.jsxs(Rr,{children:[e.jsxs(Dr,{children:[e.jsx(or,{matches:c,finishedMatches:O,$mobileVisible:x,onClose:()=>z(!1),borderTheme:h}),e.jsx(Ut,{messages:t,status:r,avatars:D,stats:u,sessions:y,inGameTags:H,recentWinners:N,botResponses:s,translations:i,borderTheme:h,sendMessage:l}),e.jsx(zr,{users:o,avatars:D,stats:u,inGameTags:H,inGameMatchMap:K,recentWinners:N,$mobileVisible:d,onClose:()=>g(!1),borderTheme:h})]}),!x&&!d&&e.jsxs(e.Fragment,{children:[e.jsx(Ee,{$left:"var(--space-4)",onClick:()=>z(!0),children:e.jsx(ie,{})}),e.jsx(Ee,{$right:"var(--space-4)",onClick:()=>g(!0),children:e.jsx(tt,{})})]})]})};export{Ir as default};
