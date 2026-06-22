from __future__ import annotations

import re
from datetime import date, datetime, time
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


StatusType = Literal["Pendente", "Em andamento", "Finalizado", "Cancelado"]
ProfileType = Literal["ADMIN", "VENDEDOR", "OFICINA"]
PersonType = Literal["VENDEDOR", "MECANICO"]
CHASSIS_PATTERN = re.compile(r"^[A-Z]{2}\d{6}$")


class BaseTextModel(BaseModel):
    @staticmethod
    def clean_text(value: str | None) -> str:
        return str(value or "").strip()

    @staticmethod
    def normalize_chassis_value(value: str | None) -> str:
        normalized = BaseTextModel.clean_text(value)
        if not normalized:
            raise ValueError("O chassi e obrigatorio.")
        if not CHASSIS_PATTERN.fullmatch(normalized):
            raise ValueError("O chassi deve seguir o formato de 2 letras maiusculas e 6 numeros, como TR645271.")
        return normalized

    @staticmethod
    def normalize_cpf_value(value: str | None) -> str:
        text = BaseTextModel.clean_text(value)
        digits = "".join(char for char in text if char.isdigit())
        return digits or text


class LoginRequest(BaseTextModel):
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=1, max_length=120)

    @field_validator("username", "password", mode="before")
    @classmethod
    def normalize_fields(cls, value: str | None) -> str:
        return cls.clean_text(value)


class UserResponse(BaseModel):
    id: int
    name: str
    username: str
    profile: ProfileType
    active: bool
    must_change_password: bool
    created_at: datetime
    updated_at: datetime
    last_login: datetime | None


class LoginResponse(BaseModel):
    token: str
    redirect_path: str
    user: UserResponse


class UserCreate(BaseTextModel):
    name: str = Field(..., min_length=1, max_length=120)
    username: str = Field(..., min_length=1, max_length=80)
    password: str = Field(..., min_length=6, max_length=120)
    profile: ProfileType
    active: bool = True
    must_change_password: bool = False

    @field_validator("name", "username", "password", mode="before")
    @classmethod
    def normalize_fields(cls, value: str | None) -> str:
        return cls.clean_text(value)


