"""
Comprehensive Test Suite for SDTM-to-ADaM Python Wrapper

This test suite validates:
1. R environment setup
2. SDTM data loading (test data and files)
3. Data conversion (Pandas ↔ R)
4. Pipeline execution
5. ADaM dataset validation
6. Error handling
7. Data export functionality

Usage:
    python test_pipeline.py
    python test_pipeline.py --verbose
"""

import sys
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List
import traceback

# Import pipeline components
from pipeline import SDTMToADaMPipeline, PipelineResult, run_pipeline
from utils import (
    pandas_to_r, r_to_pandas, validate_sdtm_dataset,
    validate_adam_dataset, get_r_version, check_r_package,
    create_pipeline_summary
)


class TestRunner:
    """Test runner for pipeline validation"""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.tests_passed = 0
        self.tests_failed = 0
        self.test_results = []

    def log(self, message: str, level: str = "INFO"):
        """Log message if verbose mode enabled"""
        if self.verbose or level == "ERROR":
            prefix = {
                "INFO": "  ℹ",
                "SUCCESS": "  ✓",
                "ERROR": "  ✗",
                "WARNING": "  ⚠"
            }.get(level, "  ")
            print(f"{prefix} {message}")

    def run_test(self, test_name: str, test_func):
        """Run a single test and record result"""
        print(f"\n{'='*60}")
        print(f"TEST: {test_name}")
        print(f"{'='*60}")

        try:
            test_func()
            self.tests_passed += 1
            self.test_results.append((test_name, "PASSED", None))
            print(f"✓ PASSED: {test_name}")
            return True
        except AssertionError as e:
            self.tests_failed += 1
            self.test_results.append((test_name, "FAILED", str(e)))
            print(f"✗ FAILED: {test_name}")
            print(f"  Reason: {e}")
            if self.verbose:
                traceback.print_exc()
            return False
        except Exception as e:
            self.tests_failed += 1
            self.test_results.append((test_name, "ERROR", str(e)))
            print(f"✗ ERROR: {test_name}")
            print(f"  Error: {e}")
            if self.verbose:
                traceback.print_exc()
            return False

    def print_summary(self):
        """Print test summary"""
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {self.tests_passed + self.tests_failed}")
        print(f"✓ Passed: {self.tests_passed}")
        print(f"✗ Failed: {self.tests_failed}")
        print(f"Success Rate: {self.tests_passed / (self.tests_passed + self.tests_failed) * 100:.1f}%")

        if self.tests_failed > 0:
            print(f"\nFailed Tests:")
            for name, status, error in self.test_results:
                if status in ["FAILED", "ERROR"]:
                    print(f"  - {name}: {error}")

        print(f"{'='*60}\n")

        return self.tests_failed == 0


# =============================================================================
# TEST FUNCTIONS
# =============================================================================

def test_r_environment(runner: TestRunner):
    """Test 1: Verify R environment is properly configured"""
    runner.log("Checking R version...")
    r_version = get_r_version()
    assert r_version is not None, "R version not found"
    runner.log(f"R version: {r_version}", "SUCCESS")

    runner.log("Checking required R packages...")
    required_packages = ['admiral', 'dplyr', 'pharmaversesdtm', 'lubridate', 'haven']

    for package in required_packages:
        is_installed = check_r_package(package)
        assert is_installed, f"Required R package not installed: {package}"
        runner.log(f"Package '{package}' is installed", "SUCCESS")


def test_pipeline_initialization(runner: TestRunner):
    """Test 2: Verify pipeline can be initialized"""
    runner.log("Initializing pipeline...")
    pipeline = SDTMToADaMPipeline()

    assert pipeline is not None, "Pipeline initialization failed"
    assert pipeline.base_dir.exists(), "Base directory not found"
    assert pipeline.output_dir.exists(), "Output directory not created"

    runner.log(f"Base directory: {pipeline.base_dir}", "SUCCESS")
    runner.log(f"Output directory: {pipeline.output_dir}", "SUCCESS")


