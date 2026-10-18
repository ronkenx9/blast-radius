"use client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import ForceGraph3D from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import IncidentMap from "./IncidentMap";
import { COLORS } from "./colors";

export type GNode = { id: string; label: string; name: string; tier?: number; severity?: string; vulnerable?: boolean; direct?: boolean; mc?: number; title?: string; x?: number; y?: number; z?: number };
export type GLink = { source: any; target: any; type: string };
export type Highlight = { nodes: Set<string>; links: Set<string>; focus?: string | null; mode?: "path" | "risk" | "context" | "incident" };
export type GraphHandle = { flyPath: (path: string[]) => Promise<void>; focusNode: (id: string) => void; fit: (ids?: string[]) => void };

const SIZE: Record<string, number> = { Service: 9, Team: 7, Company: 10, Person: 3, Advisory: 2.2, Incident: 4, Decision: 4, Version: 1.4, Package: 0.9, Maintainer: 1.2 };
const escapeLabel = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));
const lid = (l: GLink) => `${typeof l.source === "object" ? l.source.id : l.source}>${typeof l.target === "object" ? l.target.id : l.target}`;

const GraphView = forwardRef<GraphHandle, { data: { nodes: GNode[]; links: GLink[] }; hl: Highlight; onNode?: (n: GNode) => void }>(
  function GraphView({ data, hl, onNode }, ref) {
    const fg = useRef<any>(null);
    const wrap = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState({ w: 800, h: 600 });
    const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data]);
    const active = hl.nodes.size > 0;
    const pendingFit = useRef<string[] | null>(null);
    const fitVisibleGraph = useCallback(() => {
      const el = wrap.current, ids = pendingFit.current;
      if (!el || el.clientWidth === 0 || el.clientHeight === 0 || ids === null || !fg.current) return;
      const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 650;
      fg.current.zoomToFit(duration, 25, ids.length ? (node: GNode) => ids.includes(node.id) : undefined);
      pendingFit.current = null;
    }, []);

    useEffect(() => {
      const el = wrap.current; if (!el) return;
      const ro = new ResizeObserver(() => {
        // Mobile tabs hide this canvas. Keep a valid camera viewport while hidden.
        const w = el.clientWidth, h = el.clientHeight;
        if (w > 0 && h > 0) setSize({ w, h });
      });
      ro.observe(el); return () => ro.disconnect();
    }, []);

    useEffect(() => {
      const frame = requestAnimationFrame(fitVisibleGraph);
      return () => cancelAnimationFrame(frame);
    }, [size, fitVisibleGraph]);

    useEffect(() => {
      const g = fg.current; if (!g) return;
      g.d3Force("charge")?.strength(-38);
      g.d3Force("link")?.distance((l: GLink) => (l.type === "DEPENDS_ON" ? 18 : l.type === "MAINTAINS" ? 22 : 34));
      const ctrl = g.controls(); if (ctrl) { ctrl.autoRotate = false; }
    }, [size, active]);

    const camTo = (n: GNode, dist = 90, ms = 650) => {
      const g = fg.current; if (!g || n.x == null) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) ms = 0;
      const r = Math.hypot(n.x!, n.y!, n.z!) || 1;
      const k = 1 + dist / r;
      g.cameraPosition({ x: n.x! * k, y: n.y! * k + 12, z: n.z! * k }, { x: n.x, y: n.y, z: n.z }, ms);
    };

    useImperativeHandle(ref, () => ({
      flyPath: async (path) => {
        for (const id of path) { const n = byId.get(id); if (n) { camTo(n, 150, 550); await new Promise((r) => setTimeout(r, 650)); } }
      },
      focusNode: (id) => { const n = byId.get(id); if (n) camTo(n, 110); },
      fit: (ids) => {
        pendingFit.current = ids || [];
        // Let the selected tab become visible and its measured size reach the renderer.
        requestAnimationFrame(() => requestAnimationFrame(fitVisibleGraph));
      },
    }), [byId, fitVisibleGraph]);

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
          backgroundColor="#10151d"
          showNavInfo={false}
          warmupTicks={120}
          cooldownTicks={200}
          nodeRelSize={3}
          nodeOpacity={0.95}
          nodeResolution={12}
          nodeVal={(n: any) => (SIZE[n.label] || 1) * (hl.nodes.has(n.id) ? 1.5 : 1) * (n.label === "Service" && n.tier === 1 ? 1.4 : 1)}
          nodeColor={nodeColor as any}
          nodeLabel={(n: any) => `<div style="font:12px ui-monospace;padding:4px 8px;background:#0b0d12;border:1px solid #222;border-radius:6px"><b style="color:${COLORS[n.label]}">${escapeLabel(n.label)}</b> ${escapeLabel(n.title || n.name)}</div>`}
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
