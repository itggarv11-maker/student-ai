
import React, { useState, useEffect, useMemo, forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import ReactFlow, { MiniMap, Controls, Background, ReactFlowProvider, useReactFlow, getRectOfNodes, type Node, type Edge } from 'reactflow';
import { MindMapNode as MindMapNodeType } from '../../types';
import html2canvas from 'html2canvas';

// This is the original layout algorithm, preserved for its structure.
const layoutMindMap = (mindMapNode: MindMapNodeType): { nodes: Node[], edges: Edge[] } => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let nodeIdCounter = 0;

    const NODE_WIDTH = 250;
    const NODE_SPACING = 100;
    const MIN_RADIUS = 250;
    const LEVEL_RADIUS_INCREMENT = 120;

    const traverse = (
        node: MindMapNodeType,
        parentId: string | null,
        level: number,
        centerPos: { x: number; y: number },
        parentAngle: number
    ) => {
        const id = `${level}-${nodeIdCounter++}`;
        
        nodes.push({
            id,
            position: centerPos,
            data: {
                // The label is now just the raw data. We'll render it with a custom node.
                term: node.term,
                explanation: node.explanation,
                isRoot: level === 0,
                childrenCount: node.children?.length || 0,
            },
            type: 'mindmap',
            style: {
                width: NODE_WIDTH,
                minHeight: level === 0 ? 120 : 'auto',
                padding: '20px',
                borderRadius: '12px',
                background: level === 0 ? '#8b5cf6' : '#f5f3ff',
                border: `3px solid ${level === 0 ? '#6d28d9' : '#c4b5fd'}`,
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
            },
        });

        if (parentId) {
            edges.push({
                id: `e-${parentId}-${id}`,
                source: parentId,
                target: id,
                type: 'smoothstep',
                animated: true,
                style: { stroke: '#8b5cf6', strokeWidth: 2.5 },
            });
        }

        if (node.children && node.children.length > 0) {
            const childCount = node.children.length;
            const isRoot = level === 0;
            const sweepAngle = isRoot ? 2 * Math.PI : (Math.PI * 0.83);
            const startAngle = isRoot ? -Math.PI / 2 : parentAngle - (sweepAngle / 2);
            const angleStep = childCount > 1 ? sweepAngle / (isRoot ? childCount : childCount - 1) : 0;
            const minRadiusForLevel = MIN_RADIUS + level * LEVEL_RADIUS_INCREMENT;
            
            let radius = minRadiusForLevel;
            if (childCount > 1 && Math.abs(angleStep) > 0.001) {
                const requiredChordLength = NODE_WIDTH + NODE_SPACING;
                const radiusFromSpacing = requiredChordLength / (2 * Math.sin(Math.abs(angleStep) / 2));
                radius = Math.max(minRadiusForLevel, radiusFromSpacing);
            }
            
            node.children.forEach((child, i) => {
                const angle = startAngle + i * angleStep;
                const childPos = {
                    x: centerPos.x + radius * Math.cos(angle),
                    y: centerPos.y + radius * Math.sin(angle),
                };
                traverse(child, id, level + 1, childPos, angle);
            });
        }
    };

    traverse(mindMapNode, null, 0, { x: 0, y: 0 }, -Math.PI / 2);

    return { nodes, edges };
};


// A custom node component to render the term, explanation, and a toggle button.
const MindMapNodeComponent = ({ data }: { data: Node['data']}) => {
    return (
        <div className="text-center relative">
            <p className={`font-bold ${data.isRoot ? 'text-xl text-white' : 'text-base text-violet-800'}`}>
                {data.term}
            </p>
            {!data.isRoot && (
                <p className="text-sm text-slate-600 mt-2">{data.explanation}</p>
            )}
            {data.childrenCount > 0 && (
                <div className={`absolute -bottom-5 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-md cursor-pointer z-10 ${data.isExpanded ? 'bg-rose-500' : 'bg-green-500'}`}>
                    {data.isExpanded ? '-' : '+'}
                </div>
            )}
        </div>
    );
};

const nodeTypes = { mindmap: MindMapNodeComponent };

interface MindMapProps {
    data: MindMapNodeType;
    onDownloadStart?: () => void;
    onDownloadFinish?: (error?: Error) => void;
}

interface MindMapRef {
    download: () => void;
}

