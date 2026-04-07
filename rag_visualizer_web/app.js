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
                    'width': '90px',
                    'height': '90px',
                    'text-wrap': 'wrap',
                    'line-height': 1.1,
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
        
        let icon = 'ℹ';
        if (type === 'error') icon = '❌';
        else if (type === 'success') icon = '✔';
        else if (type === 'warning') icon = '⚠';

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
    let isDeleteMode = false;
    let selectedSourceNodeId = null;

    // Helper: Build Resource Matrix Label
    const buildResourceLabel = (name, instances) => {
        let dots = [];
        const maxCols = 3; 
        let currentLine = [];
        for(let i=0; i < instances; i++) {
            currentLine.push('●');
            if(currentLine.length === maxCols) {
                dots.push(currentLine.join(' ')); // Space between dots
                currentLine = [];
            }
        }
        if (currentLine.length > 0) dots.push(currentLine.join(' '));
        return `${name}\n\n${dots.join('\n')}`;
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
            data: { 
                id: currentId, 
                resourceName: currentId,
                instances: instances,
                label: buildResourceLabel(currentId, instances)
            },
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

    document.getElementById('btnEdgeMode').addEventListener('click', () => {
        isEdgeMode = !isEdgeMode;
        if (isEdgeMode) {
            if (isDeleteMode) document.getElementById('btnDeleteMode').click(); // Turn off Delete
            document.getElementById('btnEdgeMode').classList.add('active-purple');
            document.getElementById('edgeModeHint').style.display = 'block';
            showToast('Edge Mode Enabled. Click Source then Target node.', 'info');
        } else {
            document.getElementById('btnEdgeMode').classList.remove('active-purple');
            document.getElementById('edgeModeHint').style.display = 'none';
            if (selectedSourceNodeId) {
                cy.getElementById(selectedSourceNodeId).removeClass('selected-source');
                selectedSourceNodeId = null;
            }
            showToast('Edge Mode Disabled.', 'info');
        }
    });

    document.getElementById('btnDeleteMode').addEventListener('click', () => {
        isDeleteMode = !isDeleteMode;
        if (isDeleteMode) {
            if (isEdgeMode) document.getElementById('btnEdgeMode').click(); // Turn off Edge
            document.getElementById('btnDeleteMode').classList.add('active-red');
            document.getElementById('deleteModeHint').style.display = 'block';
            showToast('Delete Mode Enabled. Click any node or edge to remove it.', 'info');
        } else {
            document.getElementById('btnDeleteMode').classList.remove('active-red');
            document.getElementById('deleteModeHint').style.display = 'none';
            showToast('Delete Mode Disabled.', 'info');
        }
    });

    // Feature: Allow tapping graph elements to delete them (if delete mode), or create edges
    cy.on('tap', 'node', function(evt){
        let ele = evt.target;
        if (isDeleteMode) {
            cy.remove(ele);
            showToast(`Deleted ${ele.id()}`, 'success');
            saveState();
            return;
        }

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
        }
    });

    cy.on('tap', 'edge', function(evt){
        if (isDeleteMode) {
            const ele = evt.target;
            cy.remove(ele);
            showToast(`Deleted edge`, 'success');
            saveState();
        }
    });

    document.getElementById('btnReset').addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the entire graph?')) {
            cy.elements().remove();
            processCounter = 1;
            resourceCounter = 1;
            edgeCounter = 1;
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

    // --- DEADLOCK DETECTION (GRAPH REDUCTION ALGORITHM) ---

    const checkDeadlock = () => {
        // Clear old highlights visually
        cy.elements().removeClass('deadlock');

        const nodes = cy.nodes();
        const processes = cy.nodes('.process');
        const resources = cy.nodes('.resource');

        if (processes.length === 0 && resources.length === 0) {
            return showToast('Graph is empty. No deadlock.', 'info');
        }

        // 1. Initialize State
        let availableMap = new Map(); // resourceId -> available instances
        resources.forEach(r => {
            const instances = r.data('instances') || 1;
            const allocations = r.outgoers('edge.allocation').length;
            availableMap.set(r.id(), instances - allocations);
        });

        let reducedProcesses = new Set();
        let unreducedProcesses = new Set(processes.map(p => p.id()));

        // 2. Reduction Loop
        let reducedInThisIteration = true;
        while (reducedInThisIteration) {
            reducedInThisIteration = false;

            for (let pId of unreducedProcesses) {
                const processNode = cy.getElementById(pId);
                const requests = processNode.outgoers('edge.request');
                
                // Count how many instances of each resource this process requests
                let reqCounts = new Map(); // resId -> count
                requests.forEach(edge => {
                    const resId = edge.target().id();
                    reqCounts.set(resId, (reqCounts.get(resId) || 0) + 1);
                });

                // Check if all requests can be satisfied
                let canBeSatisfied = true;
                for (let [resId, count] of reqCounts) {
                    if ((availableMap.get(resId) || 0) < count) {
                        canBeSatisfied = false;
                        break;
                    }
                }

                if (canBeSatisfied) {
                    // Simulate Completion
                    reducedProcesses.add(pId);
                    unreducedProcesses.delete(pId);
                    reducedInThisIteration = true;

                    // Release resources held by this process
                    const allocations = processNode.incomers('edge.allocation');
                    allocations.forEach(edge => {
                        const resId = edge.source().id();
                        availableMap.set(resId, (availableMap.get(resId) || 0) + 1);
                    });
                }
            }
        }

        // 3. Evaluate State
        if (unreducedProcesses.size > 0) {
            // DEADLOCK STATE
            unreducedProcesses.forEach(pId => {
                const pNode = cy.getElementById(pId);
                pNode.addClass('deadlock');
                
                pNode.outgoers('edge.request').forEach(edge => {
                    edge.addClass('deadlock');
                    edge.target().addClass('deadlock');
                });
                
                pNode.incomers('edge.allocation').forEach(edge => {
                    edge.addClass('deadlock');
                    edge.source().addClass('deadlock');
                });
            });

            showToast('❌ Deadlock Detected! Processes involved: ' + Array.from(unreducedProcesses).join(', '), 'error');
        } else {
            // ALL PROCESSES REDUCED = SAFE STATE
            showToast('✔ System is in Safe State.\nAll processes can complete.', 'success');
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
        
        const cyContainer = document.getElementById('cy');
        const rect = cyContainer.getBoundingClientRect();
        
        // Use renderedBoundingBox for perfect visual alignment regardless of zoom/pan
        const bb = hoveredResourceNode.renderedBoundingBox();
        const nodeBottom = bb.y2;
        const nodeCenterX = (bb.x1 + bb.x2) / 2;

        hoverControls.classList.add('show');
        hoverControls.style.left = (rect.left + nodeCenterX) + 'px';
        hoverControls.style.top = (rect.top + nodeBottom + 8) + 'px'; // 8px gap below
    });

    cy.on('mouseout', 'node.resource', function(evt){
        hideHoverTimeout = setTimeout(() => {
            hoverControls.classList.remove('show');
        }, 300);
    });

    hoverControls.addEventListener('mouseenter', () => clearTimeout(hideHoverTimeout));
    hoverControls.addEventListener('mouseleave', () => {
        hoverControls.classList.remove('show');
    });

    document.getElementById('btnIncInst').addEventListener('click', () => {
        if (!hoveredResourceNode) return;
        let inst = (hoveredResourceNode.data('instances') || 1) + 1;
        hoveredResourceNode.data('instances', inst);
        
        let rn = hoveredResourceNode.data('resourceName') || hoveredResourceNode.id();
        hoveredResourceNode.data('label', buildResourceLabel(rn, inst));
    });

    document.getElementById('btnDecInst').addEventListener('click', () => {
        if (!hoveredResourceNode) return;
        let inst = hoveredResourceNode.data('instances') || 1;
        if (inst > 1) {
            inst--;
            hoveredResourceNode.data('instances', inst);
            
            let rn = hoveredResourceNode.data('resourceName') || hoveredResourceNode.id();
            hoveredResourceNode.data('label', buildResourceLabel(rn, inst));
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
        if (editingNode.hasClass('resource')) {
            currentLabel = editingNode.data('resourceName') || editingNode.id();
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
        let currentBaseName = currentLabel;
        if (editingNode.hasClass('resource')) {
            currentBaseName = editingNode.data('resourceName') || editingNode.id();
        }

        if (newName === currentBaseName) {
            cancelRename();
            return;
        }

        let isDuplicate = false;
        cy.nodes().forEach(n => {
            if (n.id() !== editingNode.id()) {
                let nBase = n.data('label');
                if (n.hasClass('resource')) nBase = n.data('resourceName') || n.id();
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

        if (editingNode.hasClass('resource')) {
            const inst = editingNode.data('instances') || 1;
            editingNode.data('resourceName', newName); // store cleanly
            editingNode.data('label', buildResourceLabel(newName, inst));
        } else {
            editingNode.data('label', newName);
        }

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
