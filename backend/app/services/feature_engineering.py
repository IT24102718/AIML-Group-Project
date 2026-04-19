def calculate_engineered_features(student_data):
    """
    Calculate the 24 features needed for the ML model.

    Keys are kept consistent with the strings stored in selected_features.pkl
    (a mix of original dataset column names and engineered feature names).
    """

    def safe_div(a, b):
        return a / b if b > 0 else 0

    # ----- Engineered values -----
    success_rate_sem1 = safe_div(
        student_data.curricular_units_1st_sem_approved,
        student_data.curricular_units_1st_sem_enrolled,
    )
    success_rate_sem2 = safe_div(
        student_data.curricular_units_2nd_sem_approved,
        student_data.curricular_units_2nd_sem_enrolled,
    )
    failure_rate_sem1 = 1 - success_rate_sem1
    failure_rate_sem2 = 1 - success_rate_sem2

    grade_improvement = (
        student_data.curricular_units_2nd_sem_grade
        - student_data.curricular_units_1st_sem_grade
    )

    family_support = (
        (student_data.scholarship_holder * 2)
        + student_data.tuition_fees_up_to_date
        + (1 - student_data.debtor)
        + (student_data.displaced * 0.5)
    )

    parents_education = (
        student_data.mothers_qualification + student_data.fathers_qualification
    ) / 2

    academic_performance = (
        student_data.curricular_units_1st_sem_grade * success_rate_sem1
        + student_data.curricular_units_2nd_sem_grade * success_rate_sem2
    ) / 2

    risk_score = (
        (1 - success_rate_sem2) * 3
        + (1 - student_data.tuition_fees_up_to_date) * 2
        + student_data.debtor * 2
        + (1 if student_data.age_at_enrollment > 25 else 0)
    )

    # ----- Return dict keyed exactly as selected_features.pkl -----
    # Original-column features use the dataset's display names;
    # engineered features use their snake_case names.
    return {
        # Original dataset columns (display-name format matching the pkl)
        "Course": student_data.course,
        "Mother's qualification": student_data.mothers_qualification,
        "Father's qualification": student_data.fathers_qualification,
        "Mother's occupation": student_data.mothers_occupation,
        "Father's occupation": student_data.fathers_occupation,
        "Tuition fees up to date": student_data.tuition_fees_up_to_date,
        "Age at enrollment": student_data.age_at_enrollment,
        "Curricular units 1st sem (evaluations)": student_data.curricular_units_1st_sem_evaluations,
        "Curricular units 1st sem (approved)": student_data.curricular_units_1st_sem_approved,
        "Curricular units 1st sem (grade)": student_data.curricular_units_1st_sem_grade,
        "Curricular units 2nd sem (evaluations)": student_data.curricular_units_2nd_sem_evaluations,
        "Curricular units 2nd sem (approved)": student_data.curricular_units_2nd_sem_approved,
        "Curricular units 2nd sem (grade)": student_data.curricular_units_2nd_sem_grade,
        "Unemployment rate": student_data.unemployment_rate,
        "Inflation rate": student_data.inflation_rate,
        # Engineered features (snake_case as stored in pkl)
        "success_rate_sem1": success_rate_sem1,
        "success_rate_sem2": success_rate_sem2,
        "grade_improvement": grade_improvement,
        "failure_rate_sem1": failure_rate_sem1,
        "failure_rate_sem2": failure_rate_sem2,
        "family_support": family_support,
        "parents_education": parents_education,
        "academic_performance_score": academic_performance,
        "risk_score": risk_score,
    }