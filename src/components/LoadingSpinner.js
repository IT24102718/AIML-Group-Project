import React from 'react';

const LoadingSpinner = ({ colors }) => {
    const styles = {
        container: {
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px',
        },
        spinner: {
            width: '50px',
            height: '50px',
            border: `4px solid ${colors.surface}`,
            borderTop: `4px solid ${colors.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
        },
        text: {
            marginTop: '16px',
            color: colors.textSecondary,
            fontSize: '14px',
        }
    };

    return (
        <div style={styles.container}>
            <style>
                {`
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                `}
            </style>
            <div style={styles.spinner}></div>
            <div style={styles.text}>Analyzing student data...</div>
        </div>
    );
};

export default LoadingSpinner;