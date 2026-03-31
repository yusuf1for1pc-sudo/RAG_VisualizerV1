package rag;

import java.awt.BasicStroke;
import java.awt.Color;
import java.awt.Font;
import java.awt.FontMetrics;
import java.awt.Graphics2D;

public class ProcessNode extends Node {
    public static final int RADIUS = 25; // Circle radius

    public ProcessNode(String id, int x, int y) {
        super(id, x, y);
    }

    @Override
    public void draw(Graphics2D g2) {
        int diameter = RADIUS * 2;
        int drawX = x - RADIUS;
        int drawY = y - RADIUS;

        // Draw shadow
        g2.setColor(new Color(0, 0, 0, 60));
        g2.fillOval(drawX + 3, drawY + 3, diameter, diameter);

        // Draw fill
        g2.setColor(isHighlighted ? new Color(231, 76, 60) : new Color(52, 152, 219));
        g2.fillOval(drawX, drawY, diameter, diameter);

        // Draw border
        g2.setColor(isHighlighted ? new Color(192, 57, 43) : new Color(41, 128, 185));
        g2.setStroke(new BasicStroke(isHighlighted ? 4 : 2));
        g2.drawOval(drawX, drawY, diameter, diameter);

        // Draw ID text
        g2.setColor(Color.WHITE);
        g2.setFont(new Font("Segoe UI", Font.BOLD, 14));
        FontMetrics fm = g2.getFontMetrics();
        int textWidth = fm.stringWidth(id);
        int textX = x - (textWidth / 2);
        int textY = y + (fm.getAscent() / 2) - 2;
        g2.drawString(id, textX, textY);
    }

    @Override
    public boolean contains(int mx, int my) {
        double dist = Math.sqrt(Math.pow(mx - x, 2) + Math.pow(my - y, 2));
        return dist <= RADIUS;
    }
}
