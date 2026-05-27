"""
ISO 13374-Aligned Predictive Maintenance System
FastAPI Backend - Main Application Entry Point

Architecture Layers:
1. Data Acquisition Layer      -> /upload, /data
2. Data Manipulation Layer     -> preprocessing module
3. Condition Monitoring Layer  -> /fleet-status, /alerts
4. Health Assessment Layer     -> /engine/{id}
5. Prognostic Assessment Layer -> /predict, /shap/{id}
6. Advisory Generation Layer   -> /recommendations
"""

import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

# Add backend to Python path
sys.path.insert(0, os.path.dirname(__file__))

from routes import data_acquisition, prediction, monitoring, advisory
from database.db import init_db
from services.model_service import ModelService

# ─────────────────────────────────────────
# Application Lifecycle
# ─────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup"""
    print("🚀 Starting ISO 13374 Predictive Maintenance System...")
    
    # Initialize database
    init_db()
    print("✅ Database initialized")
    
    # Load ML models
    model_service = ModelService()
    app.state.model_service = model_service
    print("✅ ML models loaded")
    
    yield
    
    print("🔴 Shutting down Predictive Maintenance System...")


# ─────────────────────────────────────────
# FastAPI Application
# ─────────────────────────────────────────
app = FastAPI(
    title="ISO 13374 Predictive Maintenance System",
    description="""
    Industrial Predictive Maintenance & Prognostics Platform
    Based on NASA C-MAPSS FD001 Dataset
    
    ISO 13374 Aligned Architecture:
    - Layer 1: Data Acquisition
    - Layer 2: Data Manipulation  
    - Layer 3: Condition Monitoring
    - Layer 4: Health Assessment
    - Layer 5: Prognostic Assessment
    - Layer 6: Advisory Generation
    """,
    version="1.0.0",
    lifespan=lifespan
)

# ─────────────────────────────────────────
# CORS Configuration
# ─────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ─────────────────────────────────────────
# API Routes (ISO 13374 Layers)
# ─────────────────────────────────────────

# Layer 1 & 2: Data Acquisition & Manipulation
app.include_router(
    data_acquisition.router,
    prefix="/api/v1",
    tags=["Data Acquisition Layer"]
)

# Layer 3, 4 & 5: Monitoring, Health & Prognostics
app.include_router(
    prediction.router,
    prefix="/api/v1",
    tags=["Prognostic Assessment Layer"]
)

# Layer 3: Condition Monitoring
app.include_router(
    monitoring.router,
    prefix="/api/v1",
    tags=["Condition Monitoring Layer"]
)

# Layer 6: Advisory Generation
app.include_router(
    advisory.router,
    prefix="/api/v1",
    tags=["Advisory Generation Layer"]
)


@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """System health check endpoint"""
    return {
        "status": "operational",
        "system": "ISO 13374 Predictive Maintenance Platform",
        "version": "1.0.0",
        "iso_standard": "ISO 13374",
        "dataset": "NASA C-MAPSS FD001"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
