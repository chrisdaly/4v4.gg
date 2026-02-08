import{a as t,j as e,E as s}from"./index-zEkMzarM.js";import{M as Me}from"./MatchOverlay-BHcrMksS.js";import{P as Te}from"./PlayerOverlay-AsRb7lBf.js";import{G as ke}from"./GameCard-DlNkvmz8.js";/* empty css                *//* empty css                 */const Ee=s.div`
  background: #0a0a0a;
  min-height: 100vh;
  padding: var(--space-8);
  color: #fff;
`,Ce=s.h1`
  font-family: var(--font-display);
  font-size: var(--text-xl);
  color: var(--gold);
  margin-bottom: var(--space-1);
`,L=s.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  margin-bottom: var(--space-6);
`,P=s.section`
  margin-bottom: var(--space-8);
`,B=s.h2`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-4);
`,Re=s.div`
  padding: var(--space-4);
  background: var(--grey-dark);
  border-radius: var(--radius-md);
  max-width: 500px;
  margin-bottom: var(--space-6);
`,F=s.label`
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--grey-light);
  margin-bottom: var(--space-1);
`,se=s.select`
  width: 100%;
  padding: var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  background: #0a0a0a;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: #fff;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: var(--gold);
  }
`,Oe=s.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-6);
  margin-bottom: var(--space-8);

  @media (max-width: 1000px) {
    grid-template-columns: 1fr;
  }
`,z=s.div`
  background: var(--grey-dark);
  border-radius: var(--radius-md);
  padding: var(--space-6);
`,I=s.h3`
  font-family: var(--font-display);
  font-size: var(--text-lg);
  color: var(--gold);
  margin-bottom: var(--space-4);
`,Y=s.p`
  color: var(--grey-light);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
  line-height: 1.5;
`,c=s.label`
  display: block;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--grey-mid);
  margin-bottom: var(--space-1);
`,oe=s.code`
  display: block;
  padding: var(--space-2);
  background: #0a0a0a;
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  word-break: break-all;
`,U=s(oe)`
  color: var(--green);
  padding: var(--space-2) var(--space-2);
`,g=s(oe)`
  color: var(--grey-light);
`,$=s.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
`,De=s.div`
  position: relative;
  width: 100%;
  max-width: 1280px;
  aspect-ratio: 16/9;
  background: url('/scenes/snow.png') center/cover no-repeat, #000;
  border-radius: var(--radius-md);
  overflow: hidden;

  &:fullscreen {
    max-width: none;
    border-radius: 0;
    width: 100vw;
    height: 100vh;
  }
`,Ne=s.div`
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--gold-tint);
  border: 1px solid rgba(252, 219, 51, 0.3);
  border-radius: var(--radius-md);

  strong {
    color: var(--gold);
  }

  span {
    color: var(--grey-light);
  }
