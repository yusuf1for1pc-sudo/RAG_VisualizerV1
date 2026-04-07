import React, { useState, useCallback, useMemo } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  Panel,
  getNodesBounds,
  getViewportForBounds,
} from 'reactflow';
import 'reactflow/dist/style.css';

import Sidebar from './components/Sidebar';
import ProcessNode from './components/nodes/ProcessNode';
import ResourceNode from './components/nodes/ResourceNode';
import { useRAGState } from './hooks/useRAGState';
import { detectDeadlock } from './utils/deadlockDetector';
import { toPng } from 'html-to-image';

import './App.css';

const nodeTypes = {
  processNode: ProcessNode,
  resourceNode: ResourceNode,
};

function App() {
  const {
    nodes,
    edges,
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
    canUndo,
    canRedo,
  } = useRAGState();

  const [isEdgeMode, setEdgeMode] = useState(false);
  const [selectedSource, setSelectedSource] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState([]);
  const [menu, setMenu] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [deadlockChecked, setDeadlockChecked] = useState(false);

  const onNodeClick = useCallback((event, node) => {
    if (!isEdgeMode) {
      setMenu(null);
      return;
    }

    if (!selectedSource) {
      setSelectedSource(node.id);
    } else {
      const result = createEdge(selectedSource, node.id);
      if (result && !result.success) {
        setErrorMsg(result.message);
      }
      setSelectedSource(null);
    }
  }, [isEdgeMode, selectedSource, createEdge]);

  // Handle auto-clearing error message
  React.useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  React.useEffect(() => {
    if (deadlockChecked) {
      const timer = setTimeout(() => setDeadlockChecked(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [deadlockChecked]);

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault();
    setMenu({
      type: node.type === 'processNode' ? 'process' : 'resource',
      id: node.id,
      top: event.clientY,
      left: event.clientX,
      label: node.data.label,
      instances: node.data.instances,
    });
  }, []);

  const onEdgeContextMenu = useCallback((event, edge) => {
    event.preventDefault();
    setMenu({
      type: 'edge',
      id: edge.id,
      top: event.clientY,
      left: event.clientX,
      label: edge.label,
    });
  }, []);

  const onEdgeClick = useCallback((event, edge) => {
    if (isEdgeMode) return;
    // Keep old click behavior or move entirely to context menu? 
    // Moving to context menu as requested.
  }, [isEdgeMode]);

  const onPaneClick = useCallback(() => {
    setMenu(null);
  }, []);

  const handleMenuSubmit = (e) => {
    e.preventDefault();
    if (menu.type === 'resource' || menu.type === 'process') {
      updateNodeData(menu.id, { 
        label: menu.label, 
        instances: menu.type === 'resource' ? (parseInt(menu.instances) || 1) : undefined
      });
    } else if (menu.type === 'edge') {
      updateEdgeLabel(menu.id, menu.label);
    }
    setMenu(null);
  };

  const onCheckDeadlock = useCallback(() => {
    const deadlockedNodes = detectDeadlock(nodes, edges);
    setHighlightedNodes(deadlockedNodes);
    setDeadlockChecked(true);
  }, [nodes, edges]);

  const onExportImage = useCallback(() => {
    // We want to capture the entire graph area
    const nodesBounds = getNodesBounds(nodes);
    if (!nodesBounds.width || !nodesBounds.height) return;

    const viewport = getViewportForBounds(nodesBounds, 1200, 800, 0.5, 2);
    const element = document.querySelector('.react-flow__viewport');
    if (!element) return;

    // Temporarily hide elements we don't want in the image
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.style.display = 'none';

    toPng(element, {
      backgroundColor: '#0f172a',
      width: 1200,
      height: 800,
      style: {
        width: '1200px',
        height: '800px',
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      },
    })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `rag-visualizer-export-${new Date().getTime()}.png`;
        link.href = dataUrl;
        link.click();
      })
      .catch((err) => {
        console.error('Failed to export image:', err);
        setErrorMsg('Failed to export image. Please try again.');
      })
      .finally(() => {
        // Restore sidebar
        if (sidebar) sidebar.style.display = 'flex';
      });
  }, [nodes]);

  const memoizedNodes = useMemo(() => {
    return nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        isDeadlocked: highlightedNodes.includes(node.id),
      }
    }));
  }, [nodes, highlightedNodes]);

  return (
    <div className="app-container">
      <Sidebar 
        onAddProcess={addProcess}
        onAddResource={addResource}
        isEdgeMode={isEdgeMode}
        setEdgeMode={setEdgeMode}
        onUndo={undo}
        onRedo={redo}
        onReset={() => {
          reset();
          setHighlightedNodes([]);
          setDeadlockChecked(false);
        }}
        canUndo={canUndo}
        canRedo={canRedo}
        onCheckDeadlock={onCheckDeadlock}
        onExportImage={onExportImage}
      />
      
      <main className="graph-area">
        <ReactFlow
          nodes={memoizedNodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
        >
          <Background color="#334155" gap={40} />
          <Controls />

          
          {isEdgeMode && (
            <Panel position="top-right" style={{ background: '#1e293b', padding: '8px 12px', borderRadius: '8px', border: '1px solid #334155' }}>
              <p style={{ margin: 0, fontSize: '13px', color: 'white' }}>
                {selectedSource 
                  ? `Source: ${selectedSource} - Click target node` 
                  : 'Select source node...'}
              </p>
            </Panel>
          )}

          {highlightedNodes.length > 0 && (
            <Panel position="bottom-center" style={{ background: '#7f1d1d', padding: '8px 16px', borderRadius: '8px', color: 'white', fontWeight: 'bold', border: '1px solid #991b1b', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
              <p style={{ margin: 0 }}>DEADLOCK DETECTED! {highlightedNodes.length} nodes involved.</p>
            </Panel>
          )}

          {deadlockChecked && highlightedNodes.length === 0 && (
            <Panel position="bottom-center" style={{ background: '#065f46', padding: '8px 16px', borderRadius: '8px', color: 'white', fontWeight: 'bold', border: '1px solid #064e3b', boxShadow: '0 4px 15px rgba(0,0,0,0.4)' }}>
              <p style={{ margin: 0 }}>SAFE! No deadlock detected.</p>
            </Panel>
          )}

          {menu && (
            <div 
              className="context-menu" 
              style={{ top: menu.top, left: menu.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <h4>Edit {menu.type.charAt(0).toUpperCase() + menu.type.slice(1)} ({menu.id})</h4>
              <form onSubmit={handleMenuSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="input-row">
                  <label>Label</label>
                  <input 
                    type="text" 
                    value={menu.label} 
                    onChange={e => setMenu({...menu, label: e.target.value})} 
                    autoFocus
                  />
                </div>
                {menu.type === 'resource' && (
                  <div className="input-row">
                    <label>Instances</label>
                    <input 
                      type="number" 
                      min="1"
                      max="10"
                      value={menu.instances} 
                      onChange={e => setMenu({...menu, instances: e.target.value})} 
                    />
                  </div>
                )}
                <div className="btn-row">
                  <button type="submit" className="btn btn-success" style={{ flex: 1, padding: '4px' }}>Save</button>
                  <button type="button" className="btn btn-danger" style={{ flex: 1, padding: '4px' }} onClick={() => {
                    removeElement(menu.id);
                    setMenu(null);
                  }}>Delete</button>
                  <button type="button" className="btn" style={{ flex: 1, padding: '4px' }} onClick={() => setMenu(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}
        </ReactFlow>
{errorMsg && (
  <div className="error-box" style={{ position: 'absolute', bottom: '10px', left: '50%', transform: 'translateX(-50%)', background: '#dc2626', color: '#fff', padding: '8px 12px', borderRadius: '6px', zIndex: 2000 }}>
    {errorMsg}
  </div>
)}
      </main>
    </div>
  );
}

export default App;
