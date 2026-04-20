import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StudentList = ({ onSelectStudent, colors }) => {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const [showLimit, setShowLimit] = useState(6);

    useEffect(() => {
        fetchStudents();
    }, [currentPage, showLimit, filter]);

    const fetchStudents = async () => {
        setLoading(true);
        try {
            console.log('Fetching students...');
            // If filter is not 'all', we fetch all and filter client-side for now
            const response = await axios.get(`http://localhost:8000/students?limit=${showLimit}&page=${currentPage}`);
            console.log('Students response:', response.data);
            
            let allStudents = response.data.students || [];
            setTotalStudents(response.data.total || 0);
            setTotalPages(response.data.total_pages || 1);
            
            // Apply filter
            let filtered = allStudents;
            if (filter !== 'all') {
                filtered = allStudents.filter(s => s.risk_level === filter);
            }
            
            setStudents(filtered);
        } catch (error) {
            console.error('Error fetching students:', error);
        } finally {
            setLoading(false);
        }
    };

    const getRiskColor = (riskLevel) => {
        switch(riskLevel) {
            case 'Dropout': return '#EF4444';
            case 'Enrolled': return '#F59E0B';
            case 'Graduate': return '#10B981';
            default: return colors.textSecondary;
        }
    };

    const getRiskIcon = (riskLevel) => {
        switch(riskLevel) {
            case 'Dropout': return '⚠️';
            case 'Enrolled': return '🔄';
            case 'Graduate': return '✅';
            default: return '❓';
        }
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    const handleLimitChange = (e) => {
        setShowLimit(parseInt(e.target.value));
        setCurrentPage(1);
    };

    const styles = {
        container: {
            backgroundColor: colors.surface,
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            border: `1px solid ${colors.border}`,
        },
        header: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
        },
        title: {
            fontSize: '18px',
            fontWeight: '600',
            color: colors.text,
        },
        count: {
            fontSize: '12px',
            color: colors.textSecondary,
            backgroundColor: colors.background,
            padding: '2px 8px',
            borderRadius: '12px',
            marginLeft: '8px',
        },
        filterButtons: {
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
        },
        filterButton: {
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '12px',
            cursor: 'pointer',
            border: 'none',
            transition: 'all 0.2s ease',
            fontWeight: '500',
        },
        studentGrid: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '12px',
            marginBottom: '20px',
        },
        studentCard: {
            padding: '14px',
            backgroundColor: colors.background,
            borderRadius: '10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            border: `1px solid ${colors.border}`,
        },
        studentId: {
            fontFamily: 'monospace',
            fontSize: '13px',
            color: colors.text,
            marginBottom: '8px',
        },
        riskBadge: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
        },
        pagination: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            marginTop: '16px',
            paddingTop: '16px',
            borderTop: `1px solid ${colors.border}`,
        },
        pageButton: {
            padding: '8px 14px',
            borderRadius: '8px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.background,
            color: colors.text,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
        },
        pageButtonDisabled: {
            opacity: 0.5,
            cursor: 'not-allowed',
        },
        pageInfo: {
            color: colors.textSecondary,
            fontSize: '14px',
        },
        limitSelect: {
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: colors.background,
            border: `1px solid ${colors.border}`,
            color: colors.text,
            cursor: 'pointer',
        },
        emptyState: {
            textAlign: 'center',
            padding: '40px',
            color: colors.textSecondary,
        },
        statsRow: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            fontSize: '13px',
            color: colors.textSecondary,
        }
    };

    if (loading && students.length === 0) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>Loading students...</div>
            </div>
        );
    }

    if (students.length === 0 && !loading) {
        return (
            <div style={styles.container}>
                <div style={styles.emptyState}>
                    📭 No students found. Predictions will appear here.
                </div>
            </div>
        );
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <div style={styles.title}>
                    📋 Recent Students 
                    <span style={styles.count}>{totalStudents} total</span>
                </div>
                <div style={styles.filterButtons}>
                    <button 
                        onClick={() => { setFilter('all'); setCurrentPage(1); }}
                        style={{
                            ...styles.filterButton,
                            backgroundColor: filter === 'all' ? colors.primary : colors.border,
                            color: filter === 'all' ? 'white' : colors.textSecondary,
                        }}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => { setFilter('Dropout'); setCurrentPage(1); }}
                        style={{
                            ...styles.filterButton,
                            backgroundColor: filter === 'Dropout' ? '#EF4444' : colors.border,
                            color: filter === 'Dropout' ? 'white' : colors.textSecondary,
                        }}
                    >
                        ⚠️ High Risk
                    </button>
                    <button 
                        onClick={() => { setFilter('Enrolled'); setCurrentPage(1); }}
                        style={{
                            ...styles.filterButton,
                            backgroundColor: filter === 'Enrolled' ? '#F59E0B' : colors.border,
                            color: filter === 'Enrolled' ? 'white' : colors.textSecondary,
                        }}
                    >
                        🔄 At Risk
                    </button>
                    <button 
                        onClick={() => { setFilter('Graduate'); setCurrentPage(1); }}
                        style={{
                            ...styles.filterButton,
                            backgroundColor: filter === 'Graduate' ? '#10B981' : colors.border,
                            color: filter === 'Graduate' ? 'white' : colors.textSecondary,
                        }}
                    >
                        ✅ Low Risk
                    </button>
                </div>
            </div>

            <div style={styles.statsRow}>
                <span>Showing {students.length} of {totalStudents} students</span>
                <div>
                    Show: 
                    <select value={showLimit} onChange={handleLimitChange} style={styles.limitSelect}>
                        <option value={6}>6</option>
                        <option value={12}>12</option>
                        <option value={24}>24</option>
                    </select>
                </div>
            </div>

            <div style={styles.studentGrid}>
                {students.map((student) => (
                    <div 
                        key={student.student_id}
                        style={styles.studentCard}
                        onClick={() => onSelectStudent(student.student_id)}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.borderColor = colors.primary;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.borderColor = colors.border;
                        }}
                    >
                        <div style={styles.studentId}>📚 {student.student_id}</div>
                        <div style={{
                            ...styles.riskBadge,
                            backgroundColor: `${getRiskColor(student.risk_level)}20`,
                            color: getRiskColor(student.risk_level),
                        }}>
                            <span>{getRiskIcon(student.risk_level)}</span>
                            <span>{student.risk_level}</span>
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div style={styles.pagination}>
                    <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                            ...styles.pageButton,
                            ...(currentPage === 1 ? styles.pageButtonDisabled : {})
                        }}
                    >
                        ← Previous
                    </button>
                    <span style={styles.pageInfo}>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                            ...styles.pageButton,
                            ...(currentPage === totalPages ? styles.pageButtonDisabled : {})
                        }}
                    >
                        Next →
                    </button>
                </div>
            )}
        </div>
    );
};

export default StudentList;