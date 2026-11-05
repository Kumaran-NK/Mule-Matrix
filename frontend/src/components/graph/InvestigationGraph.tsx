import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { AccountNode } from './AccountNode';
import { NodeDetailsDrawer } from './NodeDetailsDrawer';
import { GraphNodeData, GraphEdgeData } from '../../types';
import { inr } from '../ui';

interface InvestigationGraphProps {
  nodesData: GraphNodeData[];
  edgesData: GraphEdgeData[];
  onRequestIdentity: (pseudoId: string) => void;
}

// Must live outside the component so React Flow does not re-register it.
const nodeTypes = { accountNode: AccountNode };

function buildFlowData(nodesData: GraphNodeData[], edgesData: GraphEdgeData[]) {
  if (!nodesData || nodesData.length === 0) {
    return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };
  }

  const seedNodes = nodesData.filter((n) => n.is_seed);
  const endpoints = nodesData.filter((n) => n.is_endpoint && !n.is_seed);
  const intermediaries = nodesData.filter((n) => !n.is_seed && !n.is_endpoint);

  const positions: Record<string, { x: number; y: number }> = {};

  seedNodes.forEach((n, idx) => (positions[n.id] = { x: 40, y: 220 + idx * 220 }));

  const primaryMules = intermediaries.filter((n) => n.pseudo_id.includes('MULE-01'));
  primaryMules.forEach((n, idx) => (positions[n.id] = { x: 400, y: 220 + idx * 220 }));

  const secondary = intermediaries.filter((n) => !n.pseudo_id.includes('MULE-01'));
  secondary.forEach((n, idx) => (positions[n.id] = { x: 760, y: 80 + idx * 230 }));

  endpoints.forEach((n, idx) => (positions[n.id] = { x: 1120, y: 20 + idx * 210 }));

  let fallbackIdx = 0;
  nodesData.forEach((n) => {
    if (!positions[n.id]) {
      positions[n.id] = { x: 550 + (fallbackIdx % 3) * 260, y: 420 + Math.floor(fallbackIdx / 3) * 220 };
      fallbackIdx++;
    }
  });

  const flowNodes: Node[] = nodesData.map((node) => ({
    id: node.id,
    type: 'accountNode',
    position: positions[node.id] || { x: 300, y: 300 },
    data: { ...node },
  }));

  const flowEdges: Edge[] = edgesData.map((edge) => {
    const color = edge.is_reversal ? '#FF6A13' : '#000000';
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: !edge.is_reversal,
      style: {
        stroke: color,
        strokeWidth: Math.max(2, Math.min(6, (edge.amount / 20000) * 3)),
        strokeDasharray: edge.is_reversal ? '6 5' : undefined,
      },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      label: inr(edge.attributed_amount, 0),
      labelStyle: { fill: '#000', fontWeight: 700, fontSize: 14, fontFamily: '"Instrument Sans", sans-serif' },
      labelBgStyle: { fill: '#fff', stroke: '#000', strokeWidth: 1 },
      labelBgPadding: [8, 4] as [number, number],
      labelBgBorderRadius: 6,
      data: { ...edge },
    };
  });

  return { flowNodes, flowEdges };
}

export const InvestigationGraph: React.FC<InvestigationGraphProps> = ({ nodesData, edgesData, onRequestIdentity }) => {
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeData | null>(null);

  const { flowNodes, flowEdges } = useMemo(() => buildFlowData(nodesData, edgesData), [nodesData, edgesData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  useEffect(() => {
    if (flowNodes.length > 0) {
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.data as unknown as GraphNodeData);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.data as unknown as GraphEdgeData);
    setSelectedNode(null);
  }, []);

  if (nodesData.length === 0) {
    return (
      <div className="w-full h-[640px] bg-white border border-line rounded-xl flex items-center justify-center text-center">
        <div>
          <p className="text-lg font-semibold">No graph yet</p>
          <p className="text-mute mt-1">Run a provenance trace to map where the funds went.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[640px] bg-white border border-line rounded-xl overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} color="#C9C9C5" gap={22} size={1.6} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          nodeStrokeColor="#000"
          nodeColor={(n: any) => {
            if (n.data?.is_seed) return '#000000';
            if (n.data?.assessment_category === 'LIKELY_MULE') return '#FF6A13';
            return '#D4D4D0';
          }}
          maskColor="rgba(0,0,0,0.06)"
        />
      </ReactFlow>

      <NodeDetailsDrawer
        node={selectedNode}
        edge={selectedEdge}
        onClose={() => {
          setSelectedNode(null);
          setSelectedEdge(null);
        }}
        onRequestIdentity={onRequestIdentity}
      />
    </div>
  );
};