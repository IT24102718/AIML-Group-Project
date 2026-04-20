import React, { useState } from 'react';

const SearchBox = ({ onSearch, loading, colors }) => {
    const [studentId, setStudentId] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (studentId.trim()) {
            onSearch(studentId.trim());
        }
    };

    const styles = {
        container: {
            marginBottom: '32px',
        },
        form: {
            display: 'flex',
            gap: '12px',
        },
        input: {
            flex: 1,
            padding: '14px 18px',
            fontSize: '16px',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            outline: 'none',
            color: colors.text,
            transition: 'all 0.3s ease',
        },
        inputFocus: {
            borderColor: colors.primary,
            boxShadow: `0 0 0 2px ${colors.primary}40`,
        },
        button: {
            padding: '14px 28px',
            fontSize: '16px',
            fontWeight: '600',
            backgroundColor: colors.primary,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
        },
        buttonHover: {
            backgroundColor: '#6C2ED9',
            transform: 'translateY(-1px)',
        },
        buttonDisabled: {
            backgroundColor: colors.border,
            cursor: 'not-allowed',
            opacity: 0.6,
        }
    };

    const [isFocused, setIsFocused] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.form}>
                <input
                    type="text"
                    placeholder="Enter Student ID (e.g., STU20260318224803)"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    style={{
                        ...styles.input,
                        ...(isFocused ? styles.inputFocus : {})
                    }}
                    disabled={loading}
                />
                <button
                    type="submit"
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    style={{
                        ...styles.button,
                        ...(isHovered && !loading ? styles.buttonHover : {}),
                        ...(loading ? styles.buttonDisabled : {})
                    }}
                    disabled={loading}
                >
                    {loading ? 'Analyzing...' : 'Analyze'}
                </button>
            </form>
        </div>
    );
};

export default SearchBox;