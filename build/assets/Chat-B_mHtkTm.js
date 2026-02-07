import{J as N,a as p,j as e,C as U,E as n,r as L,D as E,L as $,d as R,m as A,K as I}from"./index-CrsUVmPt.js";import{G as _}from"./index-iQvI4sIm.js";function O(r){return N({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(r)}const k="http://localhost:3002",T=500;function H(){const[r,g]=p.useState([]),[o,x]=p.useState("connecting"),[u,l]=p.useState([]),b=p.useRef(null),m=p.useCallback(h=>{g(s=>{const i=new Set(s.map(t=>t.id)),a=h.filter(t=>!i.has(t.id));if(a.length===0)return s;const c=[...s,...a];return c.length>T?c.slice(c.length-T):c})},[]);return p.useEffect(()=>{let h=!1;fetch(`${k}/api/chat/messages?limit=100`).then(i=>i.json()).then(i=>{h||m(i.reverse())}).catch(()=>{});const s=new EventSource(`${k}/api/chat/stream`);return b.current=s,s.addEventListener("history",i=>{if(h)return;const a=JSON.parse(i.data);m(a)}),s.addEventListener("message",i=>{if(h)return;const a=JSON.parse(i.data);m([a])}),s.addEventListener("delete",i=>{if(h)return;const{id:a}=JSON.parse(i.data);g(c=>c.filter(t=>t.id!==a))}),s.addEventListener("bulk_delete",i=>{if(h)return;const{ids:a}=JSON.parse(i.data),c=new Set(a);g(t=>t.filter(v=>!c.has(v.id)))}),s.addEventListener("users_init",i=>{h||l(JSON.parse(i.data))}),s.addEventListener("user_joined",i=>{if(h)return;const a=JSON.parse(i.data);l(c=>c.some(t=>t.battleTag===a.battleTag)?c:[...c,a])}),s.addEventListener("user_left",i=>{if(h)return;const{battleTag:a}=JSON.parse(i.data);l(c=>c.filter(t=>t.battleTag!==a))}),s.addEventListener("status",i=>{if(h)return;const{state:a}=JSON.parse(i.data);x(a==="Connected"?"connected":a)}),s.addEventListener("heartbeat",()=>{h||x("connected")}),s.onopen=()=>{h||x("connected")},s.onerror=()=>{h||x("reconnecting")},()=>{h=!0,s.close()}},[m]),{messages:r,status:o,onlineUsers:u}}const J=n.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
`,P=n.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
`,B=n.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`,D=n.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2);
  background: ${r=>r.$status==="connected"?"var(--green)":r.$status==="reconnecting"?"var(--gold)":"var(--red)"};
  ${r=>r.$status==="reconnecting"&&"animation: pulse 1.5s infinite;"}
`,X=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
`,F=n.div`
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
`,G=n.div`
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 3px 0;
  margin-top: var(--space-2);
  line-height: 1.5;
  border-radius: var(--radius-sm);

  &:first-child {
    margin-top: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`,W=n.div`
  padding: 1px 0;
  padding-left: 42px;
  line-height: 1.5;
  border-radius: var(--radius-sm);

  @media (max-width: 480px) {
    padding-left: 34px;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
`,q=n.img`
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  margin-top: 1px;

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
  }
`,C=n.img`
  width: 32px;
  height: 32px;
  box-sizing: border-box;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  margin-top: 1px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${r=>r.$faded?.3:.85};

  @media (max-width: 480px) {
    width: 24px;
    height: 24px;
    padding: 3px;
  }
`,V=n.div`
  min-width: 0;
`,K=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-right: 6px;
`,Y=n.span`
  display: inline-flex;
  align-items: center;
  position: relative;

  &:hover > .hover-flag {
    opacity: 1;
  }
`,Q=n.span`
  position: absolute;
  right: 100%;
  margin-right: 2px;
  opacity: 0;
  transition: opacity 0.15s;
  display: inline-flex;
  align-items: center;
  pointer-events: none;
`,Z=n($)`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  margin-right: var(--space-2);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`,ee=n.div`
  position: relative;
  flex-shrink: 0;
`,te=n(_)`
  position: absolute;
  top: -3px;
  right: -3px;
  width: 10px;
  height: 10px;
  color: var(--red);
  background: var(--grey-dark);
  border-radius: 50%;
  padding: 1px;
  animation: pulse 1.5s infinite;
`,M=n.span`
  color: rgba(255, 255, 255, 0.88);
  font-size: var(--text-xs);
  word-break: break-word;
`,re=n.div`
  padding: 2px 0;
  padding-left: 42px;
  line-height: 1.5;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  font-style: italic;
  opacity: 0.7;
`,ne=n.button`
  position: absolute;
  bottom: var(--space-4);
  left: 50%;
  transform: translateX(-50%);
  background: var(--grey-dark);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-full);
  color: var(--gold);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;

  &:hover {
    border-color: var(--gold);
  }
`,ae=n.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,oe=n.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function ie(r){return new Date(r).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function se(r,g,o){var b;const x=(b=g==null?void 0:g.get(r))==null?void 0:b.profilePicUrl;if(x)return e.jsx(q,{src:x,alt:""});const u=o==null?void 0:o.get(r),l=(u==null?void 0:u.race)!=null?L[u.race]:null;return l?e.jsx(C,{src:l,alt:""}):e.jsx(C,{src:E.random,alt:"",$faded:!0})}function ce({messages:r,status:g,avatars:o,stats:x,inGameTags:u}){const l=p.useRef(null),[b,m]=p.useState(!0),[h,s]=p.useState(!1),i=p.useMemo(()=>r.map((t,v)=>{if(v===0)return{...t,isGroupStart:!0};const w=r[v-1],d=w.battle_tag||w.battleTag,f=t.battle_tag||t.battleTag;if(d!==f)return{...t,isGroupStart:!0};const y=new Date(w.sent_at||w.sentAt).getTime();return new Date(t.sent_at||t.sentAt).getTime()-y>120*1e3?{...t,isGroupStart:!0}:{...t,isGroupStart:!1}}),[r]);p.useEffect(()=>{b&&l.current?l.current.scrollTop=l.current.scrollHeight:!b&&r.length>0&&s(!0)},[r,b]);function a(){const t=l.current;if(!t)return;const v=t.scrollHeight-t.scrollTop-t.clientHeight<40;m(v),v&&s(!1)}function c(){l.current&&(l.current.scrollTop=l.current.scrollHeight),m(!0),s(!1)}return e.jsxs(J,{children:[e.jsxs(P,{children:[e.jsx(B,{children:"4v4 Chat"}),e.jsxs(X,{children:[e.jsx(D,{$status:g}),g]})]}),r.length===0?e.jsx(oe,{children:g==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(ae,{children:[e.jsx(F,{ref:l,onScroll:a,children:i.map(t=>{var f;const v=t.battle_tag||t.battleTag,w=t.user_name||t.userName,d=(f=o==null?void 0:o.get(v))==null?void 0:f.country;return!v||v==="system"?e.jsx(re,{children:t.message},t.id):t.isGroupStart?e.jsxs(G,{children:[e.jsxs(ee,{children:[se(v,o,x),(u==null?void 0:u.has(v))&&e.jsx(te,{})]}),e.jsxs(V,{children:[e.jsx(K,{children:ie(t.sent_at||t.sentAt)}),e.jsxs(Y,{children:[e.jsx(Q,{className:"hover-flag",children:e.jsx(U,{name:d})}),e.jsx(Z,{to:`/player/${encodeURIComponent(v)}`,children:w})]}),e.jsx(M,{children:t.message})]})]},t.id):e.jsx(W,{children:e.jsx(M,{children:t.message})},t.id)})}),h&&e.jsx(ne,{onClick:c,children:"New messages below"})]})]})}const le=n.aside`
  width: 220px;
  height: calc(100vh - 80px);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
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
    background: var(--grey-dark);
    border-left: 1px solid var(--grey-mid);
    border-radius: 0;
    transform: ${r=>r.$mobileVisible?"translateX(0)":"translateX(100%)"};
    transition: transform 0.25s ease;
  }
`,de=n.div`
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
`,pe=n.span`
  color: var(--gold);
`,ue=n.input`
  width: 100%;
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--grey-mid);
  outline: none;

  &::placeholder {
    color: var(--grey-light);
    opacity: 0.5;
  }

  &:focus {
    border-bottom-color: var(--gold);
  }
`,fe=n.div`
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
`,ge=n.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px var(--space-3);
  cursor: default;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,xe=n($)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px var(--space-3);
  cursor: pointer;
  text-decoration: none;
  color: inherit;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,he=n.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,me=n.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
`,z=n.img`
  width: 24px;
  height: 24px;
  border-radius: 50%;
  padding: 3px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${r=>r.$faded?.2:.85};
`,ve=n.span`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 6px;
  height: 6px;
  background: var(--red);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
`,be=n.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,ye=n.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  opacity: 0.7;
  flex-shrink: 0;
`;function we(r,g,o){var b;const x=(b=g==null?void 0:g.get(r))==null?void 0:b.profilePicUrl;if(x)return e.jsx(me,{src:x,alt:""});const u=o==null?void 0:o.get(r),l=(u==null?void 0:u.race)!=null?L[u.race]:null;return l?e.jsx(z,{src:l,alt:""}):e.jsx(z,{src:E.random,alt:"",$faded:!0})}function Se({user:r,avatars:g,stats:o,inGame:x,matchUrl:u}){var m;const l=(m=o==null?void 0:o.get(r.battleTag))==null?void 0:m.mmr,b=e.jsxs(e.Fragment,{children:[e.jsxs(he,{children:[we(r.battleTag,g,o),x&&e.jsx(ve,{})]}),e.jsx(be,{children:r.name}),e.jsx(ye,{children:l!=null?Math.round(l):""})]});return u?e.jsx(xe,{to:u,children:b}):e.jsx(ge,{children:b})}function je({users:r,avatars:g,stats:o,inGameTags:x,inGameMatchMap:u,$mobileVisible:l,onClose:b}){const[m,h]=p.useState(""),s=p.useMemo(()=>[...r].sort((a,c)=>{var w,d;const t=((w=o==null?void 0:o.get(a.battleTag))==null?void 0:w.mmr)??-1,v=((d=o==null?void 0:o.get(c.battleTag))==null?void 0:d.mmr)??-1;return t!==v?v-t:(a.name||"").localeCompare(c.name||"",void 0,{sensitivity:"base"})}),[r,o]),i=p.useMemo(()=>{if(!m.trim())return s;const a=m.toLowerCase();return s.filter(c=>(c.name||"").toLowerCase().includes(a))},[s,m]);return e.jsxs(le,{$mobileVisible:l,children:[e.jsxs(de,{children:["Channel ",e.jsx(pe,{children:r.length})]}),e.jsx(ue,{type:"text",placeholder:"Search...",value:m,onChange:a=>h(a.target.value)}),e.jsx(fe,{children:i.map(a=>{const c=x==null?void 0:x.has(a.battleTag),t=c?u==null?void 0:u.get(a.battleTag):null;return e.jsx(Se,{user:a,avatars:g,stats:o,inGame:c,matchUrl:t},a.battleTag)})})]})}const ke=n.div`
  padding: var(--space-4) var(--space-4) 0;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2) 0;
  }
`,Te=n.div`
  display: flex;
  gap: var(--space-4);
  height: calc(100vh - 80px);
`,Ce=n.button`
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
`,Me=n.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-overlay) - 1);
    background: rgba(0, 0, 0, 0.6);
  }
`,Ee=()=>{const{messages:r,status:g,onlineUsers:o}=H(),[x,u]=p.useState(new Map),[l,b]=p.useState(new Map),[m,h]=p.useState([]),[s,i]=p.useState(!1),a=p.useRef(new Set),c=p.useCallback(async()=>{try{const d=await R();h(d.matches||[])}catch{}},[]);p.useEffect(()=>{c();const d=setInterval(c,3e4);return()=>clearInterval(d)},[c]);const t=p.useMemo(()=>{const d=new Set;for(const f of m)for(const y of f.teams)for(const S of y.players)S.battleTag&&d.add(S.battleTag);return d},[m]),v=p.useMemo(()=>{const d=new Map;for(const f of m)for(const y of f.teams)for(const S of y.players)S.battleTag&&d.set(S.battleTag,`/player/${encodeURIComponent(S.battleTag)}`);return d},[m]),w=p.useMemo(()=>{const d=new Set;for(const f of r){const y=f.battle_tag||f.battleTag;y&&d.add(y)}for(const f of o)f.battleTag&&d.add(f.battleTag);return d},[r,o]);return p.useEffect(()=>{const d=[];for(const f of w)a.current.has(f)||(a.current.add(f),d.push(f));if(d.length!==0)for(const f of d)A(f).then(y=>{u(S=>{const j=new Map(S);return j.set(f,y),j})}),I(f).then(y=>{y&&b(S=>{const j=new Map(S);return j.set(f,y),j})})},[w]),e.jsxs(ke,{children:[e.jsxs(Te,{children:[e.jsx(ce,{messages:r,status:g,avatars:x,stats:l,inGameTags:t}),e.jsx(je,{users:o,avatars:x,stats:l,inGameTags:t,inGameMatchMap:v,$mobileVisible:s,onClose:()=>i(!1)})]}),s&&e.jsx(Me,{onClick:()=>i(!1)}),e.jsx(Ce,{onClick:()=>i(d=>!d),children:e.jsx(O,{})})]})};export{Ee as default};
