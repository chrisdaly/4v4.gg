import{j as e,E as a}from"./index-Cd5fC_ps.js";const h=a.div`
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
`,x=a.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,u=a.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
`,v=a.section`
  margin-bottom: var(--space-12);
`,y=a.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  margin-bottom: var(--space-1);
`,w=a.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-4);
`,j=a.div`
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
    background: ${r=>r.$bgImage?`url(${r.$bgImage}) center / cover no-repeat`:"#080808"};
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
`,k=a.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  ${r=>r.$frameStyle||""}
`,S=a.div`
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  background: linear-gradient(180deg, rgba(160, 130, 80, 0.04) 0%, transparent 100%);
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
`,$=a.span`
  font-family: var(--font-display);
  font-size: var(--text-base);
  color: var(--gold);
`,C=a.span`
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
`,F=a.div`
  flex: 1;
  padding: var(--space-2) var(--space-4);
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`,T=a.div`
  position: relative;
  min-height: 85px;
  margin-top: var(--space-4);
  padding-bottom: var(--space-1);

  &:first-child { margin-top: 0; }
`,B=a.div`
  position: absolute;
  left: var(--space-2);
  top: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
`,z=a.div`
  width: 60px;
  height: 60px;
  border-radius: var(--radius-md);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`,M=a.div`
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
`,W=a.div`
  display: flex;
  align-items: baseline;
  gap: 4px;
  white-space: nowrap;
`,E=a.span`
  font-family: var(--font-mono);
  font-size: 14px;
  color: #fff;
  font-weight: 700;
`,P=a.span`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
`,A=a.div`
  display: flex;
  align-items: center;
  gap: 2px;
  justify-content: center;
`,R=a.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${r=>r.$win?"var(--green)":"var(--red)"};
  opacity: 0.8;
`,D=a.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
`,I=a.div`
  padding: 2px var(--space-4) 2px 84px;
  line-height: 1.375;
`,L=a.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
`,H=a.span`
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--grey-light);
  margin-left: var(--space-2);
`,c=a.span`
  font-family: var(--font-body);
  color: #e0e0e0;
  font-size: 15px;
  line-height: 1.6;
  word-break: break-word;
`,m=a.div`
  width: 220px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0;
  ${r=>r.$frameStyle||""}
`,N=a.div`
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid rgba(160, 130, 80, 0.15);
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  flex-shrink: 0;
`,O=a.span`
  color: var(--gold);
`,_=a.div`
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
`,G=a.span`
  flex: 1;
  color: var(--gold);
`,K=a.span`
  flex-shrink: 0;
  color: var(--grey-light);
`,U=a.div`
  flex: 1;
  padding: var(--space-1) 0;
  overflow-y: auto;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: var(--grey-mid); border-radius: 3px; }
`,V=a.div`
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  margin: 0 var(--space-1);

  &:hover { background: rgba(255, 255, 255, 0.04); }
