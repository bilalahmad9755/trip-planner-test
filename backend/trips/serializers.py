from rest_framework import serializers

class LocationSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    full_address = serializers.CharField(max_length=500)
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)
    place_id = serializers.CharField(max_length=255)


class TripPlanSerializer(serializers.Serializer):
    current_location = LocationSerializer()
    pickup_location = LocationSerializer()
    dropoff_location = LocationSerializer()
    cycle_used_hours = serializers.FloatField(min_value=0, max_value=70)
