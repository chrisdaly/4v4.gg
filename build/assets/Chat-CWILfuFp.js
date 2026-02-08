import{J as I,a as x,j as e,E as t,r as N,D as A,L as z,d as _,m as O,K as H,N as Y}from"./index-BKQ2vVsw.js";import{G as U}from"./index-NusoK17r.js";function F(r){return I({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(r)}const $="http://localhost:3002",T=500;function P(){const[r,i]=x.useState([]),[o,n]=x.useState("connecting"),[p,u]=x.useState([]),v=x.useRef(null),j=x.useCallback(b=>{i(c=>{const g=new Set(c.map(S=>S.id)),h=b.filter(S=>!g.has(S.id));if(h.length===0)return c;const m=[...c,...h];return m.length>T?m.slice(m.length-T):m})},[]);return x.useEffect(()=>{let b=!1;fetch(`${$}/api/chat/messages?limit=100`).then(g=>g.json()).then(g=>{b||j(g.reverse())}).catch(()=>{});const c=new EventSource(`${$}/api/chat/stream`);return v.current=c,c.addEventListener("history",g=>{if(b)return;const h=JSON.parse(g.data);j(h)}),c.addEventListener("message",g=>{if(b)return;const h=JSON.parse(g.data);j([h])}),c.addEventListener("delete",g=>{if(b)return;const{id:h}=JSON.parse(g.data);i(m=>m.filter(S=>S.id!==h))}),c.addEventListener("bulk_delete",g=>{if(b)return;const{ids:h}=JSON.parse(g.data),m=new Set(h);i(S=>S.filter(a=>!m.has(a.id)))}),c.addEventListener("users_init",g=>{b||u(JSON.parse(g.data))}),c.addEventListener("user_joined",g=>{if(b)return;const h=JSON.parse(g.data);u(m=>m.some(S=>S.battleTag===h.battleTag)?m:[...m,h])}),c.addEventListener("user_left",g=>{if(b)return;const{battleTag:h}=JSON.parse(g.data);u(m=>m.filter(S=>S.battleTag!==h))}),c.addEventListener("status",g=>{if(b)return;const{state:h}=JSON.parse(g.data);n(h==="Connected"?"connected":h)}),c.addEventListener("heartbeat",()=>{b||n("connected")}),c.onopen=()=>{b||n("connected")},c.onerror=()=>{b||n("reconnecting")},()=>{b=!0,c.close()}},[j]),{messages:r,status:o,onlineUsers:p}}const J=t.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  border: 16px solid transparent;
  border-image: url("/frames/wc3-frame.png") 80 / 16px stretch;
  background: rgba(15, 12, 10, 0.85);
  backdrop-filter: blur(12px);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
`,B=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.04) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
`,W=t(z)`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,X=t.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2);
  background: ${r=>r.$status==="connected"?"var(--green)":r.$status==="reconnecting"?"var(--gold)":"var(--red)"};
  ${r=>r.$status==="reconnecting"&&"animation: pulse 1.5s infinite;"}
`,V=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
`,q=t.div`
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
`,K=t.div`
  position: relative;
  min-height: 85px;
  margin-top: var(--space-4);
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }
`,Q=t.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,Z=t.div`
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
`,G=t.span`
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
`,ee=t.img`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  flex-shrink: 0;

  @media (max-width: 480px) {
    width: 44px;
    height: 44px;
  }
`,L=t.img`
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
`,te=t.div`
  min-width: 0;
`,re=t.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,ne=t.span`
  display: inline-flex;
  align-items: center;
`,ae=t(z)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,oe=t.div`
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
`,ie=t.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 3px;
  line-height: 1;
  gap: 4px;
`,se=t.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,ce=t.span`
  font-family: var(--font-mono);
  font-size: 14px;
  color: #fff;
  font-weight: 700;
`,le=t.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
`,de=t.div`
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: center;
`,pe=t.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: var(--radius-full);
  background: ${r=>r.$win?"var(--green)":"var(--red)"};
  opacity: 0.8;
`,ge=t.div`
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
`,E=t.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
`,fe=t.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
  font-size: 13px;
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,ue=t.button`
  position: absolute;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 12, 10, 0.9);
  border: 1px solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-full);
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.08);
  }
