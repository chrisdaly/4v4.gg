import{u as Me,r as c,j as e,v as r,w as de,x as pe,h as N,y as Ce,M as Se,z as Z,A as he,L as J,C as Te,t as ze,G as me,B as Ie,D as Re,m as Ue,E as W,s as Ee,H as Ae,I as Fe}from"./index-Ck5R6zb5.js";function Le(t){return Me({attr:{viewBox:"0 0 20 20",fill:"currentColor","aria-hidden":"true"},child:[{tag:"path",attr:{d:"M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"},child:[]}]})(t)}const Be=r.aside`
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
    z-index: 10001;
    transform: ${t=>t.$mobileVisible?"translateY(0)":"translateY(100%)"};
    transition: transform 0.25s ease;
  }
`,He=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,Pe=r.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${t=>{var n;return((n=t.$theme)==null?void 0:n.bg)||"rgba(10, 8, 6, 0.25)"}};
  backdrop-filter: ${t=>{var n;return((n=t.$theme)==null?void 0:n.blur)||"blur(1px)"}};
  border: ${t=>{var n;return((n=t.$theme)==null?void 0:n.border)||"8px solid transparent"}};
  border-image: ${t=>{var n;return((n=t.$theme)==null?void 0:n.borderImage)||'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'}};
  box-shadow: ${t=>{var n;return((n=t.$theme)==null?void 0:n.shadow)||"none"}};
`,De=r.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,Oe=r.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,Ne=r.button`
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
`,Ye=r.button`
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
`,_e=r.div`
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
`,Ve=r.div`
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
`,qe=r(J)`
  display: block;
  text-decoration: none;
  color: inherit;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  overflow: hidden;
  transition: all 0.15s;

  &:hover {
    border-color: rgba(160, 130, 80, 0.25);
  }
`,fe=r.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6) var(--space-2);
  background: rgba(255, 255, 255, 0.02);
`,xe=r.img`
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,ge=r.div`
  flex: 1;
  min-width: 0;
`,ue=r.div`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,ve=r.div`
  display: flex;
  align-items: baseline;
  gap: 5px;
  margin-top: 4px;
`,be=r.span`
  font-family: var(--font-mono);
  font-size: 18px;
  color: #fff;
  font-weight: 700;
`,we=r.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  opacity: 0.7;
`,ye=r.div`
  width: 80px;
  flex-shrink: 0;
  align-self: stretch;
  padding: var(--space-2) 0;
  box-sizing: border-box;
`,je=r.div`
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--grey-light);
  margin-top: 3px;
`,Ge=r.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,$e=r.div`
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-6) var(--space-3);
  gap: 0;
`,ee=r.div`
  flex: 1;
  min-width: 0;
`,V=r.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  flex-direction: ${t=>t.$reverse?"row-reverse":"row"};

  &:last-child {
    margin-bottom: 0;
  }
`,q=r.img`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
`,G=r.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
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
`,Xe=he`
  0% { opacity: 1; }
  75% { opacity: 1; }
  100% { opacity: 0; }
`,Je=he`
  0% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 0; }
  20% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  50% { top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 80px; opacity: 1; }
  100% { top: 55%; left: var(--crown-end-x); transform: translate(-50%, -50%); width: 28px; height: 28px; opacity: 1; }
`,Ke=r(J)`
  display: block;
  text-decoration: none;
  color: inherit;
  position: relative;
  margin: var(--space-4) 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--gold);
  overflow: hidden;
  animation: ${Xe} 8s ease forwards;
`,Qe=r.img`
  position: absolute;
  z-index: 3;
  pointer-events: none;
  filter: drop-shadow(0 0 12px rgba(252, 219, 51, 0.6)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.8));
  animation: ${Je} 2s ease-out forwards;
`,Ze=r.div`
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
`,te=r.div`
  flex: 1;
  min-width: 0;
`,re=r.div`
  flex: 1;
  min-width: 0;
  opacity: 0.35;
