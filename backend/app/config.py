from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    UPI_ID: str = ""
    UPI_NAME: str = "BahiKhataDigital"
    COMPANY_NAME: str = "BahiKhataDigital"
    COMPANY_ADDRESS: str = ""
    COMPANY_PHONE: str = ""
    COMPANY_EMAIL: str = ""
    COMPANY_GSTIN: str = ""
    SHOW_DOCS: bool = True

    @property
    def origins(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


settings = Settings()
