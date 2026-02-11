import{r as p,j as e,v as s}from"./index-FIYDBnjC.js";import{b as de,a as ge}from"./index-BXCM_xA6.js";import{G as pe}from"./iconBase-tgJ53BkX.js";function xe(r){return pe({attr:{viewBox:"0 0 512 512"},child:[{tag:"path",attr:{d:"m476.59 227.05-.16-.07L49.35 49.84A23.56 23.56 0 0 0 27.14 52 24.65 24.65 0 0 0 16 72.59v113.29a24 24 0 0 0 19.52 23.57l232.93 43.07a4 4 0 0 1 0 7.86L35.53 303.45A24 24 0 0 0 16 327v113.31A23.57 23.57 0 0 0 26.59 460a23.94 23.94 0 0 0 13.22 4 24.55 24.55 0 0 0 9.52-1.93L476.4 285.94l.19-.09a32 32 0 0 0 0-58.8z"},child:[]}]})(r)}const y="https://4v4gg-chat-relay.fly.dev",fe="chat_admin_key",he=s.div`
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
  background: rgba(10, 8, 6, 0.6);
  backdrop-filter: blur(12px);
  min-height: calc(100vh - 52px);
`,ue=s.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,me=s.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
  opacity: 0.7;
`,v=s.div`
  margin-bottom: var(--space-8);
`,Q=s.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
`,b=s.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
`,ve=s.button`
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
`,be=s.a`
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
`,ye=s.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`,je=s.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`,$e=s.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,ke=s(ge)`
  color: var(--grey-light);
  flex-shrink: 0;
`,Z=s.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--space-2);
`,l=s.div`
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  text-align: center;
`,c=s.div`
  font-family: var(--font-mono);
  font-size: var(--text-base);
  color: ${r=>r.$color||"#fff"};
  font-weight: 700;
`,d=s.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-top: 4px;
`,Se=s.form`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-4);
`,we=s.input`
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
`,Ce=s.button`
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
`,Te=s.button`
  padding: 6px 16px;
  border: 1px solid ${r=>r.$active?"var(--green)":"rgba(160, 130, 80, 0.3)"};
  border-radius: var(--radius-sm);
  background: ${r=>r.$active?"rgba(76, 175, 80, 0.15)":"rgba(255, 255, 255, 0.04)"};
  color: ${r=>r.$active?"var(--green)":"var(--grey-light)"};
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    border-color: ${r=>r.$active?"var(--red)":"var(--green)"};
    color: ${r=>r.$active?"var(--red)":"var(--green)"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`,u=s.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: ${r=>r.$color||"var(--grey-light)"};
`,De=s.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);

  &:last-child {
    border-bottom: none;
  }
`,Le=s.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-mid);
  width: 24px;
`,ze=s.span`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`,Ae=s.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
  font-weight: 700;
`,Be=s.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-2) 0;
  margin-top: var(--space-2);
`,D=s.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: var(--space-2) var(--space-4) var(--space-1);
`,ee=s.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-top: var(--space-2);
`,re=s.div`
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 80px;
  padding-top: var(--space-2);
`,te=s.div`
  flex: 1;
  min-width: 0;
  background: ${r=>r.$color||"rgba(252, 219, 51, 0.5)"};
  border-radius: 2px 2px 0 0;
  height: ${r=>r.$height||"0%"};
  transition: height 0.3s ease;
  position: relative;

  &:hover::after {
    content: "${r=>r.$tooltip||""}";
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
`,oe=s.div`
  display: flex;
  gap: 2px;
  margin-top: 4px;
`,se=s.span`
  flex: 1;
  min-width: 0;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 9px;
  color: var(--grey-mid);
  overflow: hidden;
`,Me=s.div`
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--grey-light);
  margin-top: var(--space-2);
`,Ee=s.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: var(--space-2) 0;
`,Ie=s.span`
  font-family: var(--font-mono);
  font-size: ${r=>r.$size||"13px"};
  color: ${r=>r.$color||"#e0e0e0"};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(160, 130, 80, 0.15);
  border-radius: var(--radius-sm);
  padding: 3px 8px;
  white-space: nowrap;
