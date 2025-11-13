# SDTM-to-ADaM Python Wrapper

Python interface for the R-based SDTM → ADaM transformation pipeline using rpy2.

---

## 🎯 Overview

This Python package wraps the R-based admiral pipeline, allowing you to:
- Execute SDTM → ADaM transformations from Python
- Use Pandas DataFrames instead of R data.frames
- Integrate with Python-based backends (FastAPI, Django, etc.)
- Maintain all the power of admiral R packages

---

## 📦 Installation

### Prerequisites

- Python 3.11+
- R 4.5.0+
- R packages installed (run from parent directory):
  ```bash
  Rscript install_packages.R
  ```

### Install Python Dependencies

```bash
cd stdm-to-adam/python
pip install -r requirements.txt
```

---

## 🚀 Quick Start

### Basic Usage (One Line!)

```python
from pipeline import run_pipeline

# Run pipeline with test data
result = run_pipeline(use_test_data=True)

# Access datasets as Pandas DataFrames
adsl = result.datasets['adsl']
adae = result.datasets['adae']

print(f"ADSL: {len(adsl)} subjects")
print(adsl.head())
```

### Using the Pipeline Class

```python
from pipeline import SDTMToADaMPipeline

# Initialize
pipeline = SDTMToADaMPipeline()

# Load test SDTM data
sdtm_data = pipeline.load_sdtm_test_data()

# Run transformation
result = pipeline.run(sdtm_data=sdtm_data)

# Check results
if result.status == 'success':
    print(f"✓ Generated {len(result.datasets)} ADaM datasets")
    for name, df in result.datasets.items():
        print(f"  - {name.upper()}: {len(df)} rows")
```

---

## 📖 Usage Examples

### 1. Load SDTM from CSV Files

```python
pipeline = SDTMToADaMPipeline()

# Specify file paths
file_paths = {
    'dm': '/path/to/demographics.csv',
    'ex': '/path/to/exposure.csv',
    'ae': '/path/to/adverse_events.csv',
    'vs': '/path/to/vital_signs.csv',
    'lb': '/path/to/laboratory.csv'
}

# Load data
sdtm_data = pipeline.load_sdtm_from_files(file_paths)

# Run pipeline
result = pipeline.run(sdtm_data=sdtm_data)
```

### 2. Load SDTM from SAS Files

```python
file_paths = {
    'dm': '/path/to/dm.sas7bdat',
    'ae': '/path/to/ae.sas7bdat',
    # ...
}

sdtm_data = pipeline.load_sdtm_from_files(file_paths)
result = pipeline.run(sdtm_data=sdtm_data)
```

### 3. Validate Data

```python
from utils import validate_sdtm_dataset, validate_adam_dataset

# Validate SDTM input
dm_validation = validate_sdtm_dataset(dm_df, 'DM')
print(f"Valid: {dm_validation['valid']}")
print(f"Missing variables: {dm_validation['missing_variables']}")

# Validate ADaM output
adsl_validation = validate_adam_dataset(adsl_df, 'ADSL')
print(f"Valid: {adsl_validation['valid']}")
```

### 4. Working with Pandas

```python
result = run_pipeline(use_test_data=True)

# Get ADSL
adsl = result.datasets['adsl']

# Pandas operations
treatment_summary = adsl.groupby('TRT01P')['AGE'].agg(['mean', 'std', 'count'])
print(treatment_summary)

# Filter
females = adsl[adsl['SEX'] == 'F']
print(f"Female subjects: {len(females)}")

# Save to CSV
adsl.to_csv('adsl_output.csv', index=False)
```

### 5. Export to SAS Format

```python
from utils import export_to_sas

# Export ADaM dataset to SAS
export_to_sas(adsl, 'output/adsl.sas7bdat')
```

### 6. Custom R Code

```python
from utils import source_r_script
import rpy2.robjects as ro

# Source custom R script
source_r_script('my_custom_derivations.R')

# Execute R code
ro.r('''
    custom_analysis <- adsl %>%
        group_by(TRT01P) %>%
        summarise(mean_age = mean(AGE))
''')

# Get result
result_df = r_to_pandas('custom_analysis')
```

---

## 🏗 Architecture

