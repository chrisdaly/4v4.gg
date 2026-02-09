import{j as e,H as a,r as i}from"./index-CAUlyqcI.js";const N=a.div`
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
`,E=a.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,D=a.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
`,V=a.section`
  margin-bottom: var(--space-12);
`,K=a.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  margin-bottom: var(--space-1);
`,_=a.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-4);
`,U=a.div`
  position: relative;
  border-radius: var(--radius-md);
  overflow: hidden;
  height: 700px;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: ${r=>r.$bgTile?`url(${r.$bgTile}) repeat center / 256px`:r.$bgImage?`url(${r.$bgImage}) center / cover no-repeat`:"#080808"};
    z-index: 0;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: ${r=>r.$overlay||"rgba(0,0,0,0.5)"};
    z-index: 1;
  }

  > * {
    position: relative;
    z-index: 2;
  }
`,Q=a.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${r=>r.$frameStyle||""}
`,Y=a.div`
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.04) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`,q=a.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`,J=a.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  display: flex;
  align-items: center;
  gap: var(--space-2);

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--green);
  }
`,X=a.div`
  flex: 1;
  padding: var(--space-2) var(--space-4);
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`,Z=a.div`
  position: relative;
  min-height: 85px;
  margin-top: var(--space-4);
  padding-bottom: var(--space-1);

  &:first-child { margin-top: 0; }
`,ee=a.div`
  position: absolute;
  left: var(--space-2);
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
`,re=a.div`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`,ae=a.div`
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
`,ne=a.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,se=a.span`
  font-family: var(--font-mono);
  font-size: 14px;
  color: #fff;
  font-weight: 700;
`,ie=a.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
`,te=a.div`
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: center;
`,oe=a.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${r=>r.$win?"var(--green)":"var(--red)"};
  opacity: 0.8;
`,le=a.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
`,de=a.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
`,ce=a.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`,me=a.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,C=a.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
`,B=a.div`
  width: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  ${r=>r.$frameStyle||""}
`,pe=a.div`
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  flex-shrink: 0;
`,xe=a.span`
  color: var(--gold);
`,ge=a.div`
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
  flex-shrink: 0;
`,he=a.span`
  flex: 1;
  color: var(--gold);
`,fe=a.span`
  flex-shrink: 0;
  color: var(--grey-light);
`,ve=a.div`
  flex: 1;
  padding: var(--space-1) 0;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`,be=a.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover { background: rgba(255, 255, 255, 0.04); }
`,je=a.div`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`,ue=a.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,ye=a.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
`,we=[{name:"Spermfeather",mmr:1028,time:"4:10",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["i canot belive u fucking did htat","that was ufcking VITAL TO WIN"]},{name:"Abouttogoafk",mmr:1351,time:"4:10",dots:[!0,!0,!0,!0,!1,!0],lines:["upose thank you for 1v2"]},{name:"Spermfeather",mmr:1028,time:"4:10",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["u god dann idiot"]},{name:"upos",mmr:1251,time:"4:10",dots:[!0,!0,!1,!0,!0,!0,!0,!1],lines:["lol whatever","u had 2 heros all game"]},{name:"Spermfeather",mmr:1028,time:"4:10",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["WE EVENTALKED AOBUT IT","DEFNED THAT SIDE","u fucking refused","and made us lose","what afuckng idiot"]},{name:"upos",mmr:1251,time:"4:11",dots:[!0,!0,!1,!0,!0,!0,!0,!1],lines:["didnt someone say tp?","to we lose?","no?","cause i think i saw that"]},{name:"Spermfeather",mmr:1028,time:"4:11",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["i expo my side the STAY ON UR SIDE TO DEFEND","idiot","not take my natural expo","and then i cant defnd urs"]}],$e=[{name:"Ice",mmr:2336},{name:"ToD",mmr:2288},{name:"KODOFO...",mmr:2136},{name:"Cechi",mmr:2119},{name:"finicky",mmr:2068},{name:"lutz",mmr:2067},{name:"bobbyog",mmr:2060},{name:"EyeServ",mmr:2055},{name:"Solana",mmr:2009},{name:"Sanya",mmr:1998},{name:"Boyzinho",mmr:1984},{name:"SHIP",mmr:1951},{name:"ALPHA",mmr:1892},{name:"Q8DARKL...",mmr:1887},{name:"Napo",mmr:1872},{name:"JperezImba",mmr:1871},{name:"KNOPPERS",mmr:1871},{name:"Hindsight",mmr:1856}];function ke(){return e.jsx(X,{children:we.map((r,n)=>e.jsxs(Z,{children:[e.jsxs(ee,{children:[e.jsx(re,{}),e.jsxs(ae,{children:[e.jsxs(ne,{children:[e.jsx(se,{children:r.mmr}),e.jsx(ie,{children:"MMR"})]}),e.jsx(te,{children:r.dots.map((s,d)=>e.jsx(oe,{$win:s},d))})]})]}),e.jsxs(le,{children:[e.jsxs("div",{children:[e.jsx(ce,{children:r.name}),e.jsx(me,{children:r.time})]}),e.jsx(C,{children:r.lines[0]})]}),r.lines.slice(1).map((s,d)=>e.jsx(de,{children:e.jsx(C,{children:s})},d))]},n))})}function ze(){return e.jsxs(e.Fragment,{children:[e.jsxs(ge,{children:[e.jsx(he,{children:"Player"}),e.jsx(fe,{children:"MMR"})]}),e.jsx(ve,{children:$e.map(r=>e.jsxs(be,{children:[e.jsx(je,{}),e.jsx(ue,{children:r.name}),e.jsx(ye,{children:r.mmr})]},r.name))})]})}const Te=a.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${r=>r.$bg||"rgba(10, 8, 6, 0.6)"};
  backdrop-filter: blur(8px);
