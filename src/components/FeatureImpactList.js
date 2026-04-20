// src/components/FeatureImpactList.js
import React, { useState } from 'react';

const FeatureImpactList = ({ factors, title, isRisk, colors }) => {
    const [expanded, setExpanded] = useState(null);

    // === STRICTLY SHOW ONLY TOP 5 FACTORS ===
    const displayFactors = factors ? factors.slice(0, 5) : [];

    // Detailed advice (your original logic)
    const getDetailedAdvice = (feature, isRiskFactor) => {
        const adviceMap = {
            "Father's qualification": {
                risk: "Students whose fathers have lower education levels often lack academic guidance at home. Connect with the student mentoring program for additional support.",
                protective: "Your father's education provides a strong foundation. Use this support system to excel in your studies."
            },
            "Mother's qualification": {
                risk: "Consider joining peer study groups and utilizing academic support services to supplement guidance at home.",
                protective: "Your mother's educational background is an asset. Leverage her experience for academic planning."
            },
            "Course": {
                risk: "This course selection may not align with your strengths. Speak with an academic advisor about your options.",
                protective: "This course matches your academic profile well. Stay engaged and maintain your performance."
            },
            "failure_rate_sem2": {
                risk: "Your failure rate is concerning. Schedule a meeting with your academic advisor immediately. Consider reducing course load.",
                protective: "Your low failure rate shows good academic standing. Keep up the consistent effort."
            },
            "risk_score": {
                risk: "This score indicates multiple risk factors. Meet with a student success counselor to develop a personalized plan.",
                protective: "Your risk score is low - you're on the right track! Maintain good study habits."
            },
            "success_rate_sem2": {
                risk: "Low success rate suggests difficulty with current courses. Join study groups and attend office hours.",
                protective: "Excellent success rate! Keep utilizing your effective study strategies."
            },
            "Tuition fees up to date": {
                risk: "Unpaid tuition can lead to deregistration. Visit financial aid office immediately to discuss payment plans.",
                protective: "Keeping fees current is crucial. Stay on top of payment deadlines."
            },
            "Scholarship holder": {
                risk: "Apply for scholarships to reduce financial stress. Check the financial aid portal for opportunities.",
                protective: "Your scholarship recognizes your achievements. Maintain your grades to keep it."
            },
            "Debtor": {
                risk: "Financial stress affects academic performance. Seek free financial counseling services on campus.",
                protective: "Good financial management - this reduces stress and improves focus."
            },
            "Age at enrollment": {
                risk: "As a mature student, you may face unique challenges. Connect with the mature student support group.",
                protective: "Your age brings valuable life experience. Leverage this in group projects."
            },
            "Curricular units 2nd sem (approved)": {
                risk: "Low credit completion may delay graduation. Meet with advisor to adjust your study plan.",
                protective: "Good credit completion rate. Stay consistent with your study schedule."
            },
            "academic_performance_score": {
                risk: "Your performance score needs improvement. Attend tutoring sessions and extra classes.",
                protective: "Strong academic performance! Keep applying effective study techniques."
            }
        };

        const key = adviceMap[feature];
        if (key) {
            return isRiskFactor ? key.risk : key.protective;
        }
        return isRiskFactor 
            ? `This factor may be contributing to your risk. Speak with your academic advisor about improving ${feature}.`
            : `This is a positive factor. Continue maintaining your ${feature} strength.`;
    };

    const getIcon = (feature) => {
        const icons = {
            "Father's qualification": "👨‍🎓",
            "Mother's qualification": "👩‍🎓",
            "Course": "📚",
            "failure_rate_sem2": "📉",
            "risk_score": "⚠️",
            "success_rate_sem2": "📈",
            "Tuition fees up to date": "💰",
            "Scholarship holder": "🏆",
            "Debtor": "💳",
            "Age at enrollment": "🎂",
            "Curricular units 2nd sem (approved)": "✅",
            "academic_performance_score": "⭐"
        };
        return icons[feature] || "📊";
    };

    const styles = {
        container: { marginBottom: '24px' },
        title: {
            fontSize: '20px',
            fontWeight: '600',
            marginBottom: '20px',
            color: isRisk ? '#EF4444' : colors.secondary,
            borderBottom: `2px solid ${isRisk ? '#EF4444' : colors.secondary}`,
            paddingBottom: '8px',
            display: 'inline-block',
        },
        item: {
            marginBottom: '16px',
            padding: '18px',
            backgroundColor: colors.background,
            borderRadius: '12px',
            borderLeft: `4px solid ${isRisk ? '#EF4444' : colors.secondary}`,
            transition: 'all 0.3s ease',
            cursor: 'pointer',
        },
        itemHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
        },
        featureName: {
            fontWeight: '600',
            fontSize: '15px',
            color: colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
        },
        impactValue: {
            fontSize: '13px',
            fontWeight: '500',
            color: isRisk ? '#EF4444' : colors.secondary,
            fontFamily: 'monospace',
        },
        impactBar: {
            height: '10px',           // ← Made thicker and more visible
            backgroundColor: colors.surface,
            borderRadius: '3px',
            margin: '12px 0',
            overflow: 'hidden',
        },
        impactFill: {
            height: '100%',
            backgroundColor: isRisk ? '#EF4444' : colors.secondary,
            borderRadius: '3px',
            transition: 'width 0.4s ease',
        },
        advice: {
            fontSize: '13px',
            color: colors.textSecondary,
            marginTop: '12px',
            paddingTop: '12px',
            borderTop: `1px solid ${colors.border}`,
            lineHeight: '1.5',
        },
        expandIcon: {
            fontSize: '12px',
            color: colors.textSecondary,
            transition: 'transform 0.3s ease',
        },
        badge: {
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '12px',
            backgroundColor: isRisk ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
            color: isRisk ? '#EF4444' : colors.secondary,
        }
    };

    if (displayFactors.length === 0) {
        return null;
    }

    return (
        <div style={styles.container}>
            <h3 style={styles.title}>{title}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {displayFactors.map((factor, index) => {
                    // Bar width (made more visible)
                    const barWidth = Math.min(Math.abs(factor.impact) * 800, 100);

                    return (
                        <li 
                            key={index} 
                            style={styles.item}
                            onClick={() => setExpanded(expanded === index ? null : index)}
                        >
                            <div style={styles.itemHeader}>
                                <div style={styles.featureName}>
                                    <span>{getIcon(factor.feature)}</span>
                                    <span>{factor.feature}</span>
                                    {factor.impact > 0.02 && (
                                        <span style={styles.badge}>High Impact</span>
                                    )}
                                </div>
                                <div style={styles.impactValue}>
                                    Impact: {factor.impact.toFixed(4)}
                                </div>
                            </div>
                            
                            {/* SMALL BAR GRAPH - Now clearly visible */}
                            <div style={styles.impactBar}>
                                <div style={{
                                    ...styles.impactFill,
                                    width: `${barWidth}%`
                                }}></div>
                            </div>
                            
                            <div style={styles.advice}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>💡</span>
                                    <span>{factor.advice}</span>
                                </div>
                                
                                {expanded === index && (
                                    <div style={{ 
                                        marginTop: '12px', 
                                        paddingTop: '12px',
                                        borderTop: `1px solid ${colors.border}`,
                                        fontSize: '12px',
                                        color: colors.textSecondary,
                                        lineHeight: '1.6'
                                    }}>
                                        <strong>📖 Detailed Explanation:</strong><br />
                                        {getDetailedAdvice(factor.feature, isRisk)}
                                    </div>
                                )}
                            </div>
                            
                            <div style={{ 
                                textAlign: 'right', 
                                marginTop: '8px',
                                fontSize: '11px',
                                color: colors.textSecondary
                            }}>
                                {expanded === index ? '▼ Click to collapse' : '▶ Click for details'}
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

export default FeatureImpactList;