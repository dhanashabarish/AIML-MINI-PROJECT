import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
import joblib

# Synthetic dataset generation
# Features: study_time, failures, absences, previous_grade, age
np.random.seed(42)
num_samples = 500
study_time = np.random.uniform(1, 5, num_samples)  # hours per week
failures = np.random.randint(0, 4, num_samples)   # number of past failures
absences = np.random.randint(0, 30, num_samples)
previous_grade = np.random.uniform(0, 20, num_samples)  # out of 20
age = np.random.randint(15, 22, num_samples)

# Target: final_grade out of 20, a simple linear combo + noise
final_grade = (
    0.5 * study_time * 4
    - 2.0 * failures
    - 0.1 * absences
    + 0.6 * previous_grade
    - 0.2 * (age - 15)
    + np.random.normal(0, 2, num_samples)
)
final_grade = np.clip(final_grade, 0, 20)

# Assemble DataFrame
data = pd.DataFrame({
    "study_time": study_time,
    "failures": failures,
    "absences": absences,
    "previous_grade": previous_grade,
    "age": age,
    "final_grade": final_grade,
})

X = data[["study_time", "failures", "absences", "previous_grade", "age"]]
y = data["final_grade"]

model = RandomForestRegressor(n_estimators=200, random_state=42, max_depth=8)
model.fit(X, y)

# Save model
joblib.dump(model, "model.pkl")
print("Model trained and saved to model.pkl")
