import math

class HOSService:
    """
    Simulates FMCSA Hours of Service (HOS) logs for a trip.
    """
    
    STATUS_DRIVING = "DRIVING"
    STATUS_ON_DUTY = "ON_DUTY"
    STATUS_OFF_DUTY = "OFF_DUTY"

    def __init__(self, avg_speed=55):
        self.avg_speed = avg_speed
        # FMCSA Limits
        self.DRIVING_LIMIT = 11.0
        self.DUTY_WINDOW_LIMIT = 14.0
        self.BREAK_THRESHOLD = 8.0
        self.BREAK_DURATION = 0.5
        self.DAILY_RESET = 10.0
        self.CYCLE_LIMIT = 70.0
        self.CYCLE_RESET = 34.0
        self.FUEL_INTERVAL = 1000.0
        self.FUEL_DURATION = 0.5
        self.PICKUP_DROPOFF_DURATION = 1.0

    def simulate_trip(self, distance_miles, cycle_used_hours=0.0):
        """
        Simulates the trip and returns a list of daily logs.
        """
        events = []
        current_time = 0.0
        miles_remaining = float(distance_miles)
        miles_since_fuel = 0.0
        
        # State tracking for limits
        driving_in_shift = 0.0
        duty_window_elapsed = 0.0
        driving_since_last_break = 0.0
        cycle_on_duty = float(cycle_used_hours)
        
        in_duty_window = False

        def add_event(status, duration):
            nonlocal current_time, driving_in_shift, duty_window_elapsed, driving_since_last_break, cycle_on_duty, in_duty_window
            
            if duration <= 0:
                return

            # Start of duty window if first on-duty action
            if status in [self.STATUS_DRIVING, self.STATUS_ON_DUTY] and not in_duty_window:
                in_duty_window = True
                duty_window_elapsed = 0.0

            events.append({
                "status": status,
                "start_hour": round(current_time, 2),
                "end_hour": round(current_time + duration, 2)
            })
            
            # Update timers
            if status == self.STATUS_DRIVING:
                driving_in_shift += duration
                driving_since_last_break += duration
                cycle_on_duty += duration
            
            if status in [self.STATUS_ON_DUTY, self.STATUS_OFF_DUTY]:
                # Any non-driving status of at least 30 mins resets the 8-hour driving clock
                if duration >= self.BREAK_DURATION:
                    driving_since_last_break = 0.0
                
                if status == self.STATUS_ON_DUTY:
                    cycle_on_duty += duration
                
                if status == self.STATUS_OFF_DUTY and duration >= self.DAILY_RESET:
                    driving_in_shift = 0.0
                    duty_window_elapsed = 0.0
                    in_duty_window = False
            
            if in_duty_window:
                duty_window_elapsed += duration
            
            current_time += duration

        # 1. Pickup
        add_event(self.STATUS_ON_DUTY, self.PICKUP_DROPOFF_DURATION)

        # 2. Main Driving Loop
        while miles_remaining > 0:
            # Check 70-hour cycle limit
            if cycle_on_duty >= self.CYCLE_LIMIT:
                # Force a 34-hour restart before continuing.
                add_event(self.STATUS_OFF_DUTY, self.CYCLE_RESET)
                cycle_on_duty = 0.0
                continue

            # Check daily limits
            if driving_in_shift >= self.DRIVING_LIMIT or duty_window_elapsed >= self.DUTY_WINDOW_LIMIT:
                add_event(self.STATUS_OFF_DUTY, self.DAILY_RESET)
                continue

            # Check 8-hour break
            if driving_since_last_break >= self.BREAK_THRESHOLD:
                add_event(self.STATUS_OFF_DUTY, self.BREAK_DURATION)
                continue

            # Calculate max possible drive time before next "interruption"
            # a. 11h driving limit
            time_to_11h = self.DRIVING_LIMIT - driving_in_shift
            # b. 14h duty window
            time_to_14h = self.DUTY_WINDOW_LIMIT - duty_window_elapsed
            # c. 8h break
            time_to_8h = self.BREAK_THRESHOLD - driving_since_last_break
            # d. Fueling (every 1000 miles)
            miles_to_fuel = self.FUEL_INTERVAL - miles_since_fuel
            time_to_fuel = miles_to_fuel / self.avg_speed
            # e. Destination
            time_to_dest = miles_remaining / self.avg_speed
            # f. Cycle limit
            time_to_cycle = self.CYCLE_LIMIT - cycle_on_duty

            drive_duration = min(time_to_11h, time_to_14h, time_to_8h, time_to_fuel, time_to_dest, time_to_cycle)
            
            # Prevent negative or tiny drive durations
            drive_duration = max(drive_duration, 0.01)

            add_event(self.STATUS_DRIVING, drive_duration)
            
            miles_driven = drive_duration * self.avg_speed
            miles_remaining -= miles_driven
            miles_since_fuel += miles_driven

            # Trigger fueling if reached
            if miles_since_fuel >= self.FUEL_INTERVAL:
                add_event(self.STATUS_ON_DUTY, self.FUEL_DURATION)
                miles_since_fuel = 0.0

        # 3. Dropoff
        # Ensure we have enough window for dropoff, otherwise reset first
        if duty_window_elapsed + self.PICKUP_DROPOFF_DURATION > self.DUTY_WINDOW_LIMIT:
            add_event(self.STATUS_OFF_DUTY, self.DAILY_RESET)
        
        add_event(self.STATUS_ON_DUTY, self.PICKUP_DROPOFF_DURATION)

        return self._group_by_day(events)

    def _group_by_day(self, events):
        """
        Groups absolute events into 24-hour days.
        """
        if not events:
            return []

        max_time = events[-1]["end_hour"]
        total_days = math.ceil(max_time / 24)
        
        days = []
        for d in range(total_days):
            day_start = d * 24.0
            day_end = (d + 1) * 24.0
            day_events = []
            
            for event in events:
                # Check if event overlaps with this day
                overlap_start = max(event["start_hour"], day_start)
                overlap_end = min(event["end_hour"], day_end)
                
                if overlap_start < overlap_end:
                    # Handle midnight wrap-around for display
                    s_hour = round(overlap_start % 24, 2)
                    e_hour = round(overlap_end % 24, 2)
                    if e_hour == 0 and overlap_end > overlap_start:
                        e_hour = 24.0
                    
                    day_events.append({
                        "status": event["status"],
                        "start_hour": s_hour,
                        "end_hour": e_hour
                    })
            
            days.append({
                "day": d + 1,
                "events": day_events
            })
            
        return days
