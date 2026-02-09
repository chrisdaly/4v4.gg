import{u as he,r as a,j as e,R as se,C as Ue,v as n,h as G,t as Oe,L as ne,G as fe,w as Ne,x as Ze,M as et,y as ve,z as _e,A as tt,m as rt,B as be,s as nt,D as ot}from"./index-0-cVUc9R.js";function at(t){return he({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{fillRule:"evenodd",d:"M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z",clipRule:"evenodd"},child:[]}]})(t)}function st(t){return he({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}const ie="https://4v4gg-chat-relay.fly.dev",ye=500;function it(){const[t,r]=a.useState([]),[o,s]=a.useState("connecting"),[l,i]=a.useState([]),[b,I]=a.useState([]),f=a.useRef(null),u=a.useCallback(h=>{r(g=>{const p=new Set(g.map(w=>w.id)),v=h.filter(w=>!p.has(w.id));if(v.length===0)return g;const $=[...g,...v];return $.length>ye?$.slice($.length-ye):$})},[]);a.useEffect(()=>{let h=!1;fetch(`${ie}/api/chat/messages?limit=100`).then(p=>p.json()).then(p=>{h||u(p.reverse())}).catch(()=>{});const g=new EventSource(`${ie}/api/chat/stream`);return f.current=g,g.addEventListener("history",p=>{if(h)return;const v=JSON.parse(p.data);u(v)}),g.addEventListener("message",p=>{if(h)return;const v=JSON.parse(p.data);u([v])}),g.addEventListener("delete",p=>{if(h)return;const{id:v}=JSON.parse(p.data);r($=>$.filter(w=>w.id!==v))}),g.addEventListener("bulk_delete",p=>{if(h)return;const{ids:v}=JSON.parse(p.data),$=new Set(v);r(w=>w.filter(F=>!$.has(F.id)))}),g.addEventListener("users_init",p=>{h||i(JSON.parse(p.data))}),g.addEventListener("user_joined",p=>{if(h)return;const v=JSON.parse(p.data);i($=>$.some(w=>w.battleTag===v.battleTag)?$:[...$,v])}),g.addEventListener("user_left",p=>{if(h)return;const{battleTag:v}=JSON.parse(p.data);i($=>$.filter(w=>w.battleTag!==v))}),g.addEventListener("bot_response",p=>{if(h)return;const v=JSON.parse(p.data);I($=>[...$.slice(-49),v])}),g.addEventListener("status",p=>{if(h)return;const{state:v}=JSON.parse(p.data);s(v==="Connected"?"connected":v)}),g.addEventListener("heartbeat",()=>{h||s("connected")}),g.onopen=()=>{h||s("connected")},g.onerror=()=>{h||s("reconnecting")},()=>{h=!0,g.close()}},[u]);const C=a.useCallback(async(h,g)=>{const p=await fetch(`${ie}/api/admin/send`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":g},body:JSON.stringify({message:h})});if(!p.ok){const v=await p.json().catch(()=>({}));throw new Error(v.error||`Send failed (${p.status})`)}},[]);return{messages:t,status:o,onlineUsers:l,botResponses:b,sendMessage:C}}function le(t){return he({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8z"},child:[]}]})(t)}const me="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",lt=n.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,ct=n.div`
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
`,dt=n.div`
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
`,pt=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,gt=n.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,ht=n.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t=>t.$connected?"var(--green)":"var(--grey-mid)"};
  ${t=>t.$connected&&"animation: pulse 1.5s infinite;"}
`,ft=n.div`
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
`,mt=n.div`
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
`,xt=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,ut=n.div`
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
`,vt=n.span`
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
`,bt=n.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,we=n.img`
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
`,yt=n.div`
  min-width: 0;
`,wt=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,jt=n.span`
  display: inline-flex;
  align-items: center;
`,$t=n.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,kt=n(ne)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,St=n.div`
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
`,Mt=n.div`
  position: relative;
  display: inline-block;
