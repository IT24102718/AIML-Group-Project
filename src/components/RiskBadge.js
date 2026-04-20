import React from 'react';

const RiskBadge = ({ riskLevel, confidence }) => {
    const getConfig = () => {
        switch(riskLevel) {
            case 'Dropout':
                return {
                    color: '#EF4444',
                    bg: 'rgba(239, 68, 68, 0.1)',
                    icon: '⚠️',
                    label: 'High Risk',
                    severity: 'Critical'
                };
            case 'Enrolled':
                // Add severity based on confidence
                const severity = confidence > 0.6 ? 'Moderate Risk' : 'At Risk';
                return {
                    color: '#F59E0B',
                    bg: 'rgba(245, 158, 11, 0.1)',
                    icon: '🔄',
                    label: severity,
                    severity: severity
                };
            case 'Graduate':
                return {
                    color: '#10B981',
                    bg: 'rgba(16, 185, 129, 0.1)',
                    icon: '✅',
                    label: 'Low Risk',
                    severity: 'Good Standing'
                };
            default:
                return {
                    color: '#94A3B8',
                    bg: 'rgba(148, 163, 184, 0.1)',
                    icon: '❓',
                    label: 'Unknown',
                    severity: 'Unknown'
                };
        }
    };

    const config = getConfig();

    const styles = {
        badge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 20px',
            borderRadius: '40px',
            color: config.color,
            backgroundColor: config.bg,
            fontWeight: '600',
            fontSize: '14px',
            border: `1px solid ${config.color}`,
            backdropFilter: 'blur(4px)',
        },
        tooltip: {
            fontSize: '11px',
            opacity: 0.7,
            marginLeft: '4px',
        }
    };

    return (
        <div style={styles.badge}>
            <span>{config.icon}</span>
            <span>{config.label}</span>
            {confidence && (
                <span style={styles.tooltip}>({Math.round(confidence * 100)}%)</span>
            )}
        </div>
    );
};

export default RiskBadge;