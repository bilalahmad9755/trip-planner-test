import requests
import logging
from decouple import config, UndefinedValueError

logger = logging.getLogger(__name__)

class MapboxService:
    """
    Service class to interact with Mapbox Directions API.
    """
    BASE_URL = "https://api.mapbox.com/directions/v5/mapbox/driving"
    
    def __init__(self):
        try:
            self.access_token = config("MAPBOX_ACCESS_TOKEN")
        except UndefinedValueError:
            self.access_token = None
            logger.warning("MAPBOX_ACCESS_TOKEN is not set in .env or environment variables.")

    def get_route(self, current_location, pickup_location, dropoff_location):
        """
        Fetches a route from current_location -> pickup_location -> dropoff_location.
        Locations should be strings in "longitude,latitude" format.
        """
        if not self.access_token:
            return {"error": "Mapbox access token is missing."}

        # Construct coordinates string: lon,lat;lon,lat;lon,lat
        coordinates = f"{current_location};{pickup_location};{dropoff_location}"
        url = f"{self.BASE_URL}/{coordinates}"
        
        params = {
            "access_token": self.access_token,
            "geometries": "polyline",
            "overview": "full"
        }

        try:
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            if not data.get("routes"):
                return {"error": "No routes found."}

            route = data["routes"][0]
            
            # Unit conversions
            # Distance: meters to miles (1 meter = 0.000621371 miles)
            distance_miles = route["distance"] * 0.000621371
            
            # Duration: seconds to hours (1 second = 1/3600 hours)
            duration_hours = route["duration"] / 3600

            return {
                "distance_miles": round(distance_miles, 2),
                "duration_hours": round(duration_hours, 2),
                "geometry_polyline": route["geometry"]
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"Mapbox API request failed: {e}")
            return {"error": str(e)}
        except (KeyError, IndexError) as e:
            logger.error(f"Error parsing Mapbox API response: {e}")
            return {"error": "Invalid response format from Mapbox API."}
