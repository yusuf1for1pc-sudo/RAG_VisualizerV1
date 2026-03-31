package rag;

import java.awt.Color;
import java.awt.Graphics;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.awt.event.MouseMotionAdapter;
import java.util.List;
import javax.swing.JPanel;
import java.awt.Stroke;
import java.awt.BasicStroke;

public class GraphPanel extends JPanel {
    public enum Tool {
        SELECT, ADD_PROCESS, ADD_RESOURCE, ADD_REQUEST_EDGE, ADD_ALLOCATION_EDGE, REMOVE
    }

    private Graph graph;
    private Tool currentTool = Tool.ADD_PROCESS;
    
    private int processCounter = 1;
    private int resourceCounter = 1;

    private Node selectedNodeForEdge = null;
    private Node draggedNode = null;
    private int offsetX = 0, offsetY = 0;
    
    public interface StatusListener {
        void onStatusChanged(String status);
    }
    private StatusListener statusListener;

    public GraphPanel() {
        this.graph = new Graph();
        this.setBackground(new Color(30, 30, 30)); // Dark background

        addMouseListener(new MouseAdapter() {
            @Override
            public void mousePressed(MouseEvent e) {
                handleMouseClickAndPress(e);
            }
            @Override
            public void mouseReleased(MouseEvent e) {
                draggedNode = null;
            }
        });

        addMouseMotionListener(new MouseMotionAdapter() {
            @Override
            public void mouseDragged(MouseEvent e) {
                if (draggedNode != null) {
                    draggedNode.setX(e.getX() - offsetX);
                    draggedNode.setY(e.getY() - offsetY);
                    repaint();
                }
            }
        });
    }

    public void setStatusListener(StatusListener listener) {
        this.statusListener = listener;
    }
    
    private void updateStatus(String status) {
        if (statusListener != null) {
            statusListener.onStatusChanged(status);
        }
    }

    public void setTool(Tool tool) {
        this.currentTool = tool;
        this.selectedNodeForEdge = null;
        
        String msg = "";
        switch (tool) {
            case SELECT: msg = "Select mode: Drag nodes to move them."; break;
            case ADD_PROCESS: msg = "Add Process: Click on empty space to add a process."; break;
            case ADD_RESOURCE: msg = "Add Resource: Click on empty space to add a resource."; break;
            case ADD_REQUEST_EDGE: msg = "Add Request: Click a Process, then click a Resource."; break;
            case ADD_ALLOCATION_EDGE: msg = "Add Allocation: Click a Resource, then click a Process."; break;
            case REMOVE: msg = "Remove: Click on a node to remove it."; break;
        }
        updateStatus(msg);
        repaint();
    }

    public Graph getGraph() {
        return graph;
    }

    private void handleMouseClickAndPress(MouseEvent e) {
        int x = e.getX();
        int y = e.getY();
        Node clickedNode = getNodeAt(x, y);

        if (currentTool == Tool.SELECT || currentTool == Tool.ADD_PROCESS || currentTool == Tool.ADD_RESOURCE) {
            if (clickedNode != null) {
                // Allow dragging in these modes too
                draggedNode = clickedNode;
                offsetX = x - clickedNode.getX();
                offsetY = y - clickedNode.getY();
            } else if (currentTool == Tool.ADD_PROCESS) {
                graph.addNode(new ProcessNode("P" + processCounter++, x, y));
                repaint();
            } else if (currentTool == Tool.ADD_RESOURCE) {
                graph.addNode(new ResourceNode("R" + resourceCounter++, x, y));
                repaint();
            }
        } else if (currentTool == Tool.REMOVE) {
            if (clickedNode != null) {
                graph.removeNode(clickedNode);
            }
            repaint();
        } else if (currentTool == Tool.ADD_REQUEST_EDGE || currentTool == Tool.ADD_ALLOCATION_EDGE) {
            if (clickedNode != null) {
                if (selectedNodeForEdge == null) {
                    selectedNodeForEdge = clickedNode;
                    updateStatus("Selected " + clickedNode.getId() + ". Now click the target node.");
                } else {
                    if (selectedNodeForEdge != clickedNode) {
                        Edge.Type type = (currentTool == Tool.ADD_REQUEST_EDGE) ? Edge.Type.REQUEST : Edge.Type.ALLOCATION;
                        
                        boolean valid = false;
                        if (type == Edge.Type.REQUEST) {
                            valid = selectedNodeForEdge instanceof ProcessNode && clickedNode instanceof ResourceNode;
                        } else if (type == Edge.Type.ALLOCATION) {
                            valid = selectedNodeForEdge instanceof ResourceNode && clickedNode instanceof ProcessNode;
                        }

                        if (valid) {
                            graph.addEdge(selectedNodeForEdge, clickedNode, type);
                            updateStatus("Edge added. Ready to add another.");
                        } else {
                            updateStatus("Invalid edge type selected. Check source/target requirements.");
                        }
                    }
                    selectedNodeForEdge = null;
                    repaint();
                }
            } else {
                selectedNodeForEdge = null;
                setTool(currentTool); // Reset status
                repaint();
            }
        }
    }

    private Node getNodeAt(int x, int y) {
        List<Node> nodes = graph.getNodes();
        for (int i = nodes.size() - 1; i >= 0; i--) {
            if (nodes.get(i).contains(x, y)) {
                return nodes.get(i);
            }
        }
        return null;
    }

    public void detectAndHighlightDeadlock() {
        List<Node> cycle = graph.detectDeadlock();
        if (!cycle.isEmpty()) {
            graph.highlightCycle(cycle);
        } else {
            graph.clearHighlight();
        }
        repaint();
    }

    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        Graphics2D g2 = (Graphics2D) g;
        g2.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g2.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

        // Draw dotted grid background
        g2.setColor(new Color(50, 50, 50));
        Stroke dashed = new BasicStroke(1, BasicStroke.CAP_BUTT, BasicStroke.JOIN_BEVEL, 0, new float[]{2}, 0);
        g2.setStroke(dashed);
        for (int i = 0; i < getWidth(); i += 40) {
            g2.drawLine(i, 0, i, getHeight());
        }
        for (int j = 0; j < getHeight(); j += 40) {
            g2.drawLine(0, j, getWidth(), j);
        }

        // Draw edges
        for (Edge edge : graph.getEdges()) {
            edge.draw(g2);
        }

        // Selected node halo
        if (selectedNodeForEdge != null) {
            g2.setColor(new Color(243, 156, 18, 100)); // Orange translucent
            int r = 40;
            g2.fillOval(selectedNodeForEdge.getX() - r, selectedNodeForEdge.getY() - r, r*2, r*2);
        }

        // Draw nodes
        for (Node node : graph.getNodes()) {
            node.draw(g2);
        }
    }
}
