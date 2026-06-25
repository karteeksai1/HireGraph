from dataclasses import dataclass
from typing import List


@dataclass
class Student:
    student_id: int
    name: str
    marks: List[int]

    def average(self) -> float:
        if len(self.marks) == 0:
            return 0.0
        return sum(self.marks) / len(self.marks)

    def grade(self) -> str:
        avg = self.average()

        if avg >= 90:
            return "A"
        if avg >= 75:
            return "B"
        if avg >= 60:
            return "C"
        if avg >= 40:
            return "D"
        return "F"


class StudentManager:
    def __init__(self) -> None:
        self.students: List[Student] = []

    def add_student(self, student: Student) -> None:
        self.students.append(student)

    def get_student_by_id(self, student_id: int) -> Student | None:
        for student in self.students:
            if student.student_id == student_id:
                return student
        return None

    def top_student(self) -> Student | None:
        if len(self.students) == 0:
            return None

        best_student = self.students[0]

        for student in self.students:
            if student.average() > best_student.average():
                best_student = student

        return best_student

    def report(self) -> str:
        lines = []

        for student in self.students:
            line = (
                f"ID={student.student_id}, "
                f"Name={student.name}, "
                f"Average={student.average():.2f}, "
                f"Grade={student.grade()}"
            )
            lines.append(line)

        return "\n".join(lines)


def validate_marks(marks: List[int]) -> bool:
    for mark in marks:
        if mark < 0 or mark > 100:
            return False
    return True


def build_sample_data() -> StudentManager:
    manager = StudentManager()

    data = [
        (1, "Alice", [90, 85, 92]),
        (2, "Bob", [70, 80, 75]),
        (3, "Charlie", [60, 65, 68]),
    ]

    for student_id, name, marks in data:
        if validate_marks(marks):
            student = Student(student_id, name, marks)
            manager.add_student(student)

    return manager


def main() -> None:
    manager = build_sample_data()

    print("Student Report")
    print("-" * 40)
    print(manager.report())
    print("-" * 40)

    top = manager.top_student()

    if top is not None:
        print(f"Top Student: {top.name}")
        print(f"Average: {top.average():.2f}")
        print(f"Grade: {top.grade()}")


if __name__ == "__main__":
    main()
