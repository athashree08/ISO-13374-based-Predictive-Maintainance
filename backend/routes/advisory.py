"""
Advisory Generation Routes
ISO 13374 Layer 6: Advisory Generation

Endpoints:
- GET /recommendations/{engine_id}  - Maintenance recommendations
- GET /schedule                      - Maintenance schedule for fleet
"""

from fastapi import APIRouter, HTTPException
from database.db import get_db_connection
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/recommendations/{engine_id}")
async def get_recommendations(engine_id: int):
    """
    ISO 13374 Layer 6: Advisory Generation
    
    Generate maintenance recommendations for an engine.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM engine_status WHERE engine_id = ?", (engine_id,))
    engine = cursor.fetchone()
    conn.close()
    
    if not engine:
        raise HTTPException(status_code=404, detail=f"Engine {engine_id} not found")
    
    rul = engine['last_rul'] or 50.0
    alert_level = engine['alert_level'] or 'normal'
    
    from routes.prediction import _generate_recommendations
    recommendations = _generate_recommendations(rul, alert_level)
    
    return {
        "engine_id": engine_id,
        "rul": rul,
        "alert_level": alert_level,
        "recommendations": recommendations,
        "generated_at": datetime.now().isoformat()
    }


@router.get("/schedule")
async def get_maintenance_schedule():
    """
    Fleet-wide maintenance scheduling based on RUL predictions.
    Prioritizes engines by criticality.
    """
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM engine_status 
        WHERE last_rul IS NOT NULL
        ORDER BY last_rul ASC
    """)
    engines = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    schedule = []
    today = datetime.now()
    
    for engine in engines:
        rul = engine['last_rul']
        alert = engine['alert_level']
        
        # Estimate maintenance date
        estimated_days = max(1, int(rul * 0.8))  # Schedule at 80% of RUL
        maintenance_date = today + timedelta(days=estimated_days)
        
        priority_map = {
            'critical': 1,
            'warning': 2,
            'caution': 3,
            'normal': 4
        }
        
        schedule.append({
            "engine_id": engine['engine_id'],
            "current_rul": rul,
            "alert_level": alert,
            "priority": priority_map.get(alert, 4),
            "recommended_maintenance_date": maintenance_date.strftime('%Y-%m-%d'),
            "days_until_maintenance": estimated_days,
            "maintenance_type": _get_maintenance_type(alert),
            "estimated_downtime": _get_estimated_downtime(alert)
        })
    
    # Sort by priority
    schedule.sort(key=lambda x: (x['priority'], x['days_until_maintenance']))
    
    return {
        "schedule": schedule,
        "total_engines": len(schedule),
        "next_maintenance": schedule[0] if schedule else None,
        "generated_at": datetime.now().isoformat()
    }


def _get_maintenance_type(alert_level: str) -> str:
    """Determine maintenance type based on alert level"""
    types = {
        'critical': 'Unscheduled Full Overhaul',
        'warning': 'Scheduled Performance Restoration',
        'caution': 'Borescope Inspection + Minor Service',
        'normal': 'Routine Scheduled Maintenance'
    }
    return types.get(alert_level, 'Routine Maintenance')


def _get_estimated_downtime(alert_level: str) -> str:
    """Estimate maintenance downtime"""
    downtimes = {
        'critical': '5-7 days',
        'warning': '2-3 days',
        'caution': '8-12 hours',
        'normal': '4-6 hours'
    }
    return downtimes.get(alert_level, '4-6 hours')
