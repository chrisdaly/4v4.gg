import{J as Le,a as x,j as e,R as Q,C as ve,E as r,r as _,D as be,L as B,n as we,u as Fe,M as Ee,K as Z,N as ye,d as Ae,P as W,m as Ue,Q as _e,w as Ne}from"./index-DxMnafi1.js";import{G as K}from"./index-CZbxLrQH.js";function Ye(t){return Le({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}const ee="http://localhost:3002",te=500;function Be(){const[t,n]=x.useState([]),[o,a]=x.useState("connecting"),[s,c]=x.useState([]),m=x.useRef(null),d=x.useCallback(i=>{n(l=>{const p=new Set(l.map(M=>M.id)),f=i.filter(M=>!p.has(M.id));if(f.length===0)return l;const u=[...l,...f];return u.length>te?u.slice(u.length-te):u})},[]);return x.useEffect(()=>{let i=!1;fetch(`${ee}/api/chat/messages?limit=100`).then(p=>p.json()).then(p=>{i||d(p.reverse())}).catch(()=>{});const l=new EventSource(`${ee}/api/chat/stream`);return m.current=l,l.addEventListener("history",p=>{if(i)return;const f=JSON.parse(p.data);d(f)}),l.addEventListener("message",p=>{if(i)return;const f=JSON.parse(p.data);d([f])}),l.addEventListener("delete",p=>{if(i)return;const{id:f}=JSON.parse(p.data);n(u=>u.filter(M=>M.id!==f))}),l.addEventListener("bulk_delete",p=>{if(i)return;const{ids:f}=JSON.parse(p.data),u=new Set(f);n(M=>M.filter(L=>!u.has(L.id)))}),l.addEventListener("users_init",p=>{i||c(JSON.parse(p.data))}),l.addEventListener("user_joined",p=>{if(i)return;const f=JSON.parse(p.data);c(u=>u.some(M=>M.battleTag===f.battleTag)?u:[...u,f])}),l.addEventListener("user_left",p=>{if(i)return;const{battleTag:f}=JSON.parse(p.data);c(u=>u.filter(M=>M.battleTag!==f))}),l.addEventListener("status",p=>{if(i)return;const{state:f}=JSON.parse(p.data);a(f==="Connected"?"connected":f)}),l.addEventListener("heartbeat",()=>{i||a("connected")}),l.onopen=()=>{i||a("connected")},l.onerror=()=>{i||a("reconnecting")},()=>{i=!0,l.close()}},[d]),{messages:t,status:o,onlineUsers:s}}const X="data:image/svg+xml,%3c?xml%20version='1.0'%20encoding='iso-8859-1'?%3e%3c!--%20Uploaded%20to:%20SVG%20Repo,%20www.svgrepo.com,%20Generator:%20SVG%20Repo%20Mixer%20Tools%20--%3e%3csvg%20height='800px'%20width='800px'%20version='1.1'%20id='Layer_1'%20xmlns='http://www.w3.org/2000/svg'%20xmlns:xlink='http://www.w3.org/1999/xlink'%20viewBox='0%200%20512%20512'%20xml:space='preserve'%3e%3cpolygon%20style='fill:%23ECF0F1;'%20points='461.354,263.687%20347.439,356.077%20257.578,220.794%20167.748,356.035%2053.864,264.199%2043.363,201.714%20158.302,294.71%20257.557,145.29%20356.833,294.71%20471.771,201.714%20'/%3e%3cg%3e%3cpolygon%20style='fill:%23F8C660;'%20points='461.354,263.636%20429.975,450.298%2085.159,450.298%2053.864,264.148%20167.748,356.049%20257.578,220.801%20347.439,356.107%20'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='257.567'%20cy='103.497'%20r='41.796'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='467.592'%20cy='184.999'%20r='33.959'/%3e%3ccircle%20style='fill:%23F8C660;'%20cx='44.408'%20cy='184.999'%20r='33.959'/%3e%3c/g%3e%3cpolygon%20style='fill:%23DF5F4E;'%20points='258.132,413.632%20220.503,360.33%20258.132,307.028%20295.76,360.33%20'/%3e%3cg%3e%3cpath%20style='fill:%23231F20;'%20d='M512,185c0-24.487-19.921-44.408-44.408-44.408S423.184,160.513,423.184,185%20c0,12.43,5.14,23.676,13.398,31.745l-77.398,62.622l-84.14-126.641c20.239-7.206,34.769-26.548,34.769-49.228%20c0-28.808-23.437-52.245-52.245-52.245c-28.808,0-52.245,23.437-52.245,52.245c0,22.675,14.524,42.013,34.754,49.223%20L155.95,279.366l-79.147-64.037c7.443-7.944,12.013-18.61,12.013-30.329c0-24.487-19.921-44.408-44.408-44.408S0,160.513,0,185%20c0,22.076,16.194,40.434,37.326,43.837l37.53,223.14c0.846,5.031,5.203,8.77,10.304,8.77h344.816c5.102,0,9.458-3.738,10.304-8.77%20l37.638-223.767C497.439,223.542,512,205.932,512,185z%20M226.22,103.498c0-17.285,14.062-31.347,31.347-31.347%20s31.347,14.062,31.347,31.347s-14.062,31.347-31.347,31.347S226.22,120.783,226.22,103.498z%20M159.885,305.039%20c2.908-0.446,5.493-2.096,7.12-4.547l90.553-136.319l90.572,136.319c1.628,2.45,4.213,4.1,7.12,4.546%20c2.907,0.443,5.868-0.355,8.155-2.206l92.643-74.956c0.233,0.063,0.465,0.127,0.699,0.186l-5.022,29.879l-101.944,82.772%20l-83.499-125.708c-1.937-2.915-5.204-4.668-8.704-4.668c-3.5,0-6.768,1.752-8.704,4.668l-83.485,125.683L63.491,258.437%20l-5.251-31.246l93.489,75.641C154.016,304.684,156.974,305.482,159.885,305.039z%20M20.898,185c0-12.964,10.546-23.51,23.51-23.51%20s23.51,10.546,23.51,23.51s-10.546,23.51-23.51,23.51S20.898,197.964,20.898,185z%20M421.137,439.849H93.998l-25.26-150.267%20l92.447,74.597c2.287,1.847,5.247,2.63,8.152,2.184c2.905-0.447,5.488-2.104,7.115-4.553l81.126-122.135l81.157,122.181%20c1.63,2.453,4.218,4.103,7.129,4.547c2.916,0.445,5.875-0.362,8.161-2.218l92.437-74.999L421.137,439.849z%20M467.592,208.51%20c-12.964,0-23.51-10.546-23.51-23.51s10.546-23.51,23.51-23.51c12.964,0,23.51,10.546,23.51,23.51S480.556,208.51,467.592,208.51z'%20/%3e%3cpath%20style='fill:%23231F20;'%20d='M266.145,301.002c-1.958-2.773-5.141-4.423-8.536-4.423c-3.395,0-6.578,1.65-8.536,4.423%20l-37.629,53.302c-2.551,3.613-2.551,8.44,0,12.052l37.629,53.302c1.958,2.773,5.141,4.423,8.536,4.423%20c3.395,0,6.578-1.65,8.536-4.423l37.629-53.302c2.551-3.613,2.551-8.44,0-12.052L266.145,301.002z%20M257.609,395.515l-24.838-35.185%20l24.838-35.185l24.838,35.185L257.609,395.515z'/%3e%3c/g%3e%3c/svg%3e",Oe=r.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,He=r.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  border: 16px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 16px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  @media (max-width: 768px) {
    border-width: 12px;
    border-image: url("/frames/launcher/Maon_Border.png") 120 / 12px stretch;
  }
`,Pe=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);

  @media (max-width: 480px) {
    padding: 10px var(--space-2);
  }
`,Je=r(B)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,Ve=r.span`
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Ke=r.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${t=>t.$connected?"var(--green)":"var(--grey-mid)"};
  ${t=>t.$connected&&"animation: pulse 1.5s infinite;"}
`,Xe=r.div`
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
`,qe=r.div`
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
`,Ge=r.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 66px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,Qe=r.div`
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
`,Ze=r.span`
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
`,We=r.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,re=r.img`
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
`,et=r.div`
  min-width: 0;
`,tt=r.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,rt=r.span`
  display: inline-flex;
  align-items: center;
`,nt=r.img`
  width: 16px;
  height: 16px;
  margin-left: 4px;
  filter: drop-shadow(0 0 4px rgba(252, 219, 51, 0.4));
`,ot=r(B)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,at=r.div`
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
`,it=r.div`
  position: relative;
  display: inline-block;
`,st=r.div`
  position: absolute;
  bottom: -1px;
  right: -3px;
  line-height: 0;
`,lt=r.div`
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
`,ct=r.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,dt=r.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;

  @media (max-width: 480px) {
    font-size: 13px;
  }
`,pt=r.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,gt=r.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,xt=r.span`
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
`,ht=r(K)`
  width: 14px;
  height: 14px;
  color: var(--red);
  fill: var(--red);
  margin-left: 6px;
  animation: pulse 1.5s infinite;
  flex-shrink: 0;
`,ne=r.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;

  @media (max-width: 480px) {
    font-size: 14px;
    line-height: 1.5;
  }
`,ft=r.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,mt=r.button`
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
`,ut=r.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,oe=r.div`
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
`,ae=r.span`
  font-family: var(--font-mono);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  white-space: nowrap;
`,vt=r.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ie(t){const n=new Date(t),o=new Date;if(n.getDate()===o.getDate()&&n.getMonth()===o.getMonth()&&n.getFullYear()===o.getFullYear())return"Today";const s=new Date(o);return s.setDate(s.getDate()-1),n.getDate()===s.getDate()&&n.getMonth()===s.getMonth()&&n.getFullYear()===s.getFullYear()?"Yesterday":n.toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"})}function se(t){const n=new Date(t);return`${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`}function bt(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function wt(t){const n=new Date(t),o=new Date,a=n.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(n.getDate()===o.getDate()&&n.getMonth()===o.getMonth()&&n.getFullYear()===o.getFullYear())return a;const c=new Date(o);return c.setDate(c.getDate()-1),n.getDate()===c.getDate()&&n.getMonth()===c.getMonth()&&n.getFullYear()===c.getFullYear()?`Yesterday ${a}`:`${n.getMonth()+1}/${n.getDate()}/${String(n.getFullYear()).slice(2)} ${a}`}function yt(t,n,o){var m;const a=(m=n==null?void 0:n.get(t))==null?void 0:m.profilePicUrl;if(a)return e.jsx(We,{src:a,alt:""});const s=o==null?void 0:o.get(t),c=(s==null?void 0:s.race)!=null?_[s.race]:null;return c?e.jsx(re,{src:c,alt:""}):e.jsx(re,{src:be.random,alt:"",$faded:!0})}function jt({messages:t,status:n,avatars:o,stats:a,sessions:s,inGameTags:c,recentWinners:m}){const d=x.useRef(null),[i,l]=x.useState(!0),[p,f]=x.useState(!1),u=x.useMemo(()=>{const z=[];for(let T=0;T<t.length;T++){const w=t[T],j=w.battle_tag||w.battleTag;let R=T===0;if(!R){const D=t[T-1];if((D.battle_tag||D.battleTag)!==j)R=!0;else{const S=new Date(D.sent_at||D.sentAt).getTime();new Date(w.sent_at||w.sentAt).getTime()-S>120*1e3&&(R=!0)}}R?z.push({start:w,continuations:[]}):z.length>0&&z[z.length-1].continuations.push(w)}return z},[t]);x.useEffect(()=>{i&&d.current?d.current.scrollTop=d.current.scrollHeight:!i&&t.length>0&&f(!0)},[t,i]);function M(){const z=d.current;if(!z)return;const T=z.scrollHeight-z.scrollTop-z.clientHeight<40;l(T),T&&f(!1)}function L(){d.current&&(d.current.scrollTop=d.current.scrollHeight),l(!0),f(!1)}return e.jsxs(Oe,{children:[e.jsxs(Pe,{children:[e.jsx(Je,{to:"/",children:"4v4 Chat"}),e.jsxs(Ve,{children:[e.jsx(Ke,{$connected:n==="connected"}),n==="connected"?t.length:"Connecting..."]})]}),e.jsx(He,{children:t.length===0?e.jsx(vt,{children:n==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(ut,{children:[e.jsx(Xe,{ref:d,onScroll:M,children:u.map((z,T)=>{var v,I,C;const w=z.start,j=w.battle_tag||w.battleTag,R=w.user_name||w.userName,D=w.sent_at||w.sentAt,h=se(D);let S=T===0;if(!S&&T>0){const g=u[T-1].start,b=g.sent_at||g.sentAt;S=se(b)!==h}return!j||j==="system"?e.jsxs(Q.Fragment,{children:[S&&e.jsx(oe,{children:e.jsx(ae,{children:ie(D)})}),e.jsx(ft,{children:w.message})]},w.id):e.jsxs(Q.Fragment,{children:[S&&e.jsx(oe,{children:e.jsx(ae,{children:ie(D)})}),e.jsxs(qe,{children:[e.jsxs(at,{children:[e.jsxs(it,{children:[yt(j,o,a),((v=o==null?void 0:o.get(j))==null?void 0:v.country)&&e.jsx(st,{children:e.jsx(ve,{name:o.get(j).country.toLowerCase()})})]}),(((I=a==null?void 0:a.get(j))==null?void 0:I.mmr)!=null||(s==null?void 0:s.get(j)))&&e.jsxs(lt,{children:[((C=a==null?void 0:a.get(j))==null?void 0:C.mmr)!=null&&e.jsxs(ct,{children:[e.jsx(dt,{children:Math.round(a.get(j).mmr)}),e.jsx(pt,{children:"MMR"})]}),(s==null?void 0:s.get(j))&&e.jsx(gt,{children:s.get(j).map((g,b)=>e.jsx(xt,{$win:g},b))})]})]}),e.jsx(Ge,{children:e.jsxs(et,{children:[e.jsx("div",{children:e.jsxs(rt,{children:[e.jsx(ot,{to:`/player/${encodeURIComponent(j)}`,children:R}),(c==null?void 0:c.has(j))&&e.jsx(ht,{}),(m==null?void 0:m.has(j))&&e.jsx(nt,{src:X,alt:""}),e.jsx(tt,{children:wt(w.sent_at||w.sentAt)})]})}),e.jsx(ne,{children:w.message})]})}),z.continuations.map(g=>e.jsxs(Qe,{children:[e.jsx(Ze,{className:"hover-timestamp",children:bt(g.sent_at||g.sentAt)}),e.jsx(ne,{children:g.message})]},g.id))]})]},w.id)})}),p&&e.jsx(mt,{onClick:L,children:"New messages below"})]})})]})}const kt=r.aside`
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
`,Mt=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  flex-shrink: 0;
`,St=r.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  border: 16px solid transparent;
  border-top: none;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 16px stretch;
  border-image-outset: 0;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);

  @media (max-width: 768px) {
    border-width: 0 12px 12px;
    border-image: url("/frames/launcher/Maon_Border.png") 120 / 12px stretch;
  }
`,Ct=r.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,$t=r.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Tt=r.button`
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
`,zt=r.button`
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
`,Dt=r.div`
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
`,Rt=r.div`
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
`,It=r(B)`
  display: block;
  text-decoration: none;
  color: inherit;
  margin: var(--space-4) var(--space-1);
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  overflow: hidden;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(160, 130, 80, 0.25);
  }
`,je=r.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-4) var(--space-3);
  background: rgba(255, 255, 255, 0.02);
`,ke=r.img`
  width: 56px;
  height: 56px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,Me=r.div`
  flex: 1;
  min-width: 0;
`,Se=r.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Ce=r.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 2px;
`,$e=r.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;
`,Te=r.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`,ze=r.div`
  width: 70px;
  flex-shrink: 0;
  align-self: stretch;
  padding: 0;
  box-sizing: border-box;
`,De=r.div`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-top: 2px;
`,Lt=r.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,Re=r.div`
  display: flex;
  align-items: stretch;
  padding: var(--space-2) var(--space-4);
  gap: 0;
`,le=r.div`
  flex: 1;
  min-width: 0;
`,H=r.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 5px;
  flex-direction: ${t=>t.$reverse?"row-reverse":"row"};

  &:last-child {
    margin-bottom: 0;
  }
`,P=r.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
`,J=r.span`
  font-family: var(--font-display);
  font-size: 14px;
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
`,Ft=ye`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,Et=ye`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,At=r(B)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) var(--space-1);
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${Ft} 8s ease forwards;
`,Ut=r.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${Et} 2s ease-out forwards;
`,_t=r.div`
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
`,ce=r.div`
  flex: 1;
  min-width: 0;
`,de=r.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function pe(t){var a;const o=(t.teams||((a=t.match)==null?void 0:a.teams)||[]).flatMap(s=>{var c;return((c=s.players)==null?void 0:c.map(m=>m.oldMmr||0))||[]});return o.length>0?o.reduce((s,c)=>s+c,0)/o.length:0}function Nt({startTime:t}){const[n,o]=x.useState(()=>Z(t));return x.useEffect(()=>{const a=setInterval(()=>{o(Z(t))},1e3);return()=>clearInterval(a)},[t]),e.jsxs(De,{children:[e.jsx(Lt,{}),n]})}function Yt({match:t}){var z,T,w,j,R,D,h,S;const n=Fe(),o=t.mapName||((z=t.match)==null?void 0:z.mapName),a=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",s=we(o),c=t.teams||((T=t.match)==null?void 0:T.teams)||[],m=t.startTime||((w=t.match)==null?void 0:w.startTime),d=c[0],i=c[1],l=((j=d==null?void 0:d.players)==null?void 0:j.map(v=>v.oldMmr||0))||[],p=((R=i==null?void 0:i.players)==null?void 0:R.map(v=>v.oldMmr||0))||[],f=[...l,...p],u=f.length>0?Math.round(f.reduce((v,I)=>v+I,0)/f.length):null,M={teamOneMmrs:l,teamTwoMmrs:p},L=t.id||((D=t.match)==null?void 0:D.id);return e.jsxs(It,{to:L?`/match/${L}`:"/",children:[e.jsxs(je,{children:[s&&e.jsx(ke,{src:s,alt:""}),e.jsxs(Me,{children:[e.jsx(Se,{children:a}),u!=null&&e.jsxs(Ce,{children:[e.jsx($e,{children:u}),e.jsx(Te,{children:"MMR"})]}),m&&e.jsx(Nt,{startTime:m})]})]}),e.jsxs(Re,{children:[e.jsx(le,{$team:1,children:(h=d==null?void 0:d.players)==null?void 0:h.map((v,I)=>e.jsxs(H,{children:[e.jsx(P,{src:_[v.race],alt:""}),e.jsx(J,{onClick:C=>{C.preventDefault(),C.stopPropagation(),n.push(`/player/${encodeURIComponent(v.battleTag)}`)},children:v.name})]},I))}),e.jsx(ze,{children:e.jsx(Ee,{data:M,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(le,{$team:2,children:(S=i==null?void 0:i.players)==null?void 0:S.map((v,I)=>e.jsxs(H,{$reverse:!0,children:[e.jsx(P,{src:_[v.race],alt:""}),e.jsx(J,{$right:!0,onClick:C=>{C.preventDefault(),C.stopPropagation(),n.push(`/player/${encodeURIComponent(v.battleTag)}`)},children:v.name})]},I))})]})]})}function Bt({match:t}){var j,R,D,h,S,v,I;const n=t.mapName||((j=t.match)==null?void 0:j.mapName),o=(n==null?void 0:n.replace(/^\(\d\)\s*/,""))||"Unknown",a=we(n),s=t.teams||((R=t.match)==null?void 0:R.teams)||[],c=t._winnerTeam,m=t.durationInSeconds,d=m?`${Math.floor(m/60)}:${String(m%60).padStart(2,"0")}`:null,i=s[0],l=s[1],p=((D=i==null?void 0:i.players)==null?void 0:D.map(C=>C.oldMmr||0))||[],f=((h=l==null?void 0:l.players)==null?void 0:h.map(C=>C.oldMmr||0))||[],u=[...p,...f],M=u.length>0?Math.round(u.reduce((C,g)=>C+g,0)/u.length):null,L=t.id||((S=t.match)==null?void 0:S.id),z=c===0?ce:de,T=c===1?ce:de,w=c===0?"25%":"75%";return e.jsxs(At,{to:L?`/match/${L}`:"/",style:{"--crown-end-x":w},children:[e.jsx(_t,{}),c!=null&&e.jsx(Ut,{src:X,alt:""}),e.jsxs(je,{children:[a&&e.jsx(ke,{src:a,alt:""}),e.jsxs(Me,{children:[e.jsx(Se,{children:o}),M!=null&&e.jsxs(Ce,{children:[e.jsx($e,{children:M}),e.jsx(Te,{children:"MMR"})]}),d&&e.jsx(De,{children:d})]})]}),e.jsxs(Re,{children:[e.jsx(z,{children:(v=i==null?void 0:i.players)==null?void 0:v.map((C,g)=>e.jsxs(H,{children:[e.jsx(P,{src:_[C.race],alt:""}),e.jsx(J,{children:C.name})]},g))}),e.jsx(ze,{}),e.jsx(T,{children:(I=l==null?void 0:l.players)==null?void 0:I.map((C,g)=>e.jsxs(H,{$reverse:!0,children:[e.jsx(P,{src:_[C.race],alt:""}),e.jsx(J,{$right:!0,children:C.name})]},g))})]})]})}function Ot({matches:t=[],finishedMatches:n=[],$mobileVisible:o,onClose:a}){const[s,c]=x.useState("mmr"),m=x.useMemo(()=>{const d=[...t];return s==="mmr"?d.sort((i,l)=>pe(l)-pe(i)):d.sort((i,l)=>{var u,M;const p=new Date(i.startTime||((u=i.match)==null?void 0:u.startTime)||0).getTime();return new Date(l.startTime||((M=l.match)==null?void 0:M.startTime)||0).getTime()-p}),d},[t,s]);return e.jsxs(kt,{$mobileVisible:o,children:[e.jsxs(Mt,{children:[e.jsx(Ct,{children:"Active Games"}),e.jsx($t,{children:t.length}),e.jsx(Tt,{onClick:()=>c(d=>d==="mmr"?"recent":"mmr"),children:s==="mmr"?"MMR":"Recent"}),e.jsx(zt,{onClick:a,children:"×"})]}),e.jsx(St,{children:m.length===0&&n.length===0?e.jsx(Rt,{children:"No active games"}):e.jsxs(Dt,{children:[n.map(d=>e.jsx(Bt,{match:d},`fin-${d.id}`)),m.map(d=>{var i;return e.jsx(Yt,{match:d},d.id||((i=d.match)==null?void 0:i.id))})]})})]})}const Ht=r.aside`
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
`,Pt=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  flex-shrink: 0;
`,Jt=r.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  border: 16px solid transparent;
  border-top: none;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 16px stretch;
  border-image-outset: 0;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);

  @media (max-width: 768px) {
    border-width: 0 12px 12px;
    border-image: url("/frames/launcher/Maon_Border.png") 120 / 12px stretch;
  }
