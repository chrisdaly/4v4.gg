import{r as p,j as e,v as a}from"./index-sAhOW--O.js";import{G as D}from"./iconBase-D-8hu9c0.js";function ge(t){return D({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8z"},child:[]}]})(t)}function pe(t){return D({attr:{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"},child:[{tag:"path",attr:{d:"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"},child:[]},{tag:"polyline",attr:{points:"15 3 21 3 21 9"},child:[]},{tag:"line",attr:{x1:"10",y1:"14",x2:"21",y2:"3"},child:[]}]})(t)}function xe(t){return D({attr:{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"},child:[{tag:"polyline",attr:{points:"23 4 23 10 17 10"},child:[]},{tag:"polyline",attr:{points:"1 20 1 14 7 14"},child:[]},{tag:"path",attr:{d:"M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"},child:[]}]})(t)}const b="https://4v4gg-chat-relay.fly.dev",he="chat_admin_key",fe=a.div`
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  background: rgba(10, 8, 6, 0.6);
  backdrop-filter: blur(12px);
  min-height: calc(100vh - 52px);
`,ue=a.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,me=a.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
  opacity: 0.7;
`,v=a.div`
  margin-bottom: var(--space-8);
`,Z=a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
`,y=a.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
`,ve=a.button`
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
`,ye=a.a`
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
`,be=a.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,je=a.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`,ke=a.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,$e=a(pe)`
  color: var(--grey-light);
  flex-shrink: 0;
`,ee=a.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-2);
`,l=a.div`
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  text-align: center;
`,c=a.div`
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: ${t=>t.$color||"#fff"};
  font-weight: 700;
`,d=a.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 4px;
`,we=a.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
`,Se=a.input`
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
`,Ce=a.button`
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
`,Te=a.button`
  padding: 6px 16px;
  border: 1px solid ${t=>t.$active?"var(--green)":"rgba(160, 130, 80, 0.3)"};
  border-radius: var(--radius-sm);
  background: ${t=>t.$active?"rgba(76, 175, 80, 0.15)":"rgba(255, 255, 255, 0.04)"};
  color: ${t=>t.$active?"var(--green)":"var(--grey-light)"};
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${t=>t.$active?"var(--red)":"var(--green)"};
    color: ${t=>t.$active?"var(--red)":"var(--green)"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`,u=a.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: ${t=>t.$color||"var(--grey-light)"};
`,Le=a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);

  &:last-child {
    border-bottom: none;
  }
`,De=a.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-mid);
  width: 24px;
`,ze=a.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Ae=a.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
  font-weight: 700;
`,Be=a.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-2) 0;
  margin-top: var(--space-2);
`,L=a.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-2) var(--space-4) var(--space-1);
`,te=a.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-top: var(--space-2);
`,re=a.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
  padding-top: var(--space-2);
`,oe=a.div`
  flex: 1;
  min-width: 0;
  background: ${t=>t.$color||"rgba(252, 219, 51, 0.5)"};
  border-radius: 2px 2px 0 0;
  height: ${t=>t.$height||"0%"};
  transition: height 0.3s ease;
  position: relative;

  &:hover::after {
    content: "${t=>t.$tooltip||""}";
    position: absolute;
    bottom: calc(100% + 4px);
    left: 50%;
    transform: translateX(-50%);
    font-family: var(--font-mono);
    font-size: 10px;
    color: #fff;
    background: rgba(0, 0, 0, 0.85);
    padding: 2px 6px;
    border-radius: 3px;
    white-space: nowrap;
    pointer-events: none;
  }
`,ae=a.div`
  display: flex;
  gap: 2px;
  margin-top: 4px;
`,ne=a.span`
  flex: 1;
  min-width: 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
  overflow: hidden;
`,Me=a.div`
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--grey-light);
  margin-top: var(--space-2);
`,Ee=a.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: var(--space-2) 0;
`,Ie=a.span`
  font-family: var(--font-mono);
  font-size: ${t=>t.$size||"13px"};
  color: ${t=>t.$color||"#e0e0e0"};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  white-space: nowrap;
`,Re=a.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${t=>t.$error?"rgba(255, 80, 80, 0.2)":"rgba(160, 130, 80, 0.15)"};
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-2);
  opacity: ${t=>t.$error?.6:1};
`,We=a.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,He=a.pre`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #ccc;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  margin: 0;
`,Pe=a.button`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--gold);
  background: rgba(252, 219, 51, 0.06);
  border: 1px solid rgba(252, 219, 51, 0.25);
  border-radius: var(--radius-sm);
  padding: 4px 12px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover:not(:disabled) {
    background: rgba(252, 219, 51, 0.12);
    border-color: var(--gold);
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`,_e=a.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
`,Ge=[{title:"Anthropic API Cost",desc:"Monthly spend on Claude Haiku (recaps, translations)",url:"https://platform.claude.com/workspaces/default/cost"},{title:"Anthropic API Usage",desc:"Token counts and request volume",url:"https://platform.claude.com/usage"},{title:"Fly.io Billing",desc:"Relay server hosting cost",url:"https://fly.io/dashboard/chris-daly-727/billing"},{title:"Fly.io Monitoring",desc:"Relay server logs, metrics, and health",url:"https://fly.io/apps/4v4gg-chat-relay/monitoring"}];function Ne(t){return t?t<1024?`${t} B`:t<1024*1024?`${(t/1024).toFixed(1)} KB`:`${(t/(1024*1024)).toFixed(1)} MB`:"0 B"}function Fe(t){return t?new Date(t).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"}):"..."}function Ke(){var H,P,_,G,N,F,O,U,K,q,J,X,V,Y,Q;const[t,w]=p.useState(null),[g,k]=p.useState(null),[z,A]=p.useState(null),[S,B]=p.useState(""),[C,$]=p.useState(null),[M,E]=p.useState(!1),[m]=p.useState(()=>localStorage.getItem(he)||""),j=p.useCallback(()=>{fetch(`${b}/api/admin/health`).then(r=>r.json()).then(w).catch(()=>w({status:"error"}))},[]),I=p.useCallback(()=>{fetch(`${b}/api/admin/analytics`).then(r=>r.json()).then(k).catch(()=>{})},[]);p.useEffect(()=>{j(),I()},[j,I]);async function se(r){A(r);try{const n=await(await fetch(`${b}/api/admin/digest/${r}`)).json();n.digest?k(i=>{if(!i)return i;const h=(i.digests||[]).filter(f=>f.date!==r);return{...i,digests:[{date:r,digest:n.digest,created_at:new Date().toISOString()},...h].sort((f,de)=>de.date.localeCompare(f.date))}}):k(i=>{if(!i)return i;const x=i.digests||[];return{...i,digests:[{date:r,digest:null,reason:n.reason||"Failed to generate"},...x.filter(h=>h.date!==r)].sort((h,f)=>f.date.localeCompare(h.date))}})}catch{k(s=>s&&{...s,digests:[{date:r,digest:null,reason:"Request failed"},...(s.digests||[]).filter(n=>n.date!==r)].sort((n,i)=>i.date.localeCompare(n.date))})}A(null)}async function ie(r){r.preventDefault();const s=S.trim();if(!(!s||!m)){$("updating...");try{const n=await fetch(`${b}/api/admin/token`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":m},body:JSON.stringify({token:s})});if(!n.ok)throw new Error(`${n.status}`);B(""),$("Token updated"),setTimeout(()=>{$(null),j()},2e3)}catch(n){$(`Error: ${n.message}`)}}}async function le(){if(!m||M)return;const r=!(t!=null&&t.botEnabled);E(!0);try{const s=await fetch(`${b}/api/admin/bot`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":m},body:JSON.stringify({enabled:r})});if(!s.ok)throw new Error(`${s.status}`);j()}catch(s){console.error("Bot toggle failed:",s.message)}finally{E(!1)}}const ce=(t==null?void 0:t.status)==="ok"?"var(--green)":(t==null?void 0:t.status)==="error"?"var(--red)":"var(--gold)",R=(H=t==null?void 0:t.signalr)!=null&&H.hasToken?"var(--green)":"var(--red)",o=t==null?void 0:t.db,W=o!=null&&o.oldestMessage?Math.max(1,Math.floor((Date.now()-new Date(o.oldestMessage).getTime())/864e5)):null,T=W?Math.round(o.totalMessages/W):null;return e.jsxs(fe,{children:[e.jsx(ue,{children:"Admin"}),e.jsx(me,{children:b}),e.jsxs(v,{children:[e.jsxs(Z,{children:[e.jsx(y,{children:"Relay Server"}),e.jsxs(ve,{onClick:j,children:[e.jsx(xe,{size:12})," Refresh"]})]}),e.jsxs(ee,{children:[e.jsxs(l,{children:[e.jsx(c,{$color:ce,children:(t==null?void 0:t.status)||"..."}),e.jsx(d,{children:"Status"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((P=t==null?void 0:t.signalr)==null?void 0:P.state)||"..."}),e.jsx(d,{children:"SignalR"})]}),e.jsxs(l,{children:[e.jsx(c,{$color:R,children:(_=t==null?void 0:t.signalr)!=null&&_.hasToken?"SET":((G=t==null?void 0:t.signalr)==null?void 0:G.hasToken)===!1?"MISSING":"..."}),e.jsx(d,{children:"W3C Token"})]}),e.jsxs(l,{children:[e.jsx(c,{children:(t==null?void 0:t.sseClients)??"..."}),e.jsx(d,{children:"SSE Clients"})]}),e.jsxs(l,{children:[e.jsx(c,{children:t!=null&&t.uptime?`${Math.floor(t.uptime/3600)}h ${Math.floor(t.uptime%3600/60)}m`:"..."}),e.jsx(d,{children:"Uptime"})]})]})]}),e.jsxs(v,{children:[e.jsx(y,{children:"Bot"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:16,marginTop:8},children:[e.jsx(Te,{$active:t==null?void 0:t.botEnabled,onClick:le,disabled:!m||M,children:t!=null&&t.botEnabled?"ENABLED":"DISABLED"}),e.jsx(u,{children:t!=null&&t.botEnabled?"Bot responses are sent to W3C chat.":"Bot is in preview mode. Responses shown in frontend only."})]}),!m&&e.jsx(u,{style:{display:"block",marginTop:8},$color:"var(--grey-mid)",children:"Set API key in chat panel to toggle bot."})]}),e.jsxs(v,{children:[e.jsx(y,{children:"Database"}),e.jsxs(ee,{children:[e.jsxs(l,{children:[e.jsx(c,{children:((N=o==null?void 0:o.totalMessages)==null?void 0:N.toLocaleString())??"..."}),e.jsx(d,{children:"Messages"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((F=o==null?void 0:o.uniqueUsers)==null?void 0:F.toLocaleString())??"..."}),e.jsx(d,{children:"Unique Users"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((O=o==null?void 0:o.messagesLast24h)==null?void 0:O.toLocaleString())??"..."}),e.jsx(d,{children:"Last 24h"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((U=o==null?void 0:o.messagesLast7d)==null?void 0:U.toLocaleString())??"..."}),e.jsx(d,{children:"Last 7d"})]}),e.jsxs(l,{children:[e.jsx(c,{children:(T==null?void 0:T.toLocaleString())??"..."}),e.jsx(d,{children:"Avg / Day"})]}),e.jsxs(l,{children:[e.jsx(c,{children:(o==null?void 0:o.avgMessageLength)??"..."}),e.jsx(d,{children:"Avg Length"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((K=o==null?void 0:o.deletedMessages)==null?void 0:K.toLocaleString())??"..."}),e.jsx(d,{children:"Deleted"})]}),e.jsxs(l,{children:[e.jsx(c,{children:Ne(o==null?void 0:o.dbSizeBytes)}),e.jsx(d,{children:"DB Size"})]}),e.jsxs(l,{children:[e.jsx(c,{children:Fe(o==null?void 0:o.oldestMessage)}),e.jsx(d,{children:"Since"})]})]}),(o==null?void 0:o.busiestDay)&&e.jsxs(Me,{children:["Busiest day: ",e.jsx("strong",{style:{color:"var(--gold)"},children:o.busiestDay.day})," with"," ",e.jsx("strong",{style:{color:"#fff"},children:o.busiestDay.count.toLocaleString()})," messages"]}),((q=o==null?void 0:o.perDay)==null?void 0:q.length)>0&&e.jsxs(te,{children:[e.jsx(L,{children:"Messages per Day (last 14d)"}),e.jsx(re,{children:o.perDay.map(r=>{const s=Math.max(...o.perDay.map(i=>i.count)),n=s>0?r.count/s*100:0;return e.jsx(oe,{$height:`${Math.max(n,2)}%`,$tooltip:`${r.day.slice(5)}: ${r.count}`},r.day)})}),e.jsx(ae,{children:o.perDay.map((r,s)=>e.jsx(ne,{children:s===0||s===o.perDay.length-1?r.day.slice(5):""},r.day))})]}),((J=o==null?void 0:o.byHour)==null?void 0:J.length)>0&&e.jsxs(te,{children:[e.jsx(L,{children:"Activity by Hour (UTC)"}),e.jsx(re,{children:Array.from({length:24},(r,s)=>{const n=o.byHour.find(f=>f.hour===s),i=(n==null?void 0:n.count)||0,x=Math.max(...o.byHour.map(f=>f.count)),h=x>0?i/x*100:0;return e.jsx(oe,{$height:`${Math.max(h,2)}%`,$tooltip:`${s}:00 — ${i}`,$color:i===x&&x>0?"var(--gold)":void 0},s)})}),e.jsx(ae,{children:Array.from({length:24},(r,s)=>e.jsx(ne,{children:s%6===0?`${s}`:""},s))})]}),((X=o==null?void 0:o.topChatters)==null?void 0:X.length)>0&&e.jsxs(Be,{children:[e.jsx(L,{children:"Top Chatters"}),o.topChatters.map((r,s)=>e.jsxs(Le,{children:[e.jsxs(De,{children:[s+1,"."]}),e.jsx(ze,{children:r.user_name}),e.jsx(Ae,{children:r.count.toLocaleString()})]},r.battle_tag))]})]}),e.jsxs(v,{children:[e.jsx(y,{children:"Top Words (7d)"}),((V=g==null?void 0:g.topWords)==null?void 0:V.length)>0?e.jsx(Ee,{children:g.topWords.map((r,s)=>{const n=g.topWords[0].count,i=r.count/n,x=Math.round(11+i*10),h=i>.7?"var(--gold)":i>.4?"#fff":"#aaa";return e.jsx(Ie,{$size:`${x}px`,$color:h,title:`${r.count} uses`,children:r.word},r.word)})}):e.jsx(u,{children:"Loading..."})]}),e.jsxs(v,{children:[e.jsx(Z,{children:e.jsx(y,{children:"Daily Digests"})}),e.jsx(_e,{children:(()=>{const r=[];for(let n=1;n<=3;n++){const i=new Date;i.setDate(i.getDate()-n),r.push(i.toISOString().slice(0,10))}const s=new Set(((g==null?void 0:g.digests)||[]).map(n=>n.date));return r.filter(n=>!s.has(n)).map(n=>e.jsx(Pe,{onClick:()=>se(n),disabled:z===n,children:z===n?"Generating...":`Generate ${n}`},n))})()}),((Y=g==null?void 0:g.digests)==null?void 0:Y.length)>0?g.digests.map(r=>e.jsxs(Re,{$error:!r.digest,children:[e.jsx(We,{children:r.date}),r.digest?e.jsx(He,{children:r.digest}):e.jsx(u,{$color:"var(--grey-mid)",children:r.reason||"No digest available"})]},r.date)):e.jsx(u,{children:"No digests yet. Generate one for a recent day."})]}),e.jsxs(v,{children:[e.jsx(y,{children:"W3C Token"}),e.jsx(u,{$color:R,children:(Q=t==null?void 0:t.signalr)!=null&&Q.hasToken?"Token is set and active.":"No token set. Paste the W3ChampionsJWT cookie value below."}),m?e.jsxs(we,{onSubmit:ie,children:[e.jsx(Se,{type:"password",placeholder:"Paste W3ChampionsJWT cookie value...",value:S,onChange:r=>B(r.target.value)}),e.jsx(Ce,{type:"submit",disabled:!S.trim(),children:e.jsx(ge,{size:14})}),C&&e.jsx(u,{$color:C.startsWith("Error")?"var(--red)":"var(--green)",children:C})]}):e.jsx(u,{style:{display:"block",marginTop:8},children:"Set API key in chat panel to update token."})]}),e.jsxs(v,{children:[e.jsx(y,{children:"Dashboards"}),Ge.map(r=>e.jsxs(ye,{href:r.url,target:"_blank",rel:"noopener",children:[e.jsxs(be,{children:[e.jsx(je,{children:r.title}),e.jsx(ke,{children:r.desc})]}),e.jsx($e,{size:16})]},r.url))]})]})}export{Ke as default};
