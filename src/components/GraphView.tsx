"use client";
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import * as THREE from "three";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import IncidentMap from "./IncidentMap";
import { COLORS } from "./colors";

export type GNode = { id: string; label: string; name: string; tier?: number; severity?: string; vulnerable?: boolean; direct?: boolean; mc?: number; title?: string; x?: number; y?: number; z?: number };
export type GLink = { source: any; target: any; type: string };
export type Highlight = { nodes: Set<string>; links: Set<string>; focus?: string | null; mode?: "path" | "risk" | "context" | "incident" };
export type GraphHandle = { flyPath: (path: string[]) => Promise<void>; focusNode: (id: string) => void; fit: (ids?: string[]) => void };

const SIZE: Record<string, number> = { Service: 9, Team: 7, Company: 10, Person: 3, Advisory: 2.2, Incident: 4, Decision: 4, Version: 1.4, Package: 0.9, Maintainer: 1.2 };
const lid = (l: GLink) => `${typeof l.source === "object" ? l.source.id : l.source}>${typeof l.target === "object" ? l.target.id : l.target}`;

const GraphView = forwardRef<GraphHandle, { data: { nodes: GNode[]; links: GLink[] }; hl: Highlight; onNode?: (n: GNode) => void }>(
  function GraphView({ data, hl, onNode }, ref) {
    const fg = useRef<any>(null);
    const wrap = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data]);
    const active = hl.nodes.size > 0;

    useEffect(() => {
      const el = wrap.current; if (!el) return;
      const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
      ro.observe(el); return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const g = fg.current; if (!g) return;
      if (!(g as any).__bloom) {
        const bloom = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), 0.55, 0.4, 0.35);
        g.postProcessingComposer().addPass(bloom); (g as any).__bloom = true;
      }
      g.d3Force("charge")?.strength(-38);
      g.d3Force("link")?.distance((l: GLink) => (l.type === "DEPENDS_ON" ? 18 : l.type === "MAINTAINS" ? 22 : 34));
      const ctrl = g.controls(); if (ctrl) { ctrl.autoRotate = !active; ctrl.autoRotateSpeed = 0.35; }
    }, [size, active]);

    const camTo = (n: GNode, dist = 90, ms = 1100) => {
      const g = fg.current; if (!g || n.x == null) return;
      const r = Math.hypot(n.x!, n.y!, n.z!) || 1;
      const k = 1 + dist / r;
      g.cameraPosition({ x: n.x! * k, y: n.y! * k + 12, z: n.z! * k }, { x: n.x, y: n.y, z: n.z }, ms);
    };

    useImperativeHandle(ref, () => ({
      flyPath: async (path) => {
        for (const id of path) { const n = byId.get(id); if (n) { camTo(n, 150, 1000); await new Promise((r) => setTimeout(r, 1150)); } }
      },
      focusNode: (id) => { const n = byId.get(id); if (n) camTo(n, 110); },
      fit: (ids) => fg.current?.zoomToFit(900, 25, ids?.length ? (n: GNode) => ids.includes(n.id) : undefined),
    }), [byId]);

    const nodeColor = (n: GNode) => {
      if (active && !hl.nodes.has(n.id)) return "rgba(90,100,130,0.12)";
      if (hl.mode === "incident" && hl.nodes.has(n.id)) return n.label === "Person" || n.label === "Team" ? "#ffd166" : "#ff4d2e";
      if (n.label === "Version" && n.vulnerable) return "#ff7a45";
      if (n.label === "Package" && n.mc === 1 && hl.mode === "risk") return "#ff4d2e";
      return COLORS[n.label] || "#888";
    };

    return (
      <div ref={wrap} className="absolute inset-0">
        <ForceGraph3D
          ref={fg}
          width={size.w}
          height={size.h}
          graphData={data as any}
          backgroundColor="#06070a"
          showNavInfo={false}
          warmupTicks={120}
          cooldownTicks={200}
          nodeRelSize={3}
          nodeOpacity={0.95}
          nodeResolution={12}
          nodeVal={(n: any) => (SIZE[n.label] || 1) * (hl.nodes.has(n.id) ? 1.5 : 1) * (n.label === "Service" && n.tier === 1 ? 1.4 : 1)}
          nodeColor={nodeColor as any}
          nodeLabel={(n: any) => `<div style="font:12px ui-monospace;padding:4px 8px;background:#0b0d12;border:1px solid #222;border-radius:6px"><b style="color:${COLORS[n.label]}">${n.label}</b> ${n.title || n.name}</div>`}
          nodeThreeObjectExtend
          nodeThreeObject={(n: any) => {
            const show = (!active && (n.label === "Service" || n.label === "Team")) || (active && hl.nodes.has(n.id) && n.label !== "Package");
            if (!show) return undefined as any;
            const s = new SpriteText(n.label === "Version" ? n.name : n.title || n.name);
            s.fontFace = "ui-monospace, Menlo, monospace";
            s.textHeight = n.label === "Service" ? (active ? 12 : 9) : active ? 9 : 6;
            s.color = active && !hl.nodes.has(n.id) ? "rgba(160,170,190,0.25)" : n.label === "Version" && n.vulnerable ? "#ffb59a" : "#e8eaf0";
            s.backgroundColor = "rgba(6,7,10,0.7)"; s.padding = 1.5; s.borderRadius = 2; (s.material as any).depthWrite = false; (s.material as any).toneMapped = false;
            (s as any).position.y = -(SIZE[n.label] || 2) * 2.4 - 3;
            return s;
          }}
          linkColor={(l: any) => (hl.links.has(lid(l)) ? ((hl.mode === "risk" || hl.mode === "incident") ? "#ff4d2e" : "#3ad6ff") : active ? "rgba(80,90,120,0.06)" : l.type === "AFFECTS" ? "rgba(255,77,46,0.35)" : "rgba(120,140,190,0.16)")}
          linkWidth={(l: any) => (hl.links.has(lid(l)) ? 1.8 : 0)}
          linkOpacity={0.6}
          linkDirectionalParticles={(l: any) => (hl.links.has(lid(l)) ? 4 : 0)}
          linkDirectionalParticleWidth={2.4}
          linkDirectionalParticleSpeed={0.012}
          linkDirectionalParticleColor={() => ((hl.mode === "risk" || hl.mode === "incident") ? "#ff4d2e" : "#9cf0ff")}
          onNodeClick={(n: any) => { onNode?.(n); camTo(n, 110); }}
          enableNodeDrag={false}
        />
        {hl.mode === "incident" && <IncidentMap nodes={data.nodes} links={data.links} hl={hl} onNode={onNode} />}
      </div>
    );
  }
);
export default GraphView;
export { lid, COLORS };
