from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import UserSerializer
from .models import UserSocialLogin


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


class OnSocialLoginView(APIView):

    permission_classes = [IsAuthenticated]

    def post(self, request):
        body = request.data
        print(body)
        username = body['username']
        email = body['email']
        provider = body['provider']
        provider_user_id = body['provider_user_id']

        existing_social_login = UserSocialLogin.objects.filter(email=email)

        # Any existing social login may be from a different provider
        if existing_social_login:
            if existing_social_login[0].provider != provider:
                print('User profile with same email but different provider exists')
                print('Creating new profile')
                user = User.objects.get(email=email)
                UserSocialLogin.objects.create(
                    user=user,
                    email=email,
                    social_signin=True,
                    provider=provider,
                    provider_user_id=provider_user_id,
                )
            else:
                print('user profile with this email and provider exists')
                user = existing_social_login[0].user
        else:
            print('no user profile exists, creating one ....')

            # Check for an existing user with the same email (who may have
            # signed up using credentials)
            users = User.objects.filter(email=email)
            if users:
                user = users[0]
                print(f'Existing user found : {user}')
            else:
                print('Creating new user ... ')
                user = User.objects.create(
                    username=username or 'anonymous',
                    email=email,
                )
            UserSocialLogin.objects.create(
                user=user,
                email=email,
                social_signin=True,
                provider=provider,
                provider_user_id=provider_user_id,
            )

        # Return the serialized User object to the front-end server
        serializer = UserSerializer(instance=user)

        return Response(data=serializer.data, status=status.HTTP_201_CREATED)
