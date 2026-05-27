"""
Simulation Service
ISO 13374 Real-Time Simulation Module

Simulates live sensor updates and degradation progression
for the Dashboard's real-time monitoring feature.
"""

import numpy as np
import random
from datetime import datetime, timedelta


class SimulationService:
    """
    Real-time monitoring simulation for demo purposes.
    Simulates sensor drift and degradation progression.
    """
    
    def __init__(self):
        # Current simulation state
        self.simulation_active = False
        self.cycle_offset = {}
        self.degradation_rate = {}
    
    def get_simulated_fleet_update(self, current_fleet: list) -> list:
        """
        Apply one simulation tick to the fleet.
        Decrements RUL and updates health status.
        """
        updated = []
        
        for engine in current_fleet:
            engine_copy = dict(engine)
            engine_id = engine_copy['engine_id']
            
            # Random degradation per cycle (0.5 - 3 cycles per update)
            degradation = random.uniform(0.5, 2.5)
            
            # Apply degradation
            new_rul = max(0, engine_copy['rul_predicted'] - degradation)
            engine_copy['rul_predicted'] = round(new_rul, 1)
            
            # Add sensor noise
            engine_copy['sensor_data'] = self._generate_sensor_noise(engine_id, new_rul)
            
            # Update health status
            from preprocessing.preprocessor import classify_health
            health, alert, color = classify_health(new_rul)
            engine_copy['health_status'] = health
            engine_copy['alert_level'] = alert
            engine_copy['color'] = color
            
            engine_copy['last_updated'] = datetime.now().isoformat()
            
            updated.append(engine_copy)
        
        return updated
    
    def _generate_sensor_noise(self, engine_id: int, rul: float) -> dict:
        """Generate realistic sensor readings based on engine state"""
        # Degradation factor (more noise as RUL decreases)
        degradation_factor = max(0, 1 - rul / 125)
        
        # Base sensor values (from C-MAPSS mean values)
        base_values = {
            'sensor_4':  1408.934 * (1 + 0.05 * degradation_factor),
            'sensor_11': 47.31 * (1 + 0.08 * degradation_factor),
            'sensor_12': 521.413 * (1 - 0.03 * degradation_factor),
        }
        
        # Add realistic noise
        np.random.seed(engine_id)
        noisy = {}
        for sensor, base in base_values.items():
            noise = np.random.normal(0, base * 0.01)
            noisy[sensor] = round(base + noise, 2)
        
        return noisy
    
    def generate_degradation_curve(self, engine_id: int, current_rul: float, 
                                    current_cycle: int) -> dict:
        """
        Generate historical + forecasted degradation curve.
        Used for Engine Details Page visualization.
        """
        # Historical data (estimated)
        total_life = current_cycle + current_rul
        history_length = current_cycle
        
        cycles_hist = list(range(1, current_cycle + 1))
        rul_hist = []
        
        for cycle in cycles_hist:
            remaining = total_life - cycle
            # Piecewise linear cap at 125
            rul_capped = min(125, remaining)
            # Add realistic noise
            noise = np.random.normal(0, 2)
            rul_hist.append(max(0, round(rul_capped + noise, 1)))
        
        # Forecast (linear with uncertainty bands)
        forecast_cycles = 30  # Predict 30 cycles ahead
        cycles_forecast = list(range(current_cycle + 1, current_cycle + forecast_cycles + 1))
        rul_forecast = []
        rul_upper = []
        rul_lower = []
        
        for i, cycle in enumerate(cycles_forecast):
            remaining = max(0, current_rul - (i + 1) * 1.0)
            uncertainty = 3 + i * 0.5  # Uncertainty grows with time
            rul_forecast.append(round(remaining, 1))
            rul_upper.append(round(min(125, remaining + uncertainty), 1))
            rul_lower.append(round(max(0, remaining - uncertainty), 1))
        
        # Failure point
        failure_cycle = current_cycle + int(current_rul)
        
        return {
            'historical': {
                'cycles': cycles_hist,
                'rul': rul_hist
            },
            'forecast': {
                'cycles': cycles_forecast,
                'rul': rul_forecast,
                'confidence_upper': rul_upper,
                'confidence_lower': rul_lower
            },
            'failure_point': {
                'cycle': failure_cycle,
                'estimated_date': (datetime.now() + timedelta(days=int(current_rul))).strftime('%Y-%m-%d')
            },
            'current': {
                'cycle': current_cycle,
                'rul': current_rul
            }
        }
