"""
Condition Monitoring Routes
ISO 13374 Layer 3: Condition Monitoring

Endpoints:
- GET /fleet-status    - Fleet overview with health distribution
- GET /alerts          - Active alerts across fleet
- POST /simulate       - Simulate real-time degradation
"""

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from datetime import datetime
import random
import numpy as np

from database.db import get_db_connection
from preprocessing.preprocessor import classify_health

router = APIRouter()


@router.get("/fleet-status")
async def get_fleet_status():
    """
    ISO 13374 Layer 3: Condition Monitoring
    
    Returns complete fleet health overview including:
    - Health distribution (Healthy/Caution/Warning/Critical)
    - KPI metrics
    - Engine RUL list for charts
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all engine statuses
    cursor.execute("""
        SELECT * FROM engine_status 
        ORDER BY last_rul ASC
    """)
    engines = [dict(row) for row in cursor.fetchall()]
    
    # Get recent predictions for table
    cursor.execute("""
        SELECT p.*, e.last_cycle
        FROM predictions p
        JOIN engine_status e ON p.engine_id = e.engine_id
        WHERE p.id IN (
            SELECT MAX(id) FROM predictions GROUP BY engine_id
        )
        ORDER BY p.rul_predicted ASC
    """)
    recent_predictions = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    
    # Compute KPIs
    healthy_count = sum(1 for e in engines if e['alert_level'] == 'normal')
    caution_count = sum(1 for e in engines if e['alert_level'] == 'caution')
    warning_count = sum(1 for e in engines if e['alert_level'] == 'warning')
    critical_count = sum(1 for e in engines if e['alert_level'] == 'critical')
    
    ruls = [e['last_rul'] for e in engines if e['last_rul'] is not None]
    avg_rul = round(sum(ruls) / len(ruls), 1) if ruls else 0
    
    # Format fleet data for charts
    fleet_data = []
    for engine in engines:
        fleet_data.append({
            "engine_id": engine['engine_id'],
            "rul": engine['last_rul'] or 0,
            "cycle": engine['last_cycle'] or 0,
            "health_status": engine['health_status'] or 'HEALTHY',
            "alert_level": engine['alert_level'] or 'normal',
            "last_updated": engine['last_updated'] or datetime.now().isoformat()
        })
    
    return {
        "kpis": {
            "total_engines": len(engines),
            "healthy": healthy_count,
            "caution": caution_count,
            "warning": warning_count,
            "critical": critical_count,
            "average_rul": avg_rul,
            "fleet_health_score": round(
                (healthy_count * 1.0 + caution_count * 0.7 + 
                 warning_count * 0.3 + critical_count * 0.0) / max(1, len(engines)) * 100, 1
            )
        },
        "fleet_data": fleet_data,
        "recent_predictions": recent_predictions,
        "last_updated": datetime.now().isoformat()
    }


@router.get("/alerts")
async def get_alerts(limit: int = 20, include_acknowledged: bool = False):
    """
    ISO 13374 Layer 3: Condition Monitoring - Alert System
    
    Returns active alerts across the fleet.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    
    if include_acknowledged:
        cursor.execute("""
            SELECT * FROM alerts 
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
    else:
        cursor.execute("""
            SELECT * FROM alerts 
            WHERE acknowledged = 0
            ORDER BY timestamp DESC 
            LIMIT ?
        """, (limit,))
    
    alerts = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    # Add severity ordering
    severity_order = {'critical': 0, 'warning': 1, 'caution': 2, 'normal': 3}
    alerts.sort(key=lambda x: severity_order.get(x.get('alert_level', 'normal'), 4))
    
    return {
        "alerts": alerts,
        "count": len(alerts),
        "critical_count": sum(1 for a in alerts if a.get('alert_level') == 'critical'),
        "warning_count": sum(1 for a in alerts if a.get('alert_level') == 'warning')
    }


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(alert_id: int):
    """Acknowledge an alert"""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE alerts SET acknowledged = 1 WHERE id = ?", (alert_id,))
    conn.commit()
    conn.close()
    return {"status": "acknowledged", "alert_id": alert_id}


@router.post("/simulate/tick")
async def simulate_tick(request: Request):
    """
    Simulate one real-time monitoring tick.
    Decrements RUL values and updates health status.
    """
    from simulation.simulator import SimulationService
    sim = SimulationService()
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM engine_status ORDER BY engine_id")
    engines = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    if not engines:
        return {"message": "No engines to simulate"}
    
    # Apply simulation tick
    updated_engines = sim.get_simulated_fleet_update(engines)
    
    # Save updates to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    new_alerts = []
    now = datetime.now().isoformat()
    
    for engine in updated_engines:
        old_engine = next((e for e in engines if e['engine_id'] == engine['engine_id']), None)
        
        cursor.execute("""
            UPDATE engine_status 
            SET last_rul = ?, health_status = ?, alert_level = ?, last_updated = ?
            WHERE engine_id = ?
        """, (
            engine['rul_predicted'],
            engine['health_status'],
            engine['alert_level'],
            now,
            engine['engine_id']
        ))
        
        # Generate new alerts on status change
        if old_engine and old_engine.get('alert_level') != engine['alert_level']:
            if engine['alert_level'] in ('critical', 'warning'):
                alert_msg = f"Engine {engine['engine_id']} status changed to {engine['health_status']} — RUL: {engine['rul_predicted']:.0f} cycles"
                cursor.execute("""
                    INSERT INTO alerts (engine_id, alert_type, alert_level, message, timestamp)
                    VALUES (?, ?, ?, ?, ?)
                """, (engine['engine_id'], 'STATUS_CHANGE', engine['alert_level'], alert_msg, now))
                
                new_alerts.append({
                    "engine_id": engine['engine_id'],
                    "message": alert_msg,
                    "alert_level": engine['alert_level']
                })
    
    conn.commit()
    conn.close()
    
    return {
        "status": "success",
        "engines_updated": len(updated_engines),
        "new_alerts": new_alerts,
        "fleet_snapshot": [
            {
                "engine_id": e['engine_id'],
                "rul_predicted": e['rul_predicted'],
                "health_status": e['health_status'],
                "alert_level": e['alert_level']
            }
            for e in updated_engines
        ],
        "timestamp": now
    }