const MindMapInternal = forwardRef<MindMapRef, MindMapProps>(({ data, onDownloadStart, onDownloadFinish }, ref) => {
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);
    const reactFlowInstance = useReactFlow();
    const internalDivRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const { nodes: allNodes, edges: allEdges } = layoutMindMap(data);

        const childrenMap = new Map<string, string[]>();
        allEdges.forEach(edge => {
            if (!childrenMap.has(edge.source)) {
                childrenMap.set(edge.source, []);
            }
            childrenMap.get(edge.source)!.push(edge.target);
        });
        
        const rootNodeId = allNodes.length > 0 ? allNodes[0].id : null;
        
        const initialNodes = allNodes.map(n => ({
            ...n,
            data: {
                ...n.data,
                childrenIds: childrenMap.get(n.id) || [],
                isExpanded: n.id === rootNodeId, // Expand root by default
            },
            hidden: n.id !== rootNodeId,
        }));

        setNodes(initialNodes);
        setEdges(allEdges.map(e => ({ ...e, hidden: true })));

        setTimeout(() => reactFlowInstance.fitView({ padding: 0.2 }), 100);

    }, [data, reactFlowInstance]);
    
    useImperativeHandle(ref, () => ({
        download: () => {
             if (onDownloadStart) onDownloadStart();

            const originalNodes = nodes;
            const originalEdges = edges;

            const allNodesVisible = nodes.map(n => ({...n, hidden: false, data: {...n.data, isExpanded: true}}));
            const allEdgesVisible = edges.map(e => ({...e, hidden: false}));
            
            setNodes(allNodesVisible);
            setEdges(allEdgesVisible);

            setTimeout(() => {
                const PADDING = 100;
                const nodesBounds = getRectOfNodes(allNodesVisible);
                const imageWidth = nodesBounds.width + PADDING * 2;
                const imageHeight = nodesBounds.height + PADDING * 2;

                const viewport = internalDivRef.current?.querySelector('.react-flow__viewport') as HTMLElement;
                
                if (!viewport) {
                    if (onDownloadFinish) onDownloadFinish(new Error("Could not find Mind Map viewport."));
                    return;
                }

                html2canvas(viewport, {
                    backgroundColor: '#e0e7ff',
                    width: imageWidth,
                    height: imageHeight,
                    x: nodesBounds.x - PADDING,
                    y: nodesBounds.y - PADDING,
                    scale: 2,
                    useCORS: true,
                }).then(canvas => {
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL('image/png');
                    link.download = `mind-map-${data.term.replace(/\s+/g, '-').toLowerCase()}.png`;
                    link.click();
                    if (onDownloadFinish) onDownloadFinish();
                }).catch(err => {
                    if (onDownloadFinish) onDownloadFinish(err);
                }).finally(() => {
                    setNodes(originalNodes);
                    setEdges(originalEdges);
                });
            }, 500); // Wait for re-render
        }
    }));


    const onNodeClick = useCallback((event: React.MouseEvent, clickedNode: Node) => {
        if (!clickedNode.data.childrenIds || clickedNode.data.childrenIds.length === 0) return;

        const isExpanding = !clickedNode.data.isExpanded;
        
        const updatedNodes = nodes.map(n => {
            if (n.id === clickedNode.id) {
                return { ...n, data: { ...n.data, isExpanded: isExpanding } };
            }
            return n;
        });

        const getDescendants = (nodeId: string): Set<string> => {
            const descendants = new Set<string>();
            const queue: string[] = [...(updatedNodes.find(n => n.id === nodeId)?.data.childrenIds || [])];
            while (queue.length > 0) {
                const currentId = queue.shift()!;
                if (!descendants.has(currentId)) {
                    descendants.add(currentId);
                    const childNode = updatedNodes.find(n => n.id === currentId);
                    if (childNode && childNode.data.childrenIds) {
                        queue.push(...childNode.data.childrenIds);
                    }
                }
            }
            return descendants;
        };

        const descendantsToHide = isExpanding ? new Set<string>() : getDescendants(clickedNode.id);
        
        const finalNodes = updatedNodes.map(n => {
            if (clickedNode.data.childrenIds.includes(n.id)) {
                return { ...n, hidden: !isExpanding };
            }
            if (descendantsToHide.has(n.id)) {
                return { ...n, hidden: true, data: { ...n.data, isExpanded: false } };
            }
            return n;
        });
        
        setNodes(finalNodes);

        const visibleNodeIds = new Set(finalNodes.filter(n => !n.hidden).map(n => n.id));
        setEdges(prevEdges => prevEdges.map(e => ({
            ...e,
            hidden: !(visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target))
        })));
        
        reactFlowInstance.setCenter(clickedNode.position.x, clickedNode.position.y, { zoom: reactFlowInstance.getZoom(), duration: 500 });

    }, [nodes, edges, reactFlowInstance]);

    return (
        <div ref={internalDivRef} style={{ height: '70vh', width: '100%' }} className="rounded-lg overflow-hidden border-2 border-slate-300">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodeClick={onNodeClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodeTypes={nodeTypes}
            >
                <MiniMap nodeStrokeColor="#6d28d9" nodeColor="#f3e8ff" />
                <Controls />
                <Background color="#e0e7ff" />
            </ReactFlow>
        </div>
    );
});


const MindMap = forwardRef<MindMapRef, MindMapProps>((props, ref) => (
    <ReactFlowProvider>
        <MindMapInternal {...props} ref={ref} />
    </ReactFlowProvider>
));

export default MindMap;