`,z=a.img`
  position: absolute;
  width: 48px;
  height: 48px;
  z-index: 3;
  ${r=>r.$pos==="tl"&&"top: 0; left: 0;"}
  ${r=>r.$pos==="tr"&&"top: 0; right: 0;"}
  ${r=>r.$pos==="bl"&&"bottom: 0; left: 0;"}
  ${r=>r.$pos==="br"&&"bottom: 0; right: 0;"}
`,I=a.div`
  position: absolute;
  left: 48px;
  right: 48px;
  height: 16px;
  z-index: 2;
  background: url("/frames/wood/WoodTile-H.png") repeat-x center / auto 100%;
  ${r=>r.$top?"top: 0;":"bottom: 0;"}
`,M=a.div`
  position: absolute;
  top: 48px;
  bottom: 48px;
  width: 16px;
  z-index: 2;
  background: url("/frames/wood/WoodTile-V.png") repeat-y center / 100% auto;
  ${r=>r.$left?"left: 0;":"right: 0;"}
`,Se=a.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px;
  z-index: 1;
`;function P({children:r,bg:n}){return e.jsxs(Te,{$bg:n,children:[e.jsx(z,{src:"/frames/wood/WoodCorner-TL.png",$pos:"tl"}),e.jsx(z,{src:"/frames/wood/WoodCorner-TR.png",$pos:"tr"}),e.jsx(z,{src:"/frames/wood/WoodCorner-BL.png",$pos:"bl"}),e.jsx(z,{src:"/frames/wood/WoodCorner-BR.png",$pos:"br"}),e.jsx(I,{$top:!0}),e.jsx(I,{}),e.jsx(M,{$left:!0}),e.jsx(M,{}),e.jsx(Se,{children:r})]})}const R=a.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  border: 1px solid rgba(140, 110, 60, 0.4);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url("/frames/parchment/Tileable.png") repeat center / 256px;
    opacity: ${r=>r.$opacity||.08};
    z-index: 0;
    pointer-events: none;
  }

  > * { position: relative; z-index: 1; }
  background: ${r=>r.$bg||"rgba(20, 15, 8, 0.7)"};
  backdrop-filter: blur(8px);
