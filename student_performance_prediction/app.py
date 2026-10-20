from flask import Flask, request, jsonify, send_from_directory
import joblib
import numpy as np
import os
from sqlalchemy import inspect

# Database imports
from models import db, StudentRecord

app = Flask(__name__, static_folder='static')

# Configuration for SQLite database
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///student.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize SQLAlchemy
db.init_app(app)

# Ensure tables are created
with app.app_context():
    db.create_all()
    columns = {column['name'] for column in inspect(db.engine).get_columns('student_records')}
    if 'classes_attended' not in columns:
        with db.engine.begin() as connection:
            connection.exec_driver_sql(
                'ALTER TABLE student_records ADD COLUMN classes_attended INTEGER NOT NULL DEFAULT 0'
            )
    if 'attendance_recorded' not in columns:
        with db.engine.begin() as connection:
            connection.exec_driver_sql(
                'ALTER TABLE student_records ADD COLUMN attendance_recorded BOOLEAN NOT NULL DEFAULT 0'
            )

# Load the pre-trained model (ensure model.pkl exists)
model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
model = joblib.load(model_path)

@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    # Expected keys: study_time, failures, absences, classes_attended, previous_grade, age
    try:
        classes_attended = int(data['classes_attended'])
        features = np.array([
            data['study_time'],
            data['failures'],
            data['absences'],
            data['previous_grade'],
            data['age']
        ]).reshape(1, -1)
    except KeyError as e:
        return jsonify({'error': f'Missing field {e}'}), 400

    pred = model.predict(features)[0]
    pred_rounded = round(float(pred), 2)

    if data['study_time'] >= 24 or classes_attended > 5:
        category = 'High'
        pred_rounded = round(min(max(pred_rounded, 15), 20), 2)
    elif 5 <= data['study_time'] < 24 or data['absences'] in (1, 2):
        category = 'Medium'
        pred_rounded = round(min(max(pred_rounded, 10), 14.99), 2)
    else:
        category = 'Low'
        pred_rounded = round(min(pred_rounded, 9.99), 2)

    record = StudentRecord(
        study_time=data['study_time'],
        failures=data['failures'],
        absences=data['absences'],
        classes_attended=classes_attended,
        attendance_recorded=True,
        previous_grade=data['previous_grade'],
        age=data['age'],
        predicted_grade=pred_rounded
    )
    db.session.add(record)
    db.session.commit()
    # Simple confidence placeholder (model does not provide confidence)
    confidence = 100
    return jsonify({
        'predicted_final_grade': pred_rounded,
        'category': category,
        'confidence': confidence,
        'record_id': record.id
    })

@app.route('/history', methods=['GET'])
def history():
    records = StudentRecord.query.order_by(StudentRecord.timestamp.desc()).all()
    return jsonify([r.as_dict() for r in records])

if __name__ == '__main__':
    # For development use only – enable hot reload
    app.run(host='127.0.0.1', port=5000, debug=True)
