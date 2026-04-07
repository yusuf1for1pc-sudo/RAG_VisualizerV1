import { useState, useCallback, useMemo } from 'react';
import { applyNodeChanges, applyEdgeChanges, addEdge, MarkerType } from 'reactflow';

const INITIAL_STATE = {
  nodes: [],
  edges: [],
  processCounter: 1,
  resourceCounter: 1,
  edgeCounter: 1,
};

export const useRAGState = () => {
  const [history, setHistory] = useState([INITIAL_STATE]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const currentState = useMemo(() => history[historyIndex], [history, historyIndex]);

  const updateState = useCallback((newStateOrUpdater) => {
    setHistory((prev) => {
      const current = prev[historyIndex];
      const nextState = typeof newStateOrUpdater === 'function' 
        ? newStateOrUpdater(current) 
        : newStateOrUpdater;
      
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, { ...current, ...nextState }];
    });
    setHistoryIndex((prev) => prev + 1);
  }, [historyIndex]);

  const onNodesChange = useCallback(
    (changes) => {
      const newNodes = applyNodeChanges(changes, currentState.nodes);
      
      // COLLISION DETECTION LOGIC
      // If a position change occurs, check if it causes a collision
      const positionChange = changes.find(c => c.type === 'position' && c.dragging);
      if (positionChange) {
        const draggedNode = newNodes.find(n => n.id === positionChange.id);
        const others = newNodes.filter(n => n.id !== positionChange.id);
        
        const getDims = (n) => {
          const isP = n.type === 'processNode';
          return { w: isP ? 80 : 120, h: isP ? 80 : 100 };
        };

        const d = getDims(draggedNode);
        const padding = 10;

        const collision = others.find((n) => {
          const o = getDims(n);
          return (
            draggedNode.position.x < n.position.x + o.w + padding &&
            draggedNode.position.x + d.w + padding > n.position.x &&
            draggedNode.position.y < n.position.y + o.h + padding &&
            draggedNode.position.y + d.h + padding > n.position.y
          );
        });

        // If collision, don't update this node's position (keep previous)
        if (collision) {
          const prevNode = currentState.nodes.find(n => n.id === positionChange.id);
          if (prevNode) {
            draggedNode.position = { ...prevNode.position };
          }
        }
      }

      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[historyIndex] = { ...currentState, nodes: newNodes };
        return newHistory;
      });
    },
    [currentState, historyIndex]
  );

  const onEdgesChange = useCallback(
    (changes) => {
      const newEdges = applyEdgeChanges(changes, currentState.edges);
      setHistory((prev) => {
        const newHistory = [...prev];
        newHistory[historyIndex] = { ...currentState, edges: newEdges };
        return newHistory;
      });
    },
    [currentState, historyIndex]
  );

  const getNextPosition = (type, currentNodes) => {
    const nodesOfType = currentNodes.filter(n => n.type === type);
    const count = nodesOfType.length;
    
    const spacingY = 180;
    const spacingX = 400;
    const startY = 150;
    const baseX = type === 'processNode' ? 150 : 150 + spacingX;

    return { x: baseX, y: startY + count * spacingY };
  };

  const addProcess = useCallback(() => {
    const id = `P${currentState.processCounter}`;
    updateState((prev) => {
      const position = getNextPosition('processNode', prev.nodes);
      const newNode = {
        id,
        type: 'processNode',
        data: { label: id },
        position,
      };
      return {
        nodes: [...prev.nodes, newNode],
        processCounter: prev.processCounter + 1,
      };
    });
  }, [currentState, updateState]);

  const addResource = useCallback((instances = 1) => {
    const id = `R${currentState.resourceCounter}`;
    updateState((prev) => {
      const position = getNextPosition('resourceNode', prev.nodes);
      const newNode = {
        id,
        type: 'resourceNode',
        data: { label: id, instances: parseInt(instances) || 1 },
        position,
      };
      return {
        nodes: [...prev.nodes, newNode],
        resourceCounter: prev.resourceCounter + 1,
      };
    });
  }, [currentState, updateState]);

  const createEdge = useCallback((source, target) => {
    const sourceNode = currentState.nodes.find(n => n.id === source);
    const targetNode = currentState.nodes.find(n => n.id === target);
    
    if (!sourceNode || !targetNode || source === target) return { success: false, message: 'Invalid source or target.' };

    if (sourceNode.type === targetNode.type) {
      return { success: false, message: 'Edges must connect a Process and a Resource.' };
    }

    const type = sourceNode.type === 'processNode' ? 'request' : 'allocation';
    
    if (type === 'allocation') {
      // Rule 1: Resource must have free instances
      const instances = sourceNode.data.instances || 1;
      const currentAllocations = currentState.edges.filter(e => e.source === source).length;
      if (currentAllocations >= instances) {
        return { success: false, message: `Resource ${sourceNode.data.label || sourceNode.id} has no free instances! (Max: ${instances})` };
      }

      // Rule 2: Process can only hold ONE resource at a time
      const isAlreadyAllocated = currentState.edges.some(e => e.target === target && e.data.type === 'allocation');
      if (isAlreadyAllocated) {
        return { success: false, message: `Process ${targetNode.data.label || targetNode.id} is already holding a resource!` };
      }
    }

    const edgeExists = currentState.edges.some(e => e.source === source && e.target === target);
    if (edgeExists) {
        return { success: false, message: 'This edge already exists.' };
    }

    // Nearest Handle Calculation
    const getHandlePos = (node, handleId) => {
      const { x, y } = node.position;
      const isP = node.type === 'processNode';
      const w = isP ? 80 : 120;
      const h = isP ? 80 : 100;
      switch (handleId) {
        case 'top': return { x: x + w / 2, y: y };
        case 'bottom': return { x: x + w / 2, y: y + h };
        case 'left': return { x: x, y: y + h / 2 };
        case 'right': return { x: x + w, y: y + h / 2 };
        default: return { x: x, y: y };
      }
    };

    const sourceHandles = ['top', 'bottom', 'left', 'right'];
    const targetHandles = ['top', 'bottom', 'left', 'right'];
    let bestDist = Infinity;
    let bestSourceH = 'right-s';
    let bestTargetH = 'left';

    sourceHandles.forEach((sH) => {
      targetHandles.forEach((tH) => {
        const p1 = getHandlePos(sourceNode, sH);
        const p2 = getHandlePos(targetNode, tH);
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        if (dist < bestDist) {
          bestDist = dist;
          bestSourceH = `${sH}-s`;
          bestTargetH = tH;
        }
      });
    });

    const edgeNum = currentState.edgeCounter;
    const newEdge = {
      id: `e-${source}-${target}`,
      source,
      target,
      sourceHandle: bestSourceH,
      targetHandle: bestTargetH,
      type: 'straight',
      data: { type },
      label: `E${edgeNum} (${type === 'request' ? 'Req' : 'Alloc'})`,
      style: { stroke: type === 'request' ? '#8b5cf6' : '#f59e0b', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: type === 'request' ? '#8b5cf6' : '#f59e0b',
      },
      labelStyle: { fill: '#fff', fontWeight: 700, fontSize: '13px' },
      labelBgStyle: { fill: 'transparent', stroke: 'transparent', fillOpacity: 0 },
    };

    updateState((prev) => ({
      edges: addEdge(newEdge, prev.edges),
      edgeCounter: prev.edgeCounter + 1,
    }));

    return { success: true };
  }, [currentState.nodes, currentState.edges, updateState]);

  const updateNodeData = useCallback((nodeId, newData) => {
    updateState((prev) => ({
      nodes: prev.nodes.map(node => 
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      ),
    }));
  }, [updateState]);

  const updateEdgeLabel = useCallback((edgeId, newLabel) => {
    updateState((prev) => ({
      edges: prev.edges.map(edge => 
        edge.id === edgeId ? { ...edge, label: newLabel } : edge
      ),
    }));
  }, [updateState]);

  const undo = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
  }, [historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1);
  }, [historyIndex, history.length]);

  const reset = useCallback(() => {
    setHistory([INITIAL_STATE]);
    setHistoryIndex(0);
  }, []);

  const removeElement = useCallback((id) => {
    updateState((prev) => {
      return {
        nodes: prev.nodes.filter(n => n.id !== id),
        edges: prev.edges.filter(e => e.id !== id && e.source !== id && e.target !== id),
      };
    });
  }, [updateState]);

  return {
    nodes: currentState.nodes,
    edges: currentState.edges,
    onNodesChange,
    onEdgesChange,
    addProcess,
    addResource,
    createEdge,
    updateNodeData,
    updateEdgeLabel,
    removeElement,
    undo,
    redo,
    reset,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
};
