# GeoDrishti-NER
# Hybrid Landslide Risk Engine
# Step 3.10

def calculate_factor_of_safety(
    cohesion,
    normal_stress,
    pore_pressure,
    friction_angle,
    shear_stress
):
    """
    Calculate Factor of Safety (FS).

    FS = Resisting Force / Driving Force

    Effective normal stress:
    sigma' = normal_stress - pore_pressure

    Shear strength:
    strength = cohesion + sigma' * tan(phi)

    Factor of Safety:
    FS = strength / shear_stress
    """

    # Effective normal stress
    effective_normal_stress = normal_stress - pore_pressure

    # Convert friction angle from degrees to radians
    import math
    friction_angle_rad = math.radians(friction_angle)

    # Calculate resisting shear strength
    resisting_strength = (
        cohesion
        + effective_normal_stress * math.tan(friction_angle_rad)
    )

    # Avoid division by zero
    if shear_stress <= 0:
        return 999.0

    # Factor of Safety
    fs = resisting_strength / shear_stress

    return round(fs, 3)


def calculate_risk_score(fs, ml_probability, rainfall):
    """
    Combine physics-based Factor of Safety,
    ML probability and rainfall into a risk score.

    Output:
    0 - 100
    """

    # Physics risk
    if fs >= 1.5:
        physics_risk = 10
    elif fs >= 1.25:
        physics_risk = 30
    elif fs >= 1.0:
        physics_risk = 60
    else:
        physics_risk = 90

    # ML probability
    ml_risk = ml_probability * 100

    # Rainfall risk
    if rainfall < 50:
        rainfall_risk = 10
    elif rainfall < 100:
        rainfall_risk = 30
    elif rainfall < 150:
        rainfall_risk = 60
    else:
        rainfall_risk = 90

    # Hybrid risk score
    risk_score = (
        physics_risk * 0.45
        + ml_risk * 0.35
        + rainfall_risk * 0.20
    )

    # Keep score between 0 and 100
    risk_score = max(0, min(100, risk_score))

    return round(risk_score, 2)


def get_risk_level(risk_score):
    """
    Convert risk score into alert level.

    Prototype thresholds:
    0-24   Normal
    25-49  Watch
    50-74  Warning
    75-100 Critical
    """

    if risk_score < 25:
        return "Normal"

    elif risk_score < 50:
        return "Watch"

    elif risk_score < 75:
        return "Warning"

    else:
        return "Critical"


def generate_risk_report(
    cohesion,
    normal_stress,
    pore_pressure,
    friction_angle,
    shear_stress,
    ml_probability,
    rainfall
):
    """
    Generate complete landslide risk report.
    """

    # Calculate Factor of Safety
    fs = calculate_factor_of_safety(
        cohesion,
        normal_stress,
        pore_pressure,
        friction_angle,
        shear_stress
    )

    # Calculate hybrid risk score
    risk_score = calculate_risk_score(
        fs,
        ml_probability,
        rainfall
    )

    # Determine risk level
    risk_level = get_risk_level(risk_score)

    # Return complete result
    return {
        "factor_of_safety": fs,
        "ml_probability": round(ml_probability, 3),
        "rainfall_mm": rainfall,
        "risk_score": risk_score,
        "risk_level": risk_level
    }


# ---------------------------------------------------
# TEST THE RISK ENGINE
# ---------------------------------------------------

if __name__ == "__main__":

    print("=" * 50)
    print("      GeoDrishti-NER Risk Engine")
    print("=" * 50)

    # Prototype sample input
    cohesion = 20
    normal_stress = 100
    pore_pressure = 40
    friction_angle = 30
    shear_stress = 50

    # Simulated ML probability
    ml_probability = 0.72

    # Simulated rainfall in mm
    rainfall = 120

    # Generate report
    report = generate_risk_report(
        cohesion,
        normal_stress,
        pore_pressure,
        friction_angle,
        shear_stress,
        ml_probability,
        rainfall
    )

    print()
    print("INPUT DATA")
    print("-" * 50)
    print(f"Cohesion          : {cohesion}")
    print(f"Normal Stress     : {normal_stress}")
    print(f"Pore Pressure     : {pore_pressure}")
    print(f"Friction Angle    : {friction_angle} degrees")
    print(f"Shear Stress      : {shear_stress}")
    print(f"ML Probability    : {ml_probability}")
    print(f"Rainfall          : {rainfall} mm")

    print()
    print("RISK ANALYSIS")
    print("-" * 50)
    print(f"Factor of Safety  : {report['factor_of_safety']}")
    print(f"ML Probability    : {report['ml_probability']}")
    print(f"Rainfall          : {report['rainfall_mm']} mm")
    print(f"Risk Score        : {report['risk_score']}/100")
    print(f"Risk Level        : {report['risk_level']}")

    print()
    print("=" * 50)
    print("Risk analysis completed successfully.")
    print("=" * 50)