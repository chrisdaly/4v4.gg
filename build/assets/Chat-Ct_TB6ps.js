import{G as I,a as m,j as e,H as t,r as A,E as N,L as D,d as _,m as O,K as H,N as F}from"./index-Bxttn_pe.js";function Y(r){return I({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(r)}const z="http://localhost:3002",$=500;function J(){const[r,a]=m.useState([]),[n,o]=m.useState("connecting"),[l,f]=m.useState([]),v=m.useRef(null),j=m.useCallback(w=>{a(p=>{const s=new Set(p.map(i=>i.id)),u=w.filter(i=>!s.has(i.id));if(u.length===0)return p;const b=[...p,...u];return b.length>$?b.slice(b.length-$):b})},[]);return m.useEffect(()=>{let w=!1;fetch(`${z}/api/chat/messages?limit=100`).then(s=>s.json()).then(s=>{w||j(s.reverse())}).catch(()=>{});const p=new EventSource(`${z}/api/chat/stream`);return v.current=p,p.addEventListener("history",s=>{if(w)return;const u=JSON.parse(s.data);j(u)}),p.addEventListener("message",s=>{if(w)return;const u=JSON.parse(s.data);j([u])}),p.addEventListener("delete",s=>{if(w)return;const{id:u}=JSON.parse(s.data);a(b=>b.filter(i=>i.id!==u))}),p.addEventListener("bulk_delete",s=>{if(w)return;const{ids:u}=JSON.parse(s.data),b=new Set(u);a(i=>i.filter(h=>!b.has(h.id)))}),p.addEventListener("users_init",s=>{w||f(JSON.parse(s.data))}),p.addEventListener("user_joined",s=>{if(w)return;const u=JSON.parse(s.data);f(b=>b.some(i=>i.battleTag===u.battleTag)?b:[...b,u])}),p.addEventListener("user_left",s=>{if(w)return;const{battleTag:u}=JSON.parse(s.data);f(b=>b.filter(i=>i.battleTag!==u))}),p.addEventListener("status",s=>{if(w)return;const{state:u}=JSON.parse(s.data);o(u==="Connected"?"connected":u)}),p.addEventListener("heartbeat",()=>{w||o("connected")}),p.onopen=()=>{w||o("connected")},p.onerror=()=>{w||o("reconnecting")},()=>{w=!0,p.close()}},[j]),{messages:r,status:n,onlineUsers:l}}const P=t.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
`,B=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
`,X=t.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`,V=t.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2);
  background: ${r=>r.$status==="connected"?"var(--green)":r.$status==="reconnecting"?"var(--gold)":"var(--red)"};
  ${r=>r.$status==="reconnecting"&&"animation: pulse 1.5s infinite;"}
`,W=t.span`
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
`,G=t.div`
  position: relative;
  min-height: 85px;
  margin-top: var(--space-4);
  padding-bottom: var(--space-1);

  &:first-child {
    margin-top: 0;
  }
`,K=t.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,Q=t.div`
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
`,Z=t.span`
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
`,C=t.img`
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
`,ae=t(D)`
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
`,ge=t.span`
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 8px;
  height: 8px;
  background: var(--red);
  border-radius: 50%;
  border: 2px solid var(--grey-dark);
  animation: pulse 1.5s infinite;
`,L=t.span`
  color: rgba(255, 255, 255, 0.82);
  font-size: 15px;
  line-height: 1.375;
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
  background: var(--grey-dark);
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
`,he=t.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,me=t.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function xe(r){return new Date(r).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function ve(r){const a=new Date(r),n=new Date,o=a.toLocaleTimeString([],{hour:"numeric",minute:"2-digit"});if(a.getDate()===n.getDate()&&a.getMonth()===n.getMonth()&&a.getFullYear()===n.getFullYear())return o;const f=new Date(n);return f.setDate(f.getDate()-1),a.getDate()===f.getDate()&&a.getMonth()===f.getMonth()&&a.getFullYear()===f.getFullYear()?`Yesterday ${o}`:`${a.getMonth()+1}/${a.getDate()}/${String(a.getFullYear()).slice(2)} ${o}`}function be(r,a,n){var v;const o=(v=a==null?void 0:a.get(r))==null?void 0:v.profilePicUrl;if(o)return e.jsx(ee,{src:o,alt:""});const l=n==null?void 0:n.get(r),f=(l==null?void 0:l.race)!=null?A[l.race]:null;return f?e.jsx(C,{src:f,alt:""}):e.jsx(C,{src:N.random,alt:"",$faded:!0})}function ye({messages:r,status:a,avatars:n,stats:o,sessions:l,inGameTags:f}){const v=m.useRef(null),[j,w]=m.useState(!0),[p,s]=m.useState(!1),u=m.useMemo(()=>{const h=[];for(let d=0;d<r.length;d++){const y=r[d],k=y.battle_tag||y.battleTag;let c=d===0;if(!c){const g=r[d-1];if((g.battle_tag||g.battleTag)!==k)c=!0;else{const S=new Date(g.sent_at||g.sentAt).getTime();new Date(y.sent_at||y.sentAt).getTime()-S>120*1e3&&(c=!0)}}c?h.push({start:y,continuations:[]}):h.length>0&&h[h.length-1].continuations.push(y)}return h},[r]);m.useEffect(()=>{j&&v.current?v.current.scrollTop=v.current.scrollHeight:!j&&r.length>0&&s(!0)},[r,j]);function b(){const h=v.current;if(!h)return;const d=h.scrollHeight-h.scrollTop-h.clientHeight<40;w(d),d&&s(!1)}function i(){v.current&&(v.current.scrollTop=v.current.scrollHeight),w(!0),s(!1)}return e.jsxs(P,{children:[e.jsxs(B,{children:[e.jsx(X,{children:"4v4 Chat"}),e.jsxs(W,{children:[e.jsx(V,{$status:a}),a]})]}),r.length===0?e.jsx(me,{children:a==="connected"?"No messages yet":"Connecting to chat..."}):e.jsxs(he,{children:[e.jsx(q,{ref:v,onScroll:b,children:u.map(h=>{var c,g;const d=h.start,y=d.battle_tag||d.battleTag,k=d.user_name||d.userName;return!y||y==="system"?e.jsx(fe,{children:d.message},d.id):e.jsxs(G,{children:[e.jsxs(oe,{children:[e.jsxs("div",{style:{position:"relative"},children:[be(y,n,o),(f==null?void 0:f.has(y))&&e.jsx(ge,{})]}),(((c=o==null?void 0:o.get(y))==null?void 0:c.mmr)!=null||(l==null?void 0:l.get(y)))&&e.jsxs(ie,{children:[((g=o==null?void 0:o.get(y))==null?void 0:g.mmr)!=null&&e.jsxs(se,{children:[e.jsx(ce,{children:Math.round(o.get(y).mmr)}),e.jsx(le,{children:"MMR"})]}),(l==null?void 0:l.get(y))&&e.jsx(de,{children:l.get(y).slice(-10).map((x,S)=>e.jsx(pe,{$win:x},S))})]})]}),e.jsx(K,{children:e.jsxs(te,{children:[e.jsx("div",{children:e.jsxs(ne,{children:[e.jsx(ae,{to:`/player/${encodeURIComponent(y)}`,children:k}),e.jsx(re,{children:ve(d.sent_at||d.sentAt)})]})}),e.jsx(L,{children:d.message})]})}),h.continuations.map(x=>e.jsxs(Q,{children:[e.jsx(Z,{className:"hover-timestamp",children:xe(x.sent_at||x.sentAt)}),e.jsx(L,{children:x.message})]},x.id))]},d.id)})}),p&&e.jsx(ue,{onClick:i,children:"New messages below"})]})]})}const we=t.aside`
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
`,je=t.div`
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
`,Se=t.span`
  color: var(--gold);
`,ke=t.input`
  width: calc(100% - var(--space-4));
  margin: var(--space-2) auto;
  display: block;
  padding: var(--space-1) var(--space-3);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  background: var(--grey-dark);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  outline: none;
  box-sizing: border-box;

  &::placeholder {
    color: var(--grey-light);
    opacity: 0.5;
  }

  &:focus {
    border-color: var(--gold);
  }
`,Me=t.div`
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
`,Te=t.div`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  cursor: default;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,ze=t(D)`
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  cursor: pointer;
  text-decoration: none;
  color: inherit;
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,$e=t.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,Ce=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,U=t.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${r=>r.$faded?.2:.85};
`,Le=t.span`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 6px;
  height: 6px;
  background: var(--red);
  border-radius: 50%;
  animation: pulse 1.5s infinite;
`,Ue=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,Ee=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--gold);
  opacity: 0.7;
  flex-shrink: 0;
`,E=t.div`
  padding: var(--space-3) var(--space-3) var(--space-1);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);

  &:first-child {
    padding-top: var(--space-1);
  }
`;function Re(r,a,n){var v;const o=(v=a==null?void 0:a.get(r))==null?void 0:v.profilePicUrl;if(o)return e.jsx(Ce,{src:o,alt:""});const l=n==null?void 0:n.get(r),f=(l==null?void 0:l.race)!=null?A[l.race]:null;return f?e.jsx(U,{src:f,alt:""}):e.jsx(U,{src:N.random,alt:"",$faded:!0})}function R({user:r,avatars:a,stats:n,inGame:o,matchUrl:l}){var j;const f=(j=n==null?void 0:n.get(r.battleTag))==null?void 0:j.mmr,v=e.jsxs(e.Fragment,{children:[e.jsxs($e,{children:[Re(r.battleTag,a,n),o&&e.jsx(Le,{})]}),e.jsx(Ue,{children:r.name}),e.jsx(Ee,{children:f!=null?Math.round(f):""})]});return l?e.jsx(ze,{to:l,children:v}):e.jsx(Te,{children:v})}function Ae({users:r,avatars:a,stats:n,inGameTags:o,inGameMatchMap:l,$mobileVisible:f,onClose:v}){const[j,w]=m.useState(""),p=m.useMemo(()=>[...r].sort((i,h)=>{var k,c;const d=((k=n==null?void 0:n.get(i.battleTag))==null?void 0:k.mmr)??-1,y=((c=n==null?void 0:n.get(h.battleTag))==null?void 0:c.mmr)??-1;return d!==y?y-d:(i.name||"").localeCompare(h.name||"",void 0,{sensitivity:"base"})}),[r,n]),s=m.useMemo(()=>{if(!j.trim())return p;const i=j.toLowerCase();return p.filter(h=>(h.name||"").toLowerCase().includes(i))},[p,j]),{inGameUsers:u,onlineUsers:b}=m.useMemo(()=>{const i=[],h=[];for(const d of s)o!=null&&o.has(d.battleTag)?i.push(d):h.push(d);return{inGameUsers:i,onlineUsers:h}},[s,o]);return e.jsxs(we,{$mobileVisible:f,children:[e.jsxs(je,{children:["Channel ",e.jsx(Se,{children:r.length})]}),e.jsx(ke,{type:"text",placeholder:"Search...",value:j,onChange:i=>w(i.target.value)}),e.jsxs(Me,{children:[u.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(E,{children:["In Game — ",u.length]}),u.map(i=>e.jsx(R,{user:i,avatars:a,stats:n,inGame:!0,matchUrl:l==null?void 0:l.get(i.battleTag)},i.battleTag))]}),e.jsxs(E,{children:["Online — ",b.length]}),b.map(i=>e.jsx(R,{user:i,avatars:a,stats:n,inGame:!1,matchUrl:null},i.battleTag))]})]})}const Ne=t.div`
  padding: var(--space-4) var(--space-4) 0;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: var(--space-2) var(--space-2) 0;
  }
`,De=t.div`
  display: flex;
  gap: var(--space-4);
  height: calc(100vh - 80px);
`,Ie=t.button`
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
`,_e=t.div`
  display: none;

  @media (max-width: 768px) {
    display: block;
    position: fixed;
    inset: 0;
    z-index: calc(var(--z-overlay) - 1);
    background: rgba(0, 0, 0, 0.6);
  }
`,He=()=>{const{messages:r,status:a,onlineUsers:n}=J(),[o,l]=m.useState(new Map),[f,v]=m.useState(new Map),[j,w]=m.useState(new Map),[p,s]=m.useState([]),[u,b]=m.useState(!1),i=m.useRef(new Set),h=m.useCallback(async()=>{try{const c=await _();s(c.matches||[])}catch{}},[]);m.useEffect(()=>{h();const c=setInterval(h,3e4);return()=>clearInterval(c)},[h]);const d=m.useMemo(()=>{const c=new Set;for(const g of p)for(const x of g.teams)for(const S of x.players)S.battleTag&&c.add(S.battleTag);return c},[p]),y=m.useMemo(()=>{const c=new Map;for(const g of p)for(const x of g.teams)for(const S of x.players)S.battleTag&&c.set(S.battleTag,`/player/${encodeURIComponent(S.battleTag)}`);return c},[p]),k=m.useMemo(()=>{const c=new Set;for(const g of r){const x=g.battle_tag||g.battleTag;x&&c.add(x)}for(const g of n)g.battleTag&&c.add(g.battleTag);return c},[r,n]);return m.useEffect(()=>{const c=[];for(const g of k)i.current.has(g)||(i.current.add(g),c.push(g));if(c.length!==0)for(const g of c)O(g).then(x=>{l(S=>{const M=new Map(S);return M.set(g,x),M})}),H(g).then(x=>{x&&v(S=>{const M=new Map(S);return M.set(g,x),M})}),F(g).then(x=>{var S;(S=x==null?void 0:x.session)!=null&&S.form&&w(M=>{const T=new Map(M);return T.set(g,x.session.form),T})})},[k]),e.jsxs(Ne,{children:[e.jsxs(De,{children:[e.jsx(ye,{messages:r,status:a,avatars:o,stats:f,sessions:j,inGameTags:d}),e.jsx(Ae,{users:n,avatars:o,stats:f,inGameTags:d,inGameMatchMap:y,$mobileVisible:u,onClose:()=>b(!1)})]}),u&&e.jsx(_e,{onClick:()=>b(!1)}),e.jsx(Ie,{onClick:()=>b(c=>!c),children:e.jsx(Y,{})})]})};export{He as default};
