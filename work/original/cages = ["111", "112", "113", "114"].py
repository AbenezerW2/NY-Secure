"""Original NY-Secure access-control model.

This file intentionally uses only the Python standard library so the core
access rules can be understood and tested without the web application.
"""

from dataclasses import dataclass


hall_a_cages = [str(cage) for cage in range(11000, 11301, 10)]
hall_b_cages = [str(cage) for cage in range(22000, 22301, 10)]
cages = hall_a_cages + hall_b_cages

common_areas = ["Main Entrance", "Main Entrance Mantrap", "Break Room"]
electrical = ["UPS Room", "West Generator", "Roof"]
gates = ["Main Gate", "Side Gate", "East Gate"]
loading_areas = ["Loading Dock", "Loading Dock Mantrap"]


@dataclass(frozen=True)
class AccessDecision:
    """The result of checking whether a person may enter an area."""

    employee_name: str
    area: str
    message: str

    @property
    def granted(self) -> bool:
        raise NotImplementedError


@dataclass(frozen=True)
class GrantedAccess(AccessDecision):
    """A successful access decision."""

    @property
    def granted(self) -> bool:
        return True


@dataclass(frozen=True)
class DeniedAccess(AccessDecision):
    """An unsuccessful access decision."""

    @property
    def granted(self) -> bool:
        return False


class Employee:
    """Base employee with access to shared internal areas."""

    def __init__(self, name: str, age: int, employee_id: str, email: str):
        self.name = name
        self.age = age
        self.ID = employee_id
        self.email = email
        self.access = list(common_areas)

    def check_access(self, area: str) -> AccessDecision:
        """Return a granted or denied decision for the requested area."""

        if area in self.access:
            return GrantedAccess(
                employee_name=self.name,
                area=area,
                message=f"Access granted to {area}.",
            )

        return DeniedAccess(
            employee_name=self.name,
            area=area,
            message=f"Access denied to {area}.",
        )


class Tech(Employee):
    """Technician with cage, gate, loading, and common-area access."""

    def __init__(self, name: str, age: int, employee_id: str, email: str):
        super().__init__(name, age, employee_id, email)
        self.access = common_areas + cages + gates + loading_areas


class Eng(Employee):
    """Engineer with electrical, gate, loading, and common-area access."""

    def __init__(self, name: str, age: int, employee_id: str, email: str):
        super().__init__(name, age, employee_id, email)
        self.access = common_areas + electrical + gates + loading_areas


# Keep the original misspelled class name working for any early examples.
Emmployee = Employee
