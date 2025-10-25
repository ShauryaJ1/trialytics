#!/usr/bin/env python3
"""
Example client for the Modal FastAPI server
"""
import requests
import json

# API endpoint
API_URL = "http://localhost:8000/execute"

# Example 1: Simple print
print("=" * 50)
print("Example 1: Simple Print")
print("=" * 50)

response = requests.post(API_URL, json={
    "code": "print('Hello from Modal!')"
})
result = response.json()
print(f"Success: {result['success']}")
print(f"Output: {result['output']}")

# Example 2: Data Science computation
print("\n" + "=" * 50)
print("Example 2: Data Science Computation")
print("=" * 50)

code = """
import pandas as pd
import numpy as np

# Generate random data
np.random.seed(42)
data = {
    'sales': np.random.randint(100, 1000, 12),
    'month': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
}

df = pd.DataFrame(data)

print("Monthly Sales Data:")
print(df)
print(f"\\nTotal Sales: ${df['sales'].sum():,}")
print(f"Average Monthly Sales: ${df['sales'].mean():.2f}")
print(f"Best Month: {df.loc[df['sales'].idxmax(), 'month']} (${df['sales'].max()})")
print(f"Worst Month: {df.loc[df['sales'].idxmin(), 'month']} (${df['sales'].min()})")
"""

response = requests.post(API_URL, json={"code": code})
result = response.json()
print(f"Success: {result['success']}")
print("Output:")
print(result['output'])

# Example 3: Web Scraping
print("\n" + "=" * 50)
print("Example 3: Web Scraping")
print("=" * 50)

code = """
import requests
from bs4 import BeautifulSoup

# Fetch a simple HTML page
response = requests.get('https://httpbin.org/html')
soup = BeautifulSoup(response.text, 'html.parser')

print("Page Title:", soup.title.text if soup.title else "No title")
print("Number of paragraphs:", len(soup.find_all('p')))
print("First paragraph:", soup.find('p').text[:100] if soup.find('p') else "No paragraph found")
"""

response = requests.post(API_URL, json={"code": code})
result = response.json()
print(f"Success: {result['success']}")
print("Output:")
print(result['output'])

# Example 4: Machine Learning
print("\n" + "=" * 50)
print("Example 4: Machine Learning")
print("=" * 50)

code = """
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Generate synthetic data
X, y = make_classification(n_samples=100, n_features=4, n_informative=2, random_state=42)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
clf = RandomForestClassifier(n_estimators=10, random_state=42)
clf.fit(X_train, y_train)

# Predict and evaluate
y_pred = clf.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)

print(f"Random Forest Classifier")
print(f"Training samples: {len(X_train)}")
print(f"Test samples: {len(X_test)}")
print(f"Accuracy: {accuracy:.2%}")
print(f"Feature importances: {clf.feature_importances_}")
"""

response = requests.post(API_URL, json={"code": code})
result = response.json()
print(f"Success: {result['success']}")
print("Output:")
print(result['output'])

# Example 5: Error Handling
print("\n" + "=" * 50)
print("Example 5: Error Handling")
print("=" * 50)

code = """
# This will cause an error
x = 1 / 0
"""

response = requests.post(API_URL, json={"code": code})
result = response.json()
print(f"Success: {result['success']}")
if result['error']:
    print(f"Error: {result['error'].split('Traceback')[0]}")  # Just show the error message
