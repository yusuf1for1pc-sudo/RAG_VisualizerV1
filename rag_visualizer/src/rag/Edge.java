package rag;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Graphics2D;

public class Edge {
    public enum Type {
        REQUEST, ALLOCATION
    }

    private Node source;
    private Node target;
    private Type type;
    private boolean isHighlighted;

    public Edge(Node source, Node target, Type type) {
        this.source = source;
        this.target = target;
        this.type = type;
        this.isHighlighted = false;
    }

    public Node getSource() { return source; }
    public Node getTarget() { return target; }
    public Type getType() { return type; }
    
    public boolean isHighlighted() { return isHighlighted; }
    public void setHighlighted(boolean highlighted) { isHighlighted = highlighted; }

    public void draw(Graphics2D g2) {
        // Light grey for normal edges, Red for deadlock
        g2.setColor(isHighlighted ? new Color(231, 76, 60) : new Color(189, 195, 199));
        g2.setStroke(new BasicStroke(isHighlighted ? 4 : 2, BasicStroke.CAP_ROUND, BasicStroke.JOIN_ROUND));

        double dx = target.getX() - source.getX();
        double dy = target.getY() - source.getY();
        double angle = Math.atan2(dy, dx);
        
        double r1 = (source instanceof ProcessNode) ? ProcessNode.RADIUS : ResourceNode.SIZE / 2.0;
        double r2 = (target instanceof ProcessNode) ? ProcessNode.RADIUS : ResourceNode.SIZE / 2.0;

        int startX = (int) (source.getX() + r1 * Math.cos(angle));
        int startY = (int) (source.getY() + r1 * Math.sin(angle));
        
        int endX = (int) (target.getX() - (r2 + 2) * Math.cos(angle)); // +2 padding for arrowhead
        int endY = (int) (target.getY() - (r2 + 2) * Math.sin(angle));

        g2.drawLine(startX, startY, endX, endY);
        drawArrowHead(g2, endX, endY, angle);
    }
    
    private void drawArrowHead(Graphics2D g2, int x, int y, double angle) {
        int arrowLength = 12;
        int arrowWidth = 7;
        
        int x1 = (int) (x - arrowLength * Math.cos(angle - Math.PI / 7));
        int y1 = (int) (y - arrowLength * Math.sin(angle - Math.PI / 7));
        
        int x2 = (int) (x - arrowLength * Math.cos(angle + Math.PI / 7));
        int y2 = (int) (y - arrowLength * Math.sin(angle + Math.PI / 7));
        
        g2.fillPolygon(new int[]{x, x1, x2}, new int[]{y, y1, y2}, 3);
    }
}
