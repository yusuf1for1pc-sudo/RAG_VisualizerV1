import React, { useState, useCallback } from 'react';
import { Handle, Position } from 'reactflow';

const ProcessNode = ({ id, data, isConnectable }) => {
  const label = data.label || id;

  return (
    <div className={`process-node ${data.isDeadlocked ? 'deadlock-highlight' : ''}`}>
      <Handle id="top" type="target" position={Position.Top} isConnectable={isConnectable} />
      <Handle id="bottom" type="target" position={Position.Bottom} isConnectable={isConnectable} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle id="right" type="target" position={Position.Right} isConnectable={isConnectable} />
      
      <Handle id="top-s" type="source" position={Position.Top} isConnectable={isConnectable} />
      <Handle id="bottom-s" type="source" position={Position.Bottom} isConnectable={isConnectable} />
      <Handle id="left-s" type="source" position={Position.Left} isConnectable={isConnectable} />
      <Handle id="right-s" type="source" position={Position.Right} isConnectable={isConnectable} />

      <span>{label}</span>
    </div>
  );
};

export default React.memo(ProcessNode);