`,o={wc3Frame:`
    border: 20px solid transparent;
    border-image: url("/frames/wc3-frame.png") 80 / 20px stretch;
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `,launcherBorder:`
    border: 24px solid transparent;
    border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `,simpleBorder:`
    border: 1px solid rgba(160, 130, 80, 0.3);
    border-radius: var(--radius-md);
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `},Fe=[{label:"A: Parchment BG + Wood Frame",desc:"Parchment page background + wood corner frame — tavern notice board",bg:"/frames/parchment/Parchment-H.png",overlay:"rgba(0, 0, 0, 0.3)",chatType:"wood",sidebarFrame:o.simpleBorder},{label:"B: Parchment BG + WC3 Ornate Frame",desc:"Parchment page + gold ornamental frame — royal decree",bg:"/frames/parchment/Parchment-H.png",overlay:"rgba(0, 0, 0, 0.3)",chatFrame:o.wc3Frame,sidebarFrame:o.simpleBorder},{label:"C: Parchment BG + Launcher Border",desc:"Parchment page + iron launcher frame",bg:"/frames/parchment/Parchment-H.png",overlay:"rgba(0, 0, 0, 0.3)",chatFrame:o.launcherBorder,sidebarFrame:o.simpleBorder},{label:"D: Parchment BG (dark) + Wood Frame",desc:"Heavily darkened parchment + wood frame — aged scroll",bg:"/frames/parchment/Parchment-H.png",overlay:"rgba(0, 0, 0, 0.65)",chatType:"wood",sidebarFrame:o.simpleBorder},{label:"E: Parchment Tile BG + Wood Frame",desc:"Tileable parchment texture repeating + wood corners",bgTile:"/frames/parchment/Tileable.png",overlay:"rgba(0, 0, 0, 0.35)",chatType:"wood",sidebarFrame:o.simpleBorder},{label:"F: Parchment Tile BG (dark) + WC3 Frame",desc:"Tileable parchment darkened + gold ornamental frame",bgTile:"/frames/parchment/Tileable.png",overlay:"rgba(0, 0, 0, 0.6)",chatFrame:o.wc3Frame,sidebarFrame:o.wc3Frame},{label:"G: Campfire + Launcher Border (for comparison)",desc:"Previous favorite — campfire + iron frame",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatFrame:o.launcherBorder,sidebarFrame:o.simpleBorder},{label:"H: Campfire + Wood Frame (for comparison)",desc:"Campfire + wood corners and tile edges",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatType:"wood",sidebarFrame:o.simpleBorder}],l=[{map:"Mur'gul Oasis LV",mapImg:"/maps/MurgulOasisLV.png",elapsed:"3:58",team1:[{name:"Densington",race:1},{name:"nonamee",race:4},{name:"Sageypoo",race:8},{name:"Apm50",race:0}],team2:[{name:"TYRN",race:8},{name:"qwerty",race:2},{name:"Driver",race:4},{name:"nASoRCo",race:2}],avg1:1478,avg2:1479},{map:"Deadlock LV",mapImg:"/maps/DeadlockLV.png",elapsed:"4:10",team1:[{name:"Ice",race:4},{name:"XIIINostra",race:2},{name:"volume!one",race:1},{name:"ShoananasS",race:8}],team2:[{name:"Cechi",race:8},{name:"EyeServ",race:4},{name:"Teo",race:1},{name:"ReetarDio",race:2}],avg1:2086,avg2:2077},{map:"Ferocity",mapImg:"/maps/Ferocity.png",elapsed:"9:51",team1:[{name:"Heavenwaits",race:1},{name:"jau69",race:8},{name:"flOatmybOat",race:4},{name:"QQs",race:2}],team2:[{name:"DennisR",race:1},{name:"pomanta",race:4},{name:"Inarijaervi",race:2},{name:"Slothien",race:8}],avg1:1528,avg2:1526}],p=a.div`
  width: ${r=>r.$width||"340px"};
  box-sizing: border-box;
  border: 24px solid transparent;
  border-image: url("/frames/launcher/Maon_Border.png") 120 / 24px stretch;
  background: rgba(10, 8, 6, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  flex-shrink: 0;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`,x=a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px var(--space-4);
  border-bottom: 1px solid rgba(252, 219, 51, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.06) 0%, transparent 100%);
  flex-shrink: 0;
`,g=a.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  letter-spacing: 1px;
`,h=a.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,T=a.div`
  display: block;
  padding: var(--space-4) var(--space-3);
  margin: var(--space-3) var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  background: rgba(255, 255, 255, 0.02);
`,w=a.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--red);
  margin-right: 4px;
  animation: pulse 1.5s infinite;
`,t=a.img`
  width: ${r=>r.$size||"16px"};
  height: ${r=>r.$size||"16px"};
  flex-shrink: 0;
`,m=a.span`
  font-family: var(--font-display);
  font-size: ${r=>r.$size||"13px"};
  color: rgba(255, 255, 255, 0.85);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
`,$=a.div`
  font-family: var(--font-display);
  font-size: ${r=>r.$size||"var(--text-xs)"};
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,k=a.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
`,j=a.div`
  font-family: var(--font-mono);
  font-size: 9px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: ${r=>r.$team===1?"var(--blue, #4a9eff)":"var(--red)"};
  opacity: 0.6;
  margin-bottom: 2px;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
`,u=a.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: #fff;
  opacity: 0.8;
  text-transform: none;
  letter-spacing: 0;
`,S=a.img`
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
`,A=a.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.5;
`,H=a.img`
  width: 100%;
  height: 80px;
  object-fit: cover;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  margin: -16px -12px 0 -12px;
  width: calc(100% + 24px);
`,O=a.div`
  position: relative;
  margin-top: -28px;
  padding: 0 var(--space-2);
  margin-bottom: var(--space-3);
`;function Ae({match:r}){return e.jsxs(T,{children:[e.jsx(H,{src:r.mapImg,alt:""}),e.jsxs(O,{children:[e.jsx($,{$size:"var(--text-sm)",style:{textShadow:"0 1px 4px rgba(0,0,0,0.8)"},children:r.map}),e.jsxs(k,{children:[e.jsx(w,{}),r.elapsed]})]}),e.jsxs("div",{style:{display:"flex",gap:"12px"},children:[e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs(j,{$team:1,children:[e.jsx("span",{children:"Team 1"}),e.jsx(u,{children:r.avg1})]}),r.team1.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:3},children:[e.jsx(t,{src:i[n.race]}),e.jsx(m,{children:n.name})]},s))]}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsxs(j,{$team:2,children:[e.jsx("span",{children:"Team 2"}),e.jsx(u,{children:r.avg2})]}),r.team2.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:3},children:[e.jsx(t,{src:i[n.race]}),e.jsx(m,{children:n.name})]},s))]})]})]})}const y=a.div`
  display: flex;
  align-items: center;
  gap: 3px;
`;function Ce({match:r}){return e.jsxs(T,{style:{padding:"12px"},children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:8},children:[e.jsx(S,{src:r.mapImg,style:{width:40,height:40}}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx($,{children:r.map}),e.jsxs(k,{children:[e.jsx(w,{}),r.elapsed]})]})]}),e.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"center",gap:8,padding:"6px 0"},children:[e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:14,color:"#fff",fontWeight:700},children:r.avg1}),e.jsx(y,{children:r.team1.map((n,s)=>e.jsx(t,{src:i[n.race],$size:"18px"},s))})]}),e.jsx(A,{children:"vs"}),e.jsxs("div",{style:{textAlign:"center"},children:[e.jsx("div",{style:{fontFamily:"var(--font-mono)",fontSize:14,color:"#fff",fontWeight:700},children:r.avg2}),e.jsx(y,{children:r.team2.map((n,s)=>e.jsx(t,{src:i[n.race],$size:"18px"},s))})]})]})]})}const Be=a.div`
  margin: var(--space-3) var(--space-2);
  border-radius: var(--radius-md);
  border: 1px solid rgba(160, 130, 80, 0.12);
  overflow: hidden;
`,Ie=a.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.02);
`,Me=a.div`
  display: flex;
