from fastapi import APIRouter, Depends, HTTPException

from app.core.security import create_access_token
from app.dependencies import get_current_user
from app.models.auth import LoginRequest, TokenResponse, UserOut
from app.services.auth_service import authenticate_user
from datetime import datetime

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user["username"]})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(current_user: dict = Depends(get_current_user)):
    return UserOut(
        id=current_user["id"],
        username=current_user["username"],
        created_at=current_user["created_at"],
    )
