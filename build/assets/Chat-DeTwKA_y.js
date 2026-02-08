import{J as Q,a as g,j as e,E as t,r as T,D as V,L as $,n as Z,M as G,K as N,d as ee,m as te,N as re,P as ne}from"./index-HyVcIyen.js";import{G as q}from"./index-D9FQflZs.js";function ae(r){return Q({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(r)}const R="http://localhost:3002",I=500;function oe(){const[r,o]=g.useState([]),[i,a]=g.useState("connecting"),[d,f]=g.useState([]),x=g.useRef(null),b=g.useCallback(y=>{o(c=>{const p=new Set(c.map(k=>k.id)),m=y.filter(k=>!p.has(k.id));if(m.length===0)return c;const w=[...c,...m];return w.length>I?w.slice(w.length-I):w})},[]);return g.useEffect(()=>{let y=!1;fetch(`${R}/api/chat/messages?limit=100`).then(p=>p.json()).then(p=>{y||b(p.reverse())}).catch(()=>{});const c=new EventSource(`${R}/api/chat/stream`);return x.current=c,c.addEventListener("history",p=>{if(y)return;const m=JSON.parse(p.data);b(m)}),c.addEventListener("message",p=>{if(y)return;const m=JSON.parse(p.data);b([m])}),c.addEventListener("delete",p=>{if(y)return;const{id:m}=JSON.parse(p.data);o(w=>w.filter(k=>k.id!==m))}),c.addEventListener("bulk_delete",p=>{if(y)return;const{ids:m}=JSON.parse(p.data),w=new Set(m);o(k=>k.filter(j=>!w.has(j.id)))}),c.addEventListener("users_init",p=>{y||f(JSON.parse(p.data))}),c.addEventListener("user_joined",p=>{if(y)return;const m=JSON.parse(p.data);f(w=>w.some(k=>k.battleTag===m.battleTag)?w:[...w,m])}),c.addEventListener("user_left",p=>{if(y)return;const{battleTag:m}=JSON.parse(p.data);f(w=>w.filter(k=>k.battleTag!==m))}),c.addEventListener("status",p=>{if(y)return;const{state:m}=JSON.parse(p.data);a(m==="Connected"?"connected":m)}),c.addEventListener("heartbeat",()=>{y||a("connected")}),c.onopen=()=>{y||a("connected")},c.onerror=()=>{y||a("reconnecting")},()=>{y=!0,c.close()}},[b]),{messages:r,status:i,onlineUsers:d}}const ie=t.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,se=t.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  border: 24px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;

  @media (max-width: 768px) {
    border-width: 16px;
    border-image: url("/frames/launcher/Maon_Border.png") 120 / 16px stretch;
  }
`,le=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.04) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
`,ce=t($)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,de=t.div`
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
`,pe=t.div`
  position: relative;
  min-height: 90px;
  margin-top: 20px;
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }
`,ge=t.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,fe=t.div`
  position: relative;
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  @media (max-width: 480px) {
    padding-left: 64px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }

  &:hover > .hover-timestamp {
    opacity: 0.5;
  }
`,xe=t.span`
  position: absolute;
  left: 0;
  width: 84px;
  top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
  text-align: center;
`,me=t.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,O=t.img`
  width: 60px;
  height: 60px;
  box-sizing: border-box;
  border-radius: var(--radius-md);
  flex-shrink: 0;
  padding: 10px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${r=>r.$faded?.3:.85};

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
    padding: 6px;
  }
`,he=t.div`
  min-width: 0;
`,ue=t.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,ve=t.span`
  display: inline-flex;
  align-items: center;
`,be=t($)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,ye=t.div`
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
`,we=t.div`
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
`,je=t.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,ke=t.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;
`,Se=t.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,Me=t.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,ze=t.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${r=>r.$win?"var(--green)":"var(--red)"};
  opacity: 0.8;
`,Ce=t.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-md);
  color: var(--red);
  font-size: 22px;
  pointer-events: none;
`,A=t.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
`,Te=t.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,$e=t.button`
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
`,Le=t.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,Ee=t.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function Ue(r){return new Date(r).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function Ne(r){const o=new Date(r),i=new Date,a=o.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(o.getDate()===i.getDate()&&o.getMonth()===i.getMonth()&&o.getFullYear()===i.getFullYear())return a;const f=new Date(i);return f.setDate(f.getDate()-1),o.getDate()===f.getDate()&&o.getMonth()===f.getMonth()&&o.getFullYear()===f.getFullYear()?`Yesterday ${a}`:`${o.getMonth()+1}/${o.getDate()}/${String(o.getFullYear()).slice(2)} ${a}`}function Re(r,o,i){var x;const a=(x=o==null?void 0:o.get(r))==null?void 0:x.profilePicUrl;if(a)return e.jsx(me,{src:a,alt:""});const d=i==null?void 0:i.get(r),f=(d==null?void 0:d.race)!=null?T[d.race]:null;return f?e.jsx(O,{src:f,alt:""}):e.jsx(O,{src:V.random,alt:"",$faded:!0})}function Ie({messages:r,status:o,avatars:i,stats:a,sessions:d,inGameTags:f}){const x=g.useRef(null),[b,y]=g.useState(!0),[c,p]=g.useState(!1),m=g.useMemo(()=>{const j=[];for(let h=0;h<r.length;h++){const u=r[h],M=u.battle_tag||u.battleTag;let s=h===0;if(!s){const l=r[h-1];if((l.battle_tag||l.battleTag)!==M)s=!0;else{const v=new Date(l.sent_at||l.sentAt).getTime();new Date(u.sent_at||u.sentAt).getTime()-v>120*1e3&&(s=!0)}}s?j.push({start:u,continuations:[]}):j.length>0&&j[j.length-1].continuations.push(u)}return j},[r]);g.useEffect(()=>{b&&x.current?x.current.scrollTop=x.current.scrollHeight:!b&&r.length>0&&p(!0)},[r,b]);function w(){const j=x.current;if(!j)return;const h=j.scrollHeight-j.scrollTop-j.clientHeight<40;y(h),h&&p(!1)}function k(){x.current&&(x.current.scrollTop=x.current.scrollHeight),y(!0),p(!1)}return e.jsx(ie,{children:e.jsxs(se,{children:[e.jsx(le,{children:e.jsx(ce,{to:"/",children:"4v4 Chat"})}),r.length===0?e.jsx(Ee,{children:o==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(Le,{children:[e.jsx(de,{ref:x,onScroll:w,children:m.map(j=>{var s,l;const h=j.start,u=h.battle_tag||h.battleTag,M=h.user_name||h.userName;return!u||u==="system"?e.jsx(Te,{children:h.message},h.id):e.jsxs(pe,{children:[e.jsxs(ye,{children:[e.jsxs("div",{style:{position:"relative"},children:[Re(u,i,a),(f==null?void 0:f.has(u))&&e.jsx(Ce,{children:e.jsx(q,{})})]}),(((s=a==null?void 0:a.get(u))==null?void 0:s.mmr)!=null||(d==null?void 0:d.get(u)))&&e.jsxs(we,{children:[((l=a==null?void 0:a.get(u))==null?void 0:l.mmr)!=null&&e.jsxs(je,{children:[e.jsx(ke,{children:Math.round(a.get(u).mmr)}),e.jsx(Se,{children:"MMR"})]}),(d==null?void 0:d.get(u))&&e.jsx(Me,{children:d.get(u).map((n,v)=>e.jsx(ze,{$win:n},v))})]})]}),e.jsx(ge,{children:e.jsxs(he,{children:[e.jsx("div",{children:e.jsxs(ve,{children:[e.jsx(be,{to:`/player/${encodeURIComponent(u)}`,children:M}),e.jsx(ue,{children:Ne(h.sent_at||h.sentAt)})]})}),e.jsx(A,{children:h.message})]})}),j.continuations.map(n=>e.jsxs(fe,{children:[e.jsx(xe,{className:"hover-timestamp",children:Ue(n.sent_at||n.sentAt)}),e.jsx(A,{children:n.message})]},n.id))]},h.id)})}),c&&e.jsx($e,{onClick:k,children:"New messages below"})]})]})})}const Oe=t.aside`
  width: 268px;
  height: 100%;
  box-sizing: border-box;
  border: 24px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    display: none;
  }
`,Ae=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
`,_e=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,De=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,He=t.div`
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
`,Fe=t.div`
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
`,Pe=t($)`
  display: block;
  text-decoration: none;
  color: inherit;
  padding: var(--space-2) var(--space-3);
  margin: 0 var(--space-1);
  border-radius: var(--radius-sm);
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);
  transition: background 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,Be=t.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
`,Ye=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,Je=t.div`
  flex: 1;
  min-width: 0;
`,We=t.div`
  font-family: var(--font-display);
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,Xe=t.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
`,Ve=t.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,qe=t.div`
  width: 100%;
  height: 80px;
  margin-bottom: var(--space-2);
`,Ke=t.div`
  display: flex;
  gap: var(--space-2);
`,_=t.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`,D=t.div`
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${r=>r.$team===1?"var(--blue, #4a9eff)":"var(--red)"};
  opacity: 0.6;
  margin-bottom: 2px;
`,H=t.div`
  display: flex;
  align-items: center;
  gap: 4px;
`,F=t.img`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
`,P=t.span`
  font-family: var(--font-display);
  font-size: 11px;
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`;function Qe({startTime:r}){const[o,i]=g.useState(()=>N(r));return g.useEffect(()=>{const a=setInterval(()=>{i(N(r))},1e3);return()=>clearInterval(a)},[r]),e.jsxs(Xe,{children:[e.jsx(Ve,{}),o]})}function Ze({match:r}){var p,m,w,k,j,h,u,M;const o=r.mapName||((p=r.match)==null?void 0:p.mapName),i=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",a=Z(o),d=r.teams||((m=r.match)==null?void 0:m.teams)||[],f=r.startTime||((w=r.match)==null?void 0:w.startTime),x=d[0],b=d[1],y={teamOneMmrs:((k=x==null?void 0:x.players)==null?void 0:k.map(s=>s.oldMmr||0))||[],teamTwoMmrs:((j=b==null?void 0:b.players)==null?void 0:j.map(s=>s.oldMmr||0))||[]},c=r.id||((h=r.match)==null?void 0:h.id);return e.jsxs(Pe,{to:c?`/match/${c}`:"#",children:[e.jsxs(Be,{children:[a&&e.jsx(Ye,{src:a,alt:""}),e.jsxs(Je,{children:[e.jsx(We,{children:i}),f&&e.jsx(Qe,{startTime:f})]})]}),e.jsx(qe,{children:e.jsx(G,{data:y,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsxs(Ke,{children:[e.jsxs(_,{children:[e.jsx(D,{$team:1,children:"Team 1"}),(u=x==null?void 0:x.players)==null?void 0:u.map((s,l)=>e.jsxs(H,{children:[e.jsx(F,{src:T[s.race],alt:""}),e.jsx(P,{children:s.name})]},l))]}),e.jsxs(_,{children:[e.jsx(D,{$team:2,children:"Team 2"}),(M=b==null?void 0:b.players)==null?void 0:M.map((s,l)=>e.jsxs(H,{children:[e.jsx(F,{src:T[s.race],alt:""}),e.jsx(P,{children:s.name})]},l))]})]})]})}function Ge({matches:r=[]}){return e.jsxs(Oe,{children:[e.jsxs(Ae,{children:[e.jsx(_e,{children:"Active Games"}),e.jsx(De,{children:r.length})]}),r.length===0?e.jsx(Fe,{children:"No active games"}):e.jsx(He,{children:r.map(o=>{var i;return e.jsx(Ze,{match:o},o.id||((i=o.match)==null?void 0:i.id))})})]})}const et=t.aside`
  width: 268px;
  height: 100%;
  box-sizing: border-box;
  border: 24px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    right: 0;
    width: 280px;
    height: 100vh;
    z-index: var(--z-overlay);
    background: rgba(15, 12, 10, 0.95);
    border-width: 16px;
    border-image: url("/frames/launcher/Maon_Border.png") 120 / 16px stretch;
    transform: ${r=>r.$mobileVisible?"translateX(0)":"translateX(100%)"};
    transition: transform 0.25s ease;
  }
`,tt=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
`,rt=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,nt=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,at=t.div`
  position: relative;
  margin: var(--space-2) var(--space-2);

  &::before {
    content: "⌕";
    position: absolute;
    left: 8px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--grey-light);
    font-size: 13px;
    pointer-events: none;
  }
`,ot=t.input`
  width: 100%;
  padding: 6px 28px 6px 24px;
  font-family: var(--font-display);
  font-size: 12px;
  letter-spacing: 0.3px;
  color: #fff;
  background: linear-gradient(180deg, rgba(25, 20, 15, 0.9) 0%, rgba(12, 10, 8, 0.95) 100%);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  outline: none;
  box-sizing: border-box;
  transition: all 0.2s ease;

  &::placeholder {
    color: var(--grey-light);
    font-size: 11px;
  }

  &:focus {
    border-color: var(--gold);
    box-shadow: 0 0 8px rgba(252, 219, 51, 0.15);
  }
`,it=t.button`
  position: absolute;
  right: 6px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--grey-light);
  font-size: 16px;
  cursor: pointer;
  padding: 0 4px;
  line-height: 1;

  &:hover {
    color: #fff;
  }
`,st=t.div`
  display: flex;
  align-items: center;
  padding: var(--space-1) var(--space-4);
  padding-left: calc(var(--space-4) + 28px + var(--space-4));
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: rgba(20, 16, 12, 0.6);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`,K=t.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${r=>r.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,lt=t(K)`
  flex: 1;
`,ct=t(K)`
  flex-shrink: 0;
`,dt=t.div`
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
`,pt=t.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  cursor: default;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,gt=t($)`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,ft=t.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,xt=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,B=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${r=>r.$faded?.2:.85};
`,mt=t.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border-radius: var(--radius-sm);
  color: var(--red);
  font-size: 14px;
  pointer-events: none;
`,ht=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,ut=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,Y=t.div`
  padding: var(--space-2) var(--space-4) var(--space-1);
  font-family: var(--font-mono);
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;

  &:hover {
    color: #fff;
  }
`,J=t.span`
  color: var(--gold);
`,W=t.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${r=>r.$open?"rotate(90deg)":"rotate(0deg)"};
`;function vt(r,o,i){var x;const a=(x=o==null?void 0:o.get(r))==null?void 0:x.profilePicUrl;if(a)return e.jsx(xt,{src:a,alt:""});const d=i==null?void 0:i.get(r),f=(d==null?void 0:d.race)!=null?T[d.race]:null;return f?e.jsx(B,{src:f,alt:""}):e.jsx(B,{src:V.random,alt:"",$faded:!0})}function X({user:r,avatars:o,stats:i,inGame:a,matchUrl:d}){var b;const f=(b=i==null?void 0:i.get(r.battleTag))==null?void 0:b.mmr,x=e.jsxs(e.Fragment,{children:[e.jsxs(ft,{children:[vt(r.battleTag,o,i),a&&e.jsx(mt,{children:e.jsx(q,{})})]}),e.jsx(ht,{children:r.name}),f!=null&&e.jsx(ut,{children:Math.round(f)})]});return d?e.jsx(gt,{to:d,children:x}):e.jsx(pt,{children:x})}function bt({users:r,avatars:o,stats:i,inGameTags:a,inGameMatchMap:d,$mobileVisible:f,onClose:x}){const[b,y]=g.useState(""),[c,p]=g.useState("mmr"),[m,w]=g.useState(!0),[k,j]=g.useState(!0);function h(n){p(n)}const u=g.useMemo(()=>[...r].sort((n,v)=>{var L,E;if(c==="live"){const C=a!=null&&a.has(n.battleTag)?1:0,U=a!=null&&a.has(v.battleTag)?1:0;if(C!==U)return U-C}if(c==="name"){const C=(n.name||"").localeCompare(v.name||"",void 0,{sensitivity:"base"});if(C!==0)return C}const S=((L=i==null?void 0:i.get(n.battleTag))==null?void 0:L.mmr)??-1,z=((E=i==null?void 0:i.get(v.battleTag))==null?void 0:E.mmr)??-1;return S!==z?z-S:(n.name||"").localeCompare(v.name||"",void 0,{sensitivity:"base"})}),[r,i,a,c]),M=g.useMemo(()=>{if(!b.trim())return u;const n=b.toLowerCase();return u.filter(v=>(v.name||"").toLowerCase().includes(n))},[u,b]),{inGameUsers:s,onlineUsers:l}=g.useMemo(()=>{const n=[],v=[];for(const S of M)a!=null&&a.has(S.battleTag)?n.push(S):v.push(S);return{inGameUsers:n,onlineUsers:v}},[M,a]);return e.jsxs(et,{$mobileVisible:f,children:[e.jsxs(tt,{children:[e.jsx(rt,{children:"Channel"}),e.jsx(nt,{children:r.length})]}),e.jsxs(at,{children:[e.jsx(ot,{type:"text",placeholder:"Search players...",value:b,onChange:n=>y(n.target.value)}),b&&e.jsx(it,{onClick:()=>y(""),children:"×"})]}),e.jsxs(st,{children:[e.jsx(lt,{$active:c==="name",onClick:()=>h("name"),children:"Player"}),e.jsx(ct,{$active:c==="mmr",onClick:()=>h("mmr"),children:"MMR"})]}),e.jsxs(dt,{children:[s.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(Y,{onClick:()=>w(n=>!n),children:[e.jsx(W,{$open:m,children:"▶"}),"In Game — ",e.jsx(J,{children:s.length})]}),m&&s.map(n=>e.jsx(X,{user:n,avatars:o,stats:i,inGame:!0,matchUrl:d==null?void 0:d.get(n.battleTag)},n.battleTag))]}),e.jsxs(Y,{onClick:()=>j(n=>!n),children:[e.jsx(W,{$open:k,children:"▶"}),"Online — ",e.jsx(J,{children:l.length})]}),k&&l.map(n=>e.jsx(X,{user:n,avatars:o,stats:i,inGame:!1,matchUrl:null},n.battleTag))]})]})}const yt=t.div`
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
`,wt=t.div`
  display: flex;
  gap: var(--space-4);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`,jt=t.button`
  display: none;
  position: fixed;
  bottom: var(--space-4);
  right: var(--space-4);
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

  @media (max-width: 768px) {
    display: flex;
  }
`,kt=t.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-overlay) - 1);
    background: rgba(0, 0, 0, 0.6);
  }