`,G=a.div`
  flex: 1;
  padding: 10px 12px;
  background: ${r=>r.$team===1?"rgba(74, 158, 255, 0.04)":"rgba(255, 80, 80, 0.04)"};
  border-top: 1px solid ${r=>r.$team===1?"rgba(74, 158, 255, 0.15)":"rgba(255, 80, 80, 0.15)"};
`;function Pe({match:r}){return e.jsxs(Be,{children:[e.jsx(Ie,{children:e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10},children:[e.jsx(S,{src:r.mapImg,style:{width:44,height:44}}),e.jsxs("div",{children:[e.jsx($,{children:r.map}),e.jsxs(k,{children:[e.jsx(w,{}),r.elapsed]})]})]})}),e.jsxs(Me,{children:[e.jsxs(G,{$team:1,children:[e.jsxs(j,{$team:1,children:[e.jsx("span",{children:"Team 1"}),e.jsx(u,{children:r.avg1})]}),r.team1.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:3},children:[e.jsx(t,{src:i[n.race]}),e.jsx(m,{$size:"12px",children:n.name})]},s))]}),e.jsxs(G,{$team:2,children:[e.jsxs(j,{$team:2,children:[e.jsx("span",{children:"Team 2"}),e.jsx(u,{children:r.avg2})]}),r.team2.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:3},children:[e.jsx(t,{src:i[n.race]}),e.jsx(m,{$size:"12px",children:n.name})]},s))]})]})]})}const L=a.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2px 8px;
`;function Re({match:r}){return e.jsxs(T,{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:10,marginBottom:10},children:[e.jsx(S,{src:r.mapImg,style:{width:56,height:56}}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx($,{$size:"var(--text-sm)",children:r.map}),e.jsxs(k,{children:[e.jsx(w,{}),r.elapsed]})]})]}),e.jsxs("div",{style:{marginBottom:10},children:[e.jsxs(j,{$team:1,children:[e.jsx("span",{children:"Team 1"}),e.jsx(u,{children:r.avg1})]}),e.jsx(L,{children:r.team1.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx(t,{src:i[n.race],$size:"14px"}),e.jsx(m,{$size:"12px",children:n.name})]},s))})]}),e.jsxs("div",{children:[e.jsxs(j,{$team:2,children:[e.jsx("span",{children:"Team 2"}),e.jsx(u,{children:r.avg2})]}),e.jsx(L,{children:r.team2.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:4},children:[e.jsx(t,{src:i[n.race],$size:"14px"}),e.jsx(m,{$size:"12px",children:n.name})]},s))})]})]})}const Ge=a.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);

  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255, 255, 255, 0.03); }
