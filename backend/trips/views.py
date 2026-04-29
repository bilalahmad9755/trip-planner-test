from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema
from .serializers import TripPlanSerializer
from .services.mapbox_service import MapboxService
from .services.hos_service import HOSService

class TripPlanView(APIView):
    """
    Endpoint to plan a trip with route data and HOS logs.
    """
    @extend_schema(
        request=TripPlanSerializer,
        responses={200: TripPlanSerializer},
        description="Calculate a driving route and simulate FMCSA Hours of Service logs."
    )
    def post(self, request, *args, **kwargs):
        serializer = TripPlanSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        try:
            data = serializer.validated_data
            mapbox_service = MapboxService()
            hos_service = HOSService()

            # ✅ Extract coordinates (IMPORTANT FIX)
            def to_coord(loc):
                return f"{loc['lng']},{loc['lat']}"  # Mapbox format

            current_coord = to_coord(data["current_location"])
            pickup_coord  = to_coord(data["pickup_location"])
            dropoff_coord = to_coord(data["dropoff_location"])

            # 1. Fetch Route from Mapbox
            route_result = mapbox_service.get_route(
                current_location=current_coord,
                pickup_location=pickup_coord,
                dropoff_location=dropoff_coord
            )

            if "error" in route_result:
                return Response(
                    {"error": f"Mapbox Service Error: {route_result['error']}"},
                    status=status.HTTP_424_FAILED_DEPENDENCY)

            # 2. Simulate HOS Logs
            distance_miles = route_result["distance_miles"]
            hos_logs = hos_service.simulate_trip(
                distance_miles=distance_miles,
                cycle_used_hours=data["cycle_used_hours"]
            )

            # 3. Derive stops from all HOS events and estimate route progress
            total_driving_hours = sum(
                round(event["end_hour"] - event["start_hour"], 2)
                for day in hos_logs
                for event in day["events"]
                if event["status"] == HOSService.STATUS_DRIVING
            )

            stops = []
            cumulative_driving_hours = 0.0
            stop_sequence = 0
            for day in hos_logs:
                for event in day["events"]:
                    duration = round(event["end_hour"] - event["start_hour"], 2)
                    stop_type = None

                    if event["status"] == HOSService.STATUS_OFF_DUTY:
                        if duration >= 10.0:
                            stop_type = "Sleep"
                        elif 0.4 <= duration <= 0.6:
                            stop_type = "Break"
                    elif event["status"] == HOSService.STATUS_ON_DUTY:
                        if 0.4 <= duration <= 0.6:
                            stop_type = "Fuel"
                        elif 0.9 <= duration <= 1.1:
                            stop_type = "Cargo Operation"
                    elif event["status"] == HOSService.STATUS_DRIVING:
                        cumulative_driving_hours += duration

                    if stop_type:
                        stop_sequence += 1
                        route_progress = (
                            cumulative_driving_hours / total_driving_hours
                            if total_driving_hours > 0
                            else 0.0
                        )
                        stops.append({
                            "sequence": stop_sequence,
                            "type": stop_type,
                            "day": day["day"],
                            "start_hour": event["start_hour"],
                            "end_hour": event["end_hour"],
                            "duration_hours": duration,
                            "route_progress": round(min(max(route_progress, 0.0), 1.0), 4),
                        })

            # 4. Final Response
            return Response({
                "route": route_result,
                "stops": stops,
                "logs": hos_logs
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": "Internal Server Error during trip planning.", "details": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
