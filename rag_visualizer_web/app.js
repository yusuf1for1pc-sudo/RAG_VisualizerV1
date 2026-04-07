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

    // --- GLOBAL VARIABLES ---
    let processCounter = 1;
    let resourceCounter = 1;
    let edgeCounter = 1;
    let isEdgeMode = false;
    let selectedSourceNodeId = null;

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
        const currentId = 'P' + processCounter;
        
        cy.add({
            group: 'nodes',
            data: { id: currentId, label: currentId },
            classes: 'process'
        });

        processCounter++;
        showToast(`Added Process node: ${currentId}`, 'success');
        reLayout();
        saveState();
    };

    const handleAddNodeResource = () => {
        const currentId = 'R' + resourceCounter;
        const instances = 1;

        cy.add({
            group: 'nodes',
            data: { id: currentId, label: currentId, instances: instances },
            classes: 'resource'
        });

        resourceCounter++;
        showToast(`Added Resource node: ${currentId}`, 'success');
        reLayout();
        saveState();
    };

    document.getElementById('btnAddProcess').addEventListener('click', handleAddNodeProcess);
    document.getElementById('btnAddResource').addEventListener('click', handleAddNodeResource);

    // --- EDGE OPERATIONS ---

    document.getElementById('btnEdgeMode').addEventListener('click', (e) => {
        isEdgeMode = !isEdgeMode;
        if (isEdgeMode) {
            e.target.classList.add('active');
            document.getElementById('edgeModeHint').style.display = 'block';
            showToast('Edge Mode Enabled. Click Source then Target node.', 'info');
        } else {
            e.target.classList.remove('active');
            document.getElementById('edgeModeHint').style.display = 'none';
            if (selectedSourceNodeId) {
                cy.getElementById(selectedSourceNodeId).removeClass('selected-source');
                selectedSourceNodeId = null;
            }
            showToast('Edge Mode Disabled.', 'info');
        }
    });

    // Feature: Allow tapping graph elements to pre-fill the Remove ID box, or create edges
    cy.on('tap', 'node', function(evt){
        let ele = evt.target;
        if (isEdgeMode) {
            if (!selectedSourceNodeId) {
                selectedSourceNodeId = ele.id();
                ele.addClass('selected-source');
                showToast(`Selected Source: ${ele.data('label')}`, 'info');
            } else {
                let sourceNode = cy.getElementById(selectedSourceNodeId);
                let targetNode = ele;
                
                if (sourceNode.id() === targetNode.id()) {
                    showToast('Cannot connect node to itself', 'error');
                    sourceNode.removeClass('selected-source');
                    selectedSourceNodeId = null;
                    return;
                }

                let typeClass = '';
                if (sourceNode.hasClass('process') && targetNode.hasClass('resource')) {
                    typeClass = 'request';
                } else if (sourceNode.hasClass('resource') && targetNode.hasClass('process')) {
                    typeClass = 'allocation';
                    
                    const instances = sourceNode.data('instances') || 1;
                    const currentAllocations = sourceNode.outgoers('edge.allocation').length;
                    if (currentAllocations >= instances) {
                        showToast(`Resource ${sourceNode.data('label')} has no free instances! (Max: ${instances})`, 'error');
                        sourceNode.removeClass('selected-source');
                        selectedSourceNodeId = null;
                        return;
                    }
                } else {
                     showToast('Invalid Edge: Must link Process to Resource or vice versa', 'error');
                     sourceNode.removeClass('selected-source');
                     selectedSourceNodeId = null;
                     return;
                }

                const edgeId = `${sourceNode.id()}-${targetNode.id()}`;
                const edgeLabel = `E${edgeCounter} (${typeClass === 'request' ? 'Req' : 'Alloc'})`;
                
                if (cy.getElementById(edgeId).length > 0) {
                    showToast('Edge already exists!', 'error');
                } else {
                    cy.add({
                        group: 'edges',
                        data: { id: edgeId, source: sourceNode.id(), target: targetNode.id(), label: edgeLabel },
                        classes: typeClass
                    });
                    edgeCounter++;
                    showToast(`Added ${typeClass} edge: ${sourceNode.data('label')} → ${targetNode.data('label')}`, 'success');
                    saveState();
                }

                sourceNode.removeClass('selected-source');
                selectedSourceNodeId = null;
            }
        } else {
            document.getElementById('removeId').value = ele.id();
            showToast(`Selected ${ele.id()} for removal`, 'info');
        }
    });

    cy.on('tap', 'edge', function(evt){
        if (!isEdgeMode) {
            const ele = evt.target;
            document.getElementById('removeId').value = ele.id();
            showToast(`Selected ${ele.id()} for removal`, 'info');
        }
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

    // --- HOVER CONTROLS FOR RESOURCES (INSTANCES) ---
    let hoveredResourceNode = null;
    let hideHoverTimeout = null;
    const hoverControls = document.getElementById('resourceHoverControls');

    cy.on('mouseover', 'node.resource', function(evt){
        clearTimeout(hideHoverTimeout);
        hoveredResourceNode = evt.target;
        const renderedPos = evt.renderedPosition;
        
        const cyContainer = document.getElementById('cy');
        const rect = cyContainer.getBoundingClientRect();

        hoverControls.style.display = 'flex';
        hoverControls.style.left = (rect.left + renderedPos.x + 30) + 'px';
        hoverControls.style.top = (rect.top + renderedPos.y - 20) + 'px';
    });

    cy.on('mouseout', 'node.resource', function(evt){
        hideHoverTimeout = setTimeout(() => {
            hoverControls.style.display = 'none';
        }, 300);
    });

    hoverControls.addEventListener('mouseenter', () => clearTimeout(hideHoverTimeout));
    hoverControls.addEventListener('mouseleave', () => {
        hoverControls.style.display = 'none';
    });

    document.getElementById('btnIncInst').addEventListener('click', () => {
        if (!hoveredResourceNode) return;
        let inst = (hoveredResourceNode.data('instances') || 1) + 1;
        hoveredResourceNode.data('instances', inst);
        
        let currentLabel = hoveredResourceNode.data('label');
        let baseName = currentLabel.includes('(') ? currentLabel.split('(')[0].trim() : currentLabel;
        hoveredResourceNode.data('label', `${baseName} (${inst})`);
    });

    document.getElementById('btnDecInst').addEventListener('click', () => {
        if (!hoveredResourceNode) return;
        let inst = hoveredResourceNode.data('instances') || 1;
        if (inst > 1) {
            inst--;
            hoveredResourceNode.data('instances', inst);
            
            let currentLabel = hoveredResourceNode.data('label');
            let baseName = currentLabel.includes('(') ? currentLabel.split('(')[0].trim() : currentLabel;
            hoveredResourceNode.data('label', inst > 1 ? `${baseName} (${inst})` : baseName);
        }
    });

    // --- NODE RENAMING MECHANISM (DOUBLE TAP) ---
    const renameUI = document.getElementById('nodeRenameUI');
    const renameInput = document.getElementById('nodeRenameInput');
    const renameError = document.getElementById('nodeRenameError');
    let editingNode = null;

    cy.on('dblclick dbltap', 'node', function(evt) {
        editingNode = evt.target;
        
        const cyContainer = document.getElementById('cy');
        const rect = cyContainer.getBoundingClientRect();
        const renderedPos = evt.renderedPosition;

        let currentLabel = editingNode.data('label');
        if (editingNode.hasClass('resource') && currentLabel.includes('(')) {
            currentLabel = currentLabel.split('(')[0].trim();
        }

        renameInput.value = currentLabel;
        renameInput.classList.remove('error');
        renameError.style.display = 'none';

        renameUI.style.display = 'flex';
        renameUI.style.left = (rect.left + renderedPos.x - 50) + 'px';
        renameUI.style.top = (rect.top + renderedPos.y + 40) + 'px';
        
        setTimeout(() => renameInput.focus(), 50);
    });

    const commitRename = () => {
        if (!editingNode) return;
        const newName = renameInput.value.trim();
        
        if (!newName) {
            cancelRename();
            return;
        }

        const currentLabel = editingNode.data('label');
        const currentBaseName = currentLabel.includes('(') ? currentLabel.split('(')[0].trim() : currentLabel;

        if (newName === currentBaseName) {
            cancelRename();
            return;
        }

        let isDuplicate = false;
        cy.nodes().forEach(n => {
            if (n.id() !== editingNode.id()) {
                let nLabel = n.data('label');
                let nBase = nLabel.includes('(') ? nLabel.split('(')[0].trim() : nLabel;
                if (nBase.toLowerCase() === newName.toLowerCase()) {
                    isDuplicate = true;
                }
            }
        });

        if (isDuplicate) {
            renameInput.classList.add('error');
            renameError.style.display = 'block';
            return; 
        }

        let displayLabel = newName;
        if (editingNode.hasClass('resource')) {
            const inst = editingNode.data('instances') || 1;
            if (inst > 1) displayLabel = `${newName} (${inst})`;
        }

        editingNode.data('label', displayLabel);
        saveState();
        cancelRename();
    };

    const cancelRename = () => {
        renameUI.style.display = 'none';
        editingNode = null;
    };

    renameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') commitRename();
        if (e.key === 'Escape') cancelRename();
    });

    document.addEventListener('pointerdown', (e) => {
        if (editingNode && !renameUI.contains(e.target) && e.target.tagName !== 'CANVAS') {
           commitRename();
        }
    });

    cy.on('tap', function(evt){
        if (editingNode && evt.target === cy) {
            commitRename();
        }
    });

});