class UserUpdate(BaseTextModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    username: str | None = Field(default=None, min_length=1, max_length=80)
    profile: ProfileType | None = None
    active: bool | None = None
    must_change_password: bool | None = None

    @field_validator("name", "username", mode="before")
    @classmethod
    def normalize_fields(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return cls.clean_text(value)


class PasswordChangeRequest(BaseTextModel):
    password: str = Field(..., min_length=6, max_length=120)

    @field_validator("password", mode="before")
    @classmethod
    def normalize_password(cls, value: str | None) -> str:
        return cls.clean_text(value)


class PersonCreate(BaseTextModel):
    name: str = Field(..., min_length=1, max_length=120)
    type: PersonType

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str | None) -> str:
        return cls.clean_text(value)


class PersonUpdate(BaseTextModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return cls.clean_text(value)


class PersonResponse(BaseModel):
    id: int
    name: str
    type: PersonType
    active: bool
    created_at: datetime
    updated_at: datetime


class ActivationBase(BaseTextModel):
    motorcycle_model: str = Field(..., min_length=1, max_length=120)
    chassis: str = Field(..., min_length=1, max_length=80)
    order_date: date | None = None
    seller_responsible_name: str = Field(..., min_length=1, max_length=120)
    activation_date: date
    activation_time: time
    client_name: str = Field(..., min_length=1, max_length=160)
    client_cpf: str = Field(..., min_length=1, max_length=20)
    notes: str = Field(default="", max_length=1000)
    mechanic_notes: str = Field(default="", max_length=1000)
    status: StatusType = "Pendente"

    @field_validator(
        "motorcycle_model",
        "seller_responsible_name",
        "client_name",
        "notes",
        "mechanic_notes",
        mode="before",
    )
    @classmethod
    def normalize_text_fields(cls, value: str | None) -> str:
        return cls.clean_text(value)

    @field_validator("chassis", mode="before")
    @classmethod
    def normalize_chassis(cls, value: str | None) -> str:
        return cls.normalize_chassis_value(value)

    @field_validator("client_cpf", mode="before")
    @classmethod
    def normalize_cpf(cls, value: str | None) -> str:
        return cls.normalize_cpf_value(value)


class ActivationCreate(ActivationBase):
    pass


class ActivationUpdate(BaseTextModel):
    motorcycle_model: str | None = Field(default=None, min_length=1, max_length=120)
    chassis: str | None = Field(default=None, min_length=1, max_length=80)
    order_date: date | None = None
    seller_responsible_name: str | None = Field(default=None, min_length=1, max_length=120)
    activation_date: date | None = None
    activation_time: time | None = None
    client_name: str | None = Field(default=None, min_length=1, max_length=160)
    client_cpf: str | None = Field(default=None, min_length=1, max_length=20)
    notes: str | None = Field(default=None, max_length=1000)
    mechanic_notes: str | None = Field(default=None, max_length=1000)
    status: StatusType | None = None

    @field_validator(
        "motorcycle_model",
        "seller_responsible_name",
        "client_name",
        "notes",
        "mechanic_notes",
        mode="before",
    )
    @classmethod
    def normalize_optional_fields(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return cls.clean_text(value)

    @field_validator("chassis", mode="before")
    @classmethod
    def normalize_optional_chassis(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return cls.normalize_chassis_value(value)

    @field_validator("client_cpf", mode="before")
    @classmethod
    def normalize_optional_cpf(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return cls.normalize_cpf_value(value)


class StatusUpdate(BaseTextModel):
    status: StatusType
    mechanic_notes: str = Field(default="", max_length=1000)
    mechanic_responsible_name: str | None = Field(default=None, max_length=120)

    @field_validator("mechanic_notes", "mechanic_responsible_name", mode="before")
    @classmethod
    def normalize_fields(cls, value: str | None) -> str:
        return cls.clean_text(value)


class SchedulePreviewResponse(BaseModel):
    activation_date: date
    activation_time: time
    scheduling_message: str


class ActivationResponse(BaseModel):
    id: int
    motorcycle_model: str
    chassis: str
    order_date: date | None
    seller_responsible_id: int | None
    seller_responsible_name: str
    mechanic_responsible_id: int | None
    mechanic_responsible_name: str | None
    activation_date: date
    activation_time: time
    client_name: str
    client_cpf: str
    notes: str
    mechanic_notes: str
    status: StatusType
    created_at: datetime
    updated_at: datetime
    created_by: str
    last_changed_by: str
    scheduling_message: str | None = None


class AuditLogResponse(BaseModel):
    id: int
    entity_type: str
    entity_id: int | None
    action: str
    performed_by_login: str
    performed_at: datetime
    seller_person_id: int | None
    seller_person_name: str | None
    mechanic_person_id: int | None
    mechanic_person_name: str | None
    motorcycle_status: str | None
    old_value: dict[str, Any] | None
    new_value: dict[str, Any] | None
    details: str | None


class DashboardResponse(BaseModel):
    date: date
    counts: dict[str, int]
    delayed: list[ActivationResponse]
    upcoming: list[ActivationResponse]
    activations: list[ActivationResponse]


class BackupResponse(BaseModel):
    backup_path: str


class SettingsResponse(BaseModel):
    public_url: str
    company_name: str
    auto_refresh_seconds: int


class SettingsUpdate(BaseTextModel):
    public_url: str = Field(..., min_length=1, max_length=250)
    company_name: str = Field(..., min_length=1, max_length=160)
    auto_refresh_seconds: int = Field(..., ge=5, le=300)

    @field_validator("public_url", "company_name", mode="before")
    @classmethod
    def normalize_fields(cls, value: str | None) -> str:
        return cls.clean_text(value)
