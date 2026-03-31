package rag;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class Graph {
    private List<Node> nodes;
    private List<Edge> edges;
    private Map<Node, List<Edge>> adjacencyList;

    public Graph() {
        nodes = new ArrayList<>();
        edges = new ArrayList<>();
        adjacencyList = new HashMap<>();
    }

    public void addNode(Node node) {
        if (!nodes.contains(node)) {
            nodes.add(node);
            adjacencyList.put(node, new ArrayList<>());
        }
    }

    public void removeNode(Node node) {
        nodes.remove(node);
        adjacencyList.remove(node);
        
        // Remove connected edges
        List<Edge> toRemove = new ArrayList<>();
        for (Edge edge : edges) {
            if (edge.getSource().equals(node) || edge.getTarget().equals(node)) {
                toRemove.add(edge);
                if (adjacencyList.containsKey(edge.getSource()) && adjacencyList.get(edge.getSource()).contains(edge)) {
                    adjacencyList.get(edge.getSource()).remove(edge);
                }
            }
        }
        edges.removeAll(toRemove);
    }

    public void addEdge(Node source, Node target, Edge.Type type) {
        if (!adjacencyList.containsKey(source)) addNode(source);
        if (!adjacencyList.containsKey(target)) addNode(target);
        
        // Prevent duplicate edges
        for (Edge e : adjacencyList.get(source)) {
            if (e.getTarget().equals(target)) {
                return;
            }
        }

        Edge edge = new Edge(source, target, type);
        edges.add(edge);
        adjacencyList.get(source).add(edge);
    }

    public void removeEdge(Edge edge) {
        edges.remove(edge);
        if (adjacencyList.containsKey(edge.getSource())) {
            adjacencyList.get(edge.getSource()).remove(edge);
        }
    }

    public List<Node> getNodes() { return nodes; }
    public List<Edge> getEdges() { return edges; }

    public void clearHighlight() {
        for (Node node : nodes) node.setHighlighted(false);
        for (Edge edge : edges) edge.setHighlighted(false);
    }

    // Returns a list of nodes that participate in a deadlock cycle, or an empty list if none
    public List<Node> detectDeadlock() {
        clearHighlight();

        Set<Node> visited = new HashSet<>();
        Set<Node> recursionStack = new HashSet<>();
        Map<Node, Node> parentMap = new HashMap<>();
        List<Node> cyclePath = new ArrayList<>();

        for (Node startNode : nodes) {
            if (!visited.contains(startNode)) {
                if (dfs(startNode, visited, recursionStack, parentMap, cyclePath)) {
                    return cyclePath;
                }
            }
        }
        return new ArrayList<>(); // No cycle found
    }

    private boolean dfs(Node current, Set<Node> visited, Set<Node> recursionStack, 
                        Map<Node, Node> parentMap, List<Node> cyclePath) {
        visited.add(current);
        recursionStack.add(current);

        for (Edge edge : adjacencyList.get(current)) {
            Node neighbor = edge.getTarget();
            
            if (!visited.contains(neighbor)) {
                parentMap.put(neighbor, current);
                if (dfs(neighbor, visited, recursionStack, parentMap, cyclePath)) {
                    return true;
                }
            } else if (recursionStack.contains(neighbor)) {
                // Cycle detected
                cyclePath.add(neighbor);
                Node curr = current;
                while (curr != neighbor && curr != null) {
                    cyclePath.add(curr);
                    curr = parentMap.get(curr);
                }
                cyclePath.add(neighbor); // Finish the loop visually
                return true;
            }
        }

        recursionStack.remove(current);
        return false;
    }

    // Call this specifically from UI to highlight nodes and edges in the cycle
    public void highlightCycle(List<Node> cycleNodes) {
        if (cycleNodes == null || cycleNodes.size() < 2) return;

        // Highlight the nodes
        for (Node node : cycleNodes) {
            node.setHighlighted(true);
        }

        // Highlight the edges bridging the nodes in the cycle
        // Using a set of consecutive pairs from cycleNodes
        for (int i = 0; i < cycleNodes.size() - 1; i++) {
            Node sourceNode = cycleNodes.get(i + 1); // Note: path is backtraced, so it's reversed in generation
            Node targetNode = cycleNodes.get(i);
            
            // Special case for the end to start connection
            if (i == cycleNodes.size() - 2) {
                // It's the closing link, already captured based on how path was constructed
            }

            for (Edge edge : edges) {
                if (edge.getSource().equals(sourceNode) && edge.getTarget().equals(targetNode)) {
                    edge.setHighlighted(true);
                }
            }
        }
    }
}