`,Vt=r.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Kt=r.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Xt=r.button`
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
`,qt=r.div`
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
`,Gt=r.input`
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
`,Qt=r.button`
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
`,Zt=r.div`
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
`,Ie=r.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,Wt=r(Ie)`
  flex: 1;
`,er=r(Ie)`
  flex-shrink: 0;
`,tr=r.div`
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
`,rr=r.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,nr=r(B)`
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
`,or=r.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,ar=r.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,ir=r.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,ge=r.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,sr=r(K)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,lr=r.img.attrs({src:X,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,cr=r.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,dr=r.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,pr=r.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,xe=r.div`
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
`,he=r.span`
  color: var(--gold);
`,fe=r.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function gr(t,n,o){var m;const a=(m=n==null?void 0:n.get(t))==null?void 0:m.profilePicUrl;if(a)return e.jsx(ir,{src:a,alt:""});const s=o==null?void 0:o.get(t),c=(s==null?void 0:s.race)!=null?_[s.race]:null;return c?e.jsx(ge,{src:c,alt:""}):e.jsx(ge,{src:be.random,alt:"",$faded:!0})}function me({user:t,avatars:n,stats:o,inGame:a,matchUrl:s,isRecentWinner:c}){var f;const m=o==null?void 0:o.get(t.battleTag),d=m==null?void 0:m.mmr,i=(m==null?void 0:m.race)!=null?_[m.race]:null,l=(f=n==null?void 0:n.get(t.battleTag))==null?void 0:f.country,p=e.jsxs(e.Fragment,{children:[e.jsxs(or,{children:[gr(t.battleTag,n,o),l&&e.jsx(ar,{children:e.jsx(ve,{name:l.toLowerCase(),style:{width:14,height:10}})})]}),a&&e.jsx(sr,{}),c&&e.jsx(lr,{}),i&&e.jsx(cr,{src:i,alt:""}),e.jsx(dr,{children:t.name}),d!=null&&e.jsx(pr,{children:Math.round(d)})]});return s?e.jsx(nr,{to:s,children:p}):e.jsx(rr,{children:p})}function xr({users:t,avatars:n,stats:o,inGameTags:a,inGameMatchMap:s,recentWinners:c,$mobileVisible:m,onClose:d}){const[i,l]=x.useState(""),[p,f]=x.useState("mmr"),[u,M]=x.useState(!0),[L,z]=x.useState(!0);function T(h){f(h)}const w=x.useMemo(()=>[...t].sort((h,S)=>{var C,g;if(p==="live"){const b=a!=null&&a.has(h.battleTag)?1:0,y=a!=null&&a.has(S.battleTag)?1:0;if(b!==y)return y-b}if(p==="name"){const b=(h.name||"").localeCompare(S.name||"",void 0,{sensitivity:"base"});if(b!==0)return b}const v=((C=o==null?void 0:o.get(h.battleTag))==null?void 0:C.mmr)??-1,I=((g=o==null?void 0:o.get(S.battleTag))==null?void 0:g.mmr)??-1;return v!==I?I-v:(h.name||"").localeCompare(S.name||"",void 0,{sensitivity:"base"})}),[t,o,a,p]),j=x.useMemo(()=>{if(!i.trim())return w;const h=i.toLowerCase();return w.filter(S=>(S.name||"").toLowerCase().includes(h))},[w,i]),{inGameUsers:R,onlineUsers:D}=x.useMemo(()=>{const h=[],S=[];for(const v of j)a!=null&&a.has(v.battleTag)?h.push(v):S.push(v);return{inGameUsers:h,onlineUsers:S}},[j,a]);return e.jsxs(Ht,{$mobileVisible:m,children:[e.jsxs(Pt,{children:[e.jsx(Vt,{children:"Channel"}),e.jsx(Kt,{children:t.length}),e.jsx(Xt,{onClick:d,children:"×"})]}),e.jsxs(Jt,{children:[e.jsxs(qt,{children:[e.jsx(Gt,{type:"text",placeholder:"Search players...",value:i,onChange:h=>l(h.target.value)}),i&&e.jsx(Qt,{onClick:()=>l(""),children:"×"})]}),e.jsxs(Zt,{children:[e.jsx(Wt,{$active:p==="name",onClick:()=>T("name"),children:"Player"}),e.jsx(er,{$active:p==="mmr",onClick:()=>T("mmr"),children:"MMR"})]}),e.jsxs(tr,{children:[R.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(xe,{onClick:()=>M(h=>!h),children:[e.jsx(fe,{$open:u,children:"▶"}),"In Game — ",e.jsx(he,{children:R.length})]}),u&&R.map(h=>e.jsx(me,{user:h,avatars:n,stats:o,inGame:!0,matchUrl:s==null?void 0:s.get(h.battleTag),isRecentWinner:c==null?void 0:c.has(h.battleTag)},h.battleTag))]}),e.jsxs(xe,{onClick:()=>z(h=>!h),children:[e.jsx(fe,{$open:L,children:"▶"}),"Online — ",e.jsx(he,{children:D.length})]}),L&&D.map(h=>e.jsx(me,{user:h,avatars:n,stats:o,inGame:!1,matchUrl:null,isRecentWinner:c==null?void 0:c.has(h.battleTag)},h.battleTag))]})]})]})}const hr=r.div`
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
`,fr=r.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`,ue=r.button`
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
`,vr=()=>{const{messages:t,status:n,onlineUsers:o}=Be(),[a,s]=x.useState(new Map),[c,m]=x.useState(new Map),[d,i]=x.useState(new Map),[l,p]=x.useState([]),[f,u]=x.useState(!1),[M,L]=x.useState(!1),[z,T]=x.useState([]),[w,j]=x.useState(new Set),R=x.useRef(new Set),D=x.useRef(new Set),h=x.useRef(new Set),S=x.useCallback(async()=>{try{const g=await Ae();p(g.matches||[])}catch{}},[]);x.useEffect(()=>{S();const g=setInterval(S,3e4);return()=>clearInterval(g)},[S]),x.useEffect(()=>{const g=new Set(l.map(k=>{var F;return k.id||((F=k.match)==null?void 0:F.id)})),y=[...h.current].filter(k=>k&&!g.has(k));if(h.current=g,y.length===0)return;async function $(k,F=0){var q,G;const N=await Ne(k),O=N==null?void 0:N.match;if(!O)return;const Y=(q=O.teams)==null?void 0:q.findIndex(A=>{var E;return(E=A.players)==null?void 0:E.some(U=>U.won===!0||U.won===1)});if(Y<0&&F<3){setTimeout(()=>$(k,F+1),5e3);return}if(Y>=0){const A=((G=O.teams[Y].players)==null?void 0:G.map(E=>E.battleTag).filter(Boolean))||[];A.length>0&&(j(E=>{const U=new Set(E);return A.forEach(V=>U.add(V)),U}),setTimeout(()=>{j(E=>{const U=new Set(E);return A.forEach(V=>U.delete(V)),U})},12e4))}T(A=>[...A,{...O,id:k,_winnerTeam:Y>=0?Y:null,_finishedAt:Date.now()}]),setTimeout(()=>{T(A=>A.filter(E=>E.id!==k))},8e3)}for(const k of y)setTimeout(()=>$(k),5e3)},[l]);const v=x.useMemo(()=>{const g=new Set;for(const y of l)for(const $ of y.teams)for(const k of $.players)k.battleTag&&g.add(k.battleTag);const b=Date.now();for(let y=t.length-1;y>=0;y--){const $=t[y],k=new Date($.sent_at||$.sentAt).getTime();if(b-k>6e4)break;const F=$.battle_tag||$.battleTag;F&&g.delete(F)}return g},[l,t]),I=x.useMemo(()=>{const g=new Map;for(const b of l)for(const y of b.teams)for(const $ of y.players)$.battleTag&&g.set($.battleTag,`/player/${encodeURIComponent($.battleTag)}`);return g},[l]);x.useEffect(()=>{const b=[...D.current].filter(y=>!v.has(y));D.current=new Set(v);for(const y of b)W(y).then($=>{var k;(k=$==null?void 0:$.session)!=null&&k.form&&i(F=>{const N=new Map(F);return N.set(y,$.session.form),N})})},[v]);const C=x.useMemo(()=>{const g=new Set;for(const b of t){const y=b.battle_tag||b.battleTag;y&&g.add(y)}for(const b of o)b.battleTag&&g.add(b.battleTag);return g},[t,o]);return x.useEffect(()=>{const g=[];for(const b of C)R.current.has(b)||(R.current.add(b),g.push(b));if(g.length!==0)for(const b of g)Ue(b).then(y=>{s($=>{const k=new Map($);return k.set(b,y),k})}),_e(b).then(y=>{y&&m($=>{const k=new Map($);return k.set(b,y),k})}),W(b).then(y=>{var $;($=y==null?void 0:y.session)!=null&&$.form&&i(k=>{const F=new Map(k);return F.set(b,y.session.form),F})})},[C]),e.jsxs(hr,{children:[e.jsxs(fr,{children:[e.jsx(Ot,{matches:l,finishedMatches:z,$mobileVisible:M,onClose:()=>L(!1)}),e.jsx(jt,{messages:t,status:n,avatars:a,stats:c,sessions:d,inGameTags:v,recentWinners:w}),e.jsx(xr,{users:o,avatars:a,stats:c,inGameTags:v,inGameMatchMap:I,recentWinners:w,$mobileVisible:f,onClose:()=>u(!1)})]}),!M&&!f&&e.jsxs(e.Fragment,{children:[e.jsx(ue,{$left:"var(--space-4)",onClick:()=>L(!0),children:e.jsx(K,{})}),e.jsx(ue,{$right:"var(--space-4)",onClick:()=>u(!0),children:e.jsx(Ye,{})})]})]})};export{vr as default};
