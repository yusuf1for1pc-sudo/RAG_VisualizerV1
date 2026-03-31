package rag;

import java.awt.BorderLayout;
import java.awt.Color;
import java.awt.Cursor;
import java.awt.Dimension;
import java.awt.Font;
import java.awt.GridLayout;
import java.awt.event.MouseAdapter;
import java.awt.event.MouseEvent;
import java.util.List;
import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;

public class Main extends JFrame {
    private GraphPanel graphPanel;
    private JLabel statusLabel;

    public Main() {
        // Set Look and Feel to System default
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception e) {
            e.printStackTrace();
        }

        setTitle("Resource Allocation Graph Visualizer");
        setSize(1000, 700);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);
        setLayout(new BorderLayout());

        // Header Panel
        JPanel headerPanel = new JPanel(new BorderLayout());
        headerPanel.setBackground(new Color(41, 128, 185));
        headerPanel.setBorder(BorderFactory.createEmptyBorder(15, 20, 15, 20));
        JLabel titleLabel = new JLabel("OS Resource Allocation Graph Visualizer");
        titleLabel.setFont(new Font("Segoe UI", Font.BOLD, 22));
        titleLabel.setForeground(Color.WHITE);
        headerPanel.add(titleLabel, BorderLayout.WEST);
        add(headerPanel, BorderLayout.NORTH);

        // Center Graph Panel
        graphPanel = new GraphPanel();
        add(graphPanel, BorderLayout.CENTER);

        // Sidebar toolbar
        JPanel sidebar = new JPanel();
        sidebar.setLayout(new GridLayout(8, 1, 0, 15));
        sidebar.setBackground(new Color(44, 62, 80)); // Dark sidebar
        sidebar.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        sidebar.setPreferredSize(new Dimension(240, 0));

        JButton btnAddProcess = createStyledButton("Add Process", new Color(52, 152, 219));
        btnAddProcess.addActionListener(e -> graphPanel.setTool(GraphPanel.Tool.ADD_PROCESS));

        JButton btnAddResource = createStyledButton("Add Resource", new Color(46, 204, 113));
        btnAddResource.addActionListener(e -> graphPanel.setTool(GraphPanel.Tool.ADD_RESOURCE));

        JButton btnAddRequest = createStyledButton("Add Request Edge", new Color(155, 89, 182));
        btnAddRequest.addActionListener(e -> graphPanel.setTool(GraphPanel.Tool.ADD_REQUEST_EDGE));

        JButton btnAddAllocation = createStyledButton("Add Allocation Edge", new Color(241, 196, 15));
        btnAddAllocation.setForeground(Color.BLACK); // Make text visible on yellow
        btnAddAllocation.addActionListener(e -> graphPanel.setTool(GraphPanel.Tool.ADD_ALLOCATION_EDGE));

        JButton btnRemove = createStyledButton("Remove Element", new Color(149, 165, 166));
        btnRemove.addActionListener(e -> graphPanel.setTool(GraphPanel.Tool.REMOVE));

        JButton btnCheckDeadlock = createStyledButton("Check Deadlock (DFS)", new Color(231, 76, 60));
        btnCheckDeadlock.addActionListener(e -> checkDeadlock());

        JButton btnClear = createStyledButton("Clear Canvas", new Color(52, 73, 94));
        btnClear.addActionListener(e -> {
            graphPanel.getGraph().getNodes().clear();
            graphPanel.getGraph().getEdges().clear();
            graphPanel.repaint();
        });

        sidebar.add(btnAddProcess);
        sidebar.add(btnAddResource);
        sidebar.add(btnAddRequest);
        sidebar.add(btnAddAllocation);
        sidebar.add(btnRemove);
        sidebar.add(new JPanel() {{ setBackground(new Color(44, 62, 80)); }}); // Spacer
        sidebar.add(btnCheckDeadlock);
        sidebar.add(btnClear);

        add(sidebar, BorderLayout.WEST);

        // Status bar bottom
        JPanel statusPanel = new JPanel(new BorderLayout());
        statusPanel.setBackground(new Color(52, 73, 94));
        statusPanel.setBorder(BorderFactory.createEmptyBorder(8, 15, 8, 15));
        statusLabel = new JLabel("Status: Ready. Select a tool to begin.");
        statusLabel.setFont(new Font("Segoe UI", Font.PLAIN, 14));
        statusLabel.setForeground(Color.WHITE);
        statusPanel.add(statusLabel, BorderLayout.WEST);
        add(statusPanel, BorderLayout.SOUTH);

        // Wire status updates
        graphPanel.setStatusListener(status -> statusLabel.setText("Status: " + status));

        // Start with default tool
        graphPanel.setTool(GraphPanel.Tool.ADD_PROCESS);
    }

    private JButton createStyledButton(String text, Color baseColor) {
        JButton btn = new JButton(text);
        btn.setFont(new Font("Segoe UI", Font.BOLD, 14));
        btn.setBackground(baseColor);
        btn.setForeground(Color.WHITE);
        btn.setFocusPainted(false);
        btn.setBorder(BorderFactory.createEmptyBorder(10, 10, 10, 10));
        btn.setCursor(new Cursor(Cursor.HAND_CURSOR));
        
        // Hover effect setup
        btn.addMouseListener(new MouseAdapter() {
            public void mouseEntered(MouseEvent evt) {
                btn.setBackground(baseColor.brighter());
            }
            public void mouseExited(MouseEvent evt) {
                btn.setBackground(baseColor);
            }
        });

        return btn;
    }

    private void checkDeadlock() {
        List<Node> cycle = graphPanel.getGraph().detectDeadlock();
        if (!cycle.isEmpty()) {
            graphPanel.getGraph().highlightCycle(cycle);
            graphPanel.repaint();
            statusLabel.setText("Status: DEADLOCK DETECTED! Cycle highlighted in red.");
            JOptionPane.showMessageDialog(this, "Deadlock Detected! Cycle contains " + (cycle.size()-1) + " nodes.", "Deadlock Status", JOptionPane.ERROR_MESSAGE);
        } else {
            graphPanel.getGraph().clearHighlight();
            graphPanel.repaint();
            statusLabel.setText("Status: System is Safe. No deadlocks found.");
            JOptionPane.showMessageDialog(this, "No Deadlock", "System Safe", JOptionPane.INFORMATION_MESSAGE);
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            Main app = new Main();
            app.setVisible(true);
        });
    }
}