`,Le=a.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  flex-shrink: 0;
  text-align: right;
`;function We({matches:r}){return e.jsx(e.Fragment,{children:r.map((n,s)=>e.jsxs(Ge,{children:[e.jsx(S,{src:n.mapImg,style:{width:36,height:36}}),e.jsxs("div",{style:{flex:1,minWidth:0},children:[e.jsx($,{$size:"13px",children:n.map}),e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:6},children:[e.jsxs(k,{children:[e.jsx(w,{}),n.elapsed]}),e.jsx(y,{style:{opacity:.7},children:n.team1.map((d,c)=>e.jsx(t,{src:i[d.race],$size:"12px"},c))}),e.jsx(A,{children:"v"}),e.jsx(y,{style:{opacity:.7},children:n.team2.map((d,c)=>e.jsx(t,{src:i[d.race],$size:"12px"},c))})]})]}),e.jsxs(Le,{children:[n.avg1," ",e.jsx("span",{style:{opacity:.4},children:"v"})," ",n.avg2]})]},s))})}const Ee=a.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(160, 130, 80, 0.08);
  margin-bottom: var(--space-2);
`,W=a.span`
  font-family: var(--font-mono);
  font-size: 13px;
  color: #fff;
  font-weight: 700;
`;function De({match:r}){return e.jsxs(T,{children:[e.jsx(H,{src:r.mapImg,alt:""}),e.jsxs(O,{children:[e.jsx($,{$size:"var(--text-sm)",style:{textShadow:"0 1px 4px rgba(0,0,0,0.8)"},children:r.map}),e.jsxs(k,{children:[e.jsx(w,{}),r.elapsed]})]}),e.jsxs(Ee,{children:[e.jsx(y,{children:r.team1.map((n,s)=>e.jsx(t,{src:i[n.race],$size:"20px"},s))}),e.jsx(W,{children:r.avg1}),e.jsx(A,{style:{fontSize:12},children:"vs"}),e.jsx(W,{children:r.avg2}),e.jsx(y,{children:r.team2.map((n,s)=>e.jsx(t,{src:i[n.race],$size:"20px"},s))})]}),e.jsxs("div",{style:{display:"flex",gap:"12px"},children:[e.jsx("div",{style:{flex:1,minWidth:0},children:r.team1.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:3},children:[e.jsx(t,{src:i[n.race]}),e.jsx(m,{children:n.name})]},s))}),e.jsx("div",{style:{flex:1,minWidth:0},children:r.team2.map((n,s)=>e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:5,marginBottom:3},children:[e.jsx(t,{src:i[n.race]}),e.jsx(m,{children:n.name})]},s))})]})]})}const He=a.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  margin-bottom: var(--space-12);
`,f=a.div`
  display: flex;
  flex-direction: column;
`,v=a.div`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: #fff;
  margin-bottom: var(--space-1);
`,b=a.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--grey-light);
  margin-bottom: var(--space-4);
  line-height: 1.4;