`,J=s.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: var(--gold);
  color: #000;
  font-family: var(--font-display);
  font-size: var(--text-base);
  font-weight: bold;
  border-radius: var(--radius-full);
  margin-right: var(--space-3);
  flex-shrink: 0;
`,_=s.div`
  display: flex;
  align-items: center;
  margin-bottom: var(--space-4);
`,Ge=s.button`
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--grey-light);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  cursor: pointer;
  z-index: 50;
  transition: all var(--transition);

  &:hover {
    background: rgba(0, 0, 0, 0.9);
    border-color: var(--gold);
    color: var(--gold);
  }
`,Le=s.button`
  padding: var(--space-1) var(--space-2);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  background: transparent;
  border: 1px solid var(--grey-mid);
  border-radius: var(--radius-md);
  color: var(--grey-mid);
  cursor: pointer;
  transition: all var(--transition);

  &:hover {
    border-color: var(--red);
    color: var(--red);
  }
`,A="overlay_recent_tags",ne="overlay_positions",M="overlay_settings",Pe=5,X={match:{top:4,left:50,scale:1},player:{bottom:18,left:2,scale:1},lastGame:{bottom:18,right:2,scale:1}},Je=()=>{const[T,H]=t.useState(()=>{try{return JSON.parse(localStorage.getItem(A)||"[]")[0]||""}catch{return""}}),[b,le]=t.useState(()=>{try{return JSON.parse(localStorage.getItem(A)||"[]")}catch{return[]}}),[y,Be]=t.useState(()=>{try{return JSON.parse(localStorage.getItem(M)||"{}").bgStyle||"bg-gradient-fade"}catch{return"bg-gradient-fade"}}),[x,ie]=t.useState(()=>{try{return JSON.parse(localStorage.getItem(M)||"{}").playerLayout||"default"}catch{return"default"}}),[f,ce]=t.useState(()=>{try{return JSON.parse(localStorage.getItem(M)||"{}").matchStyle||"default"}catch{return"default"}}),[de,K]=t.useState(!1),[n,k]=t.useState(()=>{try{const r=localStorage.getItem(ne);return r?JSON.parse(r):X}catch{return X}}),[l,W]=t.useState(null),[m,q]=t.useState(null),[me,ue]=t.useState(!1),u=t.useRef({x:0,y:0}),j=t.useRef({scale:1,x:0,y:0}),p=t.useRef(null),[S,E]=t.useState([]),[he,Q]=t.useState(!1),[ge,v]=t.useState(!1),C=t.useRef(null),R=t.useRef(null),pe=async r=>{if(!r||r.length<2){E([]);return}Q(!0);try{const a=await fetch(`https://website-backend.w3champions.com/api/players/global-search?search=${encodeURIComponent(r)}&pageSize=10`);if(a.ok){const o=await a.json();E(o||[])}}catch(a){console.error("Search error:",a)}finally{Q(!1)}},ve=r=>{H(r),v(!0),C.current&&clearTimeout(C.current),C.current=setTimeout(()=>{pe(r)},300)},V=r=>{H(r),Z(r),v(!1),E([])};t.useEffect(()=>{const r=a=>{R.current&&!R.current.contains(a.target)&&v(!1)};return document.addEventListener("mousedown",r),()=>document.removeEventListener("mousedown",r)},[]);const Z=r=>{if(!r||!r.includes("#"))return;const a=[r,...b.filter(o=>o!==r)].slice(0,Pe);le(a),localStorage.setItem(A,JSON.stringify(a)),K(!0),setTimeout(()=>K(!1),1500)},ye=r=>{r.key==="Enter"?(Z(T),v(!1),r.target.blur()):r.key==="Escape"&&v(!1)},O=(r,a)=>{if(a.preventDefault(),!p.current)return;const o=p.current.getBoundingClientRect(),h=(a.clientX-o.left)/o.width*100,d=(a.clientY-o.top)/o.height*100,i=n[r];r==="match"?u.current={x:h-i.left,y:d-i.top}:r==="player"?u.current={x:h-i.left,y:100-d-i.bottom}:r==="lastGame"&&(u.current={x:100-h-i.right,y:100-d-i.bottom}),W(r)},ee=r=>{if(!l||!p.current)return;const a=p.current.getBoundingClientRect(),o=(r.clientX-a.left)/a.width*100,h=(r.clientY-a.top)/a.height*100;k(d=>{const i={...d};return l==="match"?i.match={...d.match,top:Math.max(0,Math.min(h-u.current.y,95)),left:Math.max(0,Math.min(o-u.current.x,100))}:l==="player"?i.player={...d.player,bottom:Math.max(0,Math.min(100-h-u.current.y,95)),left:Math.max(0,Math.min(o-u.current.x,95))}:l==="lastGame"&&(i.lastGame={...d.lastGame,bottom:Math.max(0,Math.min(100-h-u.current.y,95)),right:Math.max(0,Math.min(100-o-u.current.x,95))}),i})},w=()=>{W(null),q(null)},D=(r,a)=>{a.preventDefault(),a.stopPropagation(),j.current={scale:n[r].scale,x:a.clientX,y:a.clientY},q(r)},re=r=>{if(!m)return;const a=r.clientX-j.current.x,o=r.clientY-j.current.y,h=Math.sqrt(a*a+o*o),d=a+o>0?1:-1,i=j.current.scale+d*h*.005;k(te=>({...te,[m]:{...te[m],scale:Math.max(.4,Math.min(i,2))}}))};t.useEffect(()=>{if(l)return window.addEventListener("mousemove",ee),window.addEventListener("mouseup",w),()=>{window.removeEventListener("mousemove",ee),window.removeEventListener("mouseup",w)};if(m)return window.addEventListener("mousemove",re),window.addEventListener("mouseup",w),()=>{window.removeEventListener("mousemove",re),window.removeEventListener("mouseup",w)}},[l,m]);const ae=()=>{p.current&&(document.fullscreenElement?document.exitFullscreen():p.current.requestFullscreen().catch(r=>{console.error("Fullscreen error:",r)}))};t.useEffect(()=>{const r=()=>{ue(!!document.fullscreenElement)};return document.addEventListener("fullscreenchange",r),()=>document.removeEventListener("fullscreenchange",r)},[]),t.useEffect(()=>{localStorage.setItem(ne,JSON.stringify(n))},[n]),t.useEffect(()=>{localStorage.setItem(M,JSON.stringify({bgStyle:y,playerLayout:x,matchStyle:f}))},[y,x,f]);const xe=()=>{k(X)},fe=[{value:"default",label:"Default (vertical)"},{value:"horizontal",label:"Horizontal (bar)"},{value:"minimal",label:"Minimal"},{value:"compact",label:"Compact (2-line)"},{value:"session",label:"Session Only"},{value:"banner",label:"Banner (WC3)"}],be=[{value:"default",label:"Default",group:"Simple"},{value:"clean-gold",label:"Dark + Gold Border",group:"Simple"},{value:"frame",label:"Gold Frame (Double)",group:"Simple"},{value:"team-split",label:"Team Colors (Blue/Red)",group:"Gradient"},{value:"frost",label:"Frosted Glass",group:"Gradient"},{value:"wc3",label:"WC3 Dark Blue",group:"Themed"},{value:"banner",label:"Banner Shape",group:"Themed"}],je={teams:[{players:[{battleTag:"Player1#123",name:"Player1",race:1,currentMmr:1850},{battleTag:"Player2#123",name:"Player2",race:2,currentMmr:1720},{battleTag:"Player3#123",name:"Player3",race:4,currentMmr:1680},{battleTag:"Player4#123",name:"Player4",race:8,currentMmr:1590}]},{players:[{battleTag:"Enemy1#123",name:"Enemy1",race:1,currentMmr:1780},{battleTag:"Enemy2#123",name:"Enemy2",race:2,currentMmr:1750},{battleTag:"Enemy3#123",name:"Enemy3",race:4,currentMmr:1700},{battleTag:"Enemy4#123",name:"Enemy4",race:8,currentMmr:1620}]}]},Se={name:"YourName",profilePic:null,country:"us",mmr:1850,allTimeLow:1420,allTimePeak:1920,wins:45,losses:38,sessionChange:24,form:[!0,!0,!1,!0,!0,!1,!0,!0],rank:52},we={mapName:"(4)Ferocity",durationInSeconds:892,endTime:new Date(Date.now()-3e5).toISOString(),id:"mock-match-123",teams:[{players:[{battleTag:"YourName#123",name:"YourName",race:1,oldMmr:1838,currentMmr:1850,won:!0},{battleTag:"Teammate1#123",name:"Teammate1",race:2,oldMmr:1700,currentMmr:1712,won:!0},{battleTag:"Teammate2#123",name:"Teammate2",race:4,oldMmr:1650,currentMmr:1662,won:!0},{battleTag:"Teammate3#123",name:"Teammate3",race:8,oldMmr:1580,currentMmr:1592,won:!0}]},{players:[{battleTag:"Enemy1#123",name:"Enemy1",race:1,oldMmr:1760,currentMmr:1748,won:!1},{battleTag:"Enemy2#123",name:"Enemy2",race:2,oldMmr:1730,currentMmr:1718,won:!1},{battleTag:"Enemy3#123",name:"Enemy3",race:4,oldMmr:1680,currentMmr:1668,won:!1},{battleTag:"Enemy4#123",name:"Enemy4",race:8,oldMmr:1600,currentMmr:1588,won:!1}]}]},N=window.location.origin,G=encodeURIComponent(T||"YourTag#1234");return e.jsxs(Ee,{children:[e.jsx(Ce,{children:"Stream Overlays"}),e.jsx(L,{children:"Add real-time 4v4 stats to your stream in 3 easy steps"}),e.jsxs(P,{children:[e.jsxs(_,{children:[e.jsx(J,{children:"1"}),e.jsx(B,{style:{margin:0},children:"Find Your Account"})]}),e.jsxs(Re,{children:[e.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"var(--space-2)",marginBottom:"var(--space-2)"},children:[e.jsx(F,{style:{marginBottom:0},children:"Battle Tag"}),he&&e.jsx("span",{className:"search-status searching",children:"searching..."}),de&&e.jsx("span",{className:"search-status saved",children:"Saved"})]}),e.jsxs("div",{ref:R,className:"search-container",children:[e.jsx("input",{type:"text",value:T,onChange:r=>ve(r.target.value),onFocus:()=>v(!0),onKeyDown:ye,placeholder:"Search for a player...",className:"search-input"}),ge&&(S.length>0||b.length>0)&&e.jsxs("div",{className:"search-dropdown",children:[b.length>0&&S.length===0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"search-dropdown-header",children:"Recent"}),b.map(r=>e.jsxs("div",{onClick:()=>V(r),className:"search-dropdown-item",children:[e.jsx("span",{className:"search-player-name",children:r.split("#")[0]}),e.jsxs("span",{className:"search-player-tag",children:["#",r.split("#")[1]]})]},r))]}),S.length>0&&e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"search-dropdown-header",children:"Search Results"}),S.map((r,a)=>{var o;return e.jsxs("div",{onClick:()=>V(r.battleTag),className:"search-dropdown-item",children:[e.jsx("span",{className:"search-player-name",children:r.name}),e.jsxs("span",{className:"search-player-tag",children:["#",(o=r.battleTag)==null?void 0:o.split("#")[1]]})]},r.battleTag||a)})]})]})]}),e.jsx("p",{className:"search-hint",children:"Type to search • Click to select • Press Enter to save"})]})]}),e.jsxs(P,{children:[e.jsxs(_,{children:[e.jsx(J,{children:"2"}),e.jsx(B,{style:{margin:0},children:"Copy Your Overlay URLs"})]}),e.jsx(L,{style:{marginBottom:"var(--space-4)",marginLeft:"40px"},children:"Add these as Browser Sources in OBS/Streamlabs. Use the Custom CSS to make backgrounds transparent."}),e.jsxs(Oe,{children:[e.jsxs(z,{children:[e.jsx(I,{children:"Match Overlay"}),e.jsx(Y,{children:"Shows both teams when you're in a game. Appears automatically, hides when not in game."}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx(c,{children:"URL"}),e.jsxs(U,{children:[N,"/overlay/match/",G,"?style=",f]})]}),e.jsxs($,{children:[e.jsxs("div",{children:[e.jsx(c,{children:"Width"}),e.jsx(g,{children:"1200"})]}),e.jsxs("div",{children:[e.jsx(c,{children:"Height"}),e.jsx(g,{children:"200"})]})]}),e.jsxs("div",{children:[e.jsx(c,{children:"Custom CSS"}),e.jsxs(g,{children:["body ","{"," background: transparent !important; ","}"]})]})]}),e.jsxs(z,{children:[e.jsx(I,{children:"Player Overlay"}),e.jsx(Y,{children:"Shows your stats, MMR, record, and session progress. Always visible."}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx(c,{children:"URL"}),e.jsxs(U,{children:[N,"/overlay/player/",G,"?bg=",y,"&layout=",x]})]}),e.jsxs($,{children:[e.jsxs("div",{children:[e.jsx(c,{children:"Width"}),e.jsx(g,{children:"280"})]}),e.jsxs("div",{children:[e.jsx(c,{children:"Height"}),e.jsx(g,{children:"320"})]})]}),e.jsxs("div",{children:[e.jsx(c,{children:"Custom CSS"}),e.jsxs(g,{children:["body ","{"," background: transparent !important; ","}"]})]})]}),e.jsxs(z,{children:[e.jsx(I,{children:"Last Game Overlay"}),e.jsx(Y,{children:"Shows your most recent game result with map, players, and MMR change."}),e.jsxs("div",{style:{marginBottom:"var(--space-4)"},children:[e.jsx(c,{children:"URL"}),e.jsxs(U,{children:[N,"/overlay/lastgame/",G,"?bg=",y]})]}),e.jsxs($,{children:[e.jsxs("div",{children:[e.jsx(c,{children:"Width"}),e.jsx(g,{children:"280"})]}),e.jsxs("div",{children:[e.jsx(c,{children:"Height"}),e.jsx(g,{children:"320"})]})]}),e.jsxs("div",{children:[e.jsx(c,{children:"Custom CSS"}),e.jsxs(g,{children:["body ","{"," background: transparent !important; ","}"]})]})]})]})]}),e.jsxs(P,{children:[e.jsxs(_,{children:[e.jsx(J,{children:"3"}),e.jsx(B,{style:{margin:0},children:"Position Your Overlays"})]}),e.jsx(L,{style:{marginBottom:"var(--space-4)",marginLeft:"40px"},children:"Drag overlays to position them. Use the corner handles to resize. Double-click for fullscreen preview."}),e.jsxs("div",{style:{display:"flex",gap:"var(--space-4)",marginLeft:"40px",marginBottom:"var(--space-4)",alignItems:"flex-end"},children:[e.jsxs("div",{style:{flex:"0 0 200px"},children:[e.jsx(F,{children:"Match Style"}),e.jsx(se,{value:f,onChange:r=>ce(r.target.value),children:be.map(r=>e.jsx("option",{value:r.value,children:r.label},r.value))})]}),e.jsxs("div",{style:{flex:"0 0 180px"},children:[e.jsx(F,{children:"Player Layout"}),e.jsx(se,{value:x,onChange:r=>ie(r.target.value),children:fe.map(r=>e.jsx("option",{value:r.value,children:r.label},r.value))})]}),e.jsx(Le,{onClick:xe,children:"Reset Positions"})]}),e.jsxs(De,{ref:p,onDoubleClick:ae,style:{cursor:l||m?"grabbing":"default"},children:[e.jsx(Ge,{onClick:ae,children:me?"Exit Fullscreen (ESC)":"Fullscreen"}),e.jsx("div",{onMouseDown:r=>O("match",r),style:{position:"absolute",top:`${n.match.top}%`,left:`${n.match.left}%`,transform:`translateX(-50%) scale(${n.match.scale})`,transformOrigin:"top center",cursor:l==="match"?"grabbing":"grab"},children:e.jsxs("div",{style:{position:"relative",border:"2px solid transparent",borderColor:l==="match"||m==="match"?"var(--gold)":"transparent",borderRadius:"var(--radius-md)"},children:[e.jsx(Me,{matchData:je,atGroups:{},sessionData:{},streamerTag:"Player1#123",matchStyle:f}),e.jsx("div",{onMouseDown:r=>D("match",r),style:{position:"absolute",bottom:-6,right:-6,width:12,height:12,background:"var(--gold)",borderRadius:2,cursor:"nwse-resize",opacity:.8}})]})}),e.jsx("div",{onMouseDown:r=>O("player",r),style:{position:"absolute",bottom:`${n.player.bottom}%`,left:`${n.player.left}%`,transform:`scale(${n.player.scale})`,transformOrigin:"bottom left",cursor:l==="player"?"grabbing":"grab"},children:e.jsxs("div",{style:{position:"relative",border:"2px solid transparent",borderColor:l==="player"||m==="player"?"var(--gold)":"transparent",borderRadius:"var(--radius-md)"},children:[e.jsx(Te,{playerData:Se,layout:x,bgStyle:y}),e.jsx("div",{onMouseDown:r=>D("player",r),style:{position:"absolute",top:-6,right:-6,width:12,height:12,background:"var(--gold)",borderRadius:2,cursor:"nwse-resize",opacity:.8}})]})}),e.jsx("div",{onMouseDown:r=>O("lastGame",r),style:{position:"absolute",bottom:`${n.lastGame.bottom}%`,right:`${n.lastGame.right}%`,transform:`scale(${n.lastGame.scale})`,transformOrigin:"bottom right",cursor:l==="lastGame"?"grabbing":"grab"},children:e.jsxs("div",{style:{position:"relative",border:"2px solid transparent",borderColor:l==="lastGame"||m==="lastGame"?"var(--gold)":"transparent",borderRadius:"var(--radius-md)"},children:[e.jsx(ke,{game:we,playerBattleTag:"YourName#123",overlay:!0,layout:"vertical",size:"expanded"}),e.jsx("div",{onMouseDown:r=>D("lastGame",r),style:{position:"absolute",top:-6,left:-6,width:12,height:12,background:"var(--gold)",borderRadius:2,cursor:"nwse-resize",opacity:.8}})]})})]}),e.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(3, 1fr)",gap:"var(--space-4)",marginTop:"var(--space-4)",fontFamily:"var(--font-mono)",fontSize:"var(--text-xs)"},children:[e.jsxs("div",{style:{background:"var(--grey-dark)",padding:"var(--space-2)",borderRadius:"var(--radius-sm)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",marginBottom:"4px"},children:"Match Overlay"}),e.jsxs("div",{style:{color:"var(--gold)"},children:["top: ",n.match.top.toFixed(0),"% | center"]}),e.jsxs("div",{style:{color:"var(--grey-light)"},children:["scale: ",(n.match.scale*100).toFixed(0),"%"]})]}),e.jsxs("div",{style:{background:"var(--grey-dark)",padding:"var(--space-2)",borderRadius:"var(--radius-sm)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",marginBottom:"4px"},children:"Player Overlay"}),e.jsxs("div",{style:{color:"var(--gold)"},children:["bottom: ",n.player.bottom.toFixed(0),"% | left: ",n.player.left.toFixed(0),"%"]}),e.jsxs("div",{style:{color:"var(--grey-light)"},children:["scale: ",(n.player.scale*100).toFixed(0),"%"]})]}),e.jsxs("div",{style:{background:"var(--grey-dark)",padding:"var(--space-2)",borderRadius:"var(--radius-sm)"},children:[e.jsx("div",{style:{color:"var(--grey-light)",marginBottom:"4px"},children:"Last Game Overlay"}),e.jsxs("div",{style:{color:"var(--gold)"},children:["bottom: ",n.lastGame.bottom.toFixed(0),"% | right: ",n.lastGame.right.toFixed(0),"%"]}),e.jsxs("div",{style:{color:"var(--grey-light)"},children:["scale: ",(n.lastGame.scale*100).toFixed(0),"%"]})]})]}),e.jsxs(Ne,{style:{marginTop:"var(--space-4)"},children:[e.jsx("strong",{children:"Tip:"}),e.jsx("span",{children:" The Match Overlay auto-hides when you're not in a game, so you can leave it always enabled!"})]})]})]})};export{Je as default};