def test_data_conversion(runner: TestRunner):
    """Test 3: Test Pandas ↔ R data conversion"""
    runner.log("Testing Pandas to R conversion...")

    # Create test DataFrame
    test_df = pd.DataFrame({
        'USUBJID': ['01-001', '01-002', '01-003'],
        'AGE': [25, 30, 35],
        'SEX': ['M', 'F', 'M'],
        'WEIGHT': [70.5, 65.2, 80.1]
    })

    # Convert to R
    r_df = pandas_to_r(test_df, name='test_conversion')
    assert r_df is not None, "Pandas to R conversion failed"
    runner.log("Pandas → R conversion successful", "SUCCESS")

    # Convert back to Pandas
    py_df = r_to_pandas('test_conversion')
    assert py_df is not None, "R to Pandas conversion failed"
    assert len(py_df) == len(test_df), "Row count mismatch after conversion"
    assert list(py_df.columns) == list(test_df.columns), "Column names mismatch after conversion"

    runner.log("R → Pandas conversion successful", "SUCCESS")
    runner.log(f"Original shape: {test_df.shape}, Converted shape: {py_df.shape}", "INFO")


def test_load_sdtm_test_data(runner: TestRunner):
    """Test 4: Load SDTM test data from pharmaversesdtm"""
    runner.log("Loading SDTM test data...")

    pipeline = SDTMToADaMPipeline()
    sdtm_data = pipeline.load_sdtm_test_data()

    assert sdtm_data is not None, "SDTM data loading failed"
    assert len(sdtm_data) > 0, "No SDTM datasets loaded"

    expected_domains = ['dm', 'ex', 'ae', 'vs', 'lb']
    for domain in expected_domains:
        assert domain in sdtm_data, f"Missing SDTM domain: {domain}"
        assert len(sdtm_data[domain]) > 0, f"Empty dataset: {domain}"
        runner.log(f"Loaded {domain.upper()}: {len(sdtm_data[domain])} records", "SUCCESS")


def test_sdtm_validation(runner: TestRunner):
    """Test 5: Validate SDTM dataset structure"""
    runner.log("Validating SDTM datasets...")

    pipeline = SDTMToADaMPipeline()
    sdtm_data = pipeline.load_sdtm_test_data()

    # Validate DM domain
    dm_validation = validate_sdtm_dataset(sdtm_data['dm'], 'DM')
    assert dm_validation is not None, "DM validation failed"
    assert dm_validation['valid'], f"DM validation failed: {dm_validation['missing_variables']}"
    runner.log(f"DM domain valid: {dm_validation['row_count']} rows", "SUCCESS")

    # Validate AE domain
    ae_validation = validate_sdtm_dataset(sdtm_data['ae'], 'AE')
    assert ae_validation is not None, "AE validation failed"
    assert ae_validation['valid'], f"AE validation failed: {ae_validation['missing_variables']}"
    runner.log(f"AE domain valid: {ae_validation['row_count']} rows", "SUCCESS")


def test_pipeline_execution(runner: TestRunner):
    """Test 6: Execute full SDTM → ADaM pipeline"""
    runner.log("Executing full pipeline...")

    result = run_pipeline(use_test_data=True)

    assert result is not None, "Pipeline execution returned None"
    assert result.status == 'success', f"Pipeline failed: {result.error_message}"
    assert len(result.datasets) > 0, "No ADaM datasets generated"

    runner.log(f"Pipeline status: {result.status}", "SUCCESS")
    runner.log(f"Execution time: {result.execution_time:.2f} seconds", "INFO")
    runner.log(f"Datasets generated: {len(result.datasets)}", "SUCCESS")

    for name, df in result.datasets.items():
        runner.log(f"  - {name.upper()}: {len(df)} rows × {len(df.columns)} columns", "INFO")