`,xe=t.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,he=t.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function me(r){return new Date(r).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function ve(r){const i=new Date(r),o=new Date,n=i.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(i.getDate()===o.getDate()&&i.getMonth()===o.getMonth()&&i.getFullYear()===o.getFullYear())return n;const u=new Date(o);return u.setDate(u.getDate()-1),i.getDate()===u.getDate()&&i.getMonth()===u.getMonth()&&i.getFullYear()===u.getFullYear()?`Yesterday ${n}`:`${i.getMonth()+1}/${i.getDate()}/${String(i.getFullYear()).slice(2)} ${n}`}function be(r,i,o){var v;const n=(v=i==null?void 0:i.get(r))==null?void 0:v.profilePicUrl;if(n)return e.jsx(ee,{src:n,alt:""});const p=o==null?void 0:o.get(r),u=(p==null?void 0:p.race)!=null?N[p.race]:null;return u?e.jsx(L,{src:u,alt:""}):e.jsx(L,{src:A.random,alt:"",$faded:!0})}function ye({messages:r,status:i,avatars:o,stats:n,sessions:p,inGameTags:u}){const v=x.useRef(null),[j,b]=x.useState(!0),[c,g]=x.useState(!1),h=x.useMemo(()=>{const a=[];for(let f=0;f<r.length;f++){const y=r[f],k=y.battle_tag||y.battleTag;let l=f===0;if(!l){const s=r[f-1];if((s.battle_tag||s.battleTag)!==k)l=!0;else{const w=new Date(s.sent_at||s.sentAt).getTime();new Date(y.sent_at||y.sentAt).getTime()-w>120*1e3&&(l=!0)}}l?a.push({start:y,continuations:[]}):a.length>0&&a[a.length-1].continuations.push(y)}return a},[r]);x.useEffect(()=>{j&&v.current?v.current.scrollTop=v.current.scrollHeight:!j&&r.length>0&&g(!0)},[r,j]);function m(){const a=v.current;if(!a)return;const f=a.scrollHeight-a.scrollTop-a.clientHeight<40;b(f),f&&g(!1)}function S(){v.current&&(v.current.scrollTop=v.current.scrollHeight),b(!0),g(!1)}return e.jsxs(J,{children:[e.jsxs(B,{children:[e.jsx(W,{to:"/",children:"4v4 Chat"}),e.jsxs(V,{children:[e.jsx(X,{$status:i}),i]})]}),r.length===0?e.jsx(he,{children:i==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(xe,{children:[e.jsx(q,{ref:v,onScroll:m,children:h.map(a=>{var l,s;const f=a.start,y=f.battle_tag||f.battleTag,k=f.user_name||f.userName;return!y||y==="system"?e.jsx(fe,{children:f.message},f.id):e.jsxs(K,{children:[e.jsxs(oe,{children:[e.jsxs("div",{style:{position:"relative"},children:[be(y,o,n),(u==null?void 0:u.has(y))&&e.jsx(ge,{children:e.jsx(U,{})})]}),(((l=n==null?void 0:n.get(y))==null?void 0:l.mmr)!=null||(p==null?void 0:p.get(y)))&&e.jsxs(ie,{children:[((s=n==null?void 0:n.get(y))==null?void 0:s.mmr)!=null&&e.jsxs(se,{children:[e.jsx(ce,{children:Math.round(n.get(y).mmr)}),e.jsx(le,{children:"MMR"})]}),(p==null?void 0:p.get(y))&&e.jsx(de,{children:p.get(y).slice(-10).map((d,w)=>e.jsx(pe,{$win:d},w))})]})]}),e.jsx(Q,{children:e.jsxs(te,{children:[e.jsx("div",{children:e.jsxs(ne,{children:[e.jsx(ae,{to:`/player/${encodeURIComponent(y)}`,children:k}),e.jsx(re,{children:ve(f.sent_at||f.sentAt)})]})}),e.jsx(E,{children:f.message})]})}),a.continuations.map(d=>e.jsxs(Z,{children:[e.jsx(G,{className:"hover-timestamp",children:me(d.sent_at||d.sentAt)}),e.jsx(E,{children:d.message})]},d.id))]},f.id)})}),c&&e.jsx(ue,{onClick:S,children:"New messages below"})]})]})}const we=t.aside`
  width: 220px;
  height: 100%;
  border: 16px solid transparent;
  border-image: url("/frames/wc3-frame.png") 80 / 16px stretch;
  background: rgba(15, 12, 10, 0.85);
  backdrop-filter: blur(12px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;

  @media (max-width: 768px) {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    z-index: var(--z-overlay);
    background: rgba(15, 12, 10, 0.95);
    border-left: 1px solid rgba(160, 130, 80, 0.2);
    border-radius: 0;
    transform: ${r=>r.$mobileVisible?"translateX(0)":"translateX(100%)"};
    transition: transform 0.25s ease;
  }
`,je=t.div`
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
`,Se=t.span`
  color: var(--gold);
`,ke=t.div`
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
`,Me=t.input`
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
`,ze=t.button`
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
`,Ce=t.div`
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
`,D=t.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${r=>r.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,$e=t(D)`
  flex: 1;
`,Te=t(D)`
  flex-shrink: 0;
`,Le=t.div`
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
`,Ee=t.div`
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
`,Re=t(z)`
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
`,Ne=t.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,Ae=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,R=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${r=>r.$faded?.2:.85};
`,Ue=t.div`
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
`,De=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,Ie=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`;function _e(r,i,o){var v;const n=(v=i==null?void 0:i.get(r))==null?void 0:v.profilePicUrl;if(n)return e.jsx(Ae,{src:n,alt:""});const p=o==null?void 0:o.get(r),u=(p==null?void 0:p.race)!=null?N[p.race]:null;return u?e.jsx(R,{src:u,alt:""}):e.jsx(R,{src:A.random,alt:"",$faded:!0})}function Oe({user:r,avatars:i,stats:o,inGame:n,matchUrl:p}){var j;const u=(j=o==null?void 0:o.get(r.battleTag))==null?void 0:j.mmr,v=e.jsxs(e.Fragment,{children:[e.jsxs(Ne,{children:[_e(r.battleTag,i,o),n&&e.jsx(Ue,{children:e.jsx(U,{})})]}),e.jsx(De,{children:r.name}),u!=null&&e.jsx(Ie,{children:Math.round(u)})]});return p?e.jsx(Re,{to:p,children:v}):e.jsx(Ee,{children:v})}function He({users:r,avatars:i,stats:o,inGameTags:n,inGameMatchMap:p,$mobileVisible:u,onClose:v}){const[j,b]=x.useState(""),[c,g]=x.useState("mmr");function h(a){g(a)}const m=x.useMemo(()=>[...r].sort((a,f)=>{var l,s;if(c==="live"){const d=n!=null&&n.has(a.battleTag)?1:0,w=n!=null&&n.has(f.battleTag)?1:0;if(d!==w)return w-d}if(c==="name"){const d=(a.name||"").localeCompare(f.name||"",void 0,{sensitivity:"base"});if(d!==0)return d}const y=((l=o==null?void 0:o.get(a.battleTag))==null?void 0:l.mmr)??-1,k=((s=o==null?void 0:o.get(f.battleTag))==null?void 0:s.mmr)??-1;return y!==k?k-y:(a.name||"").localeCompare(f.name||"",void 0,{sensitivity:"base"})}),[r,o,n,c]),S=x.useMemo(()=>{if(!j.trim())return m;const a=j.toLowerCase();return m.filter(f=>(f.name||"").toLowerCase().includes(a))},[m,j]);return e.jsxs(we,{$mobileVisible:u,children:[e.jsxs(je,{children:["Channel ",e.jsx(Se,{children:r.length})]}),e.jsxs(ke,{children:[e.jsx(Me,{type:"text",placeholder:"Search players...",value:j,onChange:a=>b(a.target.value)}),j&&e.jsx(ze,{onClick:()=>b(""),children:"×"})]}),e.jsxs(Ce,{children:[e.jsx($e,{$active:c==="name",onClick:()=>h("name"),children:"Player"}),e.jsx(Te,{$active:c==="mmr",onClick:()=>h("mmr"),children:"MMR"})]}),e.jsx(Le,{children:S.map(a=>e.jsx(Oe,{user:a,avatars:i,stats:o,inGame:n==null?void 0:n.has(a.battleTag),matchUrl:p==null?void 0:p.get(a.battleTag)},a.battleTag))})]})}const Ye=t.div`
  padding: var(--space-2) var(--space-4) 0;
  max-width: 1600px;
  margin: 0 auto;
  position: relative;

  &::before {
    content: "";
    position: fixed;
    inset: 0;
    background: url("/backgrounds/nightelf.jpg") center / cover no-repeat fixed;
    z-index: -2;
  }

  &::after {
    content: "";
    position: fixed;
    inset: 0;
    background: rgba(12, 10, 8, 0.9);
    z-index: -1;
  }

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2) 0;
  }
