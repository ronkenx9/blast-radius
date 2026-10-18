"use client";
import type {GNode,GLink,Highlight} from './GraphView';
// A stable layered overview keeps every affected branch legible at once;
// evidence and maintainer exploration still use the 3D graph.
export default function IncidentMap({nodes,links,hl,onNode}:{nodes:GNode[];links:GLink[];hl:Highlight;onNode?:(n:GNode)=>void}) {
 const id=(v:any)=>typeof v==='object'?v.id:v;
 const affected=new Set(links.filter(l=>l.type==='AFFECTS' && hl.links.has(`${id(l.source)}>${id(l.target)}`)).map(l=>id(l.target)));
 const active=nodes.filter(n=>hl.nodes.has(n.id));
 const layers=[
  {title:'ADVISORY',items:active.filter(n=>n.label==='Advisory')},
  {title:'AFFECTED PACKAGES',items:active.filter(n=>n.label==='Version' && affected.has(n.id))},
  {title:'DEPENDENCY CHAIN',items:active.filter(n=>n.label==='Version' && !affected.has(n.id))},
  {title:'EXPOSED SERVICES',items:active.filter(n=>n.label==='Service')},
  {title:'OWNING TEAMS',items:active.filter(n=>n.label==='Team')},
  {title:'ON CALL',items:active.filter(n=>n.label==='Person')},
 ].filter(l=>l.items.length);
 const width=600,height=650,positions=new Map<string,{x:number;y:number}>();
 layers.forEach((l,row)=>l.items.forEach((n,col)=>positions.set(n.id,{x:(col+.5)*width/l.items.length,y:66+row*100})));
 return <div className="incident-map absolute inset-0 overflow-auto bg-[#10151d] px-2 py-3" aria-label="All affected dependency layers">
  <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${active.filter(n=>n.label==='Service').length} affected services and all connected dependency, owner and on-call layers`} className="incident-map-diagram h-full w-full">
   <defs><filter id="incident-glow"><feGaussianBlur stdDeviation="3"/></filter></defs>
   {links.filter(l=>hl.links.has(`${id(l.source)}>${id(l.target)}`)).map((l,i)=>{
    const a=positions.get(id(l.source)),b=positions.get(id(l.target));if(!a||!b)return null;
    const color=l.type==='ON_CALL'||l.type==='OWNS'?'#eabf63':'#f96a4e';
    return <g key={i}><path d={`M${a.x},${a.y} C${a.x},${(a.y+b.y)/2} ${b.x},${(a.y+b.y)/2} ${b.x},${b.y}`} fill="none" stroke={color} strokeOpacity=".18" strokeWidth="7" filter="url(#incident-glow)"/><path d={`M${a.x},${a.y} C${a.x},${(a.y+b.y)/2} ${b.x},${(a.y+b.y)/2} ${b.x},${b.y}`} fill="none" stroke={color} strokeOpacity=".65" strokeWidth="1.6"/></g>;
   })}
   {layers.map((l,row)=><g key={l.title}><text x="8" y={24+row*100} fill="#a6afbd" fontSize="11" letterSpacing="1">{l.title}</text>{l.items.map(n=>{
     const p=positions.get(n.id)!,w=Math.min(180,width/l.items.length-10),owner=n.label==='Person'||n.label==='Team';
     return <g key={n.id} role="button" tabIndex={0} aria-label={`${n.label}: ${n.name}`} onClick={()=>onNode?.(n)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onNode?.(n);}}} style={{cursor:'pointer'}}>
      <title>{n.label}: {n.name}</title><rect x={p.x-w/2} y={p.y-17} width={w} height="34" rx="9" fill={owner?'#232016':'#281710'} stroke={owner?'#eabf63':'#ff704f'} strokeWidth={n.label==='Service'?2:1}/>
      <text x={p.x} y={p.y+4} textAnchor="middle" fill="#f7ede6" fontFamily="ui-monospace, monospace" fontSize="12" textLength={n.name.length*7>w-12?w-12:undefined} lengthAdjust="spacingAndGlyphs">{n.name}</text>
     </g>;
   })}</g>)}
  </svg>
 </div>;
}
