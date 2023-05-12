from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
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


class CreateUserView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = request.data
        username = body['username']
        email = body['email']
        password = body['password']

        existing_username = User.objects.filter(username=username)
        if existing_username:
            data = {'USER_ALREADY_EXISTS': 'USERNAME'}
            return Response(data=data)

        if email:
            existing_email = User.objects.filter(email=email)
            if existing_email:
                print(existing_email)
                data = {'USER_ALREADY_EXISTS': 'EMAIL'}
                return Response(data=data)

        user = User.objects.create_user(
            username=username,
            email=email,
            password=password,
        )

        serializer = UserSerializer(instance=user)
        return Response(serializer.data)