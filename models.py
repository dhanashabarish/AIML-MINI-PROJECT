from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

# This file is imported by app.py after Flask app creation.
# It defines the database models for storing student input records and predictions.

db = SQLAlchemy()

class StudentRecord(db.Model):
    __tablename__ = "student_records"
    id = db.Column(db.Integer, primary_key=True)
    study_time = db.Column(db.Float, nullable=False)
    failures = db.Column(db.Integer, nullable=False)
    absences = db.Column(db.Integer, nullable=False)
    classes_attended = db.Column(db.Integer, nullable=False, default=0)
    attendance_recorded = db.Column(db.Boolean, nullable=False, default=False)
    previous_grade = db.Column(db.Float, nullable=False)
    age = db.Column(db.Integer, nullable=False)
    predicted_grade = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def as_dict(self):
        return {
            "id": self.id,
            "study_time": self.study_time,
            "failures": self.failures,
            "absences": self.absences,
            "classes_attended": self.classes_attended if self.attendance_recorded else None,
            "attendance_recorded": self.attendance_recorded,
            "previous_grade": self.previous_grade,
            "age": self.age,
            "predicted_grade": round(self.predicted_grade, 2),
            "timestamp": self.timestamp.isoformat()
        }
