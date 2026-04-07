import React from 'react';
import { Handle, Position } from 'reactflow';

const ResourceNode = ({ id, data, isConnectable }) => {
  const instances = Array.from({ length: data.instances || 1 }, (_, i) => i);

  return (
    <div className={`resource-node ${data.isDeadlocked ? 'deadlock-highlight' : ''}`}>
      <Handle id="top" type="target" position={Position.Top} isConnectable={isConnectable} />
      <Handle id="bottom" type="target" position={Position.Bottom} isConnectable={isConnectable} />
      <Handle id="left" type="target" position={Position.Left} isConnectable={isConnectable} />
      <Handle id="right" type="target" position={Position.Right} isConnectable={isConnectable} />
      
      <Handle id="top-s" type="source" position={Position.Top} isConnectable={isConnectable} />
      <Handle id="bottom-s" type="source" position={Position.Bottom} isConnectable={isConnectable} />
      <Handle id="left-s" type="source" position={Position.Left} isConnectable={isConnectable} />
      <Handle id="right-s" type="source" position={Position.Right} isConnectable={isConnectable} />

      <div style={{ marginBottom: '8px' }}>{data.label}</div>
      <div className="resource-instances">
        {instances.map((i) => (
          <div key={i} className="dot" />
        ))}
      </div>
    </div>
  );
};

export default React.memo(ResourceNode);
