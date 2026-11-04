import React, { useMemo, useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
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

interface InvestigationGraphProps {
  nodesData: GraphNodeData[];
  edgesData: GraphEdgeData[];
  onRequestIdentity: (pseudoId: string) => void;
}

// IMPORTANT: nodeTypes must be defined outside the component to avoid re-registration
const nodeTypes = {
  accountNode: AccountNode,
};

function buildFlowData(nodesData: GraphNodeData[], edgesData: GraphEdgeData[]) {
  if (!nodesData || nodesData.length === 0) {
    return { flowNodes: [] as Node[], flowEdges: [] as Edge[] };
  }

  // Group nodes by type for hierarchical left-to-right layout
  const seedNodes = nodesData.filter((n) => n.is_seed);
  const endpoints = nodesData.filter((n) => n.is_endpoint && !n.is_seed);
  const intermediaries = nodesData.filter((n) => !n.is_seed && !n.is_endpoint);

  const positions: Record<string, { x: number; y: number }> = {};

  // Seed accounts on far left (column 0)
  seedNodes.forEach((n, idx) => {
    positions[n.id] = { x: 50, y: 200 + idx * 200 };
  });

  // Primary mules (column 1)
  const primaryMules = intermediaries.filter((n) => n.pseudo_id.includes('MULE-01'));
  primaryMules.forEach((n, idx) => {
    positions[n.id] = { x: 400, y: 200 + idx * 200 };
  });

  // Secondary intermediaries (column 2)
  const secondary = intermediaries.filter((n) => !n.pseudo_id.includes('MULE-01'));
  secondary.forEach((n, idx) => {
    positions[n.id] = { x: 750, y: 100 + idx * 200 };
  });

  // Terminal endpoints on far right (column 3)
  endpoints.forEach((n, idx) => {
    positions[n.id] = { x: 1100, y: 50 + idx * 180 };
  });

  // Fallback for any unpositioned nodes
  let fallbackIdx = 0;
  nodesData.forEach((n) => {
    if (!positions[n.id]) {
      positions[n.id] = { x: 550 + (fallbackIdx % 3) * 200, y: 400 + Math.floor(fallbackIdx / 3) * 200 };
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
    const isReversal = edge.is_reversal;
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      animated: true,
      style: {
        stroke: isReversal ? '#f59e0b' : '#3b82f6',
        strokeWidth: Math.max(2, Math.min(6, (edge.amount / 20000) * 3)),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: isReversal ? '#f59e0b' : '#3b82f6',
      },
      label: `₹${Number(edge.attributed_amount).toLocaleString('en-IN')}`,
      labelStyle: {
        fill: '#f1f5f9',
        fontWeight: 600,
        fontSize: 11,
        fontFamily: 'monospace',
      },
      labelBgStyle: {
        fill: '#0f172a',
        fillOpacity: 0.85,
      },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      data: { ...edge },
    };
  });

  return { flowNodes, flowEdges };
}

export const InvestigationGraph: React.FC<InvestigationGraphProps> = ({
  nodesData,
  edgesData,
  onRequestIdentity,
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<GraphEdgeData | null>(null);

  const { flowNodes, flowEdges } = useMemo(
    () => buildFlowData(nodesData, edgesData),
    [nodesData, edgesData]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync nodes/edges when source data changes
  useEffect(() => {
    if (flowNodes.length > 0) {
      setNodes(flowNodes);
      setEdges(flowEdges);
    }
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.data as unknown as GraphNodeData);
      setSelectedEdge(null);
    },
    []
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSelectedEdge(edge.data as unknown as GraphEdgeData);
      setSelectedNode(null);
    },
    []
  );

  if (nodesData.length === 0) {
    return (
      <div className="w-full h-[620px] bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-sm">
        <div className="text-center space-y-2">
          <p className="font-semibold">No graph data available yet.</p>
          <p className="text-xs text-slate-500">Click "Execute Provenance Trace" to generate the investigation graph.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[620px] bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
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
        className="bg-slate-950"
      >
        <Background color="#1e293b" gap={18} size={1.5} />
        <Controls className="!bg-slate-900 !border-slate-800" />
        <MiniMap
          nodeStrokeColor="#475569"
          nodeColor={(n: any) => {
            if (n.data?.is_seed) return '#6366f1';
            if (n.data?.assessment_category === 'LIKELY_MULE') return '#f43f5e';
            if (n.data?.assessment_category === 'MERCHANT') return '#f59e0b';
            if (n.data?.assessment_category === 'LEGITIMATE_COUNTERPARTY') return '#10b981';
            return '#64748b';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
        />
      </ReactFlow>

      {/* Slide-out details drawer */}
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
