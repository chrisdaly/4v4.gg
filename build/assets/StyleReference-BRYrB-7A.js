import{j as e,M as v,v as t}from"./index-Ck5R6zb5.js";const j={gold:{value:"#fcdb33",css:"--gold",usage:"Brand, player names, accents"},green:{value:"#4ade80",css:"--green",usage:"Wins, positive"},red:{value:"#f87171",css:"--red",usage:"Losses, negative"},blue:{value:"#3b82f6",css:"--blue",usage:"Links, info"},greyLight:{value:"#bbb",css:"--grey-light",usage:"Secondary text, labels"},textBody:{value:"#ccc",css:"--text-body",usage:"Body/prose text"},greyMid:{value:"#444",css:"--grey-mid",usage:"Borders, disabled"},greyDark:{value:"#1a1a1a",css:"--grey-dark",usage:"Elevated surfaces"},white:{value:"#fff",css:"--white",usage:"Primary text"},teamBlue:{value:"#4da6ff",css:"--team-blue",usage:"Team 1 indicator"},teamRed:{value:"#ef4444",css:"--team-red",usage:"Team 2 indicator"},twitchPurple:{value:"#9146ff",css:"--twitch-purple",usage:"Twitch branding"},atPurple:{value:"#8b5cf6",css:"--at-purple",usage:"AT team indicators"}},S={display:{value:'"Friz_Quadrata_Bold", Georgia, serif',css:"--font-display",usage:"Headlines, player names"},mono:{value:'"Inconsolata", "SF Mono", Consolas, monospace',css:"--font-mono",usage:"Stats, labels, dates"},body:{value:'"Libre Baskerville", Georgia, serif',css:"--font-body",usage:"Blog prose, descriptions"}},F={xxs:{value:"12px",css:"--text-xxs",usage:"Tiny labels, tooltips"},xs:{value:"14px",css:"--text-xs",usage:"Labels, column headers"},sm:{value:"16px",css:"--text-sm",usage:"Small text, captions"},base:{value:"18px",css:"--text-base",usage:"Body default"},lg:{value:"24px",css:"--text-lg",usage:"Subheadings"},xl:{value:"34px",css:"--text-xl",usage:"Headings, player names"}},M={1:{value:"4px",css:"--space-1"},2:{value:"8px",css:"--space-2"},4:{value:"16px",css:"--space-4"},6:{value:"24px",css:"--space-6"},8:{value:"32px",css:"--space-8"},12:{value:"48px",css:"--space-12"}},d={radiusSm:{value:"2px",css:"--radius-sm",usage:"Subtle rounding"},radiusMd:{value:"4px",css:"--radius-md",usage:"Cards, buttons"},radiusFull:{value:"9999px",css:"--radius-full",usage:"Pills, dots"},thin:{value:"1px",css:"--border-thin",usage:"Subtle borders"},thick:{value:"2px",css:"--border-thick",usage:"Emphasis borders"}},u={shadowGlow:{value:"0 0 20px rgba(252, 219, 51, 0.3)",css:"--shadow-glow",usage:"Gold glow effect"},transition:{value:"150ms ease",css:"--transition",usage:"Default animation"}},C={heavy:{value:"rgba(0, 0, 0, 0.9)",css:"--overlay-heavy",usage:"Nearly opaque"},medium:{value:"rgba(0, 0, 0, 0.8)",css:"--overlay-medium",usage:"Standard overlay"},light:{value:"rgba(0, 0, 0, 0.6)",css:"--overlay-light",usage:"Lighter backdrop"}},z={surface1:{value:"rgba(255, 255, 255, 0.02)",css:"--surface-1",usage:"Card background"},surface2:{value:"rgba(255, 255, 255, 0.05)",css:"--surface-2",usage:"Hover state"},surface3:{value:"rgba(255, 255, 255, 0.1)",css:"--surface-3",usage:"Borders, dividers"}},T={gold:{value:"rgba(252, 219, 51, 0.1)",css:"--gold-tint",usage:"Gold highlight bg"},green:{value:"rgba(74, 222, 128, 0.1)",css:"--green-tint",usage:"Win highlight bg"},red:{value:"rgba(248, 113, 113, 0.1)",css:"--red-tint",usage:"Loss highlight bg"}},w={playerName:{description:"Player names",css:"font-family: var(--font-display); color: var(--gold)"},statsMmr:{description:"Stats/MMR values",css:"font-family: var(--font-mono); color: #fff"},label:{description:"Labels, column headers",css:"font: var(--text-xs) var(--font-mono); text-transform: uppercase; letter-spacing: 0.1em; color: var(--grey-light)"},winValue:{description:"Win values",css:"color: var(--green)"},lossValue:{description:"Loss values",css:"color: var(--red)"},liveIndicator:{description:"Live/ongoing indicator",css:"width: 10px; height: 10px; background: var(--red); border-radius: 50%; animation: pulse 1.5s infinite"},cardGold:{description:"Primary cards",css:"border: var(--border-thick) solid var(--gold); border-radius: var(--radius-md)"},cardSubtle:{description:"Secondary cards",css:"border: 1px solid var(--grey-mid); border-radius: var(--radius-md)"},selectGold:{description:"Dropdown/select",css:"font-family: var(--font-display); background: linear-gradient(180deg, rgba(30,30,30,0.95), rgba(15,15,15,0.98)); border: 1px solid rgba(252,219,51,0.3); border-radius: 4px; color: var(--gold); padding: 8px 28px 8px 12px"},listItemName:{description:"List item names (leagues, races, countries)",css:"font-family: var(--font-display); font-size: var(--text-base); color: #fff"},listItemValue:{description:"List item values (counts, percentages)",css:"font-family: var(--font-mono); font-size: var(--text-base); color: #fff"},blogPageTitle:{description:"Blog page/article h1",css:"font-family: var(--font-display); font-size: var(--text-xl); color: var(--gold)"},blogSectionTitle:{description:"Blog h2 (article sections)",css:"font-family: var(--font-display); font-size: var(--text-lg); color: var(--white)"},blogPostTitle:{description:"Blog post title in listing",css:"font-family: var(--font-display); font-size: 28px; color: var(--white)"},blogTag:{description:"Blog tags/categories",css:"font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--grey-light); text-transform: uppercase; letter-spacing: 0.1em"},blogDate:{description:"Blog dates",css:"font-family: var(--font-mono); font-size: var(--text-xxs); color: var(--grey-light)"},blogBody:{description:"Blog article body text",css:"font-family: var(--font-body); font-size: var(--text-base); color: var(--text-body); line-height: 1.85"},blogDesc:{description:"Blog post description in listing",css:"font-family: var(--font-body); font-size: var(--text-base); color: var(--text-body); line-height: 1.7"}},A=[{name:"Button",description:"Primary/secondary variants"},{name:"Badge",description:"Status badges (win/loss/default)"},{name:"Card",description:"Gold-bordered container"},{name:"Dot",description:"Win/loss form indicator"},{name:"TeamBar",description:"Blue/red team indicator"},{name:"Select",description:"Gold dropdown with custom arrow"}],G=t.div`
  padding: var(--space-8);
  background: #0a0a0a;
  min-height: 100vh;
  max-width: 900px;
  margin: 0 auto;
`,O=t.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-1);
`,L=t.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  margin-bottom: var(--space-8);
`,i=t.section`
  margin-bottom: var(--space-8);
`,o=t.h2`
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--green);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-1);
  border-bottom: 1px solid var(--grey-mid);
`,m=t.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--space-2);
`,n=t.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
`,l=t.pre`
  background: var(--grey-dark);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  overflow-x: auto;
  margin-top: var(--space-4);
`,E=t.div`
  display: flex;
  flex-direction: column;
`,N=t.div`
  height: 40px;
  background: ${s=>s.$color};
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  border: 1px solid var(--grey-mid);
  border-bottom: none;
`,P=t.div`
  background: var(--grey-dark);
  padding: var(--space-1) var(--space-2);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  border: 1px solid var(--grey-mid);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: #fff;
`,B=t.div`
  display: flex;
  align-items: baseline;
  gap: var(--space-4);
  padding: var(--space-2) 0;
  border-bottom: 1px solid #222;
  &:last-child { border-bottom: none; }
`,$=t.span`
  flex: 0 0 80px;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
`,D=t.div`
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
`,I=t.div`
  width: ${s=>s.$size};
  height: 16px;
  background: var(--gold);
  border-radius: var(--radius-sm);
  opacity: 0.8;
`,W=t.span`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  min-width: 100px;
`,U=t.div`
  background: rgba(255,255,255,0.02);
  border: var(--border-thick) solid var(--gold);
  border-radius: var(--radius-md);
  padding: var(--space-4);
`,y=t.span`
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-radius: var(--radius-full);
  background: ${s=>s.$bg||"var(--grey-dark)"};
  color: ${s=>s.$color||"#fff"};
  border: 1px solid ${s=>s.$border||"var(--grey-mid)"};
`,x=t.span`
  width: ${s=>s.$recent?"10px":"8px"};
  height: ${s=>s.$recent?"10px":"8px"};
  border-radius: var(--radius-full);
  background: ${s=>s.$win?"var(--green)":"var(--red)"};
  opacity: ${s=>s.$recent?1:.7};
`,k=t.button`
  padding: var(--space-2) var(--space-4);
  font-family: var(--font-display);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity var(--transition);

  ${s=>s.$primary&&`
    background: var(--gold);
    color: #0a0a0a;
    border: none;
    &:hover { opacity: 0.9; }
  `}

  ${s=>s.$secondary&&`
    background: transparent;
    color: var(--gold);
    border: var(--border-thin) solid var(--gold);
    &:hover { background: rgba(252,219,51,0.1); }
  `}
`,R=t.div`
  padding: var(--space-2) var(--space-4);
  border-left: 3px solid ${s=>s.$blue?"#3b82f6":"#ef4444"};
  background: ${s=>s.$blue?"rgba(59,130,246,0.1)":"rgba(239,68,68,0.1)"};
  font-family: var(--font-display);
  color: var(--gold);
`,h=t.p`
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-4);
  font-style: italic;
`,g={combinedGap:5,areaMultiplier:1.6},H=()=>{const s=Object.entries(j),f=Object.entries(M),b=Object.entries(F);return e.jsxs(G,{children:[e.jsx(O,{children:"Design System"}),e.jsx(L,{children:"Single source of truth: src/design-tokens.js"}),e.jsxs(i,{children:[e.jsxs(o,{children:["Colors (",s.length,")"]}),e.jsx(m,{children:s.map(([r,a])=>e.jsxs(E,{children:[e.jsx(N,{$color:a.value}),e.jsx(P,{children:a.css})]},r))})]}),e.jsxs(i,{children:[e.jsxs(o,{children:["Typography (",Object.keys(S).length," fonts, ",b.length," sizes)"]}),Object.entries(S).map(([r,a])=>e.jsxs(B,{children:[e.jsx($,{children:r}),e.jsx("span",{style:{fontFamily:a.value,fontSize:"var(--text-lg)",color:r==="display"?"var(--gold)":"#fff"},children:a.usage})]},r)),e.jsx("div",{style:{marginTop:"var(--space-4)"},children:b.map(([r,a])=>e.jsxs(B,{children:[e.jsxs($,{children:[r," / ",a.value]}),e.jsx("span",{style:{fontSize:a.value},children:a.usage})]},r))}),e.jsxs("div",{style:{marginTop:"var(--space-4)"},children:[e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",textTransform:"uppercase",letterSpacing:"0.1em",color:"var(--grey-light)"},children:"RANK    MMR    RECORD    FORM"}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginTop:"var(--space-1)"},children:"Label style: mono + xs + uppercase + letter-spacing"})]})]}),e.jsxs(i,{children:[e.jsxs(o,{children:["Spacing (",f.length,")"]}),f.map(([r,a])=>e.jsxs(D,{children:[e.jsxs(W,{children:[a.css," (",a.value,")"]}),e.jsx(I,{$size:a.value})]},r))]}),e.jsxs(i,{children:[e.jsxs(o,{children:["Borders (",Object.keys(d).length,")"]}),e.jsxs(n,{style:{gap:"var(--space-6)"},children:[Object.entries(d).filter(([r])=>r.startsWith("radius")).map(([r,a])=>e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:40,height:40,background:"var(--gold)",borderRadius:a.value,marginBottom:"var(--space-1)"}}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--grey-light)"},children:r.replace("radius","").toLowerCase()||"sm"})]},r)),e.jsx("div",{style:{borderLeft:"1px solid var(--grey-mid)",height:40}}),Object.entries(d).filter(([r])=>!r.startsWith("radius")).map(([r,a])=>e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:50,height:40,border:`${a.value} solid var(--gold)`,borderRadius:"var(--radius-md)",marginBottom:"var(--space-1)"}}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--grey-light)"},children:r})]},r))]})]}),e.jsxs(i,{children:[e.jsxs(o,{children:["Effects (",Object.keys(u).length,")"]}),e.jsx(n,{style:{gap:"var(--space-6)"},children:e.jsxs("div",{children:[e.jsx("div",{style:{width:80,height:60,background:"var(--grey-dark)",borderRadius:"var(--radius-md)",boxShadow:u.shadowGlow.value}}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--grey-light)",display:"block",marginTop:"var(--space-2)"},children:u.shadowGlow.css})]})})]}),e.jsxs(i,{children:[e.jsx(o,{children:"Transparency / Overlays"}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Dark overlays (for stream overlays, modals)"}),e.jsx(n,{style:{gap:"var(--space-4)"},children:Object.entries(C).map(([r,a])=>{var c,p;return e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:80,height:50,background:a.value,border:"1px solid var(--grey-mid)",borderRadius:"var(--radius-md)",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"#fff"},children:((p=(c=a.value.match(/[\d.]+\)$/))==null?void 0:c[0])==null?void 0:p.replace(")",""))||r})}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--grey-light)",display:"block",marginTop:"var(--space-1)"},children:r})]},r)})})]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Surface tints (for cards, rows, hover states)"}),e.jsx(n,{style:{gap:"var(--space-4)"},children:Object.entries(z).map(([r,a])=>{var c,p;return e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:80,height:50,background:a.value,border:"1px solid var(--grey-mid)",borderRadius:"var(--radius-md)",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--grey-light)"},children:((p=(c=a.value.match(/[\d.]+\)$/))==null?void 0:c[0])==null?void 0:p.replace(")",""))||r})}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--grey-light)",display:"block",marginTop:"var(--space-1)"},children:a.usage})]},r)})})]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Color tints (for badges, highlights)"}),e.jsx(n,{style:{gap:"var(--space-4)"},children:Object.entries(T).map(([r,a])=>{const c=r==="gold"?"var(--gold)":r==="green"?"var(--green)":"var(--red)";return e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{width:80,height:50,background:a.value,border:`1px solid ${c}`,borderRadius:"var(--radius-md)",display:"flex",alignItems:"center",justifyContent:"center"},children:e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:c},children:r})}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--grey-light)",display:"block",marginTop:"var(--space-1)"},children:a.css})]},r)})})]})]}),e.jsxs(i,{children:[e.jsxs(o,{children:["Components (",A.length,")"]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Buttons"}),e.jsxs(n,{children:[e.jsx(k,{$primary:!0,children:"Primary"}),e.jsx(k,{$secondary:!0,children:"Secondary"})]})]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Badges"}),e.jsxs(n,{children:[e.jsx(y,{children:"Default"}),e.jsx(y,{$bg:"var(--gold)",$color:"#0a0a0a",$border:"var(--gold)",children:"Gold"}),e.jsx(y,{$bg:"rgba(74,222,128,0.15)",$color:"var(--green)",$border:"var(--green)",children:"Win"}),e.jsx(y,{$bg:"rgba(248,113,113,0.15)",$color:"var(--red)",$border:"var(--red)",children:"Loss"})]})]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Form dots (most recent = largest)"}),e.jsxs(n,{style:{gap:"var(--space-1)",alignItems:"center"},children:[e.jsx(x,{}),e.jsx(x,{$win:!0}),e.jsx(x,{}),e.jsx(x,{$win:!0}),e.jsx(x,{$win:!0,$recent:!0}),e.jsx("span",{style:{marginLeft:"var(--space-2)",fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--grey-light)"},children:"3W-2L"})]})]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Live indicator"}),e.jsxs(n,{style:{alignItems:"center",gap:"var(--space-2)"},children:[e.jsx("span",{className:"live-dot"}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--grey-light)"},children:"Pulsing red dot for live/ongoing status"})]})]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Team indicators"}),e.jsxs(n,{children:[e.jsx(R,{$blue:!0,children:"PlayerName"}),e.jsx(R,{children:"EnemyPlayer"})]})]}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Card"}),e.jsxs(U,{style:{maxWidth:240},children:[e.jsx("div",{style:{fontFamily:"var(--font-display)",color:"var(--gold)",marginBottom:"var(--space-1)"},children:"PlayerName"}),e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--grey-light)"},children:"1847 MMR - 59% WR"})]})]}),e.jsxs("div",{children:[e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Select / Dropdown"}),e.jsxs(n,{style:{gap:"var(--space-4)"},children:[e.jsxs("select",{style:{fontFamily:'"Friz_Quadrata_Bold", serif',background:"linear-gradient(180deg, rgba(30, 30, 30, 0.95) 0%, rgba(15, 15, 15, 0.98) 100%)",border:"1px solid rgba(252, 219, 51, 0.3)",borderRadius:"4px",color:"var(--gold)",fontSize:"12px",letterSpacing:"0.5px",padding:"8px 28px 8px 12px",cursor:"pointer",WebkitAppearance:"none",MozAppearance:"none",appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath fill='%23fcdb33' d='M0 0l5 6 5-6z'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 10px center"},children:[e.jsx("option",{children:"S24"}),e.jsx("option",{children:"S23"}),e.jsx("option",{children:"S22"})]}),e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--grey-light)"},children:"Gold border, custom arrow, Friz Quadrata font"})]})]})]}),e.jsxs(i,{children:[e.jsx(o,{children:"Loading States"}),e.jsx(h,{children:"Gold spinner + text. Used across all pages."}),e.jsxs(m,{style:{gridTemplateColumns:"repeat(2, 1fr)",gap:"var(--space-4)"},children:[e.jsxs("div",{style:{background:"var(--surface-1)",padding:"var(--space-4)",borderRadius:"var(--radius-md)"},children:[e.jsx("div",{style:{color:"var(--gold)",fontSize:"var(--text-xs)",fontFamily:"var(--font-mono)",marginBottom:"var(--space-4)"},children:"Spinner Sizes"}),e.jsxs(n,{style:{gap:"var(--space-6)",marginBottom:"var(--space-4)"},children:[e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{className:"loader-spinner sm"}),e.jsx("div",{style:{fontSize:10,color:"var(--grey-light)",marginTop:"var(--space-2)"},children:"sm (16px)"})]}),e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{className:"loader-spinner"}),e.jsx("div",{style:{fontSize:10,color:"var(--grey-light)",marginTop:"var(--space-2)"},children:"default (24px)"})]}),e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{className:"loader-spinner lg"}),e.jsx("div",{style:{fontSize:10,color:"var(--grey-light)",marginTop:"var(--space-2)"},children:"lg (32px)"})]})]}),e.jsx(l,{style:{padding:"var(--space-2)",fontSize:10,marginTop:0},children:`<div className="loader-spinner" />
<div className="loader-spinner sm" />
<div className="loader-spinner lg" />`})]}),e.jsxs("div",{style:{background:"var(--surface-1)",padding:"var(--space-4)",borderRadius:"var(--radius-md)"},children:[e.jsx("div",{style:{color:"var(--gold)",fontSize:"var(--text-xs)",fontFamily:"var(--font-mono)",marginBottom:"var(--space-4)"},children:"Page Loader"}),e.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",gap:"var(--space-4)",padding:"var(--space-4)"},children:[e.jsx("div",{className:"loader-spinner lg"}),e.jsx("span",{className:"loader-text",children:"Loading matches"})]}),e.jsx(l,{style:{padding:"var(--space-2)",fontSize:10,marginTop:"var(--space-2)"},children:`<div className="page-loader">
  <div className="loader-spinner lg" />
  <span className="loader-text">Loading matches</span>
</div>`})]})]}),e.jsx("div",{style:{marginTop:"var(--space-4)",padding:"var(--space-2)",background:"rgba(255,255,255,0.02)",borderRadius:"var(--radius-sm)",border:"1px solid var(--grey-mid)"},children:e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--grey-light)"},children:"Skeleton placeholders available for future use: .loader-skeleton.avatar, .loader-skeleton.text, .loader-skeleton.card"})})]}),e.jsxs(i,{children:[e.jsx(o,{children:"Card Borders"}),e.jsx(h,{children:"Gold border for primary cards. No hover animations that move cards."}),e.jsxs(m,{style:{gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))",gap:"var(--space-4)"},children:[e.jsxs("div",{children:[e.jsxs("div",{style:{background:z.surface1.value,border:`${d.thick.value} solid ${j.gold.value}`,borderRadius:d.radiusMd.value,padding:"var(--space-4)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-display)",color:"var(--gold)",marginBottom:"var(--space-1)"},children:"Gold Border"}),e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--grey-light)"},children:"Primary cards"})]}),e.jsx(l,{style:{marginTop:"var(--space-2)",padding:"var(--space-2)",fontSize:10},children:w.cardGold.css})]}),e.jsxs("div",{children:[e.jsxs("div",{style:{background:z.surface1.value,border:`1px solid ${j.greyMid.value}`,borderRadius:d.radiusMd.value,padding:"var(--space-4)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-display)",color:"#fff",marginBottom:"var(--space-1)"},children:"Grey Border"}),e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--grey-light)"},children:"Secondary cards"})]}),e.jsx(l,{style:{marginTop:"var(--space-2)",padding:"var(--space-2)",fontSize:10},children:w.cardSubtle.css})]}),e.jsx("div",{children:e.jsxs("div",{style:{background:T.green.value,border:"1px solid rgba(74,222,128,0.25)",borderRadius:d.radiusMd.value,padding:"var(--space-4)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-display)",color:"var(--green)",marginBottom:"var(--space-1)"},children:"Win Card"}),e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--grey-light)"},children:"Victory results"})]})}),e.jsx("div",{children:e.jsxs("div",{style:{background:T.red.value,border:"1px solid rgba(248,113,113,0.25)",borderRadius:d.radiusMd.value,padding:"var(--space-4)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-display)",color:"var(--red)",marginBottom:"var(--space-1)"},children:"Loss Card"}),e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-sm)",color:"var(--grey-light)"},children:"Defeat results"})]})})]})]}),e.jsxs(i,{children:[e.jsx(o,{children:"Game Display Variants"}),e.jsx(h,{children:"Unified GameCard and GameRow components for displaying match data."}),e.jsxs("div",{style:{display:"grid",gap:"var(--space-4)"},children:[e.jsxs("div",{style:{background:"var(--surface-1)",padding:"var(--space-4)",borderRadius:"var(--radius-md)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--gold)",marginBottom:"var(--space-2)"},children:"GameCard (default)"}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Full card with map image, team details, and MMR. Used on /finished page."}),e.jsx(l,{style:{marginTop:"var(--space-2)",padding:"var(--space-2)",fontSize:10},children:`<GameCard
  game={gameData}
  playerBattleTag="Player#1234"
  status="live" // optional: "live" | "won" | "lost"
/>`})]}),e.jsxs("div",{style:{background:"var(--surface-1)",padding:"var(--space-4)",borderRadius:"var(--radius-md)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--gold)",marginBottom:"var(--space-2)"},children:"GameCard (global mode)"}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"No player perspective. Shows avg MMR prominently. Used on /finished page."}),e.jsx(l,{style:{marginTop:"var(--space-2)",padding:"var(--space-2)",fontSize:10},children:`<GameCard
  game={gameData}
  // No playerBattleTag = global mode
/>`})]}),e.jsxs("div",{style:{background:"var(--surface-1)",padding:"var(--space-4)",borderRadius:"var(--radius-md)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--gold)",marginBottom:"var(--space-2)"},children:"GameCard (overlay)"}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Stream overlay for OBS/Streamlabs. Transparent bg, multiple layouts. Used at /overlay/lastgame/:tag"}),e.jsx(l,{style:{marginTop:"var(--space-2)",padding:"var(--space-2)",fontSize:10},children:`<GameCard
  game={gameData}
  playerBattleTag="Player#1234"
  overlay={true}
  size="expanded"
  layout="vertical" // "horizontal" | "vertical" | "compact" | "wide"
/>`})]}),e.jsxs("div",{style:{background:"var(--surface-1)",padding:"var(--space-4)",borderRadius:"var(--radius-md)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--gold)",marginBottom:"var(--space-2)"},children:"GameRow (table)"}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginBottom:"var(--space-2)"},children:"Table row format for Match History. Shows Result, Map, Avg MMR, +/-, Allies, Duration, Time."}),e.jsx(l,{style:{marginTop:"var(--space-2)",padding:"var(--space-2)",fontSize:10},children:`<GameRow
  game={matchData}
  playerBattleTag="Player#1234"
  striped={true} // alternate row styling
/>`})]})]}),e.jsxs("div",{style:{marginTop:"var(--space-4)",padding:"var(--space-2)",background:"rgba(252,219,51,0.05)",borderRadius:"var(--radius-sm)",border:"1px solid rgba(252,219,51,0.2)"},children:[e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--gold)"},children:"Import"}),e.jsx(l,{style:{marginTop:"var(--space-1)",padding:"var(--space-1)",fontSize:10,background:"transparent"},children:'import { GameCard, GameRow } from "../components/game/index";'})]})]}),e.jsxs(i,{children:[e.jsx(o,{children:"Usage Patterns"}),e.jsx("div",{style:{display:"grid",gap:"var(--space-2)"},children:Object.entries(w).map(([r,a])=>e.jsxs("div",{style:{display:"flex",gap:"var(--space-4)",alignItems:"center",padding:"var(--space-2)",background:"var(--surface-1)",borderRadius:"var(--radius-sm)"},children:[e.jsx("span",{style:{fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)",color:"var(--gold)",minWidth:120},children:a.description}),e.jsx("code",{style:{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--grey-light)"},children:a.css})]},r))})]}),e.jsxs(i,{children:[e.jsx(o,{children:"MMR Chart - AT Visualization"}),e.jsx(h,{children:"Combined circle style: AT groups shown as single circle with area = sum of individual circles. Gap: 5px, Area multiplier: 160%"}),e.jsxs(m,{style:{gridTemplateColumns:"repeat(4, 1fr)",gap:"var(--space-4)",marginBottom:"var(--space-4)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{height:160,background:"var(--surface-1)",borderRadius:"var(--radius-md)",padding:"var(--space-2)"},children:e.jsx(v,{data:{teamOneMmrs:[1900,1900,1750,1650],teamTwoMmrs:[1850,1850,1700,1600],teamOneAT:[1,1,0,0],teamTwoAT:[1,1,0,0]},atStyle:"combined",pieConfig:g})}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginTop:"var(--space-2)",textAlign:"center"},children:"2-stack"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{height:160,background:"var(--surface-1)",borderRadius:"var(--radius-md)",padding:"var(--space-2)"},children:e.jsx(v,{data:{teamOneMmrs:[1900,1900,1900,1650],teamTwoMmrs:[1850,1850,1850,1600],teamOneAT:[1,1,1,0],teamTwoAT:[1,1,1,0]},atStyle:"combined",pieConfig:g})}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginTop:"var(--space-2)",textAlign:"center"},children:"3-stack"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{height:160,background:"var(--surface-1)",borderRadius:"var(--radius-md)",padding:"var(--space-2)"},children:e.jsx(v,{data:{teamOneMmrs:[1900,1900,1900,1900],teamTwoMmrs:[1850,1850,1850,1850],teamOneAT:[1,1,1,1],teamTwoAT:[1,1,1,1]},atStyle:"combined",pieConfig:g})}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginTop:"var(--space-2)",textAlign:"center"},children:"4-stack"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{height:160,background:"var(--surface-1)",borderRadius:"var(--radius-md)",padding:"var(--space-2)"},children:e.jsx(v,{data:{teamOneMmrs:[2e3,1900,1750,1600],teamTwoMmrs:[1950,1850,1700,1550],teamOneAT:[0,0,0,0],teamTwoAT:[0,0,0,0]},atStyle:"combined",pieConfig:g})}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginTop:"var(--space-2)",textAlign:"center"},children:"No AT"})]})]}),e.jsxs(m,{style:{gridTemplateColumns:"repeat(2, 1fr)",gap:"var(--space-4)"},children:[e.jsxs("div",{children:[e.jsx("div",{style:{height:160,background:"var(--surface-1)",borderRadius:"var(--radius-md)",padding:"var(--space-2)"},children:e.jsx(v,{data:{teamOneMmrs:[1850,1850,1855,2e3],teamTwoMmrs:[1820,1820,1825,1950],teamOneAT:[1,1,0,0],teamTwoAT:[1,1,0,0]},atStyle:"combined",pieConfig:g})}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginTop:"var(--space-2)",textAlign:"center"},children:"2-stack + solo collision"})]}),e.jsxs("div",{children:[e.jsx("div",{style:{height:160,background:"var(--surface-1)",borderRadius:"var(--radius-md)",padding:"var(--space-2)"},children:e.jsx(v,{data:{teamOneMmrs:[1850,1850,1850,1850],teamTwoMmrs:[1900,1850,1750,1700],teamOneAT:[1,1,1,1],teamTwoAT:[0,0,0,0]},atStyle:"combined",pieConfig:g})}),e.jsx("div",{style:{color:"var(--grey-light)",fontSize:"var(--text-xs)",marginTop:"var(--space-2)",textAlign:"center"},children:"4-stack vs all solo"})]})]})]}),e.jsxs(i,{children:[e.jsx(o,{children:"Quick Reference"}),e.jsx(h,{children:"Generated from src/design-tokens.js"}),e.jsx(l,{children:`/* COLORS */
${s.map(([r,a])=>`${a.css.padEnd(18)} ${a.value.padEnd(10)} ${a.usage}`).join(`
`)}

/* FONTS */
${Object.entries(S).map(([r,a])=>`${a.css.padEnd(18)} ${a.usage}`).join(`
`)}

/* TYPE SCALE */
${b.map(([r,a])=>`${a.css.padEnd(14)} ${a.value.padEnd(6)} ${a.usage}`).join(`
`)}

/* SPACING */
${f.map(([r,a])=>`${a.css.padEnd(12)} ${a.value}`).join(`
`)}

/* BORDERS */
${Object.entries(d).map(([r,a])=>`${a.css.padEnd(16)} ${a.value}`).join(`
`)}

/* EFFECTS */
${Object.entries(u).map(([r,a])=>`${a.css.padEnd(16)} ${a.usage}`).join(`
`)}`})]})]})};export{H as default};