`,J=a.div`
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
`,Y=a.span`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,q=a.span`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: #fff;
`,Q=[{name:"Spermfeather",mmr:1028,time:"4:10",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["i canot belive u fucking did htat","that was ufcking VITAL TO WIN"]},{name:"Abouttogoafk",mmr:1351,time:"4:10",dots:[!0,!0,!0,!0,!1,!0],lines:["upose thank you for 1v2"]},{name:"Spermfeather",mmr:1028,time:"4:10",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["u god dann idiot"]},{name:"upos",mmr:1251,time:"4:10",dots:[!0,!0,!1,!0,!0,!0,!0,!1],lines:["lol whatever","u had 2 heros all game"]},{name:"Spermfeather",mmr:1028,time:"4:10",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["WE EVENTALKED AOBUT IT","DEFNED THAT SIDE","u fucking refused","and made us lose","what afuckng idiot"]},{name:"upos",mmr:1251,time:"4:11",dots:[!0,!0,!1,!0,!0,!0,!0,!1],lines:["didnt someone say tp?","to we lose?","no?","cause i think i saw that"]},{name:"Spermfeather",mmr:1028,time:"4:11",dots:[!1,!1,!0,!1,!0,!1,!1],lines:["i expo my side the STAY ON UR SIDE TO DEFEND","idiot","not take my natural expo","and then i cant defnd urs"]}],X=[{name:"Ice",mmr:2336},{name:"ToD",mmr:2288},{name:"KODOFO...",mmr:2136},{name:"Cechi",mmr:2119},{name:"finicky",mmr:2068},{name:"lutz",mmr:2067},{name:"bobbyog",mmr:2060},{name:"EyeServ",mmr:2055},{name:"Solana",mmr:2009},{name:"Sanya",mmr:1998},{name:"Boyzinho",mmr:1984},{name:"SHIP",mmr:1951},{name:"ALPHA",mmr:1892},{name:"Q8DARKL...",mmr:1887},{name:"Napo",mmr:1872},{name:"JperezImba",mmr:1871},{name:"KNOPPERS",mmr:1871},{name:"Hindsight",mmr:1856}];function Z(){return e.jsx(F,{children:Q.map((r,i)=>e.jsxs(T,{children:[e.jsxs(B,{children:[e.jsx(z,{}),e.jsxs(M,{children:[e.jsxs(W,{children:[e.jsx(E,{children:r.mmr}),e.jsx(P,{children:"MMR"})]}),e.jsx(A,{children:r.dots.map((t,n)=>e.jsx(R,{$win:t},n))})]})]}),e.jsxs(D,{children:[e.jsxs("div",{children:[e.jsx(L,{children:r.name}),e.jsx(H,{children:r.time})]}),e.jsx(c,{children:r.lines[0]})]}),r.lines.slice(1).map((t,n)=>e.jsx(I,{children:e.jsx(c,{children:t})},n))]},i))})}function ee(){return e.jsxs(e.Fragment,{children:[e.jsxs(_,{children:[e.jsx(G,{children:"Player"}),e.jsx(K,{children:"MMR"})]}),e.jsx(U,{children:X.map(r=>e.jsxs(V,{children:[e.jsx(J,{}),e.jsx(Y,{children:r.name}),e.jsx(q,{children:r.mmr})]},r.name))})]})}const re=a.div`
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${r=>r.$bg||"rgba(10, 8, 6, 0.6)"};
  backdrop-filter: blur(8px);
`,l=a.img`
  position: absolute;
  width: 48px;
  height: 48px;
  z-index: 3;
  ${r=>r.$pos==="tl"&&"top: 0; left: 0;"}
  ${r=>r.$pos==="tr"&&"top: 0; right: 0;"}
  ${r=>r.$pos==="bl"&&"bottom: 0; left: 0;"}
  ${r=>r.$pos==="br"&&"bottom: 0; right: 0;"}
`,p=a.div`
  position: absolute;
  left: 48px;
  right: 48px;
  height: 16px;
  z-index: 2;
  background: url("/frames/wood/WoodTile-H.png") repeat-x center / auto 100%;
  ${r=>r.$top?"top: 0;":"bottom: 0;"}
`,f=a.div`
  position: absolute;
  top: 48px;
  bottom: 48px;
  width: 16px;
  z-index: 2;
  background: url("/frames/wood/WoodTile-V.png") repeat-y center / 100% auto;
  ${r=>r.$left?"left: 0;":"right: 0;"}
`,ae=a.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 14px;
  z-index: 1;
