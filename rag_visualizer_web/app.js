document.addEventListener('DOMContentLoaded', () => {

    // --- CYTOSCAPE INITIALIZATION ---
    const cy = cytoscape({
        container: document.getElementById('cy'),
        style: [
            // Process Node (Circle, Blue)
            {
                selector: 'node.process',
                style: {
                    'shape': 'ellipse',
                    'background-color': '#3b82f6',
                    'label': 'data(label)',
                    'color': '#ffffff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'text-outline-color': '#3b82f6',
                    'text-outline-width': 2,
                    'border-color': '#2563eb',
                    'border-width': 2,
                    'shadow-blur': 15,
                    'shadow-color': '#000',
                    'shadow-opacity': 0.5
                }
            },
            // Resource Node (Rectangle, Green)
            {
                selector: 'node.resource',
                style: {
                    'shape': 'round-rectangle',
                    'background-color': '#10b981',
                    'label': 'data(label)',
                    'color': '#ffffff',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'font-size': '14px',
                    'font-weight': 'bold',
                    'text-outline-color': '#10b981',
                    'text-outline-width': 2,
                    'border-color': '#059669',
                    'border-width': 2,
                    'width': '60px',
                    'height': '60px',
                    'shadow-blur': 15,
                    'shadow-color': '#000',
                    'shadow-opacity': 0.5
                }
            },
            // Default Edge Properties
            {
                selector: 'edge',
                style: {
                    'width': 3,
                    'line-color': '#9ca3af',
                    'target-arrow-color': '#9ca3af',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier',
                    'arrow-scale': 1.5,
                    'label': 'data(label)',
                    'font-size': '12px',
                    'color': '#cbd5e1',
                    'text-outline-color': '#1f2937',
                    'text-outline-width': 2,
                    'text-rotation': 'autorotate'
                }
            },
            // Edge specific classes (can be overridden, mostly visual metadata)
            {
                selector: 'edge.request',
                style: {
                    // Request: Process -> Resource. Let's make it purple for distinction
                    'line-color': '#8b5cf6',
                    'target-arrow-color': '#8b5cf6'
                }
            },
            {
                selector: 'edge.allocation',
                style: {
                    // Allocation: Resource -> Process. Yellow
                    'line-color': '#f59e0b',
                    'target-arrow-color': '#f59e0b'
                }
            },
            // Deadlock Cycle Highlight
            {
                selector: '.deadlock',
                style: {
                    'background-color': '#ef4444',
                    'line-color': '#ef4444',
                    'target-arrow-color': '#ef4444',
                    'border-color': '#dc2626',
                    'border-width': 4,
                    'text-outline-color': '#ef4444',
                    'transition-property': 'background-color, line-color, target-arrow-color',
                    'transition-duration': '0.3s'
                }
            }
        ],
        layout: { name: 'grid' },
        minZoom: 0.5,
        maxZoom: 3,
        wheelSensitivity: 0.2
    });

    // --- HELPER WRAPPERS ---

    const showToast = (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Add basic icon
        const icon = type === 'error' ? '⚠' : (type === 'success' ? '✅' : 'ℹ');
        toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
        
        container.appendChild(toast);
        
        // Remove from DOM after animation completes (3s visual + 0.3s slide)
        setTimeout(() => toast.remove(), 3500);
    };

    const reLayout = () => {
        const processes = cy.nodes('.process');
        const resources = cy.nodes('.resource');
        
        const spacingY = 120; // Vertical gap between nodes
        
        // Center the columns vertically
        const startY_P = -((processes.length - 1) * spacingY) / 2;
        const startY_R = -((resources.length - 1) * spacingY) / 2;
        
        processes.forEach((node, i) => {
            node.data('targetX', -200); // Left column
            node.data('targetY', startY_P + i * spacingY);
        });
        
        resources.forEach((node, i) => {
            node.data('targetX', 200); // Right column
            node.data('targetY', startY_R + i * spacingY);
        });
        
        cy.layout({
            name: 'preset',
            animate: true,
            animationDuration: 400,
            fit: true,
            padding: 60,
            positions: function(node) {
                return { 
                    x: node.data('targetX') || 0, 
                    y: node.data('targetY') || 0 
                };
            }
        }).run();
    };

    // --- HISTORY TRACKING (UNDO/REDO) ---
    let historyStack = [];
    let historyIndex = -1;

    const saveState = () => {
        // Discard future states if we are not at the end of history
        if (historyIndex < historyStack.length - 1) {
            historyStack = historyStack.slice(0, historyIndex + 1);
        }
        historyStack.push(cy.elements().jsons());
        historyIndex++;
        updateUndoRedoButtons();
    };

    const updateUndoRedoButtons = () => {
        document.getElementById('btnUndo').disabled = historyIndex <= 0;
        document.getElementById('btnRedo').disabled = historyIndex >= historyStack.length - 1;
    };

    const restoreState = (elementsJson) => {
        cy.elements().remove();
        if (elementsJson && elementsJson.length > 0) {
            cy.add(elementsJson);
        }
        updateUndoRedoButtons();
    };

    document.getElementById('btnUndo').addEventListener('click', () => {
        if (historyIndex > 0) {
            historyIndex--;
            restoreState(historyStack[historyIndex]);
            showToast('Undo successful', 'info');
        }
    });

    document.getElementById('btnRedo').addEventListener('click', () => {
        if (historyIndex < historyStack.length - 1) {
            historyIndex++;
            restoreState(historyStack[historyIndex]);
            showToast('Redo successful', 'info');
        }
    });

    // Save initial empty state
    saveState();

    const handleAddNodeProcess = () => {
        const input = document.getElementById('processCount');
        const num = Math.floor(Number(input.value.trim()));

        if (isNaN(num) || num <= 0) return showToast('Please enter a valid Process number', 'error');

        const currentId = 'P' + num;
        if (cy.getElementById(currentId).length > 0) {
            return showToast(`Process ${currentId} already exists!`, 'error');
        }

        cy.add({
            group: 'nodes',
            data: { id: currentId, label: currentId },
            classes: 'process'
        });

        input.value = ''; // Clear input
        showToast(`Added Process node: ${currentId}`, 'success');
        reLayout();
        saveState();
    };

    const handleAddNodeResource = () => {
        const inputNum = document.getElementById('resourceCount');
        const inputInst = document.getElementById('resourceInstances');
        const num = Math.floor(Number(inputNum.value.trim()));
        let instances = Math.floor(Number(inputInst.value.trim()));

        if (isNaN(instances) || instances <= 0) instances = 1;

        if (isNaN(num) || num <= 0) return showToast('Please enter a valid Resource number', 'error');

        const currentId = 'R' + num;
        if (cy.getElementById(currentId).length > 0) {
            return showToast(`Resource ${currentId} already exists!`, 'error');
        }

        const displayLabel = instances > 1 ? `${currentId} (${instances})` : currentId;

        cy.add({
            group: 'nodes',
            data: { id: currentId, label: displayLabel, instances: instances },
            classes: 'resource'
        });

        inputNum.value = ''; // Clear input
        inputInst.value = '';
        showToast(`Added Resource node: ${currentId} (${instances} instance${instances > 1 ? 's' : ''})`, 'success');
        reLayout();
        saveState();
    };

    document.getElementById('btnAddProcess').addEventListener('click', handleAddNodeProcess);
    document.getElementById('btnAddResource').addEventListener('click', handleAddNodeResource);

    // --- EDGE OPERATIONS ---

    const handleExecuteEdge = () => {
        const sourceInput = document.getElementById('edgeSource');
        const targetInput = document.getElementById('edgeTarget');
        const sourceId = sourceInput.value.trim().toUpperCase();
        const targetId = targetInput.value.trim().toUpperCase();

        if (!sourceId || !targetId) return showToast('Source and Target IDs required', 'error');

        const sourceNode = cy.getElementById(sourceId);
        const targetNode = cy.getElementById(targetId);

        if (sourceNode.length === 0) return showToast(`Source Node ${sourceId} not found`, 'error');
        if (targetNode.length === 0) return showToast(`Target Node ${targetId} not found`, 'error');

        let typeClass = '';
        if (sourceNode.hasClass('process') && targetNode.hasClass('resource')) {
            typeClass = 'request';
        } else if (sourceNode.hasClass('resource') && targetNode.hasClass('process')) {
            typeClass = 'allocation';
            
            const instances = sourceNode.data('instances') || 1;
            const currentAllocations = sourceNode.outgoers('edge.allocation').length;
            if (currentAllocations >= instances) {
                return showToast(`Resource ${sourceNode.id()} has no free instances! (Max: ${instances})`, 'error');
            }
        } else {
             return showToast('Invalid Edge: Must link a Process and a Resource', 'error');
        }

        const edgeId = `${sourceId}-${targetId}`;
        const edgeNameCount = cy.edges().length + 1;
        const edgeLabel = `E${edgeNameCount} (${typeClass === 'request' ? 'Req' : 'Alloc'})`;
        
        if (cy.getElementById(edgeId).length > 0) {
            return showToast('Edge already exists!', 'error');
        }

        cy.add({
            group: 'edges',
            data: { id: edgeId, source: sourceId, target: targetId, label: edgeLabel },
            classes: typeClass
        });

        sourceInput.value = ''; targetInput.value = '';
        showToast(`Added ${typeClass} edge: ${sourceId} → ${targetId}`, 'success');
        reLayout();
        saveState();
    };

    document.getElementById('btnExecuteEdge').addEventListener('click', handleExecuteEdge);

    // --- MANAGEMENT ---

    // Feature: Allow tapping graph elements to pre-fill the Remove ID box
    cy.on('tap', 'node, edge', function(evt){
        const ele = evt.target;
        document.getElementById('removeId').value = ele.id();
        showToast(`Selected ${ele.id()} for removal`, 'info');
    });

    document.getElementById('btnRemove').addEventListener('click', () => {
        const input = document.getElementById('removeId');
        const id = input.value.trim().toUpperCase();

        if (!id) return showToast('Please enter an ID to remove', 'error');

        let elem = cy.getElementById(id);
        
        // Also allow removing edges by their visual label (e.g. E1)
        if (elem.length === 0) {
            const edgeByLabel = cy.edges().filter(ele => {
                const label = ele.data('label');
                return label && label.toUpperCase().includes(id);
            });
            if (edgeByLabel.length > 0) {
                elem = edgeByLabel[0];
            }
        }

        if (elem.length === 0) {
            return showToast(`Element ${id} not found`, 'error');
        }

        const removedId = elem.id();
        elem.remove();
        input.value = '';
        showToast(`Removed Element: ${removedId}`, 'info');
        saveState();
    });

    document.getElementById('btnReset').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire graph?')) {
            cy.elements().remove();
            showToast('Graph reset successfully.', 'info');
            saveState();
        }
    });

    document.getElementById('btnExport').addEventListener('click', () => {
        if (cy.elements().length === 0) {
            return showToast('Graph is empty', 'error');
        }
        
        try {
            const b64Uri = cy.png({ full: true, bg: '#111827' });
            
            const a = document.createElement('a');
            a.href = b64Uri;
            a.download = 'rag_graph_export.png';
            a.click();
            showToast('Graph exported to PNG', 'success');
        } catch (e) {
            showToast('Failed to export graph', 'error');
            console.error(e);
        }
    });

    // --- DEADLOCK DETECTION (DFS CYCLE ALGORITHM) ---

    // A recursive DFS function running specifically on the Cytoscape collection
    const checkDeadlock = () => {
        // Clear old highlights visually
        cy.elements().removeClass('deadlock');

        const nodes = cy.nodes();
        if (nodes.length === 0) {
            return showToast('Graph is empty. No deadlock.', 'info');
        }

        let visited = new Set();
        let recursionStack = new Set();
        let parentMap = new Map();
        let cycleDetected = null; // Will store the violating node if found

        const dfs = (currentNodeId) => {
            visited.add(currentNodeId);
            recursionStack.add(currentNodeId);

            const currentNode = cy.getElementById(currentNodeId);
            const outgoingEdges = currentNode.outgoers('edge'); // Only directed edges OUT

            for(let i=0; i < outgoingEdges.length; i++) {
                const edge = outgoingEdges[i];
                const neighborNode = edge.target();
                const neighborId = neighborNode.id();

                if (!visited.has(neighborId)) {
                    parentMap.set(neighborId, { parent: currentNodeId, edgeId: edge.id() });
                    if (dfs(neighborId)) {
                        return true;
                    }
                } else if (recursionStack.has(neighborId)) {
                    // We hit a node currently in the DFS recursion stack = BACK EDGE = CYCLE
                    cycleDetected = {
                        startOfCycle: neighborId,
                        endOfCycle: currentNodeId,
                        closingEdgeId: edge.id()
                    };
                    return true;
                }
            }

            recursionStack.delete(currentNodeId);
            return false;
        };

        let hasDeadlock = false;

        // Run DFS from all unvisited nodes
        // (because the graph might have multiple disconnected components)
        for (let i = 0; i < nodes.length; i++) {
            const startId = nodes[i].id();
            if (!visited.has(startId)) {
                if (dfs(startId)) {
                    hasDeadlock = true;
                    break;
                }
            }
        }

        if (hasDeadlock && cycleDetected) {
            console.log("Deadlock trace:", cycleDetected);
            
            // Highlight the backward closing edge
            cy.getElementById(cycleDetected.closingEdgeId).addClass('deadlock');

            // Trace back via parentMap to highlight all elements in the loop
            let curr = cycleDetected.endOfCycle;
            while (curr && curr !== cycleDetected.startOfCycle) {
                cy.getElementById(curr).addClass('deadlock'); // Node
                
                const connectionInfo = parentMap.get(curr);
                if (connectionInfo) {
                    cy.getElementById(connectionInfo.edgeId).addClass('deadlock'); // Edge
                    curr = connectionInfo.parent; // Move backwards
                } else {
                    break;
                }
            }
            
            // Finally highlight the starting node of cycle
            cy.getElementById(cycleDetected.startOfCycle).addClass('deadlock');

            showToast('⚠ DEADLOCK DETECTED! Cycle highlighted in red.', 'error');
        } else {
            showToast('✅ System is Safe. No Deadlock.', 'success');
        }
    };

    document.getElementById('btnCheckDeadlock').addEventListener('click', checkDeadlock);

});