`,Ct=n.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,Tt=n.div`
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
`,zt=n.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,It=n.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`,Rt=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,Dt=n.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,Lt=n.span`
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
`,At=n(fe)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`,je=n.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 14px;
    line-height: 1.5;
  }
`,Et=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,Bt=n.button`
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
`,Ft=n.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,$e=n.div`
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
`,ke=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`,Ut=n.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: rgba(10, 8, 6, 0.4);
  border-top: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,Ot=n.input`
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
`,ce=n.button`
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
`,Nt=n.button`
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
`,Pt=n.input`
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
`,Se=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  white-space: nowrap;
`,Yt=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--red);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,de=n.div`
  margin: 4px 0 4px 84px;
  padding: 6px 10px;
  border-left: 3px solid var(--gold);
  background: rgba(252, 219, 51, 0.04);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;

  @media (max-width: 480px) {
    margin-left: 66px;
  }
`,pe=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  color: var(--gold);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-right: 6px;
`,Q=n.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.7;
`,ge=n.pre`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #ccc;
  margin: 2px 0 0;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.4;
`,Ht=n.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-4);
  background: rgba(252, 219, 51, 0.03);
  border-top: 1px solid rgba(252, 219, 51, 0.1);
  flex-shrink: 0;
`,Kt=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  color: var(--gold);
  opacity: 0.7;
`,Jt=n.input`
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
`,Vt=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function Me(t){const r=new Date(t),o=new Date;if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return"Today";const l=new Date(o);return l.setDate(l.getDate()-1),r.getDate()===l.getDate()&&r.getMonth()===l.getMonth()&&r.getFullYear()===l.getFullYear()?"Yesterday":r.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function Ce(t){const r=new Date(t);return`${r.getFullYear()}-${r.getMonth()}-${r.getDate()}`}function Gt(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function Xt(t){const r=new Date(t),o=new Date,s=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return s;const i=new Date(o);return i.setDate(i.getDate()-1),r.getDate()===i.getDate()&&r.getMonth()===i.getMonth()&&r.getFullYear()===i.getFullYear()?`Yesterday ${s}`:`${r.getMonth()+1}/${r.getDate()}/${String(r.getFullYear()).slice(2)} ${s}`}function qt(t,r,o){var b;const s=(b=r==null?void 0:r.get(t))==null?void 0:b.profilePicUrl;if(s)return e.jsx(bt,{src:s,alt:""});const l=o==null?void 0:o.get(t),i=(l==null?void 0:l.race)!=null?G[l.race]:null;return i?e.jsx(we,{src:i,alt:""}):e.jsx(we,{src:Oe.random,alt:"",$faded:!0})}const Wt="https://4v4gg-chat-relay.fly.dev",Z="chat_admin_key";function Qt({messages:t,status:r,avatars:o,stats:s,sessions:l,inGameTags:i,recentWinners:b,botResponses:I=[],borderTheme:f,sendMessage:u}){const C=a.useRef(null),h=a.useRef(null),[g,p]=a.useState(!0),[v,$]=a.useState(!1),[w,F]=a.useState(()=>localStorage.getItem(Z)||""),[N,U]=a.useState(!1),[E,_]=a.useState(""),[m,j]=a.useState(!1),[D,M]=a.useState(null),[L,J]=a.useState(""),[P,T]=a.useState(!1),R=a.useCallback(async c=>{var d;if(c.preventDefault(),!(!E.trim()||!w||m||!u)){j(!0),M(null);try{await u(E.trim(),w),_(""),(d=h.current)==null||d.focus()}catch(x){M(x.message)}finally{j(!1)}}},[E,w,m,u]);function k(c){var x,y,B;c.preventDefault();const d=(B=(y=(x=c.target.elements)==null?void 0:x.apiKeyInput)==null?void 0:y.value)==null?void 0:B.trim();d&&(localStorage.setItem(Z,d),F(d)),U(!1)}function z(){localStorage.removeItem(Z),F(""),U(!1)}const S=a.useCallback(async c=>{c.preventDefault();const d=L.trim();if(!d||P)return;const x=d.startsWith("!")?d:`!${d}`;T(!0);try{const y=w||localStorage.getItem(Z)||"",B=await fetch(`${Wt}/api/admin/bot/test`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":y},body:JSON.stringify({command:x})});if(!B.ok){const O=await B.json().catch(()=>({}));throw new Error(O.error||`Failed (${B.status})`)}J("")}catch(y){M(y.message)}finally{T(!1)}},[L,w,P]),{botResponseMap:A,unmatchedBotResponses:Y}=a.useMemo(()=>{const c=new Map,d=new Set;for(const y of I)for(let B=t.length-1;B>=0;B--){const O=t[B];if((O.battle_tag||O.battleTag)===y.triggeredByTag&&O.message.toLowerCase().startsWith(y.command)){c.set(O.id,y),d.add(y);break}}const x=I.filter(y=>!d.has(y));return{botResponseMap:c,unmatchedBotResponses:x}},[I,t]),K=a.useMemo(()=>{const c=[];for(let d=0;d<t.length;d++){const x=t[d],y=x.battle_tag||x.battleTag;let B=d===0;if(!B){const O=t[d-1];if((O.battle_tag||O.battleTag)!==y)B=!0;else{const X=new Date(O.sent_at||O.sentAt).getTime();new Date(x.sent_at||x.sentAt).getTime()-X>120*1e3&&(B=!0)}}B?c.push({start:x,continuations:[]}):c.length>0&&c[c.length-1].continuations.push(x)}return c},[t]);a.useEffect(()=>{g&&C.current?C.current.scrollTop=C.current.scrollHeight:!g&&t.length>0&&$(!0)},[t,g]);function q(){const c=C.current;if(!c)return;const d=c.scrollHeight-c.scrollTop-c.clientHeight<40;p(d),d&&$(!1)}function W(){C.current&&(C.current.scrollTop=C.current.scrollHeight),p(!0),$(!1)}return e.jsxs(lt,{children:[e.jsxs(ct,{$theme:f,children:[e.jsxs(dt,{$theme:f,children:[e.jsx(pt,{children:"4v4 Chat"}),e.jsxs(gt,{children:[e.jsx(ht,{$connected:r==="connected"}),r==="connected"?t.length:"Connecting..."]})]}),t.length===0?e.jsx(Vt,{children:r==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(Ft,{children:[e.jsxs(ft,{ref:C,onScroll:q,children:[K.map((c,d)=>{var ae,xe,ue;const x=c.start,y=x.battle_tag||x.battleTag,B=x.user_name||x.userName,O=x.sent_at||x.sentAt,oe=Ce(O);let X=d===0;if(!X&&d>0){const H=K[d-1].start,V=H.sent_at||H.sentAt;X=Ce(V)!==oe}return!y||y==="system"?e.jsxs(se.Fragment,{children:[X&&e.jsx($e,{children:e.jsx(ke,{children:Me(O)})}),e.jsx(Et,{children:x.message})]},x.id):e.jsxs(se.Fragment,{children:[X&&e.jsx($e,{children:e.jsx(ke,{children:Me(O)})}),e.jsxs(mt,{children:[e.jsxs(St,{children:[e.jsxs(Mt,{children:[qt(y,o,s),((ae=o==null?void 0:o.get(y))==null?void 0:ae.country)&&e.jsx(Ct,{children:e.jsx(Ue,{name:o.get(y).country.toLowerCase()})})]}),(((xe=s==null?void 0:s.get(y))==null?void 0:xe.mmr)!=null||(l==null?void 0:l.get(y)))&&e.jsxs(Tt,{children:[((ue=s==null?void 0:s.get(y))==null?void 0:ue.mmr)!=null&&e.jsxs(zt,{children:[e.jsx(It,{children:Math.round(s.get(y).mmr)}),e.jsx(Rt,{children:"MMR"})]}),(l==null?void 0:l.get(y))&&e.jsx(Dt,{children:l.get(y).map((H,V)=>e.jsx(Lt,{$win:H},V))})]})]}),e.jsx(xt,{children:e.jsxs(yt,{children:[e.jsx("div",{children:e.jsxs(jt,{children:[e.jsx(kt,{to:`/player/${encodeURIComponent(y)}`,children:B}),(i==null?void 0:i.has(y))&&e.jsx(At,{}),(b==null?void 0:b.has(y))&&e.jsx($t,{src:me,alt:""}),e.jsx(wt,{children:Xt(x.sent_at||x.sentAt)})]})}),e.jsx(je,{children:x.message})]})}),A.has(x.id)&&e.jsxs(de,{children:[e.jsx(pe,{children:"BOT"}),!A.get(x.id).botEnabled&&e.jsx(Q,{children:"(preview)"}),e.jsx(ge,{children:A.get(x.id).response})]}),c.continuations.map(H=>{const V=A.get(H.id);return e.jsxs(se.Fragment,{children:[e.jsxs(ut,{children:[e.jsx(vt,{className:"hover-timestamp",children:Gt(H.sent_at||H.sentAt)}),e.jsx(je,{children:H.message})]}),V&&e.jsxs(de,{children:[e.jsx(pe,{children:"BOT"}),!V.botEnabled&&e.jsx(Q,{children:"(preview)"}),e.jsx(ge,{children:V.response})]})]},H.id)})]})]},x.id)}),Y.map((c,d)=>e.jsxs(de,{style:{marginLeft:"var(--space-4)"},children:[e.jsx(pe,{children:"BOT"}),!c.botEnabled&&e.jsx(Q,{children:"(preview)"}),e.jsx(Q,{style:{marginLeft:6},children:c.command}),e.jsx(ge,{children:c.response})]},`bot-${d}`))]}),v&&e.jsx(Bt,{onClick:W,children:"New messages below"})]})]}),u&&N&&!w&&e.jsxs(_t,{as:"form",onSubmit:k,children:[e.jsx(Se,{children:"API Key:"}),e.jsx(Pt,{name:"apiKeyInput",type:"password",placeholder:"Enter admin API key",autoFocus:!0}),e.jsx(ce,{type:"submit",children:e.jsx(le,{size:14})})]}),u&&(w||!N)&&e.jsxs(Ut,{onSubmit:R,children:[e.jsx(Nt,{type:"button",$active:!!w,onClick:()=>w?z():U(!0),title:w?"Clear API key":"Set API key",children:e.jsx(at,{size:16})}),w?e.jsxs(e.Fragment,{children:[e.jsx(Ot,{ref:h,type:"text",placeholder:"Send a message...",value:E,onChange:c=>{_(c.target.value),M(null)},disabled:m,maxLength:500}),D&&e.jsx(Yt,{title:D,children:"!"}),e.jsx(ce,{type:"submit",disabled:m||!E.trim(),children:e.jsx(le,{size:14})})]}):e.jsx(Se,{children:"Set API key to send messages"})]}),e.jsxs(Ht,{onSubmit:S,children:[e.jsx(Kt,{children:"BOT"}),e.jsx(Jt,{type:"text",placeholder:"!games, !stats name, !recap topic 50, !help",value:L,onChange:c=>J(c.target.value),disabled:P,maxLength:200}),e.jsx(ce,{type:"submit",disabled:P||!L.trim(),children:e.jsx(le,{size:14})})]})]})}const Zt=n.aside`
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
`,er=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,tr=n.div`
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
`,rr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,nr=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,or=n.button`
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
`,ar=n.button`
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
`,ir=n.div`
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
`,lr=n(ne)`
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
`,Pe=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`,Ye=n.img`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,He=n.div`
  flex: 1;
  min-width: 0;
`,Ke=n.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Je=n.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
`,Ve=n.span`
  font-family: var(--font-mono);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
`,Ge=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`,Xe=n.div`
  width: 80px;
  flex-shrink: 0;
  align-self: stretch;
  padding: var(--space-2) 0;
  box-sizing: border-box;
`,qe=n.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
`,cr=n.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,We=n.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-6) var(--space-3);
  gap: 0;
`,Te=n.div`
  flex: 1;
  min-width: 0;
`,ee=n.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-direction: ${t=>t.$reverse?"row-reverse":"row"};

  &:last-child {
    margin-bottom: 0;
  }
`,te=n.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`,re=n.span`
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
`,dr=_e`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,pr=_e`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,gr=n(ne)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${dr} 8s ease forwards;
`,hr=n.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${pr} 2s ease-out forwards;
`,fr=n.div`
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
`,ze=n.div`
  flex: 1;
  min-width: 0;
`,Ie=n.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function Re(t){var s;const o=(t.teams||((s=t.match)==null?void 0:s.teams)||[]).flatMap(l=>{var i;return((i=l.players)==null?void 0:i.map(b=>b.oldMmr||0))||[]});return o.length>0?o.reduce((l,i)=>l+i,0)/o.length:0}function mr({startTime:t}){const[r,o]=a.useState(()=>ve(t));return a.useEffect(()=>{const s=setInterval(()=>{o(ve(t))},1e3);return()=>clearInterval(s)},[t]),e.jsxs(qe,{children:[e.jsx(cr,{}),r]})}function xr({match:t}){var $,w,F,N,U,E,_,m;const r=Ze(),o=t.mapName||(($=t.match)==null?void 0:$.mapName),s=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",l=Ne(o),i=t.teams||((w=t.match)==null?void 0:w.teams)||[],b=t.startTime||((F=t.match)==null?void 0:F.startTime),I=i[0],f=i[1],u=((N=I==null?void 0:I.players)==null?void 0:N.map(j=>j.oldMmr||0))||[],C=((U=f==null?void 0:f.players)==null?void 0:U.map(j=>j.oldMmr||0))||[],h=[...u,...C],g=h.length>0?Math.round(h.reduce((j,D)=>j+D,0)/h.length):null,p={teamOneMmrs:u,teamTwoMmrs:C},v=t.id||((E=t.match)==null?void 0:E.id);return e.jsxs(lr,{to:v?`/match/${v}`:"/",children:[e.jsxs(Pe,{children:[l&&e.jsx(Ye,{src:l,alt:""}),e.jsxs(He,{children:[e.jsx(Ke,{children:s}),g!=null&&e.jsxs(Je,{children:[e.jsx(Ve,{children:g}),e.jsx(Ge,{children:"MMR"})]}),b&&e.jsx(mr,{startTime:b})]})]}),e.jsxs(We,{children:[e.jsx(Te,{$team:1,children:(_=I==null?void 0:I.players)==null?void 0:_.map((j,D)=>e.jsxs(ee,{children:[e.jsx(te,{src:G[j.race],alt:""}),e.jsx(re,{onClick:M=>{M.preventDefault(),M.stopPropagation(),r.push(`/player/${encodeURIComponent(j.battleTag)}`)},children:j.name})]},D))}),e.jsx(Xe,{children:e.jsx(et,{data:p,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(Te,{$team:2,children:(m=f==null?void 0:f.players)==null?void 0:m.map((j,D)=>e.jsxs(ee,{$reverse:!0,children:[e.jsx(te,{src:G[j.race],alt:""}),e.jsx(re,{$right:!0,onClick:M=>{M.preventDefault(),M.stopPropagation(),r.push(`/player/${encodeURIComponent(j.battleTag)}`)},children:j.name})]},D))})]})]})}function ur({match:t}){var N,U,E,_,m,j,D;const r=t.mapName||((N=t.match)==null?void 0:N.mapName),o=(r==null?void 0:r.replace(/^\(\d\)\s*/,""))||"Unknown",s=Ne(r),l=t.teams||((U=t.match)==null?void 0:U.teams)||[],i=t._winnerTeam,b=t.durationInSeconds,I=b?`${Math.floor(b/60)}:${String(b%60).padStart(2,"0")}`:null,f=l[0],u=l[1],C=((E=f==null?void 0:f.players)==null?void 0:E.map(M=>M.oldMmr||0))||[],h=((_=u==null?void 0:u.players)==null?void 0:_.map(M=>M.oldMmr||0))||[],g=[...C,...h],p=g.length>0?Math.round(g.reduce((M,L)=>M+L,0)/g.length):null,v=t.id||((m=t.match)==null?void 0:m.id),$=i===0?ze:Ie,w=i===1?ze:Ie,F=i===0?"25%":"75%";return e.jsxs(gr,{to:v?`/match/${v}`:"/",style:{"--crown-end-x":F},children:[e.jsx(fr,{}),i!=null&&e.jsx(hr,{src:me,alt:""}),e.jsxs(Pe,{children:[s&&e.jsx(Ye,{src:s,alt:""}),e.jsxs(He,{children:[e.jsx(Ke,{children:o}),p!=null&&e.jsxs(Je,{children:[e.jsx(Ve,{children:p}),e.jsx(Ge,{children:"MMR"})]}),I&&e.jsx(qe,{children:I})]})]}),e.jsxs(We,{children:[e.jsx($,{children:(j=f==null?void 0:f.players)==null?void 0:j.map((M,L)=>e.jsxs(ee,{children:[e.jsx(te,{src:G[M.race],alt:""}),e.jsx(re,{children:M.name})]},L))}),e.jsx(Xe,{}),e.jsx(w,{children:(D=u==null?void 0:u.players)==null?void 0:D.map((M,L)=>e.jsxs(ee,{$reverse:!0,children:[e.jsx(te,{src:G[M.race],alt:""}),e.jsx(re,{$right:!0,children:M.name})]},L))})]})]})}function vr({matches:t=[],finishedMatches:r=[],$mobileVisible:o,onClose:s,borderTheme:l}){const[i,b]=a.useState("mmr"),I=a.useMemo(()=>{const f=[...t];return i==="mmr"?f.sort((u,C)=>Re(C)-Re(u)):f.sort((u,C)=>{var p,v;const h=new Date(u.startTime||((p=u.match)==null?void 0:p.startTime)||0).getTime();return new Date(C.startTime||((v=C.match)==null?void 0:v.startTime)||0).getTime()-h}),f},[t,i]);return e.jsx(Zt,{$mobileVisible:o,children:e.jsxs(tr,{$theme:l,children:[e.jsxs(er,{$theme:l,children:[e.jsx(rr,{children:"Active Games"}),e.jsx(nr,{children:t.length}),e.jsx(or,{onClick:()=>b(f=>f==="mmr"?"recent":"mmr"),children:i==="mmr"?"MMR":"Recent"}),e.jsx(ar,{onClick:s,children:"×"})]}),I.length===0&&r.length===0?e.jsx(ir,{children:"No active games"}):e.jsxs(sr,{children:[r.map(f=>e.jsx(ur,{match:f},`fin-${f.id}`)),I.map(f=>{var u;return e.jsx(xr,{match:f},f.id||((u=f.match)==null?void 0:u.id))})]})]})})}const br=n.aside`
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
`,yr=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: ${t=>{var r;return((r=t.$theme)==null?void 0:r.headerBg)||"rgba(10, 8, 6, 0.2)"}};
  backdrop-filter: ${t=>{var r;return((r=t.$theme)==null?void 0:r.blur)||"blur(1px)"}};
  flex-shrink: 0;
`,wr=n.div`
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
`,jr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,$r=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,kr=n.button`
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
`,Sr=n.div`
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
`,Mr=n.input`
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
`,Cr=n.button`
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
`,Tr=n.div`
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
`,Qe=n.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,zr=n(Qe)`
  flex: 1;
`,Ir=n(Qe)`
  flex-shrink: 0;
`,Rr=n.div`
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
`,Dr=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,Lr=n(ne)`
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
`,Ar=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,Er=n.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,Br=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,De=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,Fr=n(fe)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,Ur=n.img.attrs({src:me,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,Or=n.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,Nr=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,_r=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,Le=n.div`
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
`,Ae=n.span`
  color: var(--gold);
`,Ee=n.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function Pr(t,r,o){var b;const s=(b=r==null?void 0:r.get(t))==null?void 0:b.profilePicUrl;if(s)return e.jsx(Br,{src:s,alt:""});const l=o==null?void 0:o.get(t),i=(l==null?void 0:l.race)!=null?G[l.race]:null;return i?e.jsx(De,{src:i,alt:""}):e.jsx(De,{src:Oe.random,alt:"",$faded:!0})}function Be({user:t,avatars:r,stats:o,inGame:s,matchUrl:l,isRecentWinner:i}){var h;const b=o==null?void 0:o.get(t.battleTag),I=b==null?void 0:b.mmr,f=(b==null?void 0:b.race)!=null?G[b.race]:null,u=(h=r==null?void 0:r.get(t.battleTag))==null?void 0:h.country,C=e.jsxs(e.Fragment,{children:[e.jsxs(Ar,{children:[Pr(t.battleTag,r,o),u&&e.jsx(Er,{children:e.jsx(Ue,{name:u.toLowerCase(),style:{width:14,height:10}})})]}),s&&e.jsx(Fr,{}),i&&e.jsx(Ur,{}),f&&e.jsx(Or,{src:f,alt:""}),e.jsx(Nr,{children:t.name}),I!=null&&e.jsx(_r,{children:Math.round(I)})]});return l?e.jsx(Lr,{to:l,children:C}):e.jsx(Dr,{children:C})}function Yr({users:t,avatars:r,stats:o,inGameTags:s,inGameMatchMap:l,recentWinners:i,$mobileVisible:b,onClose:I,borderTheme:f}){const[u,C]=a.useState(""),[h,g]=a.useState("mmr"),[p,v]=a.useState(!0),[$,w]=a.useState(!0);function F(m){g(m)}const N=a.useMemo(()=>[...t].sort((m,j)=>{var L,J;if(h==="live"){const P=s!=null&&s.has(m.battleTag)?1:0,T=s!=null&&s.has(j.battleTag)?1:0;if(P!==T)return T-P}if(h==="name"){const P=(m.name||"").localeCompare(j.name||"",void 0,{sensitivity:"base"});if(P!==0)return P}const D=((L=o==null?void 0:o.get(m.battleTag))==null?void 0:L.mmr)??-1,M=((J=o==null?void 0:o.get(j.battleTag))==null?void 0:J.mmr)??-1;return D!==M?M-D:(m.name||"").localeCompare(j.name||"",void 0,{sensitivity:"base"})}),[t,o,s,h]),U=a.useMemo(()=>{if(!u.trim())return N;const m=u.toLowerCase();return N.filter(j=>(j.name||"").toLowerCase().includes(m))},[N,u]),{inGameUsers:E,onlineUsers:_}=a.useMemo(()=>{const m=[],j=[];for(const D of U)s!=null&&s.has(D.battleTag)?m.push(D):j.push(D);return{inGameUsers:m,onlineUsers:j}},[U,s]);return e.jsx(br,{$mobileVisible:b,children:e.jsxs(wr,{$theme:f,children:[e.jsxs(yr,{$theme:f,children:[e.jsx(jr,{children:"Channel"}),e.jsx($r,{children:t.length}),e.jsx(kr,{onClick:I,children:"×"})]}),e.jsxs(Sr,{children:[e.jsx(Mr,{type:"text",placeholder:"Search players...",value:u,onChange:m=>C(m.target.value)}),u&&e.jsx(Cr,{onClick:()=>C(""),children:"×"})]}),e.jsxs(Tr,{children:[e.jsx(zr,{$active:h==="name",onClick:()=>F("name"),children:"Player"}),e.jsx(Ir,{$active:h==="mmr",onClick:()=>F("mmr"),children:"MMR"})]}),e.jsxs(Rr,{children:[E.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(Le,{onClick:()=>v(m=>!m),children:[e.jsx(Ee,{$open:p,children:"▶"}),"In Game — ",e.jsx(Ae,{children:E.length})]}),p&&E.map(m=>e.jsx(Be,{user:m,avatars:r,stats:o,inGame:!0,matchUrl:l==null?void 0:l.get(m.battleTag),isRecentWinner:i==null?void 0:i.has(m.battleTag)},m.battleTag))]}),e.jsxs(Le,{onClick:()=>w(m=>!m),children:[e.jsx(Ee,{$open:$,children:"▶"}),"Online — ",e.jsx(Ae,{children:_.length})]}),$&&_.map(m=>e.jsx(Be,{user:m,avatars:r,stats:o,inGame:!1,matchUrl:null,isRecentWinner:i==null?void 0:i.has(m.battleTag)},m.battleTag))]})]})})}const Hr=n.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  @media (max-width: 768px) {
    padding: 0;
  }
`,Kr=n.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - 52px);

  @media (max-width: 768px) {
    gap: 0;
    height: calc(100vh - 46px);
  }
`,Fe=n.button`
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
`,Vr=()=>{const{messages:t,status:r,onlineUsers:o,botResponses:s,sendMessage:l}=it(),{borderTheme:i}=tt(),[b,I]=a.useState(new Map),[f,u]=a.useState(new Map),[C,h]=a.useState(new Map),[g,p]=a.useState([]),[v,$]=a.useState(!1),[w,F]=a.useState(!1),[N,U]=a.useState([]),[E,_]=a.useState(new Set),m=a.useRef(new Set),j=a.useRef(new Set),D=a.useRef(new Set),M=a.useCallback(async()=>{try{const T=await rt();p(T.matches||[])}catch{}},[]);a.useEffect(()=>{M();const T=setInterval(M,3e4);return()=>clearInterval(T)},[M]),a.useEffect(()=>{const T=new Set(g.map(S=>{var A;return S.id||((A=S.match)==null?void 0:A.id)})),k=[...D.current].filter(S=>S&&!T.has(S));if(D.current=T,k.length===0)return;console.log("[GameEnd] Detected ended matches:",k);async function z(S,A=0){var q,W;console.log(`[GameEnd] Fetching result for ${S}, attempt ${A}`);let Y;try{const c=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(S)}`);if(!c.ok)return;const d=await c.json();Y=d==null?void 0:d.match}catch{return}if(!Y)return;const K=(q=Y.teams)==null?void 0:q.findIndex(c=>{var d;return(d=c.players)==null?void 0:d.some(x=>x.won===!0||x.won===1)});if(K<0&&A<3){setTimeout(()=>z(S,A+1),5e3);return}if(K>=0){const c=((W=Y.teams[K].players)==null?void 0:W.map(d=>d.battleTag).filter(Boolean))||[];c.length>0&&(_(d=>{const x=new Set(d);return c.forEach(y=>x.add(y)),x}),setTimeout(()=>{_(d=>{const x=new Set(d);return c.forEach(y=>x.delete(y)),x})},12e4))}U(c=>[...c,{...Y,id:S,_winnerTeam:K>=0?K:null,_finishedAt:Date.now()}]),setTimeout(()=>{U(c=>c.filter(d=>d.id!==S))},8e3)}for(const S of k)setTimeout(()=>z(S),5e3)},[g]);const L=a.useMemo(()=>{const T=new Set;for(const k of g)for(const z of k.teams)for(const S of z.players)S.battleTag&&T.add(S.battleTag);const R=Date.now();for(let k=t.length-1;k>=0;k--){const z=t[k],S=new Date(z.sent_at||z.sentAt).getTime();if(R-S>6e4)break;const A=z.battle_tag||z.battleTag;A&&T.delete(A)}return T},[g,t]),J=a.useMemo(()=>{const T=new Map;for(const R of g)for(const k of R.teams)for(const z of k.players)z.battleTag&&T.set(z.battleTag,`/player/${encodeURIComponent(z.battleTag)}`);return T},[g]);a.useEffect(()=>{const R=[...j.current].filter(k=>!L.has(k));j.current=new Set(L);for(const k of R)be(k).then(z=>{var S;(S=z==null?void 0:z.session)!=null&&S.form&&h(A=>{const Y=new Map(A);return Y.set(k,z.session.form),Y})})},[L]);const P=a.useMemo(()=>{const T=new Set;for(const R of t){const k=R.battle_tag||R.battleTag;k&&T.add(k)}for(const R of o)R.battleTag&&T.add(R.battleTag);return T},[t,o]);return a.useEffect(()=>{const T=[];for(const R of P)m.current.has(R)||(m.current.add(R),T.push(R));if(T.length!==0)for(const R of T)nt(R).then(k=>{I(z=>{const S=new Map(z);return S.set(R,k),S})}),ot(R).then(k=>{k&&u(z=>{const S=new Map(z);return S.set(R,k),S})}),be(R).then(k=>{var z;(z=k==null?void 0:k.session)!=null&&z.form&&h(S=>{const A=new Map(S);return A.set(R,k.session.form),A})})},[P]),e.jsxs(Hr,{children:[e.jsxs(Kr,{children:[e.jsx(vr,{matches:g,finishedMatches:N,$mobileVisible:w,onClose:()=>F(!1),borderTheme:i}),e.jsx(Qt,{messages:t,status:r,avatars:b,stats:f,sessions:C,inGameTags:L,recentWinners:E,botResponses:s,borderTheme:i,sendMessage:l}),e.jsx(Yr,{users:o,avatars:b,stats:f,inGameTags:L,inGameMatchMap:J,recentWinners:E,$mobileVisible:v,onClose:()=>$(!1),borderTheme:i})]}),!w&&!v&&e.jsxs(e.Fragment,{children:[e.jsx(Fe,{$left:"var(--space-4)",onClick:()=>F(!0),children:e.jsx(fe,{})}),e.jsx(Fe,{$right:"var(--space-4)",onClick:()=>$(!0),children:e.jsx(st,{})})]})]})};export{Vr as default};
