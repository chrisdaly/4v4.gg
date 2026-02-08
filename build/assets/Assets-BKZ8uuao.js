import{a as T,j as e,E as n}from"./index-Cd5fC_ps.js";const k=n.div`
  padding: var(--space-6) var(--space-8);
  max-width: 1400px;
  margin: 0 auto;
`,W=n.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-2);
`,y=n.p`
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--grey-light);
  margin-bottom: var(--space-8);
`,L=n.section`
  margin-bottom: var(--space-12);
`,R=n.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: #fff;
  margin-bottom: var(--space-1);
`,f=n.p`
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: var(--space-6);
`,m=n.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(${r=>r.$minWidth||"200px"}, 1fr));
  gap: var(--space-6);
`,d=n.div`
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
  transition: border-color 0.2s;

  &:hover {
    border-color: var(--gold);
  }
`,p=n.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: ${r=>r.$minHeight||"120px"};
  padding: var(--space-4);
  background: ${r=>r.$bg||"repeating-conic-gradient(#1a1a1a 0% 25%, #111 0% 50%) 0 0 / 16px 16px"};
`,$=n.img`
  max-width: 100%;
  max-height: ${r=>r.$maxH||"200px"};
  object-fit: contain;
  image-rendering: ${r=>r.$pixelated?"pixelated":"auto"};
`,c=n.div`
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--grey-mid);
  background: rgba(0, 0, 0, 0.3);
`,i=n.div`
  font-family: var(--font-mono);
  font-size: 11px;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`,x=n.div`
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
`,b=n.div`
  width: 100%;
  aspect-ratio: 4 / 3;
  border: ${r=>r.$borderWidth||"16px"} solid transparent;
  border-image: url(${r=>r.$src}) ${r=>r.$slice||"80"} / ${r=>r.$borderWidth||"16px"} stretch;
  background: rgba(15, 12, 10, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: var(--text-xxs);
  color: var(--grey-light);
`,S=n.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: url(${r=>r.$src}) center / cover no-repeat;
  border-radius: var(--radius-sm);
`,H=n.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  position: relative;
  border-radius: var(--radius-sm);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: url(${r=>r.$src}) center / cover no-repeat;
  }

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: ${r=>r.$overlay||"rgba(0,0,0,0.85)"};
  }
`,v=n.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  width: 100%;
  aspect-ratio: 4 / 3;
  background: rgba(20, 18, 15, 0.9);
`,t=n.img`
  width: 64px;
  height: 64px;
  object-fit: contain;
  transform: ${r=>r.$flip||"none"};
`,B=n.div`
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--grey-light);
  opacity: 0.5;
`,F=n.div`
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
  border-bottom: 1px solid var(--grey-mid);
  padding-bottom: var(--space-4);
`,j=n.button`
  font-family: var(--font-display);
  font-size: var(--text-xs);
  color: ${r=>r.$active?"var(--gold)":"var(--grey-light)"};
  background: ${r=>r.$active?"rgba(252, 219, 51, 0.08)":"transparent"};
  border: 1px solid ${r=>r.$active?"var(--gold)":"var(--grey-mid)"};
  border-radius: var(--radius-full);
  padding: var(--space-1) var(--space-4);
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: var(--gold);
    border-color: var(--gold);
  }