`;function ne(t){var i;const o=(t.teams||((i=t.match)==null?void 0:i.teams)||[]).flatMap(x=>{var l;return((l=x.players)==null?void 0:l.map(f=>f.oldMmr||0))||[]});return o.length>0?o.reduce((x,l)=>x+l,0)/o.length:0}function We({startTime:t}){const[n,o]=c.useState(()=>Z(t));return c.useEffect(()=>{const i=setInterval(()=>{o(Z(t))},1e3);return()=>clearInterval(i)},[t]),e.jsxs(je,{children:[e.jsx(Ge,{}),n]})}function et({match:t}){var A,B,F,z,L,I,E,s;const n=Ce(),o=t.mapName||((A=t.match)==null?void 0:A.mapName),i=(o==null?void 0:o.replace(/^\(\d\)\s*/,""))||"Unknown",x=de(o),l=t.teams||((B=t.match)==null?void 0:B.teams)||[],f=t.startTime||((F=t.match)==null?void 0:F.startTime),w=l[0],a=l[1],d=((z=w==null?void 0:w.players)==null?void 0:z.map(p=>p.oldMmr||0))||[],k=((L=a==null?void 0:a.players)==null?void 0:L.map(p=>p.oldMmr||0))||[],y=[...d,...k],S=y.length>0?Math.round(y.reduce((p,$)=>p+$,0)/y.length):null,j={teamOneMmrs:d,teamTwoMmrs:k},T=t.id||((I=t.match)==null?void 0:I.id);return e.jsxs(qe,{to:T?`/match/${T}`:"/",children:[e.jsxs(fe,{children:[x&&e.jsx(xe,{src:x,alt:""}),e.jsxs(ge,{children:[e.jsx(ue,{children:i}),S!=null&&e.jsxs(ve,{children:[e.jsx(be,{children:S}),e.jsx(we,{children:"MMR"})]}),f&&e.jsx(We,{startTime:f})]})]}),e.jsxs($e,{children:[e.jsx(ee,{$team:1,children:(E=w==null?void 0:w.players)==null?void 0:E.map((p,$)=>e.jsxs(V,{children:[e.jsx(q,{src:N[p.race],alt:""}),e.jsx(G,{onClick:u=>{u.preventDefault(),u.stopPropagation(),n.push(`/player/${encodeURIComponent(p.battleTag)}`)},children:p.name})]},$))}),e.jsx(ye,{children:e.jsx(Se,{data:j,compact:!0,hideLabels:!0,showMean:!1,showStdDev:!1})}),e.jsx(ee,{$team:2,children:(s=a==null?void 0:a.players)==null?void 0:s.map((p,$)=>e.jsxs(V,{$reverse:!0,children:[e.jsx(q,{src:N[p.race],alt:""}),e.jsx(G,{$right:!0,onClick:u=>{u.preventDefault(),u.stopPropagation(),n.push(`/player/${encodeURIComponent(p.battleTag)}`)},children:p.name})]},$))})]})]})}function tt({match:t}){var z,L,I,E,s,p,$;const n=t.mapName||((z=t.match)==null?void 0:z.mapName),o=(n==null?void 0:n.replace(/^\(\d\)\s*/,""))||"Unknown",i=de(n),x=t.teams||((L=t.match)==null?void 0:L.teams)||[],l=t._winnerTeam,f=t.durationInSeconds,w=f?`${Math.floor(f/60)}:${String(f%60).padStart(2,"0")}`:null,a=x[0],d=x[1],k=((I=a==null?void 0:a.players)==null?void 0:I.map(u=>u.oldMmr||0))||[],y=((E=d==null?void 0:d.players)==null?void 0:E.map(u=>u.oldMmr||0))||[],S=[...k,...y],j=S.length>0?Math.round(S.reduce((u,R)=>u+R,0)/S.length):null,T=t.id||((s=t.match)==null?void 0:s.id),A=l===0?te:re,B=l===1?te:re,F=l===0?"25%":"75%";return e.jsxs(Ke,{to:T?`/match/${T}`:"/",style:{"--crown-end-x":F},children:[e.jsx(Ze,{}),l!=null&&e.jsx(Qe,{src:pe,alt:""}),e.jsxs(fe,{children:[i&&e.jsx(xe,{src:i,alt:""}),e.jsxs(ge,{children:[e.jsx(ue,{children:o}),j!=null&&e.jsxs(ve,{children:[e.jsx(be,{children:j}),e.jsx(we,{children:"MMR"})]}),w&&e.jsx(je,{children:w})]})]}),e.jsxs($e,{children:[e.jsx(A,{children:(p=a==null?void 0:a.players)==null?void 0:p.map((u,R)=>e.jsxs(V,{children:[e.jsx(q,{src:N[u.race],alt:""}),e.jsx(G,{children:u.name})]},R))}),e.jsx(ye,{}),e.jsx(B,{children:($=d==null?void 0:d.players)==null?void 0:$.map((u,R)=>e.jsxs(V,{$reverse:!0,children:[e.jsx(q,{src:N[u.race],alt:""}),e.jsx(G,{$right:!0,children:u.name})]},R))})]})]})}function rt({matches:t=[],finishedMatches:n=[],$mobileVisible:o,onClose:i,borderTheme:x}){const[l,f]=c.useState("mmr"),w=c.useMemo(()=>{const a=[...t];return l==="mmr"?a.sort((d,k)=>ne(k)-ne(d)):a.sort((d,k)=>{var j,T;const y=new Date(d.startTime||((j=d.match)==null?void 0:j.startTime)||0).getTime();return new Date(k.startTime||((T=k.match)==null?void 0:T.startTime)||0).getTime()-y}),a},[t,l]);return e.jsx(Be,{$mobileVisible:o,children:e.jsxs(Pe,{$theme:x,children:[e.jsxs(He,{$theme:x,children:[e.jsx(De,{children:"Active Games"}),e.jsx(Oe,{children:t.length}),e.jsx(Ne,{onClick:()=>f(a=>a==="mmr"?"recent":"mmr"),children:l==="mmr"?"MMR":"Recent"}),e.jsx(Ye,{onClick:i,children:"×"})]}),w.length===0&&n.length===0?e.jsx(Ve,{children:"No active games"}):e.jsxs(_e,{children:[n.map(a=>e.jsx(tt,{match:a},`fin-${a.id}`)),w.map(a=>{var d;return e.jsx(et,{match:a},a.id||((d=a.match)==null?void 0:d.id))})]})]})})}const nt=r.aside`
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
    z-index: 10001;
    transform: ${t=>t.$mobileVisible?"translateY(0)":"translateY(100%)"};
    transition: transform 0.25s ease;
  }
