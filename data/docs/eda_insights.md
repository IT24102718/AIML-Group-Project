---
title: Student Dropout Prediction - EDA Report
---

::: {.container}
# 📊 Student Dropout Prediction - Exploratory Data Analysis {#student-dropout-prediction---exploratory-data-analysis}

Generated on: 2026-02-21 05:51:14

Author: IT24103869 - Thennakoon T.M.S.D

::: {.stats}
## 1. Dataset Overview {#dataset-overview}

**Total Records:** 4424

**Total Features:** 48

**Numerical Features:** 45

**Categorical Features:** 3
:::

## 2. Target Distribution {#target-distribution}

| Outcome  | Count | Percentage |
|----------|-------|------------|
| Graduate | 2209  | 49.9%      |
| Dropout  | 1421  | 32.1%      |
| Enrolled | 794   | 17.9%      |

## 3. Top Risk Factors (SHAP Analysis) {#top-risk-factors-shap-analysis}

| Rank | Feature                                 | Dropout Impact | Graduate Impact | Key Insight                 |
|------|-----------------------------------------|----------------|-----------------|-----------------------------|
| 1    | **failure_rate_sem2**                   | 0.18           | 0.15            | ⚠️ Strong dropout predictor |
| 2    | **risk_score**                          | 0.15           | 0.14            | ⚠️ Strong dropout predictor |
| 3    | **success_rate_sem2**                   | 0.12           | 0.11            | ⚠️ Strong dropout predictor |
| 4    | **academic_performance_score**          | 0.10           | 0.09            | ⚠️ Strong dropout predictor |
| 5    | **Curricular units 2nd sem (approved)** | 0.11           | 0.10            | ⚠️ Strong dropout predictor |
| 6    | **failure_rate_sem1**                   | 0.10           | 0.09            | ⚠️ Strong dropout predictor |
| 7    | **success_rate_sem1**                   | 0.09           | 0.08            | ⚠️ Strong dropout predictor |
| 8    | **Tuition fees up to date**             | 0.08           | 0.07            | ⚠️ Strong dropout predictor |
| 9    | **Curricular units 1st sem (approved)** | 0.07           | 0.06            | ⚠️ Strong dropout predictor |
| 10   | **Curricular units 2nd sem (grade)**    | 0.06           | 0.05            | ⚠️ Strong dropout predictor |

## 4. Correlation with Dropout {#correlation-with-dropout}

| Rank | Feature                             | Correlation | Strength |
|------|-------------------------------------|-------------|----------|
| 1    | success_rate_sem2                   | 0.699       | Strong   |
| 2    | academic_performance_score          | 0.696       | Strong   |
| 3    | success_rate_sem1                   | 0.627       | Strong   |
| 4    | Curricular units 2nd sem (approved) | 0.624       | Strong   |
| 5    | Curricular units 2nd sem (grade)    | 0.567       | Strong   |
| 6    | Curricular units 1st sem (approved) | 0.529       | Strong   |
| 7    | Curricular units 1st sem (grade)    | 0.485       | Strong   |
| 8    | family_support                      | 0.439       | Strong   |
| 9    | Tuition fees up to date             | 0.410       | Strong   |
| 10   | Scholarship holder                  | 0.298       | Moderate |

## 5. Risk Score Thresholds {#risk-score-thresholds}

::: {.grid}
::: {.card}
### Low Risk

\< 0.38

1237 students
:::

::: {.card}
### Medium Risk

0.38 - 2.00

1745 students
:::

::: {.card}
### High Risk

\> 2.00

1442 students
:::
:::

## 6. Key Insights {#key-insights}

- [32.1%]{.highlight} of students are at risk of dropping out
- Top 3 dropout predictors:
  - **failure_rate_sem2** (SHAP impact: 0.18)
  - **risk_score** (SHAP impact: 0.15)
  - **success_rate_sem2** (SHAP impact: 0.12)
- Risk score threshold for high risk: [2.00]{.highlight}
- Students with [low success_rate_sem2]{.highlight} are most likely to dropout
- Protective factors: **family_support**, **Tuition fees up to date**

## 7. Visualizations Generated {#visualizations-generated}

- target_distribution.png - Target variable distribution
- feature_distributions.png - Key feature distributions
- box_plots.png - Outlier analysis
- categorical_analysis.png - Categorical feature impact
- correlation_heatmap_full.png - Full correlation matrix
- correlation_heatmap_top20.png - Top 20 features correlation
- shap_feature_importance_by_class.png - SHAP analysis by outcome
- feature_impact_matrix.png - Feature impact matrix
- risk_score_distribution.png - Risk score analysis
- pair_plot.png - Pair plot of key features

## 8. Recommendations for Intervention {#recommendations-for-intervention}

1.  **Immediate intervention** for students with risk_score \> 2.00
2.  **Monitor** students with success_rate_sem2 \< 50%
3.  **Financial counseling** for students with tuition fees not up to date
4.  **Academic support** for students with high failure_rate_sem2
5.  **Regular check-ins** for students with low family_support scores
:::
