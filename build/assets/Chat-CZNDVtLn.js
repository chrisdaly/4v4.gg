import{a as d,j as a,H as o}from"./index-BkIkeeh3.js";const h="http://localhost:3001",v=500;function m(){const[s,c]=d.useState([]),[l,u]=d.useState("connecting"),g=d.useRef(null),p=d.useCallback(r=>{c(n=>{const t=new Set(n.map(f=>f.id)),e=r.filter(f=>!t.has(f.id));if(e.length===0)return n;const i=[...n,...e];return i.length>v?i.slice(i.length-v):i})},[]);return d.useEffect(()=>{let r=!1;fetch(`${h}/api/chat/messages?limit=100`).then(t=>t.json()).then(t=>{r||p(t.reverse())}).catch(()=>{});const n=new EventSource(`${h}/api/chat/stream`);return g.current=n,n.addEventListener("history",t=>{if(r)return;const e=JSON.parse(t.data);p(e)}),n.addEventListener("message",t=>{if(r)return;const e=JSON.parse(t.data);p([e])}),n.addEventListener("delete",t=>{if(r)return;const{id:e}=JSON.parse(t.data);c(i=>i.filter(f=>f.id!==e))}),n.addEventListener("bulk_delete",t=>{if(r)return;const{ids:e}=JSON.parse(t.data),i=new Set(e);c(f=>f.filter(x=>!i.has(x.id)))}),n.addEventListener("status",t=>{if(r)return;const{state:e}=JSON.parse(t.data);u(e==="Connected"?"connected":e)}),n.addEventListener("heartbeat",()=>{r||u("connected")}),n.onopen=()=>{r||u("connected")},n.onerror=()=>{r||u("reconnecting")},()=>{r=!0,n.close()}},[p]),{messages:s,status:l}}const b=o.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 80px);
  max-width: 800px;
  margin: 0 auto;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.02);
  overflow: hidden;
`,y=o.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--grey-mid);
`,S=o.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`,j=o.span`
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: var(--space-2);
  background: ${s=>s.$status==="connected"?"var(--green)":s.$status==="reconnecting"?"var(--gold)":"var(--red)"};
  ${s=>s.$status==="reconnecting"&&"animation: pulse 1.5s infinite;"}
`,w=o.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
`,k=o.div`
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) var(--space-4);

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
`,E=o.div`
  padding: var(--space-1) 0;
  line-height: 1.5;

  &:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`,N=o.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-right: var(--space-2);
`,T=o.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-right: 2px;
`,L=o.span`
  font-family: var(--font-display);
  color: var(--gold);
  margin-right: var(--space-2);
  cursor: default;
`,C=o.span`
  color: #fff;
  font-size: var(--text-sm);
  word-break: break-word;
`,R=o.button`
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
`,$=o.div`
  position: relative;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`,z=o.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
`;function M(s){return new Date(s).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function _({messages:s,status:c}){const l=d.useRef(null),[u,g]=d.useState(!0),[p,r]=d.useState(!1);d.useEffect(()=>{u&&l.current?l.current.scrollTop=l.current.scrollHeight:!u&&s.length>0&&r(!0)},[s,u]);function n(){const e=l.current;if(!e)return;const i=e.scrollHeight-e.scrollTop-e.clientHeight<40;g(i),i&&r(!1)}function t(){l.current&&(l.current.scrollTop=l.current.scrollHeight),g(!0),r(!1)}return a.jsxs(b,{children:[a.jsxs(y,{children:[a.jsx(S,{children:"4v4 Chat"}),a.jsxs(w,{children:[a.jsx(j,{$status:c}),c]})]}),s.length===0?a.jsx(z,{children:c==="connected"?"No messages yet":"Connecting to chat..."}):a.jsxs($,{children:[a.jsx(k,{ref:l,onScroll:n,children:s.map(e=>a.jsxs(E,{children:[a.jsx(N,{children:M(e.sent_at||e.sentAt)}),e.clan_tag||e.clanTag?a.jsxs(T,{children:["[",e.clan_tag||e.clanTag,"]"]}):null,a.jsx(L,{children:e.user_name||e.userName}),a.jsx(C,{children:e.message})]},e.id))}),p&&a.jsx(R,{onClick:t,children:"New messages below"})]})]})}const H=o.div`
  padding: var(--space-4) var(--space-4) 0;
`,J=()=>{const{messages:s,status:c}=m();return a.jsx(H,{children:a.jsx(_,{messages:s,status:c})})};export{J as default};
