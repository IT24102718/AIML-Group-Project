import React from 'react';

const ConfidenceMeter = ({ confidence, colors }) => {
    const percentage = Math.round(confidence * 100);
    
    const getColor = () => {
        if (percentage >= 70) return colors.secondary;
        if (percentage >= 50) return '#F59E0B';
        return '#EF4444';
    };

    const styles = {
        container: {
            marginBottom: '24px',
        },
        label: {
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px',
            fontSize: '14px',
            fontWeight: '500',
            color: colors.textSecondary,
        },
        barContainer: {
            backgroundColor: colors.background,
            borderRadius: '20px',
            overflow: 'hidden',
            height: '10px',
        },
        bar: {
            width: `${percentage}%`,
            backgroundColor: getColor(),
            height: '100%',
            borderRadius: '20px',
            transition: 'width 0.5s ease',
            boxShadow: `0 0 8px ${getColor()}80`,
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.label}>
                <span>Prediction Confidence</span>
                <span style={{ fontWeight: 'bold', color: getColor() }}>{percentage}%</span>
            </div>
            <div style={styles.barContainer}>
                <div style={styles.bar}></div>
            </div>
        </div>
    );
};

export default ConfidenceMeter;