`;function u(r){var s;(s=navigator.clipboard)==null||s.writeText(r)}function h({src:r,name:s,path:l,bg:o,maxH:a,pixelated:w,minHeight:C}){return e.jsxs(d,{children:[e.jsx(p,{$bg:o,$minHeight:C,children:e.jsx($,{src:r,alt:s,$maxH:a,$pixelated:w})}),e.jsxs(c,{children:[e.jsx(i,{children:s}),e.jsx(x,{onClick:()=>u(l),title:"Click to copy path",children:l})]})]})}const g=[{id:"backgrounds",title:"Backgrounds",desc:"Race-themed backgrounds from W3Champions",minWidth:"300px",items:[{name:"Human",src:"/backgrounds/human.jpg"},{name:"Night Elf",src:"/backgrounds/nightelf.jpg"},{name:"Orc",src:"/backgrounds/orc.jpg"},{name:"Undead",src:"/backgrounds/undead.jpg"}]},{id:"wc3-frame",title:"WC3 Ornate Frame",desc:"Full border-image frame with decorative corners",minWidth:"300px",items:[{name:"wc3-frame.png",src:"/frames/wc3-frame.png"}]},{id:"chat-frames",title:"Chat Frames",desc:"WoW chat frame borders and backgrounds",items:[{name:"ChatFrame",src:"/frames/chat/ChatFrame.png"},{name:"ChatFrameBorder",src:"/frames/chat/ChatFrameBorder.png"},{name:"ChatFrameInnerBorder",src:"/frames/chat/ChatFrameInnerBorder.png"},{name:"ChatFrameBackground",src:"/frames/chat/ChatFrameBackground.png"},{name:"BorderCorner",src:"/frames/chat/BorderCorner.png"},{name:"BorderLeft",src:"/frames/chat/BorderLeft.png"},{name:"BorderTop",src:"/frames/chat/BorderTop.png"}]},{id:"wood",title:"Wood Borders",desc:"Achievement and BlackMarket wood frame pieces",items:[{name:"WoodBorder",src:"/frames/wood/WoodBorder.png"},{name:"WoodBorder-Corner",src:"/frames/wood/WoodBorder-Corner.png"},{name:"AchievementWood (H)",src:"/frames/wood/AchievementWood.png"},{name:"AchievementWood (V)",src:"/frames/wood/AchievementWoodVertical.png"},{name:"Corner TL",src:"/frames/wood/WoodCorner-TL.png"},{name:"Corner TR",src:"/frames/wood/WoodCorner-TR.png"},{name:"Corner BL",src:"/frames/wood/WoodCorner-BL.png"},{name:"Corner BR",src:"/frames/wood/WoodCorner-BR.png"},{name:"Tile Horizontal",src:"/frames/wood/WoodTile-H.png"},{name:"Tile Vertical",src:"/frames/wood/WoodTile-V.png"}]},{id:"stone",title:"Stone / Bronze / Marble Corners",desc:"ItemTextFrame corner pieces — 4 variants",items:[{name:"Stone TL",src:"/frames/stone/Stone-TL.png"},{name:"Stone TR",src:"/frames/stone/Stone-TR.png"},{name:"Stone BL",src:"/frames/stone/Stone-BL.png"},{name:"Stone BR",src:"/frames/stone/Stone-BR.png"},{name:"Bronze TL",src:"/frames/stone/Bronze-TL.png"},{name:"Bronze TR",src:"/frames/stone/Bronze-TR.png"},{name:"Bronze BL",src:"/frames/stone/Bronze-BL.png"},{name:"Bronze BR",src:"/frames/stone/Bronze-BR.png"},{name:"Marble TL",src:"/frames/stone/Marble-TL.png"},{name:"Marble TR",src:"/frames/stone/Marble-TR.png"},{name:"Marble BL",src:"/frames/stone/Marble-BL.png"},{name:"Marble BR",src:"/frames/stone/Marble-BR.png"}]},{id:"dialog",title:"Dialog Frames",desc:"WoW dialog box borders, corners, and backgrounds",items:[{name:"Background",src:"/frames/dialog/Background.png"},{name:"Background Dark",src:"/frames/dialog/Background-Dark.png"},{name:"Border",src:"/frames/dialog/Border.png"},{name:"Corner",src:"/frames/dialog/Corner.png"},{name:"Header",src:"/frames/dialog/Header.png"},{name:"Gold Background",src:"/frames/dialog/Gold-Background.png"},{name:"Gold Border",src:"/frames/dialog/Gold-Border.png"},{name:"Gold Corner",src:"/frames/dialog/Gold-Corner.png"},{name:"Gold Dragon",src:"/frames/dialog/Gold-Dragon.png"},{name:"Gold Header",src:"/frames/dialog/Gold-Header.png"}]},{id:"tooltips",title:"Tooltips",desc:"9-slice tooltip borders and backgrounds",items:[{name:"Tooltip Frame",src:"/frames/tooltips/Tooltip.png"},{name:"Background",src:"/frames/tooltips/Background.png"},{name:"Border",src:"/frames/tooltips/Border.png"},{name:"TooltipBg",src:"/frames/tooltips/TooltipBg.png"},{name:"Top-Left",src:"/frames/tooltips/TL.png"},{name:"Top-Right",src:"/frames/tooltips/TR.png"},{name:"Bottom-Left",src:"/frames/tooltips/BL.png"},{name:"Bottom-Right",src:"/frames/tooltips/BR.png"},{name:"Top",src:"/frames/tooltips/T.png"},{name:"Bottom",src:"/frames/tooltips/B.png"},{name:"Left",src:"/frames/tooltips/L.png"},{name:"Right",src:"/frames/tooltips/R.png"}]},{id:"parchment",title:"Parchment & Scroll",desc:"Tileable parchment textures and edge pieces",items:[{name:"Parchment",src:"/frames/parchment/Parchment.png"},{name:"Parchment Horizontal",src:"/frames/parchment/Parchment-H.png"},{name:"Quest Parchment",src:"/frames/parchment/QuestParchment.png"},{name:"Tileable",src:"/frames/parchment/Tileable.png"},{name:"Edge Top",src:"/frames/parchment/Edge-Top.png"},{name:"Edge Bottom",src:"/frames/parchment/Edge-Bottom.png"},{name:"Edge Left",src:"/frames/parchment/Edge-Left.png"},{name:"Edge Right",src:"/frames/parchment/Edge-Right.png"}]},{id:"chat-bubbles",title:"Chat Bubbles",desc:"Speech bubble backdrops and tails",items:[{name:"Backdrop",src:"/frames/chat-bubbles/Backdrop.png"},{name:"Background",src:"/frames/chat-bubbles/Background.png"},{name:"Tail",src:"/frames/chat-bubbles/Tail.png"},{name:"ChatBubble",src:"/frames/chat-bubbles/ChatBubble.png"}]},{id:"metal",title:"Metal Borders",desc:"Achievement metal border strips and joints",items:[{name:"Borders",src:"/frames/metal/Borders.png"},{name:"Left Strip",src:"/frames/metal/Left.png"},{name:"Top Strip",src:"/frames/metal/Top.png"},{name:"Joint",src:"/frames/metal/Joint.png"}]},{id:"launcher",title:"W3Champions Launcher",desc:"Buttons, frames, and UI from the W3C launcher app",items:[{name:"Main Border",src:"/frames/launcher/Maon_Border.png"},{name:"Static Background",src:"/frames/launcher/Static_Background.png"},{name:"Header Frame",src:"/frames/launcher/Header_Buttons_Frame.png"},{name:"Header Frame Slim",src:"/frames/launcher/Header_Buttons_Frame_Slim.png"},{name:"Text Frame",src:"/frames/launcher/W3Champion_Text_Frame.png"},{name:"Button Blue",src:"/frames/launcher/Button_Blue.png"},{name:"Button Blue Active",src:"/frames/launcher/Button_Blue_Active.png"},{name:"Exit Button",src:"/frames/launcher/Exit_Button.png"},{name:"Hero Button Active",src:"/frames/launcher/Green_Hero_Button_Active.png"},{name:"Hero Button Static",src:"/frames/launcher/Green_Hero_Button_Static.png"},{name:"Item Background",src:"/frames/launcher/itemBg.png"}]},{id:"logos",title:"W3Champions Logos",desc:"Official W3Champions branding assets",items:[{name:"Medium Logo",src:"/frames/w3c-logos/medium-logo.png"},{name:"Medium Logotype",src:"/frames/w3c-logos/medium-logotype.png"},{name:"Small Logo Full",src:"/frames/w3c-logos/small-logo-full.png"},{name:"Small Logo Yellow",src:"/frames/w3c-logos/small-logo-full-yellow.png"},{name:"Small Logo",src:"/frames/w3c-logos/small-logo.png"}]}];g.map(r=>r.id);function z(){const[r,s]=T.useState("all"),l=r==="all"?g:g.filter(o=>o.id===r);return e.jsxs(k,{children:[e.jsx(W,{children:"Asset Library"}),e.jsx(y,{children:"WC3 & WoW UI textures, borders, frames, backgrounds. Click path to copy."}),e.jsxs(F,{children:[e.jsx(j,{$active:r==="all",onClick:()=>s("all"),children:"All"}),g.map(o=>e.jsx(j,{$active:r===o.id,onClick:()=>s(o.id),children:o.title},o.id))]}),l.map(o=>e.jsxs(L,{children:[e.jsx(R,{children:o.title}),e.jsx(f,{children:o.desc}),o.id==="backgrounds"?e.jsx(m,{$minWidth:"300px",children:o.items.map(a=>e.jsxs(d,{children:[e.jsx(S,{$src:a.src}),e.jsxs(c,{children:[e.jsx(i,{children:a.name}),e.jsx(x,{onClick:()=>u(a.src),children:a.src})]}),e.jsx(H,{$src:a.src,$overlay:"rgba(0,0,0,0.85)"}),e.jsx(c,{children:e.jsxs(i,{children:[a.name," + 85% overlay"]})})]},a.name))}):o.id==="wc3-frame"?e.jsxs(m,{$minWidth:"300px",children:[e.jsxs(d,{children:[e.jsx(p,{$minHeight:"200px",children:e.jsx($,{src:o.items[0].src,$maxH:"300px"})}),e.jsxs(c,{children:[e.jsx(i,{children:"Raw Image"}),e.jsx(x,{onClick:()=>u(o.items[0].src),children:o.items[0].src})]})]}),e.jsxs(d,{children:[e.jsx(p,{$minHeight:"200px",$bg:"transparent",children:e.jsx(b,{$src:'"/frames/wc3-frame.png"',$slice:"80",$borderWidth:"16px",children:"border-image preview"})}),e.jsx(c,{children:e.jsx(i,{children:"As border-image (16px, slice 80)"})})]}),e.jsxs(d,{children:[e.jsx(p,{$minHeight:"200px",$bg:"transparent",children:e.jsx(b,{$src:'"/frames/wc3-frame.png"',$slice:"80",$borderWidth:"24px",children:"border-image preview"})}),e.jsx(c,{children:e.jsx(i,{children:"As border-image (24px, slice 80)"})})]})]}):o.id==="stone"?e.jsxs(e.Fragment,{children:[e.jsx(m,{$minWidth:"140px",children:o.items.map(a=>e.jsx(h,{src:a.src,name:a.name,path:a.src,maxH:"100px"},a.name))}),e.jsx(f,{style:{marginTop:"var(--space-6)"},children:"Corner Assembly Previews"}),e.jsx(m,{$minWidth:"250px",children:["Stone","Bronze","Marble"].map(a=>e.jsxs(d,{children:[e.jsxs(v,{children:[e.jsx(t,{src:`/frames/stone/${a}-TL.png`}),e.jsx("div",{}),e.jsx(t,{src:`/frames/stone/${a}-TR.png`}),e.jsx("div",{}),e.jsx(B,{children:a}),e.jsx("div",{}),e.jsx(t,{src:`/frames/stone/${a}-BL.png`}),e.jsx("div",{}),e.jsx(t,{src:`/frames/stone/${a}-BR.png`})]}),e.jsx(c,{children:e.jsxs(i,{children:[a," Corners Assembled"]})})]},a))})]}):o.id==="wood"&&o.items.length>=8?e.jsxs(e.Fragment,{children:[e.jsx(m,{$minWidth:"160px",children:o.items.map(a=>e.jsx(h,{src:a.src,name:a.name,path:a.src,maxH:"120px"},a.name))}),e.jsx(f,{style:{marginTop:"var(--space-6)"},children:"Wood Corner Assembly"}),e.jsx(m,{$minWidth:"300px",children:e.jsxs(d,{children:[e.jsxs(v,{children:[e.jsx(t,{src:"/frames/wood/WoodCorner-TL.png"}),e.jsx("div",{}),e.jsx(t,{src:"/frames/wood/WoodCorner-TR.png"}),e.jsx("div",{}),e.jsx(B,{children:"Wood Frame"}),e.jsx("div",{}),e.jsx(t,{src:"/frames/wood/WoodCorner-BL.png"}),e.jsx("div",{}),e.jsx(t,{src:"/frames/wood/WoodCorner-BR.png"})]}),e.jsx(c,{children:e.jsx(i,{children:"BlackMarket Wood Corners"})})]})})]}):e.jsx(m,{$minWidth:o.minWidth||"200px",children:o.items.map(a=>e.jsx(h,{src:a.src,name:a.name,path:a.src},a.name))})]},o.id))]})}export{z as default};