`,ot=r.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  flex-shrink: 0;
`,st=r.div`
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
  background: ${t=>{var n;return((n=t.$theme)==null?void 0:n.bg)||"rgba(10, 8, 6, 0.25)"}};
  backdrop-filter: ${t=>{var n;return((n=t.$theme)==null?void 0:n.blur)||"blur(1px)"}};
  border: ${t=>{var n;return((n=t.$theme)==null?void 0:n.border)||"8px solid transparent"}};
  border-image: ${t=>{var n;return((n=t.$theme)==null?void 0:n.borderImage)||'url("/frames/chat/ChatFrameBorder.png") 30 / 8px stretch'}};
  box-shadow: ${t=>{var n;return((n=t.$theme)==null?void 0:n.shadow)||"none"}};
`,at=r.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,it=r.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,lt=r.button`
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
`,ct=r.div`
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
`,dt=r.input`
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
`,pt=r.button`
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
`,ht=r.div`
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
`,ke=r.span`
  cursor: pointer;
  user-select: none;
  transition: color 0.15s;
  color: ${t=>t.$active?"var(--gold)":"var(--grey-light)"};

  &:hover {
    color: var(--gold);
  }
`,mt=r(ke)`
  flex: 1;
`,ft=r(ke)`
  flex-shrink: 0;
`,xt=r.div`
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
`,gt=r.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  cursor: default;
  border-radius: var(--radius-sm);

  &:hover {
    background: rgba(255, 255, 255, 0.04);
  }