```
Python Layer                    R Layer
─────────────                   ─────────

SDTMToADaMPipeline
    │
    ├─→ load_sdtm_test_data() ──→ pharmaversesdtm::dm, ae, vs, lb
    │
    ├─→ pandas_to_r() ──────────→ rpy2 conversion
    │
    ├─→ run() ───────────────────→ source("create_adams_data.R")
    │                                   │
    │                                   ↓
    │                              admiral::derive_*()
    │                                   │
    │                                   ↓
    │                              ADSL, ADAE, ADVS, ADLB
    │
    └─→ r_to_pandas() ←─────────← rpy2 conversion

Result (Pandas DataFrames)
```

---

## 📊 API Reference

### `SDTMToADaMPipeline`

Main pipeline class.

**Methods:**

- `__init__(r_pipeline_dir=None)` - Initialize pipeline
- `load_sdtm_test_data()` - Load pharmaversesdtm test data
- `load_sdtm_from_files(file_paths)` - Load SDTM from files
- `run(sdtm_data=None, use_test_data=False, datasets_to_generate=None)` - Execute pipeline

**Returns:** `PipelineResult`

### `PipelineResult`

Result object containing:

- `job_id`: Unique identifier
- `status`: 'success' or 'failed'
- `datasets`: Dict of Pandas DataFrames
- `metadata`: Execution metadata
- `error_message`: Error details (if failed)
- `execution_time`: Time in seconds

### Utility Functions

**Data Conversion:**
- `pandas_to_r(df, name)` - Convert Pandas → R
- `r_to_pandas(r_obj)` - Convert R → Pandas
- `load_r_dataset(dataset_name, package)` - Load R dataset as Pandas

**Validation:**
- `validate_sdtm_dataset(df, domain)` - Validate SDTM structure
- `validate_adam_dataset(df, dataset)` - Validate ADaM structure

**R Integration:**
- `source_r_script(script_path)` - Source R script
- `install_r_package(package_name)` - Install R package
- `check_r_package(package_name)` - Check if package installed

**Export:**
- `export_to_sas(df, output_path)` - Export to SAS format
- `load_adams_metadata(metadata_path)` - Load metadata Excel

---

## 🧪 Testing

Run example script:

```bash
python example_usage.py
```

Run specific example:

```python
from example_usage import example_1_basic_usage
example_1_basic_usage()
```

---

## 🔧 Configuration

### R Environment

The pipeline automatically sets up the R environment. If packages are missing:

```bash
cd ..
Rscript install_packages.R
```

### Custom R Path

```python
import os
os.environ['R_HOME'] = '/path/to/R'

pipeline = SDTMToADaMPipeline()
```

---

## 📝 Integration Examples

### With FastAPI

```python
from fastapi import FastAPI
from pipeline import run_pipeline

app = FastAPI()

@app.post("/pipeline/run")
async def execute_pipeline():
    result = run_pipeline(use_test_data=True)
    return {
        "status": result.status,
        "datasets": list(result.datasets.keys()),
        "metadata": result.metadata
    }
```

### With tRPC

```python
# In your tRPC router
from pipeline import SDTMToADaMPipeline

def run_adam_pipeline(ctx, input):
    pipeline = SDTMToADaMPipeline()
    result = pipeline.run(use_test_data=True)

    return {
        'jobId': result.job_id,
        'status': result.status,
        'datasets': {
            name: df.to_dict('records')
            for name, df in result.datasets.items()
        }
    }
```

### Async Execution

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

async def run_pipeline_async():
    loop = asyncio.get_event_loop()
    executor = ThreadPoolExecutor()

    result = await loop.run_in_executor(
        executor,
        run_pipeline,
        {'use_test_data': True}
    )

    return result
```

---

## ⚠️ Troubleshooting

### rpy2 Import Error

```bash
pip install --upgrade rpy2
```

### R Package Not Found

```bash
cd ..
Rscript install_packages.R
```

Or from Python:

```python
from utils import install_r_package
install_r_package('admiral')
```

### Memory Issues with Large Datasets

- Process datasets in chunks
- Use R's `data.table` for large data
- Clear R environment: `ro.r('rm(list=ls())')`

### pandas2ri Conversion Errors

```python
# Explicit activation
from rpy2.robjects import pandas2ri
pandas2ri.activate()

# Manual conversion
r_df = pandas2ri.py2rpy(df)
```

---

## 🎓 Learn More

- [rpy2 Documentation](https://rpy2.readthedocs.io)
- [Pharmaverse](https://pharmaverse.org)
- [admiral Package](https://pharmaverse.github.io/admiral/)
- [CDISC ADaM Standards](https://www.cdisc.org/standards/foundational/adam)

---

## 📄 License

MIT License

---

**Questions?** Check `example_usage.py` for more examples!
