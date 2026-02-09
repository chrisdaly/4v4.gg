import{u as h,r as i,j as r,v as t}from"./index-CKqM6WhI.js";function W(e){return h({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8z"},child:[]}]})(e)}function B(e){return h({attr:{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"},child:[{tag:"path",attr:{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"},child:[]},{tag:"polyline",attr:{points:"15 3 21 3 21 9"},child:[]},{tag:"line",attr:{x1:"10",y1:"14",x2:"21",y2:"3"},child:[]}]})(e)}function F(e){return h({attr:{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"},child:[{tag:"polyline",attr:{points:"23 4 23 10 17 10"},child:[]},{tag:"polyline",attr:{points:"1 20 1 14 7 14"},child:[]},{tag:"path",attr:{d:"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"},child:[]}]})(e)}const R="https://4v4gg-chat-relay.fly.dev",D="chat_admin_key",U=t.div`
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
`,_=t.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-8);
`,p=t.div`
  margin-bottom: var(--space-8);
`,N=t.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
`,g=t.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
`,O=t.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: 4px 10px;
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    color: var(--gold);
  }
`,G=t.a`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  margin-bottom: var(--space-2);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-md);
  color: #e0e0e0;
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.06);
  }
`,K=t.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,q=t.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`,J=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,V=t(B)`
  color: var(--grey-light);
  flex-shrink: 0;
`,H=t.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-2);
`,n=t.div`
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  text-align: center;
`,s=t.div`
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: ${e=>e.$color||"#fff"};
  font-weight: 700;
`,a=t.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 4px;
`,Y=t.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
`,X=t.input`
  flex: 1;
  min-width: 0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(160, 130, 80, 0.2);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
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
`,Q=t.button`
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
`,m=t.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: ${e=>e.$color||"var(--grey-light)"};
`,Z=[{title:"Anthropic API Cost",desc:"Monthly spend on Claude Haiku (recaps, translations)",url:"https://platform.claude.com/workspaces/default/cost"},{title:"Anthropic API Usage",desc:"Token counts and request volume",url:"https://platform.claude.com/usage"},{title:"Fly.io Billing",desc:"Relay server hosting cost",url:"https://fly.io/dashboard/chris-daly-727/billing"},{title:"Fly.io Monitoring",desc:"Relay server logs, metrics, and health",url:"https://fly.io/apps/4v4gg-chat-relay/monitoring"}];function re(){var y,k,S,T,L,C,w,A,E,I,z;const[e,v]=i.useState(null),[u,b]=i.useState(""),[x,l]=i.useState(null),[f]=i.useState(()=>localStorage.getItem(D)||""),c=i.useCallback(()=>{fetch(`${R}/api/admin/health`).then(o=>o.json()).then(v).catch(()=>v({status:"error"}))},[]);i.useEffect(()=>{c()},[c]);async function M(o){o.preventDefault();const $=u.trim();if(!(!$||!f)){l("updating...");try{const d=await fetch(`${R}/api/admin/token`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":f},body:JSON.stringify({token:$})});if(!d.ok)throw new Error(`${d.status}`);b(""),l("Token updated"),setTimeout(()=>{l(null),c()},2e3)}catch(d){l(`Error: ${d.message}`)}}}const P=(e==null?void 0:e.status)==="ok"?"var(--green)":(e==null?void 0:e.status)==="error"?"var(--red)":"var(--gold)",j=(y=e==null?void 0:e.signalr)!=null&&y.hasToken?"var(--green)":"var(--red)";return r.jsxs(U,{children:[r.jsx(_,{children:"Admin"}),r.jsxs(p,{children:[r.jsxs(N,{children:[r.jsx(g,{children:"Relay Server"}),r.jsxs(O,{onClick:c,children:[r.jsx(F,{size:12})," Refresh"]})]}),r.jsxs(H,{children:[r.jsxs(n,{children:[r.jsx(s,{$color:P,children:(e==null?void 0:e.status)||"..."}),r.jsx(a,{children:"Status"})]}),r.jsxs(n,{children:[r.jsx(s,{children:((k=e==null?void 0:e.signalr)==null?void 0:k.state)||"..."}),r.jsx(a,{children:"SignalR"})]}),r.jsxs(n,{children:[r.jsx(s,{$color:j,children:(S=e==null?void 0:e.signalr)!=null&&S.hasToken?"SET":((T=e==null?void 0:e.signalr)==null?void 0:T.hasToken)===!1?"MISSING":"..."}),r.jsx(a,{children:"W3C Token"})]}),r.jsxs(n,{children:[r.jsx(s,{children:(e==null?void 0:e.sseClients)??"..."}),r.jsx(a,{children:"SSE Clients"})]}),r.jsxs(n,{children:[r.jsx(s,{children:e!=null&&e.botEnabled?"ON":(e==null?void 0:e.botEnabled)===!1?"OFF":"..."}),r.jsx(a,{children:"Bot"})]}),r.jsxs(n,{children:[r.jsx(s,{children:e!=null&&e.uptime?`${Math.floor(e.uptime/3600)}h`:"..."}),r.jsx(a,{children:"Uptime"})]})]})]}),r.jsxs(p,{children:[r.jsx(g,{children:"Database"}),r.jsxs(H,{children:[r.jsxs(n,{children:[r.jsx(s,{children:((C=(L=e==null?void 0:e.db)==null?void 0:L.totalMessages)==null?void 0:C.toLocaleString())??"..."}),r.jsx(a,{children:"Messages"})]}),r.jsxs(n,{children:[r.jsx(s,{children:((A=(w=e==null?void 0:e.db)==null?void 0:w.uniqueUsers)==null?void 0:A.toLocaleString())??"..."}),r.jsx(a,{children:"Unique Users"})]}),r.jsxs(n,{children:[r.jsx(s,{children:((I=(E=e==null?void 0:e.db)==null?void 0:E.messagesLast24h)==null?void 0:I.toLocaleString())??"..."}),r.jsx(a,{children:"Last 24h"})]})]})]}),r.jsxs(p,{children:[r.jsx(g,{children:"W3C Token"}),r.jsx(m,{$color:j,children:(z=e==null?void 0:e.signalr)!=null&&z.hasToken?"Token is set and active.":"No token set. Paste the W3ChampionsJWT cookie value below."}),f?r.jsxs(Y,{onSubmit:M,children:[r.jsx(X,{type:"password",placeholder:"Paste W3ChampionsJWT cookie value...",value:u,onChange:o=>b(o.target.value)}),r.jsx(Q,{type:"submit",disabled:!u.trim(),children:r.jsx(W,{size:14})}),x&&r.jsx(m,{$color:x.startsWith("Error")?"var(--red)":"var(--green)",children:x})]}):r.jsx(m,{style:{display:"block",marginTop:8},children:"Set API key in chat panel to update token."})]}),r.jsxs(p,{children:[r.jsx(g,{children:"Dashboards"}),Z.map(o=>r.jsxs(G,{href:o.url,target:"_blank",rel:"noopener",children:[r.jsxs(K,{children:[r.jsx(q,{children:o.title}),r.jsx(J,{children:o.desc})]}),r.jsx(V,{size:16})]},o.url))]})]})}export{re as default};