`,ut=r(J)`
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
`,vt=r.div`
  position: relative;
  display: inline-block;
  flex-shrink: 0;
`,bt=r.div`
  position: absolute;
  bottom: -2px;
  right: -2px;
  line-height: 0;
`,wt=r.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
`,oe=r.img`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  padding: 4px;
  background: rgba(255, 255, 255, 0.06);
  opacity: ${t=>t.$faded?.2:.85};
`,yt=r(me)`
  width: 12px;
  height: 12px;
  color: var(--red);
  fill: var(--red);
  flex-shrink: 0;
  animation: pulse 1.5s infinite;
`,jt=r.img.attrs({src:pe,alt:""})`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  filter: drop-shadow(0 0 3px rgba(252, 219, 51, 0.4));
`,$t=r.img`
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  opacity: 0.85;
`,kt=r.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,Mt=r.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
  flex-shrink: 0;
`,se=r.div`
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
`,ae=r.span`
  color: var(--gold);
`,ie=r.span`
  font-size: 8px;
  transition: transform 0.2s;
  transform: ${t=>t.$open?"rotate(90deg)":"rotate(0deg)"};
`;function Ct(t,n,o){var f;const i=(f=n==null?void 0:n.get(t))==null?void 0:f.profilePicUrl;if(i)return e.jsx(wt,{src:i,alt:""});const x=o==null?void 0:o.get(t),l=(x==null?void 0:x.race)!=null?N[x.race]:null;return l?e.jsx(oe,{src:l,alt:""}):e.jsx(oe,{src:ze.random,alt:"",$faded:!0})}function le({user:t,avatars:n,stats:o,inGame:i,matchUrl:x,isRecentWinner:l}){var y;const f=o==null?void 0:o.get(t.battleTag),w=f==null?void 0:f.mmr,a=(f==null?void 0:f.race)!=null?N[f.race]:null,d=(y=n==null?void 0:n.get(t.battleTag))==null?void 0:y.country,k=e.jsxs(e.Fragment,{children:[e.jsxs(vt,{children:[Ct(t.battleTag,n,o),d&&e.jsx(bt,{children:e.jsx(Te,{name:d.toLowerCase(),style:{width:14,height:10}})})]}),i&&e.jsx(yt,{}),l&&e.jsx(jt,{}),a&&e.jsx($t,{src:a,alt:""}),e.jsx(kt,{children:t.name}),w!=null&&e.jsx(Mt,{children:Math.round(w)})]});return x?e.jsx(ut,{to:x,children:k}):e.jsx(gt,{children:k})}function St({users:t,avatars:n,stats:o,inGameTags:i,inGameMatchMap:x,recentWinners:l,$mobileVisible:f,onClose:w,borderTheme:a}){const[d,k]=c.useState(""),[y,S]=c.useState("mmr"),[j,T]=c.useState(!0),[A,B]=c.useState(!0);function F(s){S(s)}const z=c.useMemo(()=>[...t].sort((s,p)=>{var R,H;if(y==="live"){const O=i!=null&&i.has(s.battleTag)?1:0,Y=i!=null&&i.has(p.battleTag)?1:0;if(O!==Y)return Y-O}if(y==="name"){const O=(s.name||"").localeCompare(p.name||"",void 0,{sensitivity:"base"});if(O!==0)return O}const $=((R=o==null?void 0:o.get(s.battleTag))==null?void 0:R.mmr)??-1,u=((H=o==null?void 0:o.get(p.battleTag))==null?void 0:H.mmr)??-1;return $!==u?u-$:(s.name||"").localeCompare(p.name||"",void 0,{sensitivity:"base"})}),[t,o,i,y]),L=c.useMemo(()=>{if(!d.trim())return z;const s=d.toLowerCase();return z.filter(p=>(p.name||"").toLowerCase().includes(s))},[z,d]),{inGameUsers:I,onlineUsers:E}=c.useMemo(()=>{const s=[],p=[];for(const $ of L)i!=null&&i.has($.battleTag)?s.push($):p.push($);return{inGameUsers:s,onlineUsers:p}},[L,i]);return e.jsx(nt,{$mobileVisible:f,children:e.jsxs(st,{$theme:a,children:[e.jsxs(ot,{$theme:a,children:[e.jsx(at,{children:"Channel"}),e.jsx(it,{children:t.length}),e.jsx(lt,{onClick:w,children:"×"})]}),e.jsxs(ct,{children:[e.jsx(dt,{type:"text",placeholder:"Search players...",value:d,onChange:s=>k(s.target.value)}),d&&e.jsx(pt,{onClick:()=>k(""),children:"×"})]}),e.jsxs(ht,{children:[e.jsx(mt,{$active:y==="name",onClick:()=>F("name"),children:"Player"}),e.jsx(ft,{$active:y==="mmr",onClick:()=>F("mmr"),children:"MMR"})]}),e.jsxs(xt,{children:[I.length>0&&e.jsxs(e.Fragment,{children:[e.jsxs(se,{onClick:()=>T(s=>!s),children:[e.jsx(ie,{$open:j,children:"▶"}),"In Game — ",e.jsx(ae,{children:I.length})]}),j&&I.map(s=>e.jsx(le,{user:s,avatars:n,stats:o,inGame:!0,matchUrl:x==null?void 0:x.get(s.battleTag),isRecentWinner:l==null?void 0:l.has(s.battleTag)},s.battleTag))]}),e.jsxs(se,{onClick:()=>B(s=>!s),children:[e.jsx(ie,{$open:A,children:"▶"}),"Online — ",e.jsx(ae,{children:E.length})]}),A&&E.map(s=>e.jsx(le,{user:s,avatars:n,stats:o,inGame:!1,matchUrl:null,isRecentWinner:l==null?void 0:l.has(s.battleTag)},s.battleTag))]})]})})}const Tt=r.div`
  padding: var(--space-1) var(--space-2) 0;
  position: relative;

  @media (max-width: 768px) {
    padding: 0;
  }
