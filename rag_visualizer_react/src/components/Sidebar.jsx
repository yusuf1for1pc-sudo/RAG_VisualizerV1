import React, { useState } from 'react';
import { PlusCircle, Database, Link, Undo2, Redo2, RotateCcw, AlertTriangle, Image } from 'lucide-react';

const Sidebar = ({ 
  onAddProcess, 
  onAddResource, 
  isEdgeMode, 
  setEdgeMode, 
  onUndo, 
  onRedo, 
  onReset,
  canUndo,
  canRedo,
  onCheckDeadlock,
  onExportImage
}) => {
  const [instances, setInstances] = useState(1);

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>RAG Visualizer</h1>
        <p>Resource Allocation Graph & Deadlock Detection</p>
      </div>

      <div className="control-group">
        <h3>1. Add Components</h3>
        <button className="btn btn-primary" onClick={onAddProcess}>
          <PlusCircle size={18} /> Add Process
        </button>
        
        <div className="input-row">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label htmlFor="instances">Number of Instances</label>
            <button 
              className="btn" 
              style={{ padding: '2px 8px', fontSize: '11px', height: 'fit-content' }}
              onClick={() => setInstances(1)}
            >
              Reset
            </button>
          </div>
          <input 
            id="instances"
            type="number" 
            min="1" 
            max="10"
            value={instances} 
            onChange={(e) => {
              const val = e.target.value;
              if (val === '') {
                setInstances('');
              } else {
                setInstances(parseInt(val) || 1);
              }
            }}
          />
        </div>
        <button className="btn btn-success" onClick={() => {
          onAddResource(instances);
          setInstances(1); // Reset to 1 after adding
        }}>
          <Database size={18} /> Add Resource
        </button>
      </div>

      <div className="control-group">
        <h3>2. Interactive Creation</h3>
        <button 
          className={`btn ${isEdgeMode ? 'btn-active' : ''}`} 
          onClick={() => setEdgeMode(!isEdgeMode)}
        >
          <Link size={18} /> {isEdgeMode ? 'Edge Mode On' : 'Add Edge Mode'}
        </button>
        <p style={{ fontSize: '12px' }}>
          {isEdgeMode 
            ? 'Select source node, then destination node to create an edge.' 
            : 'Enable to create edges by clicking nodes.'}
        </p>
      </div>

      <div className="control-group">
        <h3>3. Analysis</h3>
        <button className="btn btn-danger btn-full" onClick={onCheckDeadlock}>
          <AlertTriangle size={18} /> Check Deadlock
        </button>
        <button className="btn btn-full" onClick={onExportImage} style={{ marginTop: '12px' }}>
          <Image size={18} /> Export Image
        </button>
      </div>

      <div className="history-controls">
        <button className="btn" disabled={!canUndo} onClick={onUndo}>
          <Undo2 size={18} /> Undo
        </button>
        <button className="btn" disabled={!canRedo} onClick={onRedo}>
          <Redo2 size={18} /> Redo
        </button>
        <button className="btn btn-full" onClick={() => {
          onReset();
          setInstances(1);
        }}>
          <RotateCcw size={18} /> Reset Graph
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
