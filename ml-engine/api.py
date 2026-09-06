from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from risk_engine import generate_risk_report


# ===================================================
# FASTAPI APPLICATION
# ===================================================

app = FastAPI(
    title="GeoDrishti-NER ML API",
    description="AI-Based Early Warning and Landslide Risk Monitoring System",
    version="1.0.0"
)


# ===================================================
# INPUT MODEL
# ===================================================

class RiskInput(BaseModel):

    cohesion: float = Field(..., ge=0)
    normal_stress: float = Field(..., ge=0)
    pore_pressure: float = Field(..., ge=0)
    friction_angle: float = Field(..., ge=0, le=90)
    shear_stress: float = Field(..., gt=0)

    # ML probability must be between 0 and 1
    ml_probability: float = Field(..., ge=0, le=1)

    # Rainfall in mm
    rainfall: float = Field(..., ge=0)


# ===================================================
# HOME ROUTE
# ===================================================

@app.get("/")
def home():

    return {
        "project": "GeoDrishti-NER",
        "service": "ML Risk Engine",
        "status": "running",
        "version": "1.0.0"
    }


# ===================================================
# HEALTH CHECK
# ===================================================

@app.get("/health")
def health():

    return {
        "status": "OK",
        "service": "GeoDrishti-NER ML API",
        "risk_engine": "connected"
    }


# ===================================================
# RISK PREDICTION
# ===================================================

@app.post("/predict")
def predict_risk(data: RiskInput):

    try:

        # Generate risk report
        report = generate_risk_report(
            cohesion=data.cohesion,
            normal_stress=data.normal_stress,
            pore_pressure=data.pore_pressure,
            friction_angle=data.friction_angle,
            shear_stress=data.shear_stress,
            ml_probability=data.ml_probability,
            rainfall=data.rainfall
        )

        return {
            "success": True,
            "project": "GeoDrishti-NER",
            "prediction": report
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Risk engine error: {str(error)}"
        )


# ===================================================
# SERVER INFORMATION
# ===================================================

@app.get("/api/info")
def api_info():

    return {
        "project": "GeoDrishti-NER",
        "api": "FastAPI",
        "module": "Hybrid Landslide Risk Engine",
        "status": "active"
    }