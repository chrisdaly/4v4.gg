import{J as X,a as d,j as e,E as t,r as Y,D as P,L as T,d as V,m as q,K,N as Q}from"./index-Dizn3W7p.js";import{G as J}from"./index-81YVtgVx.js";function Z(r){return X({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(r)}const R="http://localhost:3002",E=500;function G(){const[r,i]=d.useState([]),[o,a]=d.useState("connecting"),[p,f]=d.useState([]),v=d.useRef(null),j=d.useCallback(b=>{i(s=>{const g=new Set(s.map(k=>k.id)),u=b.filter(k=>!g.has(k.id));if(u.length===0)return s;const y=[...s,...u];return y.length>E?y.slice(y.length-E):y})},[]);return d.useEffect(()=>{let b=!1;fetch(`${R}/api/chat/messages?limit=100`).then(g=>g.json()).then(g=>{b||j(g.reverse())}).catch(()=>{});const s=new EventSource(`${R}/api/chat/stream`);return v.current=s,s.addEventListener("history",g=>{if(b)return;const u=JSON.parse(g.data);j(u)}),s.addEventListener("message",g=>{if(b)return;const u=JSON.parse(g.data);j([u])}),s.addEventListener("delete",g=>{if(b)return;const{id:u}=JSON.parse(g.data);i(y=>y.filter(k=>k.id!==u))}),s.addEventListener("bulk_delete",g=>{if(b)return;const{ids:u}=JSON.parse(g.data),y=new Set(u);i(k=>k.filter(w=>!y.has(w.id)))}),s.addEventListener("users_init",g=>{b||f(JSON.parse(g.data))}),s.addEventListener("user_joined",g=>{if(b)return;const u=JSON.parse(g.data);f(y=>y.some(k=>k.battleTag===u.battleTag)?y:[...y,u])}),s.addEventListener("user_left",g=>{if(b)return;const{battleTag:u}=JSON.parse(g.data);f(y=>y.filter(k=>k.battleTag!==u))}),s.addEventListener("status",g=>{if(b)return;const{state:u}=JSON.parse(g.data);a(u==="Connected"?"connected":u)}),s.addEventListener("heartbeat",()=>{b||a("connected")}),s.onopen=()=>{b||a("connected")},s.onerror=()=>{b||a("reconnecting")},()=>{b=!0,s.close()}},[j]),{messages:r,status:o,onlineUsers:p}}const ee=t.div`
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
`,te=t.div`
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
`,re=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.04) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
`,ne=t(T)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,ae=t.div`
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
`,oe=t.div`
  position: relative;
  min-height: 90px;
  margin-top: 20px;
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }
`,ie=t.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,se=t.div`
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
`,le=t.span`
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
`,ce=t.img`
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
`,de=t.div`
  min-width: 0;
`,pe=t.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,ge=t.span`
  display: inline-flex;
  align-items: center;
`,fe=t(T)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,xe=t.div`
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
`,ue=t.div`
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
`,he=t.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,me=t.span`
  font-family: var(--font-mono);
  font-size: 15px;
  color: #fff;
  font-weight: 700;
`,ve=t.span`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  opacity: 0.7;
`,be=t.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  justify-content: center;
  max-width: 38px;
`,ye=t.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${r=>r.$win?"var(--green)":"var(--red)"};
  opacity: 0.8;
