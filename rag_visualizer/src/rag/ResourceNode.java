package rag;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;

public class ResourceNode extends Node {
    public static final int SIZE = 50; // Square side length
    private int instances;

    public ResourceNode(String id, int x, int y, int instances) {
        super(id, x, y);
        this.instances = instances;
    }

    public ResourceNode(String id, int x, int y) {
        this(id, x, y, 1);
    }

    public int getInstances() {
        return instances;
    }

    public void setInstances(int instances) {
        this.instances = instances;
    }

    @Override
    public void draw(Graphics2D g2) {
        int drawX = x - SIZE / 2;
        int drawY = y - SIZE / 2;

        // Draw shadow
        g2.setColor(new Color(0, 0, 0, 60));
        g2.fillRect(drawX + 3, drawY + 3, SIZE, SIZE);

        // Draw fill (Emerald Green)
        g2.setColor(isHighlighted ? new Color(231, 76, 60) : new Color(46, 204, 113));
        g2.fillRect(drawX, drawY, SIZE, SIZE);

        // Draw border
        g2.setColor(isHighlighted ? new Color(192, 57, 43) : new Color(39, 174, 96));
        g2.setStroke(new BasicStroke(isHighlighted ? 4 : 2));
        g2.drawRect(drawX, drawY, SIZE, SIZE);

        // Draw ID text
        g2.setColor(Color.WHITE);
        g2.setFont(new Font("Segoe UI", Font.BOLD, 14));
        FontMetrics fm = g2.getFontMetrics();
        int textWidth = fm.stringWidth(id);
        int textX = x - (textWidth / 2);
        int textY = y + (fm.getAscent() / 2) - 8;
        g2.drawString(id, textX, textY);

        // Instances
        if (instances > 1) {
            String instText = "Inst: " + instances;
            g2.setFont(new Font("Segoe UI", Font.PLAIN, 10));
            int instW = g2.getFontMetrics().stringWidth(instText);
            g2.drawString(instText, x - instW / 2, drawY + SIZE - 5);
        } else {
             g2.setColor(new Color(255, 255, 255, 180));
             g2.fillOval(x - 3, y + 8, 6, 6);
        }
    }

    @Override
    public boolean contains(int mx, int my) {
        int drawX = x - SIZE / 2;
        int drawY = y - SIZE / 2;
        return mx >= drawX && mx <= drawX + SIZE && my >= drawY && my <= drawY + SIZE;
    }
}
