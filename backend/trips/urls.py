from django.urls import path
from .views import TripPlanView

urlpatterns = [
    path('plan-trip/', TripPlanView.as_view(), name='plan-trip'),
]