`;function Oe(){return e.jsxs(e.Fragment,{children:[e.jsx(E,{children:"Active Games Layouts"}),e.jsx(D,{children:"Six layout options — same data, different presentations"}),e.jsxs(He,{children:[e.jsxs(f,{children:[e.jsx(v,{children:"A: Banner Map"}),e.jsx(b,{children:"Full-width map hero image, name overlaid. Two-column players below."}),e.jsxs(p,{$width:"100%",children:[e.jsxs(x,{children:[e.jsx(g,{children:"Active Games"}),e.jsx(h,{children:l.length})]}),l.map((r,n)=>e.jsx(Ae,{match:r},n))]})]}),e.jsxs(f,{children:[e.jsx(v,{children:"B: Compact Race Icons"}),e.jsx(b,{children:"No player names — race icons + avg MMR as a visual shorthand. Fits more games."}),e.jsxs(p,{$width:"100%",children:[e.jsxs(x,{children:[e.jsx(g,{children:"Active Games"}),e.jsx(h,{children:l.length})]}),l.map((r,n)=>e.jsx(Ce,{match:r},n))]})]}),e.jsxs(f,{children:[e.jsx(v,{children:"C: Split Team Tint"}),e.jsx(b,{children:"Blue/red background tint per team column. Clear team separation."}),e.jsxs(p,{$width:"100%",children:[e.jsxs(x,{children:[e.jsx(g,{children:"Active Games"}),e.jsx(h,{children:l.length})]}),l.map((r,n)=>e.jsx(Pe,{match:r},n))]})]}),e.jsxs(f,{children:[e.jsx(v,{children:"D: Vertical + 2-Per-Row"}),e.jsx(b,{children:"Each team stacked vertically. Players in a 2-column grid within each team."}),e.jsxs(p,{$width:"100%",children:[e.jsxs(x,{children:[e.jsx(g,{children:"Active Games"}),e.jsx(h,{children:l.length})]}),l.map((r,n)=>e.jsx(Re,{match:r},n))]})]}),e.jsxs(f,{children:[e.jsx(v,{children:"E: Minimal List"}),e.jsx(b,{children:"One line per game — map, race icons, avg MMRs. Ultra-compact."}),e.jsxs(p,{$width:"100%",children:[e.jsxs(x,{children:[e.jsx(g,{children:"Active Games"}),e.jsx(h,{children:l.length})]}),e.jsx(We,{matches:l})]})]}),e.jsxs(f,{children:[e.jsx(v,{children:"F: Banner + Race Faceoff"}),e.jsx(b,{children:"Map banner, then race icons facing off with avg MMR. Player names below."}),e.jsxs(p,{$width:"100%",children:[e.jsxs(x,{children:[e.jsx(g,{children:"Active Games"}),e.jsx(h,{children:l.length})]}),l.map((r,n)=>e.jsx(De,{match:r},n))]})]})]})]})}function Ve(){return e.jsxs(N,{children:[e.jsx(Oe,{}),e.jsx(E,{children:"Chat Mockups"}),e.jsx(D,{children:"Background + frame combinations — full transcript layout"}),Fe.map((r,n)=>{const s=e.jsxs(e.Fragment,{children:[e.jsxs(Y,{children:[e.jsx(q,{children:"4v4 Chat"}),e.jsx(J,{children:"connected"})]}),e.jsx(ke,{})]}),d=e.jsxs(e.Fragment,{children:[e.jsxs(pe,{children:["Channel ",e.jsx(xe,{children:"79"})]}),e.jsx(ze,{})]});let c;r.chatType==="wood"?c=e.jsx(P,{children:s}):r.chatType==="wood-parchment"?c=e.jsx(P,{bg:"rgba(20, 15, 8, 0.7)",children:s}):r.chatType==="parchment"?c=e.jsx(R,{children:s}):c=e.jsx(Q,{$frameStyle:r.chatFrame,children:s});let F;return r.sidebarType==="parchment"?F=e.jsx(R,{as:B,$bg:"rgba(20, 15, 8, 0.7)",$opacity:.06,style:{width:220,flex:"none"},children:d}):F=e.jsx(B,{$frameStyle:r.sidebarFrame,children:d}),e.jsxs(V,{children:[e.jsx(K,{children:r.label}),e.jsx(_,{children:r.desc}),e.jsxs(U,{$bgImage:r.bg,$bgTile:r.bgTile,$overlay:r.overlay,children:[c,F]})]},n)})]})}export{Ve as default};
