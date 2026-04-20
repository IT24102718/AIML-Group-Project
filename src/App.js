// src/App.js - SIMPLE VERSION (Removed "High Risk Student" box)

import React, { useState } from 'react';
import { explainStudent } from './services/api';

import SearchBox from './components/SearchBox';
import StudentList from './components/StudentList';
import ConfidenceMeter from './components/ConfidenceMeter';
import FeatureImpactList from './components/FeatureImpactList';
import LoadingSpinner from './components/LoadingSpinner';

function App() {
    const [loading, setLoading] = useState(false);
    const [explanation, setExplanation] = useState(null);
    const [error, setError] = useState(null);

    const handleSearch = async (studentId) => {
        setLoading(true);
        setError(null);
        
        try {
            const result = await explainStudent(studentId);
            setExplanation(result);
        } catch (err) {
            setError('Failed to get explanation. Please check the student ID.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const colors = {
        primary: '#7C3AED',
        secondary: '#10B981',
        background: '#0F172A',
        surface: '#1E293B',
        text: '#F1F5F9',
        textSecondary: '#94A3B8',
        border: '#334155',
        error: '#EF4444',
        warning: '#F59E0B',
    };

    // Simple Risk Text (no forced "High Risk Student")
    const getRiskText = (riskLevel) => {
        if (!riskLevel) return "Unknown Risk";
        
        const level = riskLevel.toString().toLowerCase().trim();
        
        if (level === 'dropout') return "Dropout Risk Student";
        if (level === 'enrolled') return "At Risk Student";
        if (level === 'graduate') return "Low Risk Student";
        
        return riskLevel;
    };

    const riskText = explanation ? getRiskText(explanation.risk_level) : "";

    return (
        <div style={{ 
            minHeight: '100vh', 
            backgroundColor: colors.background, 
            fontFamily: "'Inter', sans-serif" 
        }}>
            <header style={{
                backgroundColor: colors.surface,
                borderBottom: `1px solid ${colors.border}`,
                padding: '24px 20px',
                textAlign: 'center'
            }}>
                <h1 style={{
                    margin: 0,
                    fontSize: '28px',
                    fontWeight: 'bold',
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                }}>
                    🎓 Student Dropout Risk Predictor
                </h1>
                <p style={{ margin: '8px 0 0', fontSize: '14px', color: colors.textSecondary }}>
                    AI-Powered Risk Analysis with SHAP Explanations
                </p>
            </header>

            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
                <SearchBox onSearch={handleSearch} loading={loading} colors={colors} />
                <StudentList onSelectStudent={handleSearch} colors={colors} />

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        color: colors.error,
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '24px',
                        border: `1px solid ${colors.error}`,
                        textAlign: 'center'
                    }}>
                        ⚠️ {error}
                    </div>
                )}

                {loading && <LoadingSpinner colors={colors} />}

                {!loading && explanation && (
                    <div style={{
                        backgroundColor: colors.surface,
                        borderRadius: '16px',
                        padding: '32px',
                        marginBottom: '32px',
                        border: `1px solid ${colors.border}`,
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}>
                        {/* Student ID */}
                        <div style={{
                            fontSize: '14px',
                            color: colors.textSecondary,
                            fontFamily: 'monospace',
                            backgroundColor: colors.background,
                            padding: '6px 14px',
                            borderRadius: '9999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '20px'
                        }}>
                            📚 Student ID: <strong>{explanation.student_id}</strong>
                        </div>

                        {/* Confidence Meter */}
                        <ConfidenceMeter 
                            confidence={explanation.confidence} 
                            colors={colors}
                        />

                        {/* SIMPLE SUMMARY BOX - No "High Risk Student" forced */}
                        <div style={{
                            background: 'rgba(30, 41, 59, 0.8)',
                            border: `1px solid #475569`,
                            borderRadius: '12px',
                            padding: '18px 20px',
                            marginTop: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            color: colors.text,
                            fontSize: '16px'
                        }}>
                            <span style={{ fontSize: '22px' }}></span>
                            <strong>{riskText}</strong>
                        </div>
                    </div>
                )}

                {!loading && explanation && (
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: '1fr 1fr', 
                        gap: '32px' 
                    }}>
                        <FeatureImpactList
                            factors={explanation.top_risk_factors || []}
                            title="⚠️ Risk Factors"
                            isRisk={true}
                            colors={colors}
                        />
                        <FeatureImpactList
                            factors={explanation.top_protective_factors || []}
                            title="✅ Protective Factors"
                            isRisk={false}
                            colors={colors}
                        />
                    </div>
                )}

                {!loading && !explanation && !error && (
                    <div style={{
                        backgroundColor: colors.surface,
                        borderRadius: '16px',
                        padding: '80px 40px',
                        textAlign: 'center',
                        border: `1px solid ${colors.border}`,
                        color: colors.textSecondary
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
                        <h3>Ready to Analyze</h3>
                        <p>Type a Student ID above or click on any student card</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;