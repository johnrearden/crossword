from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from .serializers import UserSerializer


class ConfirmCredentialsView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = request.data['body']
        username = body['username']
        password = body['password']
        user = authenticate(username=username, password=password)
        if user is not None:
            serializer = UserSerializer(instance=user)
            return Response(serializer.data)
        else:
            return Response(status=status.HTTP_404_NOT_FOUND)