`,zt=()=>{const{messages:r,status:o,onlineUsers:i}=oe(),[a,d]=g.useState(new Map),[f,x]=g.useState(new Map),[b,y]=g.useState(new Map),[c,p]=g.useState([]),[m,w]=g.useState(!1),k=g.useRef(new Set),j=g.useCallback(async()=>{try{const s=await ee();p(s.matches||[])}catch{}},[]);g.useEffect(()=>{j();const s=setInterval(j,3e4);return()=>clearInterval(s)},[j]);const h=g.useMemo(()=>{const s=new Set;for(const l of c)for(const n of l.teams)for(const v of n.players)v.battleTag&&s.add(v.battleTag);return s},[c]),u=g.useMemo(()=>{const s=new Map;for(const l of c)for(const n of l.teams)for(const v of n.players)v.battleTag&&s.set(v.battleTag,`/player/${encodeURIComponent(v.battleTag)}`);return s},[c]),M=g.useMemo(()=>{const s=new Set;for(const l of r){const n=l.battle_tag||l.battleTag;n&&s.add(n)}for(const l of i)l.battleTag&&s.add(l.battleTag);return s},[r,i]);return g.useEffect(()=>{const s=[];for(const l of M)k.current.has(l)||(k.current.add(l),s.push(l));if(s.length!==0)for(const l of s)te(l).then(n=>{d(v=>{const S=new Map(v);return S.set(l,n),S})}),re(l).then(n=>{n&&x(v=>{const S=new Map(v);return S.set(l,n),S})}),ne(l).then(n=>{var v;(v=n==null?void 0:n.session)!=null&&v.form&&y(S=>{const z=new Map(S);return z.set(l,n.session.form),z})})},[M]),e.jsxs(yt,{children:[e.jsxs(wt,{children:[e.jsx(Ge,{matches:c}),e.jsx(Ie,{messages:r,status:o,avatars:a,stats:f,sessions:b,inGameTags:h}),e.jsx(bt,{users:i,avatars:a,stats:f,inGameTags:h,inGameMatchMap:u,$mobileVisible:m,onClose:()=>w(!1)})]}),m&&e.jsx(kt,{onClick:()=>w(!1)}),e.jsx(jt,{onClick:()=>w(s=>!s),children:e.jsx(ae,{})})]})};export{zt as default};
