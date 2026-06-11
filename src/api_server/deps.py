from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from src.api_server.auth import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)) -> str:
    return decode_token(token)