`,Re=s.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${r=>r.$error?"rgba(255, 80, 80, 0.2)":"rgba(160, 130, 80, 0.15)"};
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-2);
  opacity: ${r=>r.$error?.6:1};
`,We=s.div`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,He=s.pre`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #ccc;
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  margin: 0;
`,Pe=s.button`
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
`,_e=s.div`
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
`,Ge=[{title:"Anthropic API Cost",desc:"Monthly spend on Claude Haiku (recaps, translations)",url:"https://platform.claude.com/workspaces/default/cost"},{title:"Anthropic API Usage",desc:"Token counts and request volume",url:"https://platform.claude.com/usage"},{title:"Fly.io Billing",desc:"Relay server hosting cost",url:"https://fly.io/dashboard/chris-daly-727/billing"},{title:"Fly.io Monitoring",desc:"Relay server logs, metrics, and health",url:"https://fly.io/apps/4v4gg-chat-relay/monitoring"}];function Ne(r){return r?r<1024?`${r} B`:r<1024*1024?`${(r/1024).toFixed(1)} KB`:`${(r/(1024*1024)).toFixed(1)} MB`:"0 B"}function Fe(r){return r?new Date(r).toLocaleDateString([],{month:"short",day:"numeric",year:"numeric"}):"..."}function qe(){var W,H,P,_,G,N,F,O,U,K,q,J,X,Y,V;const[r,S]=p.useState(null),[g,$]=p.useState(null),[L,z]=p.useState(null),[w,A]=p.useState(""),[C,k]=p.useState(null),[B,M]=p.useState(!1),[m]=p.useState(()=>localStorage.getItem(fe)||""),j=p.useCallback(()=>{fetch(`${y}/api/admin/health`).then(t=>t.json()).then(S).catch(()=>S({status:"error"}))},[]),E=p.useCallback(()=>{fetch(`${y}/api/admin/analytics`).then(t=>t.json()).then($).catch(()=>{})},[]);p.useEffect(()=>{j(),E()},[j,E]);async function ae(t){z(t);try{const a=await(await fetch(`${y}/api/admin/digest/${t}`)).json();a.digest?$(i=>{if(!i)return i;const f=(i.digests||[]).filter(h=>h.date!==t);return{...i,digests:[{date:t,digest:a.digest,created_at:new Date().toISOString()},...f].sort((h,ce)=>ce.date.localeCompare(h.date))}}):$(i=>{if(!i)return i;const x=i.digests||[];return{...i,digests:[{date:t,digest:null,reason:a.reason||"Failed to generate"},...x.filter(f=>f.date!==t)].sort((f,h)=>h.date.localeCompare(f.date))}})}catch{$(n=>n&&{...n,digests:[{date:t,digest:null,reason:"Request failed"},...(n.digests||[]).filter(a=>a.date!==t)].sort((a,i)=>i.date.localeCompare(a.date))})}z(null)}async function ne(t){t.preventDefault();const n=w.trim();if(!(!n||!m)){k("updating...");try{const a=await fetch(`${y}/api/admin/token`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":m},body:JSON.stringify({token:n})});if(!a.ok)throw new Error(`${a.status}`);A(""),k("Token updated"),setTimeout(()=>{k(null),j()},2e3)}catch(a){k(`Error: ${a.message}`)}}}async function ie(){if(!m||B)return;const t=!(r!=null&&r.botEnabled);M(!0);try{const n=await fetch(`${y}/api/admin/bot`,{method:"POST",headers:{"Content-Type":"application/json","X-API-Key":m},body:JSON.stringify({enabled:t})});if(!n.ok)throw new Error(`${n.status}`);j()}catch(n){console.error("Bot toggle failed:",n.message)}finally{M(!1)}}const le=(r==null?void 0:r.status)==="ok"?"var(--green)":(r==null?void 0:r.status)==="error"?"var(--red)":"var(--gold)",I=(W=r==null?void 0:r.signalr)!=null&&W.hasToken?"var(--green)":"var(--red)",o=r==null?void 0:r.db,R=o!=null&&o.oldestMessage?Math.max(1,Math.floor((Date.now()-new Date(o.oldestMessage).getTime())/864e5)):null,T=R?Math.round(o.totalMessages/R):null;return e.jsxs(he,{children:[e.jsx(ue,{children:"Admin"}),e.jsx(me,{children:y}),e.jsxs(v,{children:[e.jsxs(Q,{children:[e.jsx(b,{children:"Relay Server"}),e.jsxs(ve,{onClick:j,children:[e.jsx(de,{size:12})," Refresh"]})]}),e.jsxs(Z,{children:[e.jsxs(l,{children:[e.jsx(c,{$color:le,children:(r==null?void 0:r.status)||"..."}),e.jsx(d,{children:"Status"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((H=r==null?void 0:r.signalr)==null?void 0:H.state)||"..."}),e.jsx(d,{children:"SignalR"})]}),e.jsxs(l,{children:[e.jsx(c,{$color:I,children:(P=r==null?void 0:r.signalr)!=null&&P.hasToken?"SET":((_=r==null?void 0:r.signalr)==null?void 0:_.hasToken)===!1?"MISSING":"..."}),e.jsx(d,{children:"W3C Token"})]}),e.jsxs(l,{children:[e.jsx(c,{children:(r==null?void 0:r.sseClients)??"..."}),e.jsx(d,{children:"SSE Clients"})]}),e.jsxs(l,{children:[e.jsx(c,{children:r!=null&&r.uptime?`${Math.floor(r.uptime/3600)}h ${Math.floor(r.uptime%3600/60)}m`:"..."}),e.jsx(d,{children:"Uptime"})]})]})]}),e.jsxs(v,{children:[e.jsx(b,{children:"Bot"}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:16,marginTop:8},children:[e.jsx(Te,{$active:r==null?void 0:r.botEnabled,onClick:ie,disabled:!m||B,children:r!=null&&r.botEnabled?"ENABLED":"DISABLED"}),e.jsx(u,{children:r!=null&&r.botEnabled?"Bot responses are sent to W3C chat.":"Bot is in preview mode. Responses shown in frontend only."})]}),!m&&e.jsx(u,{style:{display:"block",marginTop:8},$color:"var(--grey-mid)",children:"Set API key in chat panel to toggle bot."})]}),e.jsxs(v,{children:[e.jsx(b,{children:"Database"}),e.jsxs(Z,{children:[e.jsxs(l,{children:[e.jsx(c,{children:((G=o==null?void 0:o.totalMessages)==null?void 0:G.toLocaleString())??"..."}),e.jsx(d,{children:"Messages"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((N=o==null?void 0:o.uniqueUsers)==null?void 0:N.toLocaleString())??"..."}),e.jsx(d,{children:"Unique Users"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((F=o==null?void 0:o.messagesLast24h)==null?void 0:F.toLocaleString())??"..."}),e.jsx(d,{children:"Last 24h"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((O=o==null?void 0:o.messagesLast7d)==null?void 0:O.toLocaleString())??"..."}),e.jsx(d,{children:"Last 7d"})]}),e.jsxs(l,{children:[e.jsx(c,{children:(T==null?void 0:T.toLocaleString())??"..."}),e.jsx(d,{children:"Avg / Day"})]}),e.jsxs(l,{children:[e.jsx(c,{children:(o==null?void 0:o.avgMessageLength)??"..."}),e.jsx(d,{children:"Avg Length"})]}),e.jsxs(l,{children:[e.jsx(c,{children:((U=o==null?void 0:o.deletedMessages)==null?void 0:U.toLocaleString())??"..."}),e.jsx(d,{children:"Deleted"})]}),e.jsxs(l,{children:[e.jsx(c,{children:Ne(o==null?void 0:o.dbSizeBytes)}),e.jsx(d,{children:"DB Size"})]}),e.jsxs(l,{children:[e.jsx(c,{children:Fe(o==null?void 0:o.oldestMessage)}),e.jsx(d,{children:"Since"})]})]}),(o==null?void 0:o.busiestDay)&&e.jsxs(Me,{children:["Busiest day: ",e.jsx("strong",{style:{color:"var(--gold)"},children:o.busiestDay.day})," with"," ",e.jsx("strong",{style:{color:"#fff"},children:o.busiestDay.count.toLocaleString()})," messages"]}),((K=o==null?void 0:o.perDay)==null?void 0:K.length)>0&&e.jsxs(ee,{children:[e.jsx(D,{children:"Messages per Day (last 14d)"}),e.jsx(re,{children:o.perDay.map(t=>{const n=Math.max(...o.perDay.map(i=>i.count)),a=n>0?t.count/n*100:0;return e.jsx(te,{$height:`${Math.max(a,2)}%`,$tooltip:`${t.day.slice(5)}: ${t.count}`},t.day)})}),e.jsx(oe,{children:o.perDay.map((t,n)=>e.jsx(se,{children:n===0||n===o.perDay.length-1?t.day.slice(5):""},t.day))})]}),((q=o==null?void 0:o.byHour)==null?void 0:q.length)>0&&e.jsxs(ee,{children:[e.jsx(D,{children:"Activity by Hour (UTC)"}),e.jsx(re,{children:Array.from({length:24},(t,n)=>{const a=o.byHour.find(h=>h.hour===n),i=(a==null?void 0:a.count)||0,x=Math.max(...o.byHour.map(h=>h.count)),f=x>0?i/x*100:0;return e.jsx(te,{$height:`${Math.max(f,2)}%`,$tooltip:`${n}:00 — ${i}`,$color:i===x&&x>0?"var(--gold)":void 0},n)})}),e.jsx(oe,{children:Array.from({length:24},(t,n)=>e.jsx(se,{children:n%6===0?`${n}`:""},n))})]}),((J=o==null?void 0:o.topChatters)==null?void 0:J.length)>0&&e.jsxs(Be,{children:[e.jsx(D,{children:"Top Chatters"}),o.topChatters.map((t,n)=>e.jsxs(De,{children:[e.jsxs(Le,{children:[n+1,"."]}),e.jsx(ze,{children:t.user_name}),e.jsx(Ae,{children:t.count.toLocaleString()})]},t.battle_tag))]})]}),e.jsxs(v,{children:[e.jsx(b,{children:"Top Words (7d)"}),((X=g==null?void 0:g.topWords)==null?void 0:X.length)>0?e.jsx(Ee,{children:g.topWords.map((t,n)=>{const a=g.topWords[0].count,i=t.count/a,x=Math.round(11+i*10),f=i>.7?"var(--gold)":i>.4?"#fff":"#aaa";return e.jsx(Ie,{$size:`${x}px`,$color:f,title:`${t.count} uses`,children:t.word},t.word)})}):e.jsx(u,{children:"Loading..."})]}),e.jsxs(v,{children:[e.jsx(Q,{children:e.jsx(b,{children:"Daily Digests"})}),e.jsx(_e,{children:(()=>{const t=[];for(let a=1;a<=3;a++){const i=new Date;i.setDate(i.getDate()-a),t.push(i.toISOString().slice(0,10))}const n=new Set(((g==null?void 0:g.digests)||[]).map(a=>a.date));return t.filter(a=>!n.has(a)).map(a=>e.jsx(Pe,{onClick:()=>ae(a),disabled:L===a,children:L===a?"Generating...":`Generate ${a}`},a))})()}),((Y=g==null?void 0:g.digests)==null?void 0:Y.length)>0?g.digests.map(t=>e.jsxs(Re,{$error:!t.digest,children:[e.jsx(We,{children:t.date}),t.digest?e.jsx(He,{children:t.digest}):e.jsx(u,{$color:"var(--grey-mid)",children:t.reason||"No digest available"})]},t.date)):e.jsx(u,{children:"No digests yet. Generate one for a recent day."})]}),e.jsxs(v,{children:[e.jsx(b,{children:"W3C Token"}),e.jsx(u,{$color:I,children:(V=r==null?void 0:r.signalr)!=null&&V.hasToken?"Token is set and active.":"No token set. Paste the W3ChampionsJWT cookie value below."}),m?e.jsxs(Se,{onSubmit:ne,children:[e.jsx(we,{type:"password",placeholder:"Paste W3ChampionsJWT cookie value...",value:w,onChange:t=>A(t.target.value)}),e.jsx(Ce,{type:"submit",disabled:!w.trim(),children:e.jsx(xe,{size:14})}),C&&e.jsx(u,{$color:C.startsWith("Error")?"var(--red)":"var(--green)",children:C})]}):e.jsx(u,{style:{display:"block",marginTop:8},children:"Set API key in chat panel to update token."})]}),e.jsxs(v,{children:[e.jsx(b,{children:"Dashboards"}),Ge.map(t=>e.jsxs(be,{href:t.url,target:"_blank",rel:"noopener",children:[e.jsxs(ye,{children:[e.jsx(je,{children:t.title}),e.jsx($e,{children:t.desc})]}),e.jsx(ke,{size:16})]},t.url))]})]})}export{qe as default};
