package rag;

import java.awt.Graphics2D;

public abstract class Node {
    protected String id;
    protected int x;
    protected int y;
    protected boolean isHighlighted;

    public Node(String id, int x, int y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isHighlighted = false;
    }

    public String getId() {
        return id;
    }

    public int getX() {
        return x;
    }

    public int getY() {
        return y;
    }

    public void setX(int x) {
        this.x = x;
    }

    public void setY(int y) {
        this.y = y;
    }

    public boolean isHighlighted() {
        return isHighlighted;
    }

    public void setHighlighted(boolean highlighted) {
        isHighlighted = highlighted;
    }

    // Abstract method to let subclasses define how they are drawn
    public abstract void draw(Graphics2D g2);
    
    // Abstract method to check if a point is inside the node (for mouse selection)
    public abstract boolean contains(int mx, int my);
}