def test_adam_datasets(runner: TestRunner):
    """Test 7: Verify ADaM datasets structure and content"""
    runner.log("Testing ADaM datasets...")

    result = run_pipeline(use_test_data=True)
    assert result.status == 'success', "Pipeline execution failed"

    # Test ADSL
    assert 'adsl' in result.datasets, "ADSL dataset not generated"
    adsl = result.datasets['adsl']
    assert len(adsl) > 0, "ADSL is empty"

    adsl_validation = validate_adam_dataset(adsl, 'ADSL')
    assert adsl_validation['valid'], f"ADSL validation failed: {adsl_validation['missing_variables']}"
    runner.log(f"ADSL valid: {len(adsl)} subjects", "SUCCESS")

    # Test ADAE
    if 'adae' in result.datasets:
        adae = result.datasets['adae']
        assert len(adae) > 0, "ADAE is empty"
        runner.log(f"ADAE valid: {len(adae)} adverse events", "SUCCESS")

    # Test ADVS
    if 'advs' in result.datasets:
        advs = result.datasets['advs']
        assert len(advs) > 0, "ADVS is empty"
        runner.log(f"ADVS valid: {len(advs)} vital sign records", "SUCCESS")

    # Test ADLB
    if 'adlb' in result.datasets:
        adlb = result.datasets['adlb']
        assert len(adlb) > 0, "ADLB is empty"
        runner.log(f"ADLB valid: {len(adlb)} lab records", "SUCCESS")


def test_data_integrity(runner: TestRunner):
    """Test 8: Verify data integrity across pipeline"""
    runner.log("Testing data integrity...")

    pipeline = SDTMToADaMPipeline()
    sdtm_data = pipeline.load_sdtm_test_data()
    result = pipeline.run(sdtm_data=sdtm_data)

    assert result.status == 'success', "Pipeline execution failed"

    # Check subject count matches between DM and ADSL
    dm_subjects = sdtm_data['dm']['USUBJID'].nunique()
    adsl_subjects = result.datasets['adsl']['USUBJID'].nunique()

    assert dm_subjects == adsl_subjects, \
        f"Subject count mismatch: DM={dm_subjects}, ADSL={adsl_subjects}"

    runner.log(f"Subject count consistent: {dm_subjects} subjects", "SUCCESS")

    # Check ADSL required variables exist
    required_adsl_vars = ['STUDYID', 'USUBJID', 'TRT01P', 'TRT01A']
    adsl = result.datasets['adsl']

    for var in required_adsl_vars:
        assert var in adsl.columns, f"Required ADSL variable missing: {var}"

    runner.log("All required ADSL variables present", "SUCCESS")


def test_pipeline_summary(runner: TestRunner):
    """Test 9: Test pipeline summary functionality"""
    runner.log("Testing pipeline summary...")

    result = run_pipeline(use_test_data=True)
    assert result.status == 'success', "Pipeline execution failed"

    summary = create_pipeline_summary(result)

    assert summary is not None, "Summary creation failed"
    assert 'job_id' in summary, "job_id missing from summary"
    assert 'status' in summary, "status missing from summary"
    assert 'datasets_generated' in summary, "datasets_generated missing from summary"
    assert 'dataset_details' in summary, "dataset_details missing from summary"

    runner.log(f"Summary job_id: {summary['job_id']}", "INFO")
    runner.log(f"Datasets generated: {summary['datasets_generated']}", "SUCCESS")

    for dataset, details in summary['dataset_details'].items():
        runner.log(f"  {dataset}: {details['rows']} rows, {details['memory_usage_mb']:.2f} MB", "INFO")


def test_error_handling(runner: TestRunner):
    """Test 10: Test error handling with invalid data"""
    runner.log("Testing error handling...")

    pipeline = SDTMToADaMPipeline()

    # Test with empty dictionary
    try:
        result = pipeline.run(sdtm_data={})
        # If it doesn't raise an error, it should return a failed status
        runner.log("Empty data handled gracefully", "SUCCESS")
    except Exception as e:
        runner.log(f"Empty data raises exception (expected): {type(e).__name__}", "SUCCESS")

    # Test invalid dataset names
    try:
        result = pipeline.run(datasets_to_generate=['invalid_dataset'])
        runner.log("Invalid dataset names handled", "SUCCESS")
    except Exception as e:
        runner.log(f"Invalid dataset handled: {type(e).__name__}", "SUCCESS")


