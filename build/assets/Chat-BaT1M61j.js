import{J as Ie,a as f,j as e,R as q,C as ue,E as n,r as Y,D as ve,L as O,n as be,u as Fe,M as Le,K as Q,N as ye,d as Ee,P as Z,m as Ae,Q as Ue}from"./index-BfWfxCZJ.js";import{G as V}from"./index-BD6rXAVP.js";function Ne(t){return Ie({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}const W="http://localhost:3002",ee=500;function Ye(){const[t,r]=f.useState([]),[o,a]=f.useState("connecting"),[s,c]=f.useState([]),m=f.useRef(null),d=f.useCallback(i=>{r(l=>{const p=new Set(l.map(S=>S.id)),h=i.filter(S=>!p.has(S.id));if(h.length===0)return l;const u=[...l,...h];return u.length>ee?u.slice(u.length-ee):u})},[]);return f.useEffect(()=>{let i=!1;fetch(`${W}/api/chat/messages?limit=100`).then(p=>p.json()).then(p=>{i||d(p.reverse())}).catch(()=>{});const l=new EventSource(`${W}/api/chat/stream`);return m.current=l,l.addEventListener("history",p=>{if(i)return;const h=JSON.parse(p.data);d(h)}),l.addEventListener("message",p=>{if(i)return;const h=JSON.parse(p.data);d([h])}),l.addEventListener("delete",p=>{if(i)return;const{id:h}=JSON.parse(p.data);r(u=>u.filter(S=>S.id!==h))}),l.addEventListener("bulk_delete",p=>{if(i)return;const{ids:h}=JSON.parse(p.data),u=new Set(h);r(S=>S.filter(F=>!u.has(F.id)))}),l.addEventListener("users_init",p=>{i||c(JSON.parse(p.data))}),l.addEventListener("user_joined",p=>{if(i)return;const h=JSON.parse(p.data);c(u=>u.some(S=>S.battleTag===h.battleTag)?u:[...u,h])}),l.addEventListener("user_left",p=>{if(i)return;const{battleTag:h}=JSON.parse(p.data);c(u=>u.filter(S=>S.battleTag!==h))}),l.addEventListener("status",p=>{if(i)return;const{state:h}=JSON.parse(p.data);a(h==="Connected"?"connected":h)}),l.addEventListener("heartbeat",()=>{i||a("connected")}),l.onopen=()=>{i||a("connected")},l.onerror=()=>{i||a("reconnecting")},()=>{i=!0,l.close()}},[d]),{messages:t,status:o,onlineUsers:s}}const G="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",_e=n.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,Oe=n.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  background: rgba(10, 8, 6, 0.3);
  backdrop-filter: blur(2px);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
`,He=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: rgba(10, 8, 6, 0.3);
  backdrop-filter: blur(2px);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);

  @media (max-width: 480px) {
    padding: 10px var(--space-2);
  }
`,Be=n(O)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,Pe=n.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Je=n.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t=>t.$connected?"var(--green)":"var(--grey-mid)"};
  ${t=>t.$connected&&"animation: pulse 1.5s infinite;"}
`,Ve=n.div`
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
`,Ge=n.div`
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
`,Ke=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,Xe=n.div`
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
`,qe=n.span`
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
`,Qe=n.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,te=n.img`
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
`,Ze=n.div`
  min-width: 0;
`,We=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,et=n.span`
  display: inline-flex;
  align-items: center;
`,tt=n.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,nt=n(O)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,rt=n.div`
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
`,ot=n.div`
  position: relative;
  display: inline-block;
`,at=n.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,it=n.div`
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
`,st=n.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,lt=n.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`,ct=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,dt=n.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,pt=n.span`
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
`,gt=n(V)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`,ne=n.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 14px;
    line-height: 1.5;
  }
`,ft=n.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,xt=n.button`
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
`,ht=n.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,re=n.div`
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
`,oe=n.span`
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`,mt=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ae(t){const r=new Date(t),o=new Date;if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return"Today";const s=new Date(o);return s.setDate(s.getDate()-1),r.getDate()===s.getDate()&&r.getMonth()===s.getMonth()&&r.getFullYear()===s.getFullYear()?"Yesterday":r.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function ie(t){const r=new Date(t);return`${r.getFullYear()}-${r.getMonth()}-${r.getDate()}`}function ut(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function vt(t){const r=new Date(t),o=new Date,a=r.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(r.getDate()===o.getDate()&&r.getMonth()===o.getMonth()&&r.getFullYear()===o.getFullYear())return a;const c=new Date(o);return c.setDate(c.getDate()-1),r.getDate()===c.getDate()&&r.getMonth()===c.getMonth()&&r.getFullYear()===c.getFullYear()?`Yesterday ${a}`:`${r.getMonth()+1}/${r.getDate()}/${String(r.getFullYear()).slice(2)} ${a}`}function bt(t,r,o){var m;const a=(m=r==null?void 0:r.get(t))==null?void 0:m.profilePicUrl;if(a)return e.jsx(Qe,{src:a,alt:""});const s=o==null?void 0:o.get(t),c=(s==null?void 0:s.race)!=null?Y[s.race]:null;return c?e.jsx(te,{src:c,alt:""}):e.jsx(te,{src:ve.random,alt:"",$faded:!0})}function yt({messages:t,status:r,avatars:o,stats:a,sessions:s,inGameTags:c,recentWinners:m}){const d=f.useRef(null),[i,l]=f.useState(!0),[p,h]=f.useState(!1),u=f.useMemo(()=>{const z=[];for(let T=0;T<t.length;T++){const w=t[T],k=w.battle_tag||w.battleTag;let R=T===0;if(!R){const D=t[T-1];if((D.battle_tag||D.battleTag)!==k)R=!0;else{const M=new Date(D.sent_at||D.sentAt).getTime();new Date(w.sent_at||w.sentAt).getTime()-M>120*1e3&&(R=!0)}}R?z.push({start:w,continuations:[]}):z.length>0&&z[z.length-1].continuations.push(w)}return z},[t]);f.useEffect(()=>{i&&d.current?d.current.scrollTop=d.current.scrollHeight:!i&&t.length>0&&h(!0)},[t,i]);function S(){const z=d.current;if(!z)return;const T=z.scrollHeight-z.scrollTop-z.clientHeight<40;l(T),T&&h(!1)}function F(){d.current&&(d.current.scrollTop=d.current.scrollHeight),l(!0),h(!1)}return e.jsxs(_e,{children:[e.jsxs(He,{children:[e.jsx(Be,{to:"/",children:"4v4 Chat"}),e.jsxs(Pe,{children:[e.jsx(Je,{$connected:r==="connected"}),r==="connected"?t.length:"Connecting..."]})]}),e.jsx(Oe,{children:t.length===0?e.jsx(mt,{children:r==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(ht,{children:[e.jsx(Ve,{ref:d,onScroll:S,children:u.map((z,T)=>{var v,I,C;const w=z.start,k=w.battle_tag||w.battleTag,R=w.user_name||w.userName,D=w.sent_at||w.sentAt,x=ie(D);let M=T===0;if(!M&&T>0){const g=u[T-1].start,b=g.sent_at||g.sentAt;M=ie(b)!==x}return!k||k==="system"?e.jsxs(q.Fragment,{children:[M&&e.jsx(re,{children:e.jsx(oe,{children:ae(D)})}),e.jsx(ft,{children:w.message})]},w.id):e.jsxs(q.Fragment,{children:[M&&e.jsx(re,{children:e.jsx(oe,{children:ae(D)})}),e.jsxs(Ge,{children:[e.jsxs(rt,{children:[e.jsxs(ot,{children:[bt(k,o,a),((v=o==null?void 0:o.get(k))==null?void 0:v.country)&&e.jsx(at,{children:e.jsx(ue,{name:o.get(k).country.toLowerCase()})})]}),(((I=a==null?void 0:a.get(k))==null?void 0:I.mmr)!=null||(s==null?void 0:s.get(k)))&&e.jsxs(it,{children:[((C=a==null?void 0:a.get(k))==null?void 0:C.mmr)!=null&&e.jsxs(st,{children:[e.jsx(lt,{children:Math.round(a.get(k).mmr)}),e.jsx(ct,{children:"MMR"})]}),(s==null?void 0:s.get(k))&&e.jsx(dt,{children:s.get(k).map((g,b)=>e.jsx(pt,{$win:g},b))})]})]}),e.jsx(Ke,{children:e.jsxs(Ze,{children:[e.jsx("div",{children:e.jsxs(et,{children:[e.jsx(nt,{to:`/player/${encodeURIComponent(k)}`,children:R}),(c==null?void 0:c.has(k))&&e.jsx(gt,{}),(m==null?void 0:m.has(k))&&e.jsx(tt,{src:G,alt:""}),e.jsx(We,{children:vt(w.sent_at||w.sentAt)})]})}),e.jsx(ne,{children:w.message})]})}),z.continuations.map(g=>e.jsxs(Xe,{children:[e.jsx(qe,{className:"hover-timestamp",children:ut(g.sent_at||g.sentAt)}),e.jsx(ne,{children:g.message})]},g.id))]})]},w.id)})}),p&&e.jsx(xt,{onClick:F,children:"New messages below"})]})})]})}const wt=n.aside`
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
`,jt=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,kt=n.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(10, 8, 6, 0.3);
  backdrop-filter: blur(2px);
`,St=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Mt=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Ct=n.button`
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
`,$t=n.button`
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
`,Tt=n.div`
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
`,zt=n.div`
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
`,Dt=n(O)`
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
`,we=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`,je=n.img`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,ke=n.div`
  flex: 1;
  min-width: 0;
`,Se=n.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Me=n.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
`,Ce=n.span`
  font-family: var(--font-mono);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
`,$e=n.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`,Te=n.div`
  width: 80px;
  flex-shrink: 0;
  align-self: stretch;
  padding: var(--space-2) 0;
  box-sizing: border-box;
`,ze=n.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
`,Rt=n.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,De=n.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-6) var(--space-3);
  gap: 0;
`,se=n.div`
  flex: 1;
  min-width: 0;
`,H=n.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-direction: ${t=>t.$reverse?"row-reverse":"row"};

  &:last-child {
    margin-bottom: 0;
  }
`,B=n.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`,P=n.span`
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
`,It=ye`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,Ft=ye`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,Lt=n(O)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${It} 8s ease forwards;
`,Et=n.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${Ft} 2s ease-out forwards;
`,At=n.div`
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
`,le=n.div`
  flex: 1;
  min-width: 0;
`,ce=n.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function de(t){var a;const o=(t.teams||((a=t.match)==null?void 0:a.teams)||[]).flatMap(s=>{var c;return((c=s.players)==null?void 0:c.map(m=>m.oldMmr||0))||[]});return o.length>0?o.reduce((s,c)=>s+c,0)/o.length:0}function Ut({startTime:t}){const[r,o]=f.useState(()=>Q(t));return f.useEffect(()=>{const a=setInterval(()=>{o(Q(t))},1e3);return()=>clearInterval(a)},[t]),e.jsxs(ze,{children:[e.jsx(Rt,{}),r]})}function Nt({match:t}){var z,T,w,k,R,D,x,M;const r=Fe(),o=t.mapName||((z=t.match)==null?void 0:z.mapName),a=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",s=be(o),c=t.teams||((T=t.match)==null?void 0:T.teams)||[],m=t.startTime||((w=t.match)==null?void 0:w.startTime),d=c[0],i=c[1],l=((k=d==null?void 0:d.players)==null?void 0:k.map(v=>v.oldMmr||0))||[],p=((R=i==null?void 0:i.players)==null?void 0:R.map(v=>v.oldMmr||0))||[],h=[...l,...p],u=h.length>0?Math.round(h.reduce((v,I)=>v+I,0)/h.length):null,S={teamOneMmrs:l,teamTwoMmrs:p},F=t.id||((D=t.match)==null?void 0:D.id);return e.jsxs(Dt,{to:F?`/match/${F}`:"/",children:[e.jsxs(we,{children:[s&&e.jsx(je,{src:s,alt:""}),e.jsxs(ke,{children:[e.jsx(Se,{children:a}),u!=null&&e.jsxs(Me,{children:[e.jsx(Ce,{children:u}),e.jsx($e,{children:"MMR"})]}),m&&e.jsx(Ut,{startTime:m})]})]}),e.jsxs(De,{children:[e.jsx(se,{$team:1,children:(x=d==null?void 0:d.players)==null?void 0:x.map((v,I)=>e.jsxs(H,{children:[e.jsx(B,{src:Y[v.race],alt:""}),e.jsx(P,{onClick:C=>{C.preventDefault(),C.stopPropagation(),r.push(`/player/${encodeURIComponent(v.battleTag)}`)},children:v.name})]},I))}),e.jsx(Te,{children:e.jsx(Le,{data:S,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(se,{$team:2,children:(M=i==null?void 0:i.players)==null?void 0:M.map((v,I)=>e.jsxs(H,{$reverse:!0,children:[e.jsx(B,{src:Y[v.race],alt:""}),e.jsx(P,{$right:!0,onClick:C=>{C.preventDefault(),C.stopPropagation(),r.push(`/player/${encodeURIComponent(v.battleTag)}`)},children:v.name})]},I))})]})]})}function Yt({match:t}){var k,R,D,x,M,v,I;const r=t.mapName||((k=t.match)==null?void 0:k.mapName),o=(r==null?void 0:r.replace(/^\(\d\)\s*/,""))||"Unknown",a=be(r),s=t.teams||((R=t.match)==null?void 0:R.teams)||[],c=t._winnerTeam,m=t.durationInSeconds,d=m?`${Math.floor(m/60)}:${String(m%60).padStart(2,"0")}`:null,i=s[0],l=s[1],p=((D=i==null?void 0:i.players)==null?void 0:D.map(C=>C.oldMmr||0))||[],h=((x=l==null?void 0:l.players)==null?void 0:x.map(C=>C.oldMmr||0))||[],u=[...p,...h],S=u.length>0?Math.round(u.reduce((C,g)=>C+g,0)/u.length):null,F=t.id||((M=t.match)==null?void 0:M.id),z=c===0?le:ce,T=c===1?le:ce,w=c===0?"25%":"75%";return e.jsxs(Lt,{to:F?`/match/${F}`:"/",style:{"--crown-end-x":w},children:[e.jsx(At,{}),c!=null&&e.jsx(Et,{src:G,alt:""}),e.jsxs(we,{children:[a&&e.jsx(je,{src:a,alt:""}),e.jsxs(ke,{children:[e.jsx(Se,{children:o}),S!=null&&e.jsxs(Me,{children:[e.jsx(Ce,{children:S}),e.jsx($e,{children:"MMR"})]}),d&&e.jsx(ze,{children:d})]})]}),e.jsxs(De,{children:[e.jsx(z,{children:(v=i==null?void 0:i.players)==null?void 0:v.map((C,g)=>e.jsxs(H,{children:[e.jsx(B,{src:Y[C.race],alt:""}),e.jsx(P,{children:C.name})]},g))}),e.jsx(Te,{}),e.jsx(T,{children:(I=l==null?void 0:l.players)==null?void 0:I.map((C,g)=>e.jsxs(H,{$reverse:!0,children:[e.jsx(B,{src:Y[C.race],alt:""}),e.jsx(P,{$right:!0,children:C.name})]},g))})]})]})}function _t({matches:t=[],finishedMatches:r=[],$mobileVisible:o,onClose:a}){const[s,c]=f.useState("mmr"),m=f.useMemo(()=>{const d=[...t];return s==="mmr"?d.sort((i,l)=>de(l)-de(i)):d.sort((i,l)=>{var u,S;const p=new Date(i.startTime||((u=i.match)==null?void 0:u.startTime)||0).getTime();return new Date(l.startTime||((S=l.match)==null?void 0:S.startTime)||0).getTime()-p}),d},[t,s]);return e.jsx(wt,{$mobileVisible:o,children:e.jsxs(kt,{children:[e.jsxs(jt,{children:[e.jsx(St,{children:"Active Games"}),e.jsx(Mt,{children:t.length}),e.jsx(Ct,{onClick:()=>c(d=>d==="mmr"?"recent":"mmr"),children:s==="mmr"?"MMR":"Recent"}),e.jsx($t,{onClick:a,children:"×"})]}),m.length===0&&r.length===0?e.jsx(zt,{children:"No active games"}):e.jsxs(Tt,{children:[r.map(d=>e.jsx(Yt,{match:d},`fin-${d.id}`)),m.map(d=>{var i;return e.jsx(Nt,{match:d},d.id||((i=d.match)==null?void 0:i.id))})]})]})})}const Ot=n.aside`
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
`,Ht=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,Bt=n.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: rgba(10, 8, 6, 0.3);
  backdrop-filter: blur(2px);
`,Pt=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Jt=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Vt=n.button`
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
`,Gt=n.div`
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
`,Kt=n.input`
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
`,Xt=n.button`
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
`,qt=n.div`
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
`,Re=n.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,Qt=n(Re)`
  flex: 1;
`,Zt=n(Re)`
  flex-shrink: 0;
`,Wt=n.div`
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
`,en=n.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,tn=n(O)`
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
`,nn=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,rn=n.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,on=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,pe=n.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,an=n(V)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,sn=n.img.attrs({src:G,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,ln=n.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,cn=n.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,dn=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,ge=n.div`
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
`,fe=n.span`
  color: var(--gold);
`,xe=n.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function pn(t,r,o){var m;const a=(m=r==null?void 0:r.get(t))==null?void 0:m.profilePicUrl;if(a)return e.jsx(on,{src:a,alt:""});const s=o==null?void 0:o.get(t),c=(s==null?void 0:s.race)!=null?Y[s.race]:null;return c?e.jsx(pe,{src:c,alt:""}):e.jsx(pe,{src:ve.random,alt:"",$faded:!0})}function he({user:t,avatars:r,stats:o,inGame:a,matchUrl:s,isRecentWinner:c}){var h;const m=o==null?void 0:o.get(t.battleTag),d=m==null?void 0:m.mmr,i=(m==null?void 0:m.race)!=null?Y[m.race]:null,l=(h=r==null?void 0:r.get(t.battleTag))==null?void 0:h.country,p=e.jsxs(e.Fragment,{children:[e.jsxs(nn,{children:[pn(t.battleTag,r,o),l&&e.jsx(rn,{children:e.jsx(ue,{name:l.toLowerCase(),style:{width:14,height:10}})})]}),a&&e.jsx(an,{}),c&&e.jsx(sn,{}),i&&e.jsx(ln,{src:i,alt:""}),e.jsx(cn,{children:t.name}),d!=null&&e.jsx(dn,{children:Math.round(d)})]});return s?e.jsx(tn,{to:s,children:p}):e.jsx(en,{children:p})}function gn({users:t,avatars:r,stats:o,inGameTags:a,inGameMatchMap:s,recentWinners:c,$mobileVisible:m,onClose:d}){const[i,l]=f.useState(""),[p,h]=f.useState("mmr"),[u,S]=f.useState(!0),[F,z]=f.useState(!0);function T(x){h(x)}const w=f.useMemo(()=>[...t].sort((x,M)=>{var C,g;if(p==="live"){const b=a!=null&&a.has(x.battleTag)?1:0,y=a!=null&&a.has(M.battleTag)?1:0;if(b!==y)return y-b}if(p==="name"){const b=(x.name||"").localeCompare(M.name||"",void 0,{sensitivity:"base"});if(b!==0)return b}const v=((C=o==null?void 0:o.get(x.battleTag))==null?void 0:C.mmr)??-1,I=((g=o==null?void 0:o.get(M.battleTag))==null?void 0:g.mmr)??-1;return v!==I?I-v:(x.name||"").localeCompare(M.name||"",void 0,{sensitivity:"base"})}),[t,o,a,p]),k=f.useMemo(()=>{if(!i.trim())return w;const x=i.toLowerCase();return w.filter(M=>(M.name||"").toLowerCase().includes(x))},[w,i]),{inGameUsers:R,onlineUsers:D}=f.useMemo(()=>{const x=[],M=[];for(const v of k)a!=null&&a.has(v.battleTag)?x.push(v):M.push(v);return{inGameUsers:x,onlineUsers:M}},[k,a]);return e.jsx(Ot,{$mobileVisible:m,children:e.jsxs(Bt,{children:[e.jsxs(Ht,{children:[e.jsx(Pt,{children:"Channel"}),e.jsx(Jt,{children:t.length}),e.jsx(Vt,{onClick:d,children:"×"})]}),e.jsxs(Gt,{children:[e.jsx(Kt,{type:"text",placeholder:"Search players...",value:i,onChange:x=>l(x.target.value)}),i&&e.jsx(Xt,{onClick:()=>l(""),children:"×"})]}),e.jsxs(qt,{children:[e.jsx(Qt,{$active:p==="name",onClick:()=>T("name"),children:"Player"}),e.jsx(Zt,{$active:p==="mmr",onClick:()=>T("mmr"),children:"MMR"})]}),e.jsxs(Wt,{children:[R.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(ge,{onClick:()=>S(x=>!x),children:[e.jsx(xe,{$open:u,children:"▶"}),"In Game — ",e.jsx(fe,{children:R.length})]}),u&&R.map(x=>e.jsx(he,{user:x,avatars:r,stats:o,inGame:!0,matchUrl:s==null?void 0:s.get(x.battleTag),isRecentWinner:c==null?void 0:c.has(x.battleTag)},x.battleTag))]}),e.jsxs(ge,{onClick:()=>z(x=>!x),children:[e.jsx(xe,{$open:F,children:"▶"}),"Online — ",e.jsx(fe,{children:D.length})]}),F&&D.map(x=>e.jsx(he,{user:x,avatars:r,stats:o,inGame:!1,matchUrl:null,isRecentWinner:c==null?void 0:c.has(x.battleTag)},x.battleTag))]})]})})}const fn=n.div`
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
`,xn=n.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`,me=n.button`
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
`,un=()=>{const{messages:t,status:r,onlineUsers:o}=Ye(),[a,s]=f.useState(new Map),[c,m]=f.useState(new Map),[d,i]=f.useState(new Map),[l,p]=f.useState([]),[h,u]=f.useState(!1),[S,F]=f.useState(!1),[z,T]=f.useState([]),[w,k]=f.useState(new Set),R=f.useRef(new Set),D=f.useRef(new Set),x=f.useRef(new Set),M=f.useCallback(async()=>{try{const g=await Ee();p(g.matches||[])}catch{}},[]);f.useEffect(()=>{M();const g=setInterval(M,3e4);return()=>clearInterval(g)},[M]),f.useEffect(()=>{const g=new Set(l.map(j=>{var L;return j.id||((L=j.match)==null?void 0:L.id)})),y=[...x.current].filter(j=>j&&!g.has(j));if(x.current=g,y.length===0)return;console.log("[GameEnd] Detected ended matches:",y);async function $(j,L=0){var K,X;console.log(`[GameEnd] Fetching result for ${j}, attempt ${L}`);let U;try{const A=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(j)}`);if(!A.ok)return;const E=await A.json();U=E==null?void 0:E.match}catch{return}if(!U)return;const _=(K=U.teams)==null?void 0:K.findIndex(A=>{var E;return(E=A.players)==null?void 0:E.some(N=>N.won===!0||N.won===1)});if(_<0&&L<3){setTimeout(()=>$(j,L+1),5e3);return}if(_>=0){const A=((X=U.teams[_].players)==null?void 0:X.map(E=>E.battleTag).filter(Boolean))||[];A.length>0&&(k(E=>{const N=new Set(E);return A.forEach(J=>N.add(J)),N}),setTimeout(()=>{k(E=>{const N=new Set(E);return A.forEach(J=>N.delete(J)),N})},12e4))}T(A=>[...A,{...U,id:j,_winnerTeam:_>=0?_:null,_finishedAt:Date.now()}]),setTimeout(()=>{T(A=>A.filter(E=>E.id!==j))},8e3)}for(const j of y)setTimeout(()=>$(j),5e3)},[l]);const v=f.useMemo(()=>{const g=new Set;for(const y of l)for(const $ of y.teams)for(const j of $.players)j.battleTag&&g.add(j.battleTag);const b=Date.now();for(let y=t.length-1;y>=0;y--){const $=t[y],j=new Date($.sent_at||$.sentAt).getTime();if(b-j>6e4)break;const L=$.battle_tag||$.battleTag;L&&g.delete(L)}return g},[l,t]),I=f.useMemo(()=>{const g=new Map;for(const b of l)for(const y of b.teams)for(const $ of y.players)$.battleTag&&g.set($.battleTag,`/player/${encodeURIComponent($.battleTag)}`);return g},[l]);f.useEffect(()=>{const b=[...D.current].filter(y=>!v.has(y));D.current=new Set(v);for(const y of b)Z(y).then($=>{var j;(j=$==null?void 0:$.session)!=null&&j.form&&i(L=>{const U=new Map(L);return U.set(y,$.session.form),U})})},[v]);const C=f.useMemo(()=>{const g=new Set;for(const b of t){const y=b.battle_tag||b.battleTag;y&&g.add(y)}for(const b of o)b.battleTag&&g.add(b.battleTag);return g},[t,o]);return f.useEffect(()=>{const g=[];for(const b of C)R.current.has(b)||(R.current.add(b),g.push(b));if(g.length!==0)for(const b of g)Ae(b).then(y=>{s($=>{const j=new Map($);return j.set(b,y),j})}),Ue(b).then(y=>{y&&m($=>{const j=new Map($);return j.set(b,y),j})}),Z(b).then(y=>{var $;($=y==null?void 0:y.session)!=null&&$.form&&i(j=>{const L=new Map(j);return L.set(b,y.session.form),L})})},[C]),e.jsxs(fn,{children:[e.jsxs(xn,{children:[e.jsx(_t,{matches:l,finishedMatches:z,$mobileVisible:S,onClose:()=>F(!1)}),e.jsx(yt,{messages:t,status:r,avatars:a,stats:c,sessions:d,inGameTags:v,recentWinners:w}),e.jsx(gn,{users:o,avatars:a,stats:c,inGameTags:v,inGameMatchMap:I,recentWinners:w,$mobileVisible:h,onClose:()=>u(!1)})]}),!S&&!h&&e.jsxs(e.Fragment,{children:[e.jsx(me,{$left:"var(--space-4)",onClick:()=>F(!0),children:e.jsx(V,{})}),e.jsx(me,{$right:"var(--space-4)",onClick:()=>u(!0),children:e.jsx(Ne,{})})]})]})};export{un as default};