`,we=t.div`
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
`,N=t.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
`,je=t.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,ke=t.button`
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
`,Se=t.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,Me=t.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ze(r){return new Date(r).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function Ce(r){const i=new Date(r),o=new Date,a=i.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(i.getDate()===o.getDate()&&i.getMonth()===o.getMonth()&&i.getFullYear()===o.getFullYear())return a;const f=new Date(o);return f.setDate(f.getDate()-1),i.getDate()===f.getDate()&&i.getMonth()===f.getMonth()&&i.getFullYear()===f.getFullYear()?`Yesterday ${a}`:`${i.getMonth()+1}/${i.getDate()}/${String(i.getFullYear()).slice(2)} ${a}`}function $e(r,i,o){var v;const a=(v=i==null?void 0:i.get(r))==null?void 0:v.profilePicUrl;if(a)return e.jsx(ce,{src:a,alt:""});const p=o==null?void 0:o.get(r),f=(p==null?void 0:p.race)!=null?Y[p.race]:null;return f?e.jsx(O,{src:f,alt:""}):e.jsx(O,{src:P.random,alt:"",$faded:!0})}function Te({messages:r,status:i,avatars:o,stats:a,sessions:p,inGameTags:f}){const v=d.useRef(null),[j,b]=d.useState(!0),[s,g]=d.useState(!1),u=d.useMemo(()=>{const w=[];for(let h=0;h<r.length;h++){const m=r[h],M=m.battle_tag||m.battleTag;let l=h===0;if(!l){const c=r[h-1];if((c.battle_tag||c.battleTag)!==M)l=!0;else{const x=new Date(c.sent_at||c.sentAt).getTime();new Date(m.sent_at||m.sentAt).getTime()-x>120*1e3&&(l=!0)}}l?w.push({start:m,continuations:[]}):w.length>0&&w[w.length-1].continuations.push(m)}return w},[r]);d.useEffect(()=>{j&&v.current?v.current.scrollTop=v.current.scrollHeight:!j&&r.length>0&&g(!0)},[r,j]);function y(){const w=v.current;if(!w)return;const h=w.scrollHeight-w.scrollTop-w.clientHeight<40;b(h),h&&g(!1)}function k(){v.current&&(v.current.scrollTop=v.current.scrollHeight),b(!0),g(!1)}return e.jsx(ee,{children:e.jsxs(te,{children:[e.jsx(re,{children:e.jsx(ne,{to:"/",children:"4v4 Chat"})}),r.length===0?e.jsx(Me,{children:i==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(Se,{children:[e.jsx(ae,{ref:v,onScroll:y,children:u.map(w=>{var l,c;const h=w.start,m=h.battle_tag||h.battleTag,M=h.user_name||h.userName;return!m||m==="system"?e.jsx(je,{children:h.message},h.id):e.jsxs(oe,{children:[e.jsxs(xe,{children:[e.jsxs("div",{style:{position:"relative"},children:[$e(m,o,a),(f==null?void 0:f.has(m))&&e.jsx(we,{children:e.jsx(J,{})})]}),(((l=a==null?void 0:a.get(m))==null?void 0:l.mmr)!=null||(p==null?void 0:p.get(m)))&&e.jsxs(ue,{children:[((c=a==null?void 0:a.get(m))==null?void 0:c.mmr)!=null&&e.jsxs(he,{children:[e.jsx(me,{children:Math.round(a.get(m).mmr)}),e.jsx(ve,{children:"MMR"})]}),(p==null?void 0:p.get(m))&&e.jsx(be,{children:p.get(m).map((n,x)=>e.jsx(ye,{$win:n},x))})]})]}),e.jsx(ie,{children:e.jsxs(de,{children:[e.jsx("div",{children:e.jsxs(ge,{children:[e.jsx(fe,{to:`/player/${encodeURIComponent(m)}`,children:M}),e.jsx(pe,{children:Ce(h.sent_at||h.sentAt)})]})}),e.jsx(N,{children:h.message})]})}),w.continuations.map(n=>e.jsxs(se,{children:[e.jsx(le,{className:"hover-timestamp",children:ze(n.sent_at||n.sentAt)}),e.jsx(N,{children:n.message})]},n.id))]},h.id)})}),s&&e.jsx(ke,{onClick:k,children:"New messages below"})]})]})})}const Le=t.aside`
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
`,Ue=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
`,Ae=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Re=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Ee=t.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;

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
`,Oe=t.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  margin: 0 var(--space-1);
`,Ne=t.div`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`,_e=t.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
`,_=t.div`
  height: 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  width: ${r=>r.$width||"100%"};
`;function $(){return e.jsxs(Oe,{children:[e.jsx(Ne,{}),e.jsxs(_e,{children:[e.jsx(_,{$width:"75%"}),e.jsx(_,{$width:"50%"})]})]})}function He({matchCount:r=0}){return e.jsxs(Le,{children:[e.jsxs(Ue,{children:[e.jsx(Ae,{children:"Active Games"}),e.jsx(Re,{children:r})]}),e.jsxs(Ee,{children:[e.jsx($,{}),e.jsx($,{}),e.jsx($,{}),e.jsx($,{}),e.jsx($,{})]})]})}const De=t.aside`
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
`,Ie=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
`,Fe=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Be=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Ye=t.div`
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
`,Pe=t.input`
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
`,Je=t.button`
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
`,We=t.div`
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
`,W=t.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${r=>r.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,Xe=t(W)`
  flex: 1;
`,Ve=t(W)`
  flex-shrink: 0;
`,qe=t.div`
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
`,Ke=t.div`
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
`,Qe=t(T)`
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
`,Ze=t.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,Ge=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,H=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${r=>r.$faded?.2:.85};
`,et=t.div`
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
`,tt=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,rt=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,D=t.div`
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
`,I=t.span`
  color: var(--gold);
`,F=t.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${r=>r.$open?"rotate(90deg)":"rotate(0deg)"};
`;function nt(r,i,o){var v;const a=(v=i==null?void 0:i.get(r))==null?void 0:v.profilePicUrl;if(a)return e.jsx(Ge,{src:a,alt:""});const p=o==null?void 0:o.get(r),f=(p==null?void 0:p.race)!=null?Y[p.race]:null;return f?e.jsx(H,{src:f,alt:""}):e.jsx(H,{src:P.random,alt:"",$faded:!0})}function B({user:r,avatars:i,stats:o,inGame:a,matchUrl:p}){var j;const f=(j=o==null?void 0:o.get(r.battleTag))==null?void 0:j.mmr,v=e.jsxs(e.Fragment,{children:[e.jsxs(Ze,{children:[nt(r.battleTag,i,o),a&&e.jsx(et,{children:e.jsx(J,{})})]}),e.jsx(tt,{children:r.name}),f!=null&&e.jsx(rt,{children:Math.round(f)})]});return p?e.jsx(Qe,{to:p,children:v}):e.jsx(Ke,{children:v})}function at({users:r,avatars:i,stats:o,inGameTags:a,inGameMatchMap:p,$mobileVisible:f,onClose:v}){const[j,b]=d.useState(""),[s,g]=d.useState("mmr"),[u,y]=d.useState(!0),[k,w]=d.useState(!0);function h(n){g(n)}const m=d.useMemo(()=>[...r].sort((n,x)=>{var L,U;if(s==="live"){const C=a!=null&&a.has(n.battleTag)?1:0,A=a!=null&&a.has(x.battleTag)?1:0;if(C!==A)return A-C}if(s==="name"){const C=(n.name||"").localeCompare(x.name||"",void 0,{sensitivity:"base"});if(C!==0)return C}const S=((L=o==null?void 0:o.get(n.battleTag))==null?void 0:L.mmr)??-1,z=((U=o==null?void 0:o.get(x.battleTag))==null?void 0:U.mmr)??-1;return S!==z?z-S:(n.name||"").localeCompare(x.name||"",void 0,{sensitivity:"base"})}),[r,o,a,s]),M=d.useMemo(()=>{if(!j.trim())return m;const n=j.toLowerCase();return m.filter(x=>(x.name||"").toLowerCase().includes(n))},[m,j]),{inGameUsers:l,onlineUsers:c}=d.useMemo(()=>{const n=[],x=[];for(const S of M)a!=null&&a.has(S.battleTag)?n.push(S):x.push(S);return{inGameUsers:n,onlineUsers:x}},[M,a]);return e.jsxs(De,{$mobileVisible:f,children:[e.jsxs(Ie,{children:[e.jsx(Fe,{children:"Channel"}),e.jsx(Be,{children:r.length})]}),e.jsxs(Ye,{children:[e.jsx(Pe,{type:"text",placeholder:"Search players...",value:j,onChange:n=>b(n.target.value)}),j&&e.jsx(Je,{onClick:()=>b(""),children:"×"})]}),e.jsxs(We,{children:[e.jsx(Xe,{$active:s==="name",onClick:()=>h("name"),children:"Player"}),e.jsx(Ve,{$active:s==="mmr",onClick:()=>h("mmr"),children:"MMR"})]}),e.jsxs(qe,{children:[l.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(D,{onClick:()=>y(n=>!n),children:[e.jsx(F,{$open:u,children:"▶"}),"In Game — ",e.jsx(I,{children:l.length})]}),u&&l.map(n=>e.jsx(B,{user:n,avatars:i,stats:o,inGame:!0,matchUrl:p==null?void 0:p.get(n.battleTag)},n.battleTag))]}),e.jsxs(D,{onClick:()=>w(n=>!n),children:[e.jsx(F,{$open:k,children:"▶"}),"Online — ",e.jsx(I,{children:c.length})]}),k&&c.map(n=>e.jsx(B,{user:n,avatars:i,stats:o,inGame:!1,matchUrl:null},n.battleTag))]})]})}const ot=t.div`
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
`,it=t.div`
  display: flex;
  gap: var(--space-4);
  height: calc(100vh - var(--space-1));

  @media (max-width: 768px) {
    gap: 0;
    height: 100vh;
  }
`,st=t.button`
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
`,lt=t.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-overlay) - 1);
    background: rgba(0, 0, 0, 0.6);
  }
`,pt=()=>{const{messages:r,status:i,onlineUsers:o}=G(),[a,p]=d.useState(new Map),[f,v]=d.useState(new Map),[j,b]=d.useState(new Map),[s,g]=d.useState([]),[u,y]=d.useState(!1),k=d.useRef(new Set),w=d.useCallback(async()=>{try{const l=await V();g(l.matches||[])}catch{}},[]);d.useEffect(()=>{w();const l=setInterval(w,3e4);return()=>clearInterval(l)},[w]);const h=d.useMemo(()=>{const l=new Set;for(const c of s)for(const n of c.teams)for(const x of n.players)x.battleTag&&l.add(x.battleTag);return l},[s]),m=d.useMemo(()=>{const l=new Map;for(const c of s)for(const n of c.teams)for(const x of n.players)x.battleTag&&l.set(x.battleTag,`/player/${encodeURIComponent(x.battleTag)}`);return l},[s]),M=d.useMemo(()=>{const l=new Set;for(const c of r){const n=c.battle_tag||c.battleTag;n&&l.add(n)}for(const c of o)c.battleTag&&l.add(c.battleTag);return l},[r,o]);return d.useEffect(()=>{const l=[];for(const c of M)k.current.has(c)||(k.current.add(c),l.push(c));if(l.length!==0)for(const c of l)q(c).then(n=>{p(x=>{const S=new Map(x);return S.set(c,n),S})}),K(c).then(n=>{n&&v(x=>{const S=new Map(x);return S.set(c,n),S})}),Q(c).then(n=>{var x;(x=n==null?void 0:n.session)!=null&&x.form&&b(S=>{const z=new Map(S);return z.set(c,n.session.form),z})})},[M]),e.jsxs(ot,{children:[e.jsxs(it,{children:[e.jsx(He,{matchCount:s.length}),e.jsx(Te,{messages:r,status:i,avatars:a,stats:f,sessions:j,inGameTags:h}),e.jsx(at,{users:o,avatars:a,stats:f,inGameTags:h,inGameMatchMap:m,$mobileVisible:u,onClose:()=>y(!1)})]}),u&&e.jsx(lt,{onClick:()=>y(!1)}),e.jsx(st,{onClick:()=>y(l=>!l),children:e.jsx(Z,{})})]})};export{pt as default};
