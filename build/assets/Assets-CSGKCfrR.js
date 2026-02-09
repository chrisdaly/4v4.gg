import{r as F,j as e,R,v as s}from"./index-CKqM6WhI.js";const H=s.div`
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
`,P=s.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,I=s.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
`,v=s.section`
  margin-bottom: var(--space-12);
`,y=s.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  margin-bottom: var(--space-1);
`,f=s.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-6);
`,t=s.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${n=>n.$minWidth||"200px"}, 1fr));
  gap: var(--space-6);
`,h=s.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--gold);
  }
`,u=s.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${n=>n.$minHeight||"120px"};
  padding: var(--space-4);
  background: ${n=>n.$bg||"repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%) 0 0 / 16px 16px"};
`,L=s.img`
  max-width: 100%;
  max-height: ${n=>n.$maxH||"200px"};
  object-fit: contain;
  image-rendering: ${n=>n.$pixelated?"pixelated":"auto"};
`,i=s.div`
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--grey-mid);
  background: rgba(0, 0, 0, 0.3);
`,c=s.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,k=s.div`
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;

  &:hover {
    opacity: 1;
    color: var(--gold);
  }
`,C=s.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  border: ${n=>n.$borderWidth||"16px"} solid transparent;
  border-image: url(${n=>n.$src}) ${n=>n.$slice||"80"} / ${n=>n.$borderWidth||"16px"} stretch;
  background: rgba(15, 12, 10, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,w=s.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: url(${n=>n.$src}) center / cover no-repeat;
  border-radius: var(--radius-sm);
`,z=s.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url(${n=>n.$src}) center / cover no-repeat;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: ${n=>n.$overlay||"rgba(0,0,0,0.85)"};
  }
`,W=s.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(20, 18, 15, 0.9);
`,m=s.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
  transform: ${n=>n.$flip||"none"};
`,T=s.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.5;
`,_=s.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
  border-bottom: 1px solid var(--grey-mid);
  padding-bottom: var(--space-4);
`,$=s.button`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${n=>n.$active?"var(--gold)":"var(--grey-light)"};
  background: ${n=>n.$active?"rgba(252, 219, 51, 0.08)":"transparent"};
  border: 1px solid ${n=>n.$active?"var(--gold)":"var(--grey-mid)"};
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`;function j(n){var l;(l=navigator.clipboard)==null||l.writeText(n)}function b({src:n,name:l,path:x,bg:a,maxH:r,pixelated:o,minHeight:S}){return e.jsxs(h,{children:[e.jsx(u,{$bg:a,$minHeight:S,children:e.jsx(L,{src:n,alt:l,$maxH:r,$pixelated:o})}),e.jsxs(i,{children:[e.jsx(c,{children:l}),e.jsx(k,{onClick:()=>j(x),title:"Click to copy path",children:x})]})]})}const A=s.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
`,d=s.a`
  display: block;
  padding: var(--space-4);
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  text-decoration: none;
  transition: all 0.15s;

  &:hover {
    border-color: var(--gold);
    background: rgba(252, 219, 51, 0.04);
  }
`,g=s.div`
  font-family: var(--font-display);
  font-size: var(--text-sm);
  color: var(--gold);
  margin-bottom: var(--space-1);
`,p=s.div`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,B=[{id:"backgrounds",title:"Backgrounds",desc:"Race-themed backgrounds from W3Champions",minWidth:"300px",items:[{name:"Human",src:"/backgrounds/human.jpg"},{name:"Night Elf",src:"/backgrounds/nightelf.jpg"},{name:"Orc",src:"/backgrounds/orc.jpg"},{name:"Undead",src:"/backgrounds/undead.jpg"}]},{id:"theme-backgrounds",title:"Theme Backgrounds",desc:"Background candidates for the expanded theme system",minWidth:"400px",isThemeBackgrounds:!0,groups:[{label:"Frozen Throne",items:[{name:"Arthas Close-up (1920x1080)",src:"/backgrounds/themes/frozen-throne.jpg",note:"has watermark"},{name:"Lich King on Throne",src:"/backgrounds/themes/frozen-throne-ice.jpg",note:"small watermark"},{name:"Undead Campaign — Northrend",src:"/backgrounds/themes/frozen-throne-alt.jpg"},{name:"Wrath Login — Frost Wyrm + Icecrown",src:"/backgrounds/themes/blight-alt.jpg",note:"clean, no text"}]},{label:"Dalaran / Arcane",items:[{name:"Peter Lee — Floating City",src:"/backgrounds/themes/dalaran.jpg",note:"stunning"},{name:"Dalaran Overview",src:"/backgrounds/themes/dalaran-alt.jpg"}]},{label:"Lordaeron",items:[{name:"Human Campaign — Knight in Gates",src:"/backgrounds/themes/lordaeron.jpg"},{name:"The Culling — Arthas at Stratholme",src:"/backgrounds/themes/culling.jpg",note:"has logos"}]},{label:"Ashenvale",items:[{name:"Night Elf Campaign — Moonlit Forest",src:"/backgrounds/themes/ashenvale.jpg"}]},{label:"Blackrock",items:[{name:"Blackrock Mountain Concept",src:"/backgrounds/themes/blackrock-alt.jpg",note:"incredible painting"},{name:"Upper Blackrock Spire Loading",src:"/backgrounds/themes/blackrock.jpg",note:"has WoW logo"}]},{label:"Fel / Burning Legion",items:[{name:"Legion Wallpaper — Illidan",src:"/backgrounds/themes/fel.jpg",note:"has logo"},{name:"BC Login — Dark Portal",src:"/backgrounds/themes/fel-alt.jpg",note:"clean"},{name:"Legion Login — Tomb of Sargeras",src:"/backgrounds/themes/arcane-legion-login.jpg",note:"clean"},{name:"Outland WC3 Map",src:"/backgrounds/themes/outland.jpg",note:"map style"}]},{label:"Holy Light",items:[{name:"Cathedral of Light — Hearthstone",src:"/backgrounds/themes/holy-light.jpg"},{name:"Uther the Lightbringer",src:"/backgrounds/themes/holy-light-alt.jpg"}]},{label:"Blight / Plague",items:[{name:"Icecrown Citadel Loading",src:"/backgrounds/themes/blight.jpg",note:"has WoW logo"},{name:"Naxxramas Loading",src:"/backgrounds/themes/blight-naxx.jpg",note:"has WoW logo"},{name:"Wrath Login — Icecrown",src:"/backgrounds/themes/blight-alt.jpg",note:"clean"}]},{label:"Arena",items:[{name:"Trial of the Crusader",src:"/backgrounds/themes/arena.jpg",note:"has WoW logo"},{name:"Ring of Valor — Horde Banners",src:"/backgrounds/themes/arena-alt.jpg",note:"clean"}]},{label:"Midnight / Dark",items:[{name:"Shadowlands Login — Shattered Sky",src:"/backgrounds/themes/midnight.png",note:"clean, no text"},{name:"Revendreth — Gothic Castle",src:"/backgrounds/themes/midnight-revendreth.jpg"},{name:"Campfire Under Stars (existing)",src:"/frames/launcher/Static_Background.png"}]}]},{id:"wc3-frame",title:"WC3 Ornate Frame",desc:"Full border-image frame with decorative corners",minWidth:"300px",items:[{name:"wc3-frame.png",src:"/frames/wc3-frame.png"}]},{id:"chat-frames",title:"Chat Frames",desc:"WoW chat frame borders and backgrounds",items:[{name:"ChatFrame",src:"/frames/chat/ChatFrame.png"},{name:"ChatFrameBorder",src:"/frames/chat/ChatFrameBorder.png"},{name:"ChatFrameInnerBorder",src:"/frames/chat/ChatFrameInnerBorder.png"},{name:"ChatFrameBackground",src:"/frames/chat/ChatFrameBackground.png"},{name:"BorderCorner",src:"/frames/chat/BorderCorner.png"},{name:"BorderLeft",src:"/frames/chat/BorderLeft.png"},{name:"BorderTop",src:"/frames/chat/BorderTop.png"}]},{id:"wood",title:"Wood Borders",desc:"Achievement and BlackMarket wood frame pieces",items:[{name:"WoodBorder",src:"/frames/wood/WoodBorder.png"},{name:"WoodBorder-Corner",src:"/frames/wood/WoodBorder-Corner.png"},{name:"AchievementWood (H)",src:"/frames/wood/AchievementWood.png"},{name:"AchievementWood (V)",src:"/frames/wood/AchievementWoodVertical.png"},{name:"Corner TL",src:"/frames/wood/WoodCorner-TL.png"},{name:"Corner TR",src:"/frames/wood/WoodCorner-TR.png"},{name:"Corner BL",src:"/frames/wood/WoodCorner-BL.png"},{name:"Corner BR",src:"/frames/wood/WoodCorner-BR.png"},{name:"Tile Horizontal",src:"/frames/wood/WoodTile-H.png"},{name:"Tile Vertical",src:"/frames/wood/WoodTile-V.png"}]},{id:"stone",title:"Stone / Bronze / Marble Corners",desc:"ItemTextFrame corner pieces — 4 variants",items:[{name:"Stone TL",src:"/frames/stone/Stone-TL.png"},{name:"Stone TR",src:"/frames/stone/Stone-TR.png"},{name:"Stone BL",src:"/frames/stone/Stone-BL.png"},{name:"Stone BR",src:"/frames/stone/Stone-BR.png"},{name:"Bronze TL",src:"/frames/stone/Bronze-TL.png"},{name:"Bronze TR",src:"/frames/stone/Bronze-TR.png"},{name:"Bronze BL",src:"/frames/stone/Bronze-BL.png"},{name:"Bronze BR",src:"/frames/stone/Bronze-BR.png"},{name:"Marble TL",src:"/frames/stone/Marble-TL.png"},{name:"Marble TR",src:"/frames/stone/Marble-TR.png"},{name:"Marble BL",src:"/frames/stone/Marble-BL.png"},{name:"Marble BR",src:"/frames/stone/Marble-BR.png"}]},{id:"dialog",title:"Dialog Frames",desc:"WoW dialog box borders, corners, and backgrounds",items:[{name:"Background",src:"/frames/dialog/Background.png"},{name:"Background Dark",src:"/frames/dialog/Background-Dark.png"},{name:"Border",src:"/frames/dialog/Border.png"},{name:"Corner",src:"/frames/dialog/Corner.png"},{name:"Header",src:"/frames/dialog/Header.png"},{name:"Gold Background",src:"/frames/dialog/Gold-Background.png"},{name:"Gold Border",src:"/frames/dialog/Gold-Border.png"},{name:"Gold Corner",src:"/frames/dialog/Gold-Corner.png"},{name:"Gold Dragon",src:"/frames/dialog/Gold-Dragon.png"},{name:"Gold Header",src:"/frames/dialog/Gold-Header.png"}]},{id:"tooltips",title:"Tooltips",desc:"9-slice tooltip borders and backgrounds",items:[{name:"Tooltip Frame",src:"/frames/tooltips/Tooltip.png"},{name:"Background",src:"/frames/tooltips/Background.png"},{name:"Border",src:"/frames/tooltips/Border.png"},{name:"TooltipBg",src:"/frames/tooltips/TooltipBg.png"},{name:"Top-Left",src:"/frames/tooltips/TL.png"},{name:"Top-Right",src:"/frames/tooltips/TR.png"},{name:"Bottom-Left",src:"/frames/tooltips/BL.png"},{name:"Bottom-Right",src:"/frames/tooltips/BR.png"},{name:"Top",src:"/frames/tooltips/T.png"},{name:"Bottom",src:"/frames/tooltips/B.png"},{name:"Left",src:"/frames/tooltips/L.png"},{name:"Right",src:"/frames/tooltips/R.png"}]},{id:"parchment",title:"Parchment & Scroll",desc:"Tileable parchment textures and edge pieces",items:[{name:"Parchment",src:"/frames/parchment/Parchment.png"},{name:"Parchment Horizontal",src:"/frames/parchment/Parchment-H.png"},{name:"Quest Parchment",src:"/frames/parchment/QuestParchment.png"},{name:"Tileable",src:"/frames/parchment/Tileable.png"},{name:"Edge Top",src:"/frames/parchment/Edge-Top.png"},{name:"Edge Bottom",src:"/frames/parchment/Edge-Bottom.png"},{name:"Edge Left",src:"/frames/parchment/Edge-Left.png"},{name:"Edge Right",src:"/frames/parchment/Edge-Right.png"}]},{id:"chat-bubbles",title:"Chat Bubbles",desc:"Speech bubble backdrops and tails",items:[{name:"Backdrop",src:"/frames/chat-bubbles/Backdrop.png"},{name:"Background",src:"/frames/chat-bubbles/Background.png"},{name:"Tail",src:"/frames/chat-bubbles/Tail.png"},{name:"ChatBubble",src:"/frames/chat-bubbles/ChatBubble.png"}]},{id:"metal",title:"Metal Borders",desc:"Achievement metal border strips and joints",items:[{name:"Borders",src:"/frames/metal/Borders.png"},{name:"Left Strip",src:"/frames/metal/Left.png"},{name:"Top Strip",src:"/frames/metal/Top.png"},{name:"Joint",src:"/frames/metal/Joint.png"}]},{id:"launcher",title:"W3Champions Launcher",desc:"Buttons, frames, and UI from the W3C launcher app",items:[{name:"Main Border",src:"/frames/launcher/Maon_Border.png"},{name:"Static Background",src:"/frames/launcher/Static_Background.png"},{name:"Header Frame",src:"/frames/launcher/Header_Buttons_Frame.png"},{name:"Header Frame Slim",src:"/frames/launcher/Header_Buttons_Frame_Slim.png"},{name:"Text Frame",src:"/frames/launcher/W3Champion_Text_Frame.png"},{name:"Settings Panel Frame",src:"/frames/launcher/Settings_Directory_Text_Frame.png"},{name:"Input Field Frame",src:"/frames/launcher/Settings_Directory_Frame.png"},{name:"Button Blue",src:"/frames/launcher/Button_Blue.png"},{name:"Button Blue Active",src:"/frames/launcher/Button_Blue_Active.png"},{name:"Exit Button",src:"/frames/launcher/Exit_Button.png"},{name:"Hero Button Active",src:"/frames/launcher/Green_Hero_Button_Active.png"},{name:"Hero Button Static",src:"/frames/launcher/Green_Hero_Button_Static.png"},{name:"Item Background",src:"/frames/launcher/itemBg.png"}]},{id:"logos",title:"W3Champions Logos",desc:"Official W3Champions branding assets",items:[{name:"Medium Logo",src:"/frames/w3c-logos/medium-logo.png"},{name:"Medium Logotype",src:"/frames/w3c-logos/medium-logotype.png"},{name:"Small Logo Full",src:"/frames/w3c-logos/small-logo-full.png"},{name:"Small Logo Yellow",src:"/frames/w3c-logos/small-logo-full-yellow.png"},{name:"Small Logo",src:"/frames/w3c-logos/small-logo.png"}]},{id:"fansite-kit",title:"WC3 Fansite Kit",desc:"Race-specific borders, buttons, and logos from the Frozen Throne UI kit",items:[{name:"Human Borders",src:"/frames/fansite-kit/human-borders.png"},{name:"Orc Borders",src:"/frames/fansite-kit/orb-borders.png"},{name:"Night Elf Borders",src:"/frames/fansite-kit/elf-borders.png"},{name:"Undead Borders",src:"/frames/fansite-kit/undead-borders.png"},{name:"4 Races",src:"/frames/fansite-kit/4-races.jpg"},{name:"Buttons",src:"/frames/fansite-kit/buttons.png"},{name:"Blue Button",src:"/frames/fansite-kit/blue-button.png"},{name:"Green Button",src:"/frames/fansite-kit/green-button.png"},{name:"Red Button",src:"/frames/fansite-kit/red-button.png"},{name:"Button Yes",src:"/frames/fansite-kit/button-yes.png"},{name:"Button No",src:"/frames/fansite-kit/button-no.png"},{name:"Chain",src:"/frames/fansite-kit/p-chain.png"},{name:"WC3: Reign of Chaos",src:"/frames/fansite-kit/warcraft-3-reign-of-chaos.png"},{name:"WC3: Frozen Throne",src:"/frames/fansite-kit/warcraft-3-the-frozen-throne.png"},{name:"RoC Icon",src:"/frames/fansite-kit/warcraft-3-reign-of-chaos-icon.png"},{name:"TFT Icon",src:"/frames/fansite-kit/warcraft-3-the-frozen-throne-icon.png"}]},{id:"kenney",title:"Kenney Fantasy UI Borders",desc:"CC0 licensed 9-slice borders — kenney.nl/assets/fantasy-ui-borders",minWidth:"120px",items:[{name:"Preview Sheet",src:"/frames/external/kenney/Preview.png"},{name:"Sample Usage",src:"/frames/external/kenney/Sample.png"},{name:"Border 000",src:"/frames/external/kenney/panel-border-000.png"},{name:"Border 001",src:"/frames/external/kenney/panel-border-001.png"},{name:"Border 002",src:"/frames/external/kenney/panel-border-002.png"},{name:"Border 003",src:"/frames/external/kenney/panel-border-003.png"},{name:"Border 004",src:"/frames/external/kenney/panel-border-004.png"},{name:"Border 005",src:"/frames/external/kenney/panel-border-005.png"},{name:"Border 010",src:"/frames/external/kenney/panel-border-010.png"},{name:"Border 015",src:"/frames/external/kenney/panel-border-015.png"},{name:"Border 020",src:"/frames/external/kenney/panel-border-020.png"},{name:"Border 025",src:"/frames/external/kenney/panel-border-025.png"},{name:"Border 030",src:"/frames/external/kenney/panel-border-030.png"},{name:"Border 031",src:"/frames/external/kenney/panel-border-031.png"},{name:"Panel 000",src:"/frames/external/kenney/panel-000.png"},{name:"Panel 005",src:"/frames/external/kenney/panel-005.png"},{name:"Panel 010",src:"/frames/external/kenney/panel-010.png"},{name:"Panel 015",src:"/frames/external/kenney/panel-015.png"},{name:"Panel 020",src:"/frames/external/kenney/panel-020.png"},{name:"Panel 025",src:"/frames/external/kenney/panel-025.png"},{name:"Panel 030",src:"/frames/external/kenney/panel-030.png"},{name:"Double Border 000",src:"/frames/external/kenney/double-border-panel-border-000.png"},{name:"Double Border 005",src:"/frames/external/kenney/double-border-panel-border-005.png"},{name:"Double Border 010",src:"/frames/external/kenney/double-border-panel-border-010.png"},{name:"Double Border 015",src:"/frames/external/kenney/double-border-panel-border-015.png"},{name:"Double Border 020",src:"/frames/external/kenney/double-border-panel-border-020.png"}]},{id:"hive-workshop",title:"Hive Workshop Custom UIs",desc:"Custom WC3 UI packs — hiveworkshop.com/repositories/user-interface.779",minWidth:"280px",items:[{name:"Dragon Scales UI",src:"/frames/external/hive/dragon-scales.jpg"},{name:"Scions of the Sky UI",src:"/frames/external/hive/scions-sky.jpg"},{name:"Fallout UI",src:"/frames/external/hive/fallout.jpg"},{name:"Kul Tiran Custom UI",src:"/frames/external/hive/kul-tiran.jpg"}]}];B.map(n=>n.id);function G(){const[n,l]=F.useState("all"),x=n==="all"?B:B.filter(a=>a.id===n);return e.jsxs(H,{children:[e.jsx(P,{children:"Asset Library"}),e.jsx(I,{children:"WC3 & WoW UI textures, borders, frames, backgrounds. Click path to copy."}),e.jsxs(_,{children:[e.jsx($,{$active:n==="all",onClick:()=>l("all"),children:"All"}),B.map(a=>e.jsx($,{$active:n===a.id,onClick:()=>l(a.id),children:a.title},a.id))]}),x.map(a=>e.jsxs(v,{children:[e.jsx(y,{children:a.title}),e.jsx(f,{children:a.desc}),a.isThemeBackgrounds?e.jsx(e.Fragment,{children:a.groups.map(r=>e.jsxs(R.Fragment,{children:[e.jsx(f,{style:{marginTop:"var(--space-6)",color:"var(--gold)",fontSize:"var(--text-xs)",textTransform:"none",letterSpacing:"normal"},children:r.label}),e.jsx(t,{$minWidth:"400px",children:r.items.map(o=>e.jsxs(h,{children:[e.jsx(w,{$src:o.src}),e.jsxs(i,{children:[e.jsx(c,{children:o.name}),e.jsxs(k,{onClick:()=>j(o.src),children:[o.src,o.note?` — ${o.note}`:""]})]})]},o.src))})]},r.label))}):a.id==="backgrounds"?e.jsx(t,{$minWidth:"300px",children:a.items.map(r=>e.jsxs(h,{children:[e.jsx(w,{$src:r.src}),e.jsxs(i,{children:[e.jsx(c,{children:r.name}),e.jsx(k,{onClick:()=>j(r.src),children:r.src})]}),e.jsx(z,{$src:r.src,$overlay:"rgba(0,0,0,0.85)"}),e.jsx(i,{children:e.jsxs(c,{children:[r.name," + 85% overlay"]})})]},r.name))}):a.id==="wc3-frame"?e.jsxs(t,{$minWidth:"300px",children:[e.jsxs(h,{children:[e.jsx(u,{$minHeight:"200px",children:e.jsx(L,{src:a.items[0].src,$maxH:"300px"})}),e.jsxs(i,{children:[e.jsx(c,{children:"Raw Image"}),e.jsx(k,{onClick:()=>j(a.items[0].src),children:a.items[0].src})]})]}),e.jsxs(h,{children:[e.jsx(u,{$minHeight:"200px",$bg:"transparent",children:e.jsx(C,{$src:'"/frames/wc3-frame.png"',$slice:"80",$borderWidth:"16px",children:"border-image preview"})}),e.jsx(i,{children:e.jsx(c,{children:"As border-image (16px, slice 80)"})})]}),e.jsxs(h,{children:[e.jsx(u,{$minHeight:"200px",$bg:"transparent",children:e.jsx(C,{$src:'"/frames/wc3-frame.png"',$slice:"80",$borderWidth:"24px",children:"border-image preview"})}),e.jsx(i,{children:e.jsx(c,{children:"As border-image (24px, slice 80)"})})]})]}):a.id==="stone"?e.jsxs(e.Fragment,{children:[e.jsx(t,{$minWidth:"140px",children:a.items.map(r=>e.jsx(b,{src:r.src,name:r.name,path:r.src,maxH:"100px"},r.name))}),e.jsx(f,{style:{marginTop:"var(--space-6)"},children:"Corner Assembly Previews"}),e.jsx(t,{$minWidth:"250px",children:["Stone","Bronze","Marble"].map(r=>e.jsxs(h,{children:[e.jsxs(W,{children:[e.jsx(m,{src:`/frames/stone/${r}-TL.png`}),e.jsx("div",{}),e.jsx(m,{src:`/frames/stone/${r}-TR.png`}),e.jsx("div",{}),e.jsx(T,{children:r}),e.jsx("div",{}),e.jsx(m,{src:`/frames/stone/${r}-BL.png`}),e.jsx("div",{}),e.jsx(m,{src:`/frames/stone/${r}-BR.png`})]}),e.jsx(i,{children:e.jsxs(c,{children:[r," Corners Assembled"]})})]},r))})]}):a.id==="wood"&&a.items.length>=8?e.jsxs(e.Fragment,{children:[e.jsx(t,{$minWidth:"160px",children:a.items.map(r=>e.jsx(b,{src:r.src,name:r.name,path:r.src,maxH:"120px"},r.name))}),e.jsx(f,{style:{marginTop:"var(--space-6)"},children:"Wood Corner Assembly"}),e.jsx(t,{$minWidth:"300px",children:e.jsxs(h,{children:[e.jsxs(W,{children:[e.jsx(m,{src:"/frames/wood/WoodCorner-TL.png"}),e.jsx("div",{}),e.jsx(m,{src:"/frames/wood/WoodCorner-TR.png"}),e.jsx("div",{}),e.jsx(T,{children:"Wood Frame"}),e.jsx("div",{}),e.jsx(m,{src:"/frames/wood/WoodCorner-BL.png"}),e.jsx("div",{}),e.jsx(m,{src:"/frames/wood/WoodCorner-BR.png"})]}),e.jsx(i,{children:e.jsx(c,{children:"BlackMarket Wood Corners"})})]})})]}):a.id==="kenney"?e.jsx(t,{$minWidth:a.minWidth||"120px",children:a.items.map(r=>e.jsx(b,{src:r.src,name:r.name,path:r.src,bg:"#222",maxH:r.name.startsWith("Preview")||r.name.startsWith("Sample")?"300px":"120px",minHeight:r.name.startsWith("Preview")||r.name.startsWith("Sample")?"200px":"80px"},r.name))}):e.jsx(t,{$minWidth:a.minWidth||"200px",children:a.items.map(r=>e.jsx(b,{src:r.src,name:r.name,path:r.src},r.name))})]},a.id)),e.jsxs(v,{children:[e.jsx(y,{children:"External Resources"}),e.jsx(f,{children:"Additional fantasy UI border packs available online"}),e.jsxs(A,{children:[e.jsxs(d,{href:"https://kenney.nl/assets/fantasy-ui-borders",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"Kenney Fantasy UI Borders"}),e.jsx(p,{children:"CC0 — 140 sprites, 9-slice, free commercial use"})]}),e.jsxs(d,{href:"https://gaming-tools.com/warcraft-3/warcraft-3-fansite-kit-free-download/",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"WC3 Fansite Kit"}),e.jsx(p,{children:"Free — Race-specific borders (Human, Orc, NE, UD) + Lifecraft font"})]}),e.jsxs(d,{href:"https://www.hiveworkshop.com/repositories/user-interface.779/",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"Hive Workshop Custom UIs"}),e.jsx(p,{children:"Community — 9+ pages of custom WC3 UI replacement packs"})]}),e.jsxs(d,{href:"https://ronenness.github.io/RPGUI/",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"RPGUI Framework"}),e.jsx(p,{children:"zlib license — CSS/JS RPG frames (framed-golden, framed-golden-2)"})]}),e.jsxs(d,{href:"https://opengameart.org/content/golden-ui",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"OpenGameArt: Golden UI"}),e.jsx(p,{children:"CC0 — Panels, bars, buttons, inventory by Buch"})]}),e.jsxs(d,{href:"https://free-game-assets.itch.io/fantasy-rpg-user-interface",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"Fantasy RPG UI (itch.io)"}),e.jsx(p,{children:"$0.90 — Includes chat interface assets, gold frames"})]}),e.jsxs(d,{href:"https://codepen.io/kevinmcullen/pen/PVmwVz",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"Gold Shimmer Border (CodePen)"}),e.jsx(p,{children:"CSS-only — Animated gold border sweep effect"})]}),e.jsxs(d,{href:"https://codepen.io/propjockey/pen/poqKrGe",target:"_blank",rel:"noopener",children:[e.jsx(g,{children:"CSS Fantasy Buttons (CodePen)"}),e.jsx(p,{children:"CSS-only — Metallic gradient border techniques"})]})]})]})]})}export{G as default};