`,Fe=t.div`
  display: flex;
  gap: var(--space-4);
  height: calc(100vh - var(--space-2));
`,Pe=t.button`
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
`,Je=t.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-overlay) - 1);
    background: rgba(0, 0, 0, 0.6);
  }
`,Xe=()=>{const{messages:r,status:i,onlineUsers:o}=P(),[n,p]=x.useState(new Map),[u,v]=x.useState(new Map),[j,b]=x.useState(new Map),[c,g]=x.useState([]),[h,m]=x.useState(!1),S=x.useRef(new Set),a=x.useCallback(async()=>{try{const l=await _();g(l.matches||[])}catch{}},[]);x.useEffect(()=>{a();const l=setInterval(a,3e4);return()=>clearInterval(l)},[a]);const f=x.useMemo(()=>{const l=new Set;for(const s of c)for(const d of s.teams)for(const w of d.players)w.battleTag&&l.add(w.battleTag);return l},[c]),y=x.useMemo(()=>{const l=new Map;for(const s of c)for(const d of s.teams)for(const w of d.players)w.battleTag&&l.set(w.battleTag,`/player/${encodeURIComponent(w.battleTag)}`);return l},[c]),k=x.useMemo(()=>{const l=new Set;for(const s of r){const d=s.battle_tag||s.battleTag;d&&l.add(d)}for(const s of o)s.battleTag&&l.add(s.battleTag);return l},[r,o]);return x.useEffect(()=>{const l=[];for(const s of k)S.current.has(s)||(S.current.add(s),l.push(s));if(l.length!==0)for(const s of l)O(s).then(d=>{p(w=>{const M=new Map(w);return M.set(s,d),M})}),H(s).then(d=>{d&&v(w=>{const M=new Map(w);return M.set(s,d),M})}),Y(s).then(d=>{var w;(w=d==null?void 0:d.session)!=null&&w.form&&b(M=>{const C=new Map(M);return C.set(s,d.session.form),C})})},[k]),e.jsxs(Ye,{children:[e.jsxs(Fe,{children:[e.jsx(ye,{messages:r,status:i,avatars:n,stats:u,sessions:j,inGameTags:f}),e.jsx(He,{users:o,avatars:n,stats:u,inGameTags:f,inGameMatchMap:y,$mobileVisible:h,onClose:()=>m(!1)})]}),h&&e.jsx(Je,{onClick:()=>m(!1)}),e.jsx(Pe,{onClick:()=>m(l=>!l),children:e.jsx(F,{})})]})};export{Xe as default};