`;function g({children:r,bg:i}){return e.jsxs(re,{$bg:i,children:[e.jsx(l,{src:"/frames/wood/WoodCorner-TL.png",$pos:"tl"}),e.jsx(l,{src:"/frames/wood/WoodCorner-TR.png",$pos:"tr"}),e.jsx(l,{src:"/frames/wood/WoodCorner-BL.png",$pos:"bl"}),e.jsx(l,{src:"/frames/wood/WoodCorner-BR.png",$pos:"br"}),e.jsx(p,{$top:!0}),e.jsx(p,{}),e.jsx(f,{$left:!0}),e.jsx(f,{}),e.jsx(ae,{children:r})]})}const b=a.div`
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
  `,goldBorder:`
    border: 2px solid rgba(252, 219, 51, 0.25);
    border-radius: var(--radius-md);
    background: rgba(10, 8, 6, 0.6);
    backdrop-filter: blur(8px);
  `},oe=[{label:"A: Campfire + Launcher Border",desc:"Authentic W3C launcher look — iron frame, warm campfire glow",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatFrame:o.launcherBorder,sidebarFrame:o.simpleBorder},{label:"B: Campfire + WC3 Ornate Frame",desc:"Gold ornamental corners over campfire scene",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatFrame:o.wc3Frame,sidebarFrame:o.simpleBorder},{label:"C: Campfire + Wood Frame",desc:"Assembled wood corners + tile edges — tavern notice board vibe",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatType:"wood",sidebarFrame:o.simpleBorder},{label:"D: Campfire + Wood Frame + Parchment",desc:"Wood frame with parchment texture inside — quest log feel",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatType:"wood-parchment",sidebarFrame:o.simpleBorder},{label:"E: Campfire + Parchment Panel",desc:"Subtle parchment texture on dark panel — no wood frame",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatType:"parchment",sidebarType:"parchment"},{label:"F: Night Elf + Wood Frame + Parchment",desc:"Purple forest + wood frame with parchment glow",bg:"/backgrounds/nightelf.jpg",overlay:"rgba(5, 0, 15, 0.45)",chatType:"wood-parchment",sidebarFrame:o.simpleBorder},{label:"G: Undead + Wood Frame",desc:"Gothic green + dark wood frame — crypt message board",bg:"/backgrounds/undead.jpg",overlay:"rgba(0, 0, 0, 0.45)",chatType:"wood",sidebarFrame:o.simpleBorder},{label:"H: Orc + Wood Frame + Parchment",desc:"Warm earthy tones + wood and parchment — war room briefing",bg:"/backgrounds/orc.jpg",overlay:"rgba(0, 0, 0, 0.45)",chatType:"wood-parchment",sidebarFrame:o.simpleBorder},{label:"I: Human + Launcher Border",desc:"Bright castle scene, iron launcher frame",bg:"/backgrounds/human.jpg",overlay:"rgba(0, 0, 0, 0.5)",chatFrame:o.launcherBorder,sidebarFrame:o.simpleBorder},{label:"J: Campfire + Simple Gold Border",desc:"Minimal thin gold border, no ornate frame",bg:"/frames/launcher/Static_Background.png",overlay:"rgba(0, 0, 0, 0.45)",chatFrame:o.goldBorder,sidebarFrame:o.goldBorder}];function ne(){return e.jsxs(h,{children:[e.jsx(x,{children:"Chat Mockups"}),e.jsx(u,{children:"Background + frame combinations — full transcript layout"}),oe.map((r,i)=>{const t=e.jsxs(e.Fragment,{children:[e.jsxs(S,{children:[e.jsx($,{children:"4v4 Chat"}),e.jsx(C,{children:"connected"})]}),e.jsx(Z,{})]}),n=e.jsxs(e.Fragment,{children:[e.jsxs(N,{children:["Channel ",e.jsx(O,{children:"79"})]}),e.jsx(ee,{})]});let s;r.chatType==="wood"?s=e.jsx(g,{children:t}):r.chatType==="wood-parchment"?s=e.jsx(g,{bg:"rgba(20, 15, 8, 0.7)",children:t}):r.chatType==="parchment"?s=e.jsx(b,{children:t}):s=e.jsx(k,{$frameStyle:r.chatFrame,children:t});let d;return r.sidebarType==="parchment"?d=e.jsx(b,{as:m,$bg:"rgba(20, 15, 8, 0.7)",$opacity:.06,style:{width:220,flex:"none"},children:n}):d=e.jsx(m,{$frameStyle:r.sidebarFrame,children:n}),e.jsxs(v,{children:[e.jsx(y,{children:r.label}),e.jsx(w,{children:r.desc}),e.jsxs(j,{$bgImage:r.bg,$overlay:r.overlay,children:[s,d]})]},i)})]})}export{ne as default};