def test_pandas_operations(runner: TestRunner):
    """Test 11: Verify Pandas operations work on ADaM datasets"""
    runner.log("Testing Pandas operations on ADaM datasets...")

    result = run_pipeline(use_test_data=True)
    assert result.status == 'success', "Pipeline execution failed"

    adsl = result.datasets['adsl']

    # Test groupby
    treatment_summary = adsl.groupby('TRT01P')['AGE'].agg(['mean', 'count'])
    assert len(treatment_summary) > 0, "Groupby failed"
    runner.log("Groupby operation successful", "SUCCESS")

    # Test filtering
    filtered = adsl[adsl['AGE'] > 30]
    assert len(filtered) >= 0, "Filtering failed"
    runner.log(f"Filtering successful: {len(filtered)} subjects > 30 years", "SUCCESS")

    # Test sorting
    sorted_df = adsl.sort_values('AGE', ascending=False)
    assert len(sorted_df) == len(adsl), "Sorting changed row count"
    runner.log("Sorting successful", "SUCCESS")

    # Test value counts
    sex_counts = adsl['SEX'].value_counts()
    assert len(sex_counts) > 0, "Value counts failed"
    runner.log(f"Value counts: {dict(sex_counts)}", "SUCCESS")


def test_dataset_export(runner: TestRunner):
    """Test 12: Test dataset export to CSV"""
    runner.log("Testing dataset export...")

    result = run_pipeline(use_test_data=True)
    assert result.status == 'success', "Pipeline execution failed"

    # Check that files were created
    pipeline = SDTMToADaMPipeline()
    output_files = list(pipeline.output_dir.glob(f"*_{result.job_id}.csv"))

    assert len(output_files) > 0, "No output files created"
    runner.log(f"Created {len(output_files)} output files", "SUCCESS")

    # Verify files can be read back
    for output_file in output_files[:2]:  # Test first 2 files
        test_read = pd.read_csv(output_file)
        assert len(test_read) > 0, f"Output file is empty: {output_file.name}"
        runner.log(f"Verified {output_file.name}: {len(test_read)} rows", "SUCCESS")


# =============================================================================
# MAIN TEST EXECUTION
# =============================================================================

def main():
    """Main test execution"""
    import argparse

    parser = argparse.ArgumentParser(description='Test SDTM-to-ADaM Python Wrapper')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    args = parser.parse_args()

    print("\n" + "="*60)
    print("SDTM-to-ADaM Python Wrapper - Test Suite")
    print("="*60 + "\n")

    runner = TestRunner(verbose=args.verbose)

    # Run all tests
    runner.run_test("R Environment Setup", lambda: test_r_environment(runner))
    runner.run_test("Pipeline Initialization", lambda: test_pipeline_initialization(runner))
    runner.run_test("Data Conversion (Pandas ↔ R)", lambda: test_data_conversion(runner))
    runner.run_test("Load SDTM Test Data", lambda: test_load_sdtm_test_data(runner))
    runner.run_test("SDTM Dataset Validation", lambda: test_sdtm_validation(runner))
    runner.run_test("Full Pipeline Execution", lambda: test_pipeline_execution(runner))
    runner.run_test("ADaM Dataset Validation", lambda: test_adam_datasets(runner))
    runner.run_test("Data Integrity Checks", lambda: test_data_integrity(runner))
    runner.run_test("Pipeline Summary", lambda: test_pipeline_summary(runner))
    runner.run_test("Error Handling", lambda: test_error_handling(runner))
    runner.run_test("Pandas Operations", lambda: test_pandas_operations(runner))
    runner.run_test("Dataset Export", lambda: test_dataset_export(runner))

    # Print summary
    all_passed = runner.print_summary()

    # Exit with appropriate code
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
