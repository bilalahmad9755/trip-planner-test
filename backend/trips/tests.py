from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class TripPlanViewTests(APITestCase):
    def setUp(self):
        self.url = reverse("plan-trip")
        self.payload = {
            "current_location": {
                "name": "New York",
                "full_address": "New York, New York, United States",
                "lat": 40.712749,
                "lng": -74.005994,
                "place_id": "place.233720044",
            },
            "pickup_location": {
                "name": "Philadelphia",
                "full_address": "Philadelphia, Pennsylvania, United States",
                "lat": 39.952724,
                "lng": -75.163526,
                "place_id": "place.pickup",
            },
            "dropoff_location": {
                "name": "Baltimore",
                "full_address": "Baltimore, Maryland, United States",
                "lat": 39.290882,
                "lng": -76.610759,
                "place_id": "place.dropoff",
            },
            "cycle_used_hours": 12.5,
        }

    @patch("trips.views.HOSService.simulate_trip")
    @patch("trips.views.MapboxService.get_route")
    def test_trip_payload_is_transformed_to_mapbox_coordinate_strings(
        self, mock_get_route, mock_simulate_trip
    ):
        mock_get_route.return_value = {
            "distance_miles": 190.5,
            "duration_hours": 3.75,
            "geometry_polyline": "encoded-polyline",
        }
        mock_simulate_trip.return_value = []

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        mock_get_route.assert_called_once_with(
            current_location="-74.005994,40.712749",
            pickup_location="-75.163526,39.952724",
            dropoff_location="-76.610759,39.290882",
        )
        mock_simulate_trip.assert_called_once_with(
            distance_miles=190.5,
            cycle_used_hours=12.5,
        )

    @patch("trips.views.HOSService.simulate_trip")
    @patch("trips.views.MapboxService.get_route")
    def test_all_stops_are_included_across_days_with_route_progress(
        self, mock_get_route, mock_simulate_trip
    ):
        mock_get_route.return_value = {
            "distance_miles": 660.0,
            "duration_hours": 12.0,
            "geometry_polyline": "encoded-polyline",
        }
        mock_simulate_trip.return_value = [
            {
                "day": 1,
                "events": [
                    {"status": "ON_DUTY", "start_hour": 0.0, "end_hour": 1.0},
                    {"status": "DRIVING", "start_hour": 1.0, "end_hour": 5.0},
                    {"status": "OFF_DUTY", "start_hour": 5.0, "end_hour": 5.5},
                    {"status": "DRIVING", "start_hour": 5.5, "end_hour": 9.5},
                    {"status": "ON_DUTY", "start_hour": 9.5, "end_hour": 10.0},
                ],
            },
            {
                "day": 2,
                "events": [
                    {"status": "OFF_DUTY", "start_hour": 0.0, "end_hour": 10.0},
                    {"status": "DRIVING", "start_hour": 10.0, "end_hour": 14.0},
                    {"status": "ON_DUTY", "start_hour": 14.0, "end_hour": 15.0},
                ],
            },
        ]

        response = self.client.post(self.url, self.payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["stops"],
            [
                {
                    "sequence": 1,
                    "type": "Cargo Operation",
                    "day": 1,
                    "start_hour": 0.0,
                    "end_hour": 1.0,
                    "duration_hours": 1.0,
                    "route_progress": 0.0,
                },
                {
                    "sequence": 2,
                    "type": "Break",
                    "day": 1,
                    "start_hour": 5.0,
                    "end_hour": 5.5,
                    "duration_hours": 0.5,
                    "route_progress": 0.3333,
                },
                {
                    "sequence": 3,
                    "type": "Fuel",
                    "day": 1,
                    "start_hour": 9.5,
                    "end_hour": 10.0,
                    "duration_hours": 0.5,
                    "route_progress": 0.6667,
                },
                {
                    "sequence": 4,
                    "type": "Sleep",
                    "day": 2,
                    "start_hour": 0.0,
                    "end_hour": 10.0,
                    "duration_hours": 10.0,
                    "route_progress": 0.6667,
                },
                {
                    "sequence": 5,
                    "type": "Cargo Operation",
                    "day": 2,
                    "start_hour": 14.0,
                    "end_hour": 15.0,
                    "duration_hours": 1.0,
                    "route_progress": 1.0,
                },
            ],
        )

    def test_invalid_lat_lng_values_are_rejected_before_mapbox_call(self):
        invalid_payload = {
            **self.payload,
            "current_location": {
                **self.payload["current_location"],
                "lat": 140.712749,
                "lng": -274.005994,
            },
        }

        response = self.client.post(self.url, invalid_payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["current_location"]["lat"][0].code, "max_value")
        self.assertEqual(response.data["current_location"]["lng"][0].code, "min_value")