`,zt=r.div`
  display: flex;
  gap: var(--space-2);
  height: calc(100vh - 52px);

  @media (max-width: 768px) {
    gap: 0;
    height: calc(100vh - 46px);
  }
`,ce=r.button`
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
`,Rt=()=>{const{messages:t,status:n,onlineUsers:o,botResponses:i,translations:x,sendMessage:l}=Ie(),{borderTheme:f}=Re(),[w,a]=c.useState(new Map),[d,k]=c.useState(new Map),[y,S]=c.useState(new Map),[j,T]=c.useState([]),[A,B]=c.useState(!1),[F,z]=c.useState(!1),[L,I]=c.useState([]),[E,s]=c.useState(new Set),p=c.useRef(new Set),$=c.useRef(new Set),u=c.useRef(new Set),R=c.useCallback(async()=>{try{const b=await Ue();T(b.matches||[])}catch{}},[]);c.useEffect(()=>{R();const b=setInterval(R,3e4);return()=>clearInterval(b)},[R]),c.useEffect(()=>{const b=new Set(j.map(m=>{var M;return m.id||((M=m.match)==null?void 0:M.id)})),h=[...u.current].filter(m=>m&&!b.has(m));if(u.current=b,h.length===0)return;console.log("[GameEnd] Detected ended matches:",h);async function g(m,M=0){var K,Q;console.log(`[GameEnd] Fetching result for ${m}, attempt ${M}`);let P;try{const U=await fetch(`https://website-backend.w3champions.com/api/matches/${encodeURIComponent(m)}`);if(!U.ok)return;const C=await U.json();P=C==null?void 0:C.match}catch{return}if(!P)return;const _=(K=P.teams)==null?void 0:K.findIndex(U=>{var C;return(C=U.players)==null?void 0:C.some(D=>D.won===!0||D.won===1)});if(_<0&&M<3){setTimeout(()=>g(m,M+1),5e3);return}if(_>=0){const U=((Q=P.teams[_].players)==null?void 0:Q.map(C=>C.battleTag).filter(Boolean))||[];U.length>0&&(s(C=>{const D=new Set(C);return U.forEach(X=>D.add(X)),D}),setTimeout(()=>{s(C=>{const D=new Set(C);return U.forEach(X=>D.delete(X)),D})},12e4))}I(U=>[...U,{...P,id:m,_winnerTeam:_>=0?_:null,_finishedAt:Date.now()}]),setTimeout(()=>{I(U=>U.filter(C=>C.id!==m))},8e3)}for(const m of h)setTimeout(()=>g(m),5e3)},[j]);const H=c.useMemo(()=>{const b=new Set;for(const h of j)for(const g of h.teams)for(const m of g.players)m.battleTag&&b.add(m.battleTag);const v=Date.now();for(let h=t.length-1;h>=0;h--){const g=t[h],m=new Date(g.sent_at||g.sentAt).getTime();if(v-m>6e4)break;const M=g.battle_tag||g.battleTag;M&&b.delete(M)}return b},[j,t]),O=c.useMemo(()=>{const b=new Map;for(const v of j)for(const h of v.teams)for(const g of h.players)g.battleTag&&b.set(g.battleTag,`/player/${encodeURIComponent(g.battleTag)}`);return b},[j]);c.useEffect(()=>{const v=[...$.current].filter(h=>!H.has(h));$.current=new Set(H);for(const h of v)W(h).then(g=>{var m;(m=g==null?void 0:g.session)!=null&&m.form&&S(M=>{const P=new Map(M);return P.set(h,g.session.form),P})})},[H]);const Y=c.useMemo(()=>{const b=new Set;for(const v of t){const h=v.battle_tag||v.battleTag;h&&b.add(h)}for(const v of o)v.battleTag&&b.add(v.battleTag);return b},[t,o]);return c.useEffect(()=>{const b=[];for(const v of Y)p.current.has(v)||(p.current.add(v),b.push(v));if(b.length!==0)for(const v of b)Ee(v).then(h=>{a(g=>{const m=new Map(g);return m.set(v,h),m})}),Ae(v).then(h=>{h&&k(g=>{const m=new Map(g);return m.set(v,h),m})}),W(v).then(h=>{var g;(g=h==null?void 0:h.session)!=null&&g.form&&S(m=>{const M=new Map(m);return M.set(v,h.session.form),M})})},[Y]),e.jsxs(Tt,{children:[e.jsxs(zt,{children:[e.jsx(rt,{matches:j,finishedMatches:L,$mobileVisible:F,onClose:()=>z(!1),borderTheme:f}),e.jsx(Fe,{messages:t,status:n,avatars:w,stats:d,sessions:y,inGameTags:H,recentWinners:E,botResponses:i,translations:x,borderTheme:f,sendMessage:l}),e.jsx(St,{users:o,avatars:w,stats:d,inGameTags:H,inGameMatchMap:O,recentWinners:E,$mobileVisible:A,onClose:()=>B(!1),borderTheme:f})]}),!F&&!A&&e.jsxs(e.Fragment,{children:[e.jsx(ce,{$left:"var(--space-4)",onClick:()=>z(!0),children:e.jsx(me,{})}),e.jsx(ce,{$right:"var(--space-4)",onClick:()=>B(!0),children:e.jsx(Le,{})})]})]})};export{Rt as default};